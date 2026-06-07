import os
from app.core.config import settings
from arq import Worker, cron
from app.services.ai_service import generate_code_review

async def process_ai_review_task(ctx, req_json: dict):
    """
    ARQ Task to process Code Review payloads.
    Uses pure AsyncIO for lightweight GPU orchestration.
    """
    try:
        review_json = await generate_code_review(
            code=req_json.get("code"),
            language=req_json.get("language"),
            output=req_json.get("output"),
            error=req_json.get("error"),
            execution_time_ms=req_json.get("execution_time_ms"),
            memory_usage_mb=req_json.get("memory_usage_mb")
        )
        return {"status": "completed", "review": review_json}
    except Exception as e:
        # Returning graceful failure on fatal so the frontend polling API gets it
        return {"status": "failed", "error": str(e)}


async def generate_interview_feedback_task(ctx, interview_id: str, college_id: str):
    """
    ARQ Task: Generate comprehensive AI feedback for a completed interview.
    
    This is the heaviest LLM call in the platform (full transcript analysis).
    Offloaded from the API worker so /interview/{id}/end returns instantly.
    Frontend polls GET /interview/{id} until feedback.status == 'completed'.
    """
    import json
    import logging
    from database import admin_session_ctx
    from sqlalchemy import select, text
    from app import models
    from app.core.config import settings

    logger = logging.getLogger("acadmix.worker.interview")
    logger.info("[interview-feedback] Processing interview=%s", interview_id)

    async with admin_session_ctx() as session:
        stmt = select(models.MockInterview).where(
            models.MockInterview.id == interview_id,
            models.MockInterview.college_id == college_id,
        )
        result = await session.execute(stmt)
        interview = result.scalars().first()

        if not interview:
            logger.error("[interview-feedback] Interview not found: %s", interview_id)
            return {"status": "failed", "error": "Interview not found"}

        # Build transcript
        transcript_lines = []
        for msg in (interview.conversation or []):
            role_label = "Interviewer" if msg["role"] == "assistant" else "Candidate"
            transcript_lines.append(f"{role_label}: {msg['content']}")
        transcript = "\n\n".join(transcript_lines)

        # Call LLM for feedback via Production Gateway
        try:
            from app.services.llm_gateway import gateway
            from app.services.interview_service import get_feedback_system_prompt

            feedback_prompt = get_feedback_system_prompt(interview.interview_type)

            feedback_raw = await gateway.complete(
                "interview",
                messages=[
                    {"role": "system", "content": feedback_prompt},
                    {"role": "user", "content": f"Transcript:\n\n{transcript}"},
                ],
                json_mode=True,
                max_tokens=3000,
            )
            feedback = json.loads(feedback_raw)
        except Exception as e:
            logger.error("[interview-feedback] LLM failed: %s", e)
            feedback = {
                "overall_score": 50,
                "scores": {},
                "per_question": [],
                "strengths": [],
                "weaknesses": [],
                "improvement_tips": ["Review the transcript and practice."],
                "overall_comment": "AI feedback generation failed. Please try again.",
            }

        # Update interview record
        from datetime import datetime, timezone
        from sqlalchemy.orm.attributes import flag_modified

        now = datetime.now(timezone.utc)
        duration = int((now - interview.created_at.replace(tzinfo=timezone.utc)).total_seconds()) if interview.created_at else 0

        interview.status = "completed"
        interview.completed_at = now
        interview.duration_seconds = duration
        interview.ai_feedback = feedback
        interview.scores = feedback.get("scores", {})
        interview.overall_score = feedback.get("overall_score", 50)
        flag_modified(interview, "ai_feedback")
        flag_modified(interview, "scores")

        await session.commit()
        logger.info("[interview-feedback] Completed interview=%s score=%s", interview_id, interview.overall_score)
        return {"status": "completed", "score": interview.overall_score}


# ═══════════════════════════════════════════════════════════════════════════════
# HOSTEL MODULE — Background Workers
# ═══════════════════════════════════════════════════════════════════════════════

async def sweep_expired_bed_locks(ctx):
    """
    Runs every 60 seconds. Releases LOCKED beds older than 10 minutes
    to prevent orphaned locks from blocking inventory.
    """
    from database import admin_session_ctx
    from sqlalchemy import text
    import logging

    logger = logging.getLogger("acadmix.hostel.sweep")

    try:
        async with admin_session_ctx() as session:
            result = await session.execute(text("""
                UPDATE beds SET status = 'AVAILABLE', locked_at = NULL, locked_by = NULL
                WHERE status = 'LOCKED'
                  AND locked_at < NOW() - INTERVAL '10 minutes'
                  AND is_deleted = false
                RETURNING id, room_id
            """))
            released = result.fetchall()
            if released:
                await session.commit()
                logger.info("[hostel-sweep] Released %d expired bed locks", len(released))
            else:
                await session.commit()
    except Exception as e:
        logger.error("[hostel-sweep] Error: %s", e)


async def check_gatepass_violations(ctx):
    """
    Runs every 15 minutes. Flags gatepasses where students have not
    returned by expected_return time.
    """
    from database import admin_session_ctx
    from sqlalchemy import text
    import logging

    logger = logging.getLogger("acadmix.hostel.gatepass")

    try:
        async with admin_session_ctx() as session:
            result = await session.execute(text("""
                UPDATE gatepasses SET approval_status = 'expired'
                WHERE approval_status = 'approved'
                  AND expected_return < NOW()
                  AND actual_return IS NULL
                  AND is_deleted = false
                RETURNING id, student_id, hostel_id
            """))
            overdue = result.fetchall()
            if overdue:
                await session.commit()
                logger.warning("[hostel-gatepass] Flagged %d overdue gatepasses", len(overdue))
            else:
                await session.commit()
    except Exception as e:
        logger.error("[hostel-gatepass] Error: %s", e)


# ═══════════════════════════════════════════════════════════════════════════════
# WHATSAPP TRANSACTIONAL BOT — Scheduled Cron Jobs
# ═══════════════════════════════════════════════════════════════════════════════

async def send_daily_attendance_digest(ctx):
    """6 PM daily — Send end-of-day attendance digest to parents."""
    from database import admin_session_ctx
    from app.services.wa_parent_flows import send_daily_attendance_digest as _send
    import logging
    logger = logging.getLogger("acadmix.wa_cron")

    try:
        async with admin_session_ctx() as session:
            count = await _send(session)
            await session.commit()
            logger.info("[wa-cron] Attendance digest: sent %d messages", count)
    except Exception as e:
        logger.error("[wa-cron] Attendance digest failed: %s", e)


async def send_weekly_ami_digest(ctx):
    """Sunday 7 PM — Weekly Ami performance digest for students."""
    from database import admin_session_ctx
    from app.services.wa_student_flows import send_weekly_ami_digest as _send
    import logging
    logger = logging.getLogger("acadmix.wa_cron")

    try:
        async with admin_session_ctx() as session:
            count = await _send(session)
            await session.commit()
            logger.info("[wa-cron] Ami weekly digest: sent %d messages", count)
    except Exception as e:
        logger.error("[wa-cron] Ami digest failed: %s", e)


async def check_low_wallet_balances(ctx):
    """Twice daily — Alert parents when student wallet is low."""
    from database import admin_session_ctx
    from sqlalchemy.future import select
    from app import models
    from app.services.wa_interactive import send_cta_url_message
    import logging
    logger = logging.getLogger("acadmix.wa_cron")

    try:
        async with admin_session_ctx() as session:
            threshold = settings.WALLET_LOW_BALANCE_THRESHOLD
            # Find students with low balances
            stmt = (
                select(
                    models.UserProfile.user_id,
                    models.UserProfile.acad_tokens,
                    models.UserProfile.phone,
                    models.User.name,
                )
                .join(models.User, models.User.id == models.UserProfile.user_id)
                .where(
                    models.User.role == "student",
                    models.User.is_deleted == False,
                    models.UserProfile.is_deleted == False,
                    models.UserProfile.acad_tokens < threshold,
                    models.UserProfile.acad_tokens > 0,
                    models.UserProfile.phone != None,
                )
            )
            result = await session.execute(stmt)
            rows = result.all()

            count = 0
            for user_id, balance, phone, name in rows:
                body = (
                    f"💰 *Low Wallet Balance*\n\n"
                    f"Hi {name}, your campus wallet balance is *₹{balance:.0f}*.\n"
                    f"Top up to avoid interruptions at vending machines and mess."
                )
                await send_cta_url_message(
                    to_phone=phone, body_text=body,
                    button_text="💳 Top Up",
                    url=f"{settings.FEE_PORTAL_BASE_URL}?action=topup",
                    footer_text="AcadMix Wallet",
                )
                count += 1

            logger.info("[wa-cron] Low wallet alerts: sent %d messages", count)
    except Exception as e:
        logger.error("[wa-cron] Low wallet check failed: %s", e)


async def check_overdue_fees(ctx):
    """Daily 10 AM — Alert parents and students about overdue fees with pay links."""
    from database import admin_session_ctx
    from app.services.wa_parent_flows import send_overdue_fee_alerts_parents
    from app.services.wa_student_flows import send_overdue_fee_alert_student
    import logging
    logger = logging.getLogger("acadmix.wa_cron")

    try:
        async with admin_session_ctx() as session:
            parent_count = await send_overdue_fee_alerts_parents(session)
            student_count = await send_overdue_fee_alert_student(session)
            await session.commit()
            logger.info("[wa-cron] Overdue fees: %d parent + %d student alerts", parent_count, student_count)
    except Exception as e:
        logger.error("[wa-cron] Overdue fees check failed: %s", e)


async def send_fee_due_reminders_cron(ctx):
    """Daily 9 AM — Remind students about fees due within 3 days (with pay link)."""
    from database import admin_session_ctx
    from app.services.wa_student_flows import send_fee_due_reminders as _send
    import logging
    logger = logging.getLogger("acadmix.wa_cron")

    try:
        async with admin_session_ctx() as session:
            count = await _send(session)
            await session.commit()
            logger.info("[wa-cron] Fee due reminders: sent %d messages", count)
    except Exception as e:
        logger.error("[wa-cron] Fee due reminders failed: %s", e)


async def send_bus_departure_alerts_cron(ctx):
    """4:45 PM — 15 min before evening bus departure alerts."""
    from database import admin_session_ctx
    from app.services.wa_student_flows import send_bus_departure_alerts as _send
    import logging
    logger = logging.getLogger("acadmix.wa_cron")

    try:
        async with admin_session_ctx() as session:
            count = await _send(session)
            await session.commit()
            logger.info("[wa-cron] Bus departure alerts: sent %d messages", count)
    except Exception as e:
        logger.error("[wa-cron] Bus departure alerts failed: %s", e)


# ═══════════════════════════════════════════════════════════════════════════════
# ON-DEMAND ARQ TASKS (enqueued by webhook/router triggers)
# ═══════════════════════════════════════════════════════════════════════════════

async def process_gatepass_approval_request(ctx, gatepass_id: str):
    """Send gate pass approval interactive message to parent."""
    from database import admin_session_ctx
    from app.services.wa_parent_flows import send_gatepass_approval_request
    import logging
    logger = logging.getLogger("acadmix.wa_task")

    try:
        async with admin_session_ctx() as session:
            await send_gatepass_approval_request(session, gatepass_id)
            await session.commit()
            logger.info("[wa-task] Gate pass approval request sent for %s", gatepass_id)
    except Exception as e:
        logger.error("[wa-task] Gate pass approval failed: %s", e)


async def process_vending_receipt(ctx, student_id: str, item_name: str, amount: float, balance_after: float, transaction_type: str):
    """Send vending machine / mess receipt to student."""
    from database import admin_session_ctx
    from app.services.wa_student_flows import send_vending_receipt
    import logging
    logger = logging.getLogger("acadmix.wa_task")

    try:
        async with admin_session_ctx() as session:
            await send_vending_receipt(session, student_id, item_name, amount, balance_after, transaction_type)
            logger.info("[wa-task] Vending receipt sent for student %s", student_id)
    except Exception as e:
        logger.error("[wa-task] Vending receipt failed: %s", e)


async def process_hardware_alert(ctx, college_id: str, machine_code: str, alert_type: str, details: str):
    """Send hardware maintenance alert to staff."""
    from database import admin_session_ctx
    from app.services.wa_staff_flows import send_hardware_alert
    import logging
    logger = logging.getLogger("acadmix.wa_task")

    try:
        async with admin_session_ctx() as session:
            await send_hardware_alert(session, college_id, machine_code, alert_type, details)
            logger.info("[wa-task] Hardware alert sent for %s", machine_code)
    except Exception as e:
        logger.error("[wa-task] Hardware alert failed: %s", e)


async def process_proxy_request(ctx, college_id: str, absent_teacher_id: str, period_slot_id: str, subject_name: str, period_no: int, target_date: str):
    """Send proxy substitution requests to eligible teachers."""
    from database import admin_session_ctx
    from app.services.wa_staff_flows import send_proxy_requests
    from datetime import date as dateclass
    import logging
    logger = logging.getLogger("acadmix.wa_task")

    try:
        async with admin_session_ctx() as session:
            d = dateclass.fromisoformat(target_date)
            count = await send_proxy_requests(session, college_id, absent_teacher_id, period_slot_id, subject_name, period_no, d)
            logger.info("[wa-task] Sent %d proxy requests for %s P%d", count, subject_name, period_no)
    except Exception as e:
        logger.error("[wa-task] Proxy request failed: %s", e)


async def broadcast_college_alert_task(ctx, college_id: str, announcement_id: str):
    """Broadcast high-priority college announcement via WhatsApp."""
    from database import admin_session_ctx
    from app.services.wa_student_flows import broadcast_college_alert
    import logging
    logger = logging.getLogger("acadmix.wa_task")

    try:
        async with admin_session_ctx() as session:
            count = await broadcast_college_alert(session, college_id, announcement_id)
            await session.commit()
            logger.info("[wa-task] College alert broadcast to %d recipients", count)
    except Exception as e:
        logger.error("[wa-task] College alert broadcast failed: %s", e)


async def send_fee_payment_receipt_task(ctx, student_id: str, invoice_id: str, amount_paid: float, transaction_ref: str, receipt_url: str = None):
    """Send fee payment receipt with receipt link to student."""
    from database import admin_session_ctx
    from app.services.wa_student_flows import send_fee_payment_receipt
    import logging
    logger = logging.getLogger("acadmix.wa_task")

    try:
        async with admin_session_ctx() as session:
            await send_fee_payment_receipt(session, student_id, invoice_id, amount_paid, transaction_ref, receipt_url)
            logger.info("[wa-task] Fee receipt sent for student %s", student_id)
    except Exception as e:
        logger.error("[wa-task] Fee receipt failed: %s", e)


# ═══════════════════════════════════════════════════════════════════════════════
# TRANSPORT — Scheduled Cron Jobs
# ═══════════════════════════════════════════════════════════════════════════════

async def transport_cleanup_stale_trips(ctx):
    """10 PM daily — Auto-complete any trips still in 'started' or 'in_transit' state."""
    from app.services.transport_state import get_all_active_trips, end_trip
    from database import admin_session_ctx
    from app import models
    from sqlalchemy.future import select
    from datetime import datetime
    import logging
    logger = logging.getLogger("acadmix.transport_cron")

    try:
        active = await get_all_active_trips()
        cleaned = 0
        for trip_info in active:
            route_id = trip_info["route_id"]
            await end_trip(route_id)
            # Mark Trip as completed in DB
            async with admin_session_ctx() as session:
                trip_data = trip_info.get("trip", {})
                trip_id = trip_data.get("trip_id")
                if trip_id:
                    r = await session.execute(
                        select(models.Trip).where(models.Trip.id == trip_id)
                    )
                    trip = r.scalars().first()
                    if trip and trip.state != "completed":
                        trip.state = "completed"
                        trip.completed_at = datetime.utcnow()
                        await session.commit()
                        cleaned += 1
        if cleaned:
            logger.info("[transport-cron] Cleaned %d stale trips", cleaned)
    except Exception as e:
        logger.error("[transport-cron] Stale trip cleanup failed: %s", e)


async def transport_morning_reminder(ctx):
    """6:30 AM daily — Remind enrolled students about their bus departure time."""
    from database import admin_session_ctx
    from app import models
    from sqlalchemy.future import select
    from app.services.push_notifications import send_notification
    import logging
    logger = logging.getLogger("acadmix.transport_cron")

    try:
        async with admin_session_ctx() as session:
            # Get all active enrollments with route info + FCM tokens
            stmt = (
                select(
                    models.TransportEnrollment.student_id,
                    models.TransportEnrollment.boarding_stop_name,
                    models.BusRoute.route_number,
                    models.BusRoute.route_name,
                    models.BusRoute.departure_time,
                    models.UserProfile.extra_data,
                    models.User.name,
                )
                .join(models.BusRoute, models.BusRoute.id == models.TransportEnrollment.route_id)
                .join(models.User, models.User.id == models.TransportEnrollment.student_id)
                .join(models.UserProfile, models.UserProfile.user_id == models.User.id)
                .where(
                    models.TransportEnrollment.is_active == True,
                    models.TransportEnrollment.is_deleted == False,
                    models.BusRoute.is_active == True,
                    models.User.is_deleted == False,
                )
            )
            result = await session.execute(stmt)
            rows = result.all()

            count = 0
            for student_id, stop_name, route_num, route_name, dep_time, extra_data, name in rows:
                fcm_token = (extra_data or {}).get("fcm_token")
                if not fcm_token:
                    continue
                try:
                    await send_notification(
                        fcm_token,
                        title=f"🚌 Good Morning, {name}!",
                        body=f"Bus {route_num} departs at {dep_time or '07:00'}. Your stop: {stop_name}",
                        data={"type": "morning_reminder", "route_number": route_num},
                    )
                    count += 1
                except Exception:
                    pass

            logger.info("[transport-cron] Morning reminders sent to %d students via FCM", count)
    except Exception as e:
        logger.error("[transport-cron] Morning reminder failed: %s", e)

# ═══════════════════════════════════════════════════════════════════════════════
# LIBRARY — Scheduled Cron Jobs & On-Demand Tasks
# ═══════════════════════════════════════════════════════════════════════════════

async def calculate_overdue_fines(ctx):
    """12:05 AM daily — Flag overdue transactions, generate fines, push notifications."""
    from database import admin_session_ctx
    from sqlalchemy import text
    from decimal import Decimal
    import logging
    logger = logging.getLogger("acadmix.library_cron")

    try:
        async with admin_session_ctx() as session:
            # 1. Update ACTIVE transactions past due_date to OVERDUE
            await session.execute(text("""
                UPDATE library_transactions SET status = 'OVERDUE'
                WHERE status = 'ACTIVE'
                  AND due_date < NOW()
                  AND is_deleted = false
            """))

            # 2. Create/update fines for all OVERDUE transactions
            result = await session.execute(text("""
                SELECT lt.id, lt.user_id, lt.college_id, lt.due_date,
                       EXTRACT(DAY FROM NOW() - lt.due_date)::int AS overdue_days
                FROM library_transactions lt
                WHERE lt.status = 'OVERDUE'
                  AND lt.return_time IS NULL
                  AND lt.is_deleted = false
                  AND NOT EXISTS (
                      SELECT 1 FROM library_fines lf
                      WHERE lf.transaction_id = lt.id
                        AND lf.is_deleted = false
                  )
            """))
            new_fines = result.fetchall()

            for txn_id, user_id, college_id, due_date, overdue_days in new_fines:
                days = max(overdue_days, 1)
                amount = Decimal("2.00") * days
                await session.execute(text("""
                    INSERT INTO library_fines (id, college_id, transaction_id, user_id, amount, status, is_deleted)
                    VALUES (gen_random_uuid()::text, :cid, :tid, :uid, :amt, 'UNPAID', false)
                """), {"cid": college_id, "tid": txn_id, "uid": user_id, "amt": float(amount)})

            # 3. Update existing unpaid fines with current overdue amount
            await session.execute(text("""
                UPDATE library_fines lf SET amount = (
                    SELECT GREATEST(EXTRACT(DAY FROM NOW() - lt.due_date)::int, 1) * 2.00
                    FROM library_transactions lt
                    WHERE lt.id = lf.transaction_id
                )
                WHERE lf.status = 'UNPAID'
                  AND lf.is_deleted = false
                  AND EXISTS (
                      SELECT 1 FROM library_transactions lt
                      WHERE lt.id = lf.transaction_id
                        AND lt.status = 'OVERDUE'
                        AND lt.return_time IS NULL
                  )
            """))

            await session.commit()
            if new_fines:
                logger.info("[library-cron] Created %d new overdue fines", len(new_fines))
    except Exception as e:
        logger.error("[library-cron] Overdue fine calculation failed: %s", e)


async def process_library_hold_queue(ctx, book_id: str, college_id: str):
    """Triggered on book return — notify next student in reservation queue."""
    from database import admin_session_ctx
    from sqlalchemy.future import select
    from app import models
    from datetime import datetime, timezone, timedelta
    import logging
    logger = logging.getLogger("acadmix.library_task")

    try:
        async with admin_session_ctx() as session:
            # Find the oldest PENDING reservation for this book
            res_q = await session.execute(
                select(models.LibraryReservation)
                .where(
                    models.LibraryReservation.book_id == book_id,
                    models.LibraryReservation.college_id == college_id,
                    models.LibraryReservation.status == "PENDING",
                    models.LibraryReservation.is_deleted == False,
                )
                .order_by(models.LibraryReservation.reserved_at)
                .limit(1)
            )
            reservation = res_q.scalars().first()
            if not reservation:
                return

            # Find an available copy
            copy_q = await session.execute(
                select(models.BookCopy)
                .where(
                    models.BookCopy.book_id == book_id,
                    models.BookCopy.college_id == college_id,
                    models.BookCopy.status == "AVAILABLE",
                    models.BookCopy.is_deleted == False,
                )
                .limit(1)
            )
            copy = copy_q.scalars().first()
            if not copy:
                return

            # Reserve the copy
            now = datetime.now(timezone.utc)
            copy.status = "RESERVED"
            reservation.status = "READY"
            reservation.expires_at = now + timedelta(hours=48)
            reservation.notified_at = now

            # Update book aggregate
            book_q = await session.execute(
                select(models.Book).where(models.Book.id == book_id)
            )
            book = book_q.scalars().first()
            if book:
                book.available_copies = max(0, (book.available_copies or 1) - 1)

            await session.commit()
            logger.info(
                "[library-task] Reserved copy %s for user %s (reservation %s)",
                copy.id, reservation.user_id, reservation.id,
            )

            # TODO: Send FCM/WhatsApp notification to the student
    except Exception as e:
        logger.error("[library-task] Hold queue processing failed: %s", e)


async def expire_library_reservations(ctx):
    """Every 30 min — Expire READY reservations past their 48h window."""
    from database import admin_session_ctx
    from sqlalchemy import text
    import logging
    logger = logging.getLogger("acadmix.library_cron")

    try:
        async with admin_session_ctx() as session:
            # Expire reservations and free up copies
            result = await session.execute(text("""
                UPDATE library_reservations SET status = 'EXPIRED'
                WHERE status = 'READY'
                  AND expires_at < NOW()
                  AND is_deleted = false
                RETURNING id, book_id, college_id
            """))
            expired = result.fetchall()

            # Free up the reserved copies
            for res_id, book_id, college_id in expired:
                await session.execute(text("""
                    UPDATE book_copies SET status = 'AVAILABLE'
                    WHERE book_id = :bid AND college_id = :cid
                      AND status = 'RESERVED' AND is_deleted = false
                    LIMIT 1
                """), {"bid": book_id, "cid": college_id})

                # Update book aggregate
                await session.execute(text("""
                    UPDATE books SET available_copies = available_copies + 1
                    WHERE id = :bid
                """), {"bid": book_id})

            await session.commit()
            if expired:
                logger.info("[library-cron] Expired %d library reservations", len(expired))
    except Exception as e:
        logger.error("[library-cron] Reservation expiry failed: %s", e)


# ═══════════════════════════════════════════════════════════════════════════════
# LEADERBOARD — Scheduled Cron Jobs
# ═══════════════════════════════════════════════════════════════════════════════

async def compute_leaderboard_ranks(ctx):
    """Every 5 minutes — Pre-compute student ranks for fast dashboard loading."""
    from database import admin_session_ctx
    from app import models
    from sqlalchemy import select, text
    import logging
    logger = logging.getLogger("acadmix.leaderboard_cron")

    try:
        async with admin_session_ctx() as session:
            # Recreate rankings completely for all colleges
            await session.execute(text("TRUNCATE TABLE student_rankings"))
            
            students_r = await session.execute(
                select(models.QuizAttempt.student_id, models.QuizAttempt.final_score, models.Quiz.college_id)
                .join(models.Quiz, models.Quiz.id == models.QuizAttempt.quiz_id)
                .where(models.QuizAttempt.status == "submitted")
            )
            
            scores_by_college = {}
            for student_id, score, college_id in students_r.all():
                if college_id not in scores_by_college:
                    scores_by_college[college_id] = {}
                scores_by_college[college_id].setdefault(student_id, []).append(score or 0)
                
            insert_batch = []
            for college_id, student_scores in scores_by_college.items():
                ranked = sorted(
                    [(sid, sum(sc)/len(sc) if sc else 0) for sid, sc in student_scores.items()],
                    key=lambda x: x[1], reverse=True
                )
                total = len(ranked)
                for rank, (sid, avg) in enumerate(ranked, 1):
                    insert_batch.append({
                        "college_id": college_id,
                        "student_id": sid,
                        "rank": rank,
                        "total_students": total,
                        "avg_score": round(avg, 1)
                    })
            
            if insert_batch:
                from sqlalchemy import insert
                await session.execute(insert(models.StudentRanking), insert_batch)
                await session.commit()
                logger.info("[leaderboard-cron] Computed ranks for %d students across %d colleges", len(insert_batch), len(scores_by_college))
    except Exception as e:
        logger.error("[leaderboard-cron] Ranking calculation failed: %s", e)

# ═══════════════════════════════════════════════════════════════════════════════
# RESULTS WARMING & NOTIFICATION TASKS
# ═══════════════════════════════════════════════════════════════════════════════

async def warm_results_cache_task(ctx, college_id: str, semester: int, student_ids: list):
    """
    Idempotent ARQ task designed strictly to populate memory footprints without side-effects.
    """
    from database import admin_session_ctx
    from app.services.marks_service import MarksService
    import asyncio
    import logging

    logger = logging.getLogger("acadmix.worker.results_cache")
    logger.info("[results-warming] Pre-caching %d student payloads for %s", len(student_ids), college_id)
    
    async with admin_session_ctx() as session:
        marks_svc = MarksService(session)
        for i, s_id in enumerate(student_ids):
            # get_student_cia inherently injects back into Redis logic natively using standard TTL
            await marks_svc.get_student_cia(student_id=s_id, college_id=college_id, semester=semester)
            
            # Prevent PostgreSQL connection pool saturation & CPU starvation
            if i > 0 and i % 100 == 0:
                await asyncio.sleep(2)


async def notify_results_task(ctx, college_id: str, semester: int, student_ids: list):
    """
    Separated Notification Task. Chunks targets implicitly and delays processing
    to stagger TCP traffic loads natively. Strictly bound to max_tries=1.
    """
    import asyncio
    import logging
    from app.services.push_notifications import send_batch_data
    from database import admin_session_ctx
    from sqlalchemy import select
    from app.models.core import User

    logger = logging.getLogger("acadmix.worker.results_notify")
    logger.info("[results-notify] Spawning notification orchestrator for %d students", len(student_ids))
    
    # Check execution context to prevent duplicate tries if ARQ ignores global config
    if ctx.get('job_try', 1) > 1:
        logger.warning("[results-notify] Aborting retry to prevent duplicate FCM dispatch spam.")
        return

    batch_size = 100
    for i in range(0, len(student_ids), batch_size):
        chunk = student_ids[i:i + batch_size]
        try:
            async with admin_session_ctx() as session:
                fcm_stmt = select(User.fcm_token).where(
                    User.id.in_(chunk), 
                    User.fcm_token.is_not(None)
                )
                tokens_r = await session.execute(fcm_stmt)
                tokens = [t for t in tokens_r.scalars().all() if t]

            if tokens:
                try:
                    await send_batch_data(tokens, {
                        "type": "RESULT_PUBLISHED",
                        "title": "Semester Results Published!",
                        "body": "Your updated exam scores are now available on the dashboard.",
                        "semester": str(semester)
                    })
                except Exception as inner_e:
                    logger.warning("[results-notify] Chunk %d to %d failed FCM dispatch: %s", i, i+batch_size, inner_e)
        except Exception as e:
            logger.error("[results-notify] Chunk resolution failed totally: %s", e)
            
        # The Core Stagger Mechanic
        await asyncio.sleep(5)


# ═══════════════════════════════════════════════════════════════════════════════
# TENANT PROVISIONING (Stripe Onboarding)
# ═══════════════════════════════════════════════════════════════════════════════

async def provision_tenant(ctx, college_name: str, college_domain: str, admin_email: str, plan: str, stripe_customer_id: str, stripe_subscription_id: str):
    """
    ARQ Task to provision a new college tenant asynchronously after Stripe checkout.
    """
    import uuid
    import logging
    from database import admin_session_ctx
    from app.models.core import College, User, UserProfile, Role
    from app.core.security import get_password_hash

    logger = logging.getLogger("acadmix.worker.provision")
    logger.info(f"[provision] Starting provisioning for {college_name} ({college_domain})")

    try:
        async with admin_session_ctx() as session:
            college_id = str(uuid.uuid4())
            new_college = College(
                id=college_id,
                name=college_name,
                domain=college_domain,
                stripe_customer_id=stripe_customer_id,
                stripe_subscription_id=stripe_subscription_id,
                settings={"plan": plan}
            )
            session.add(new_college)

            # Create default Admin role
            admin_role = Role(
                id=str(uuid.uuid4()),
                college_id=college_id,
                name="admin",
                permissions={"all": True}
            )
            session.add(admin_role)

            # Create the initial Admin user
            admin_user = User(
                id=str(uuid.uuid4()),
                college_id=college_id,
                email=admin_email,
                name="Platform Admin",
                role="admin",
                password_hash=get_password_hash("changeme123")  # Prompt to change on first login
            )
            session.add(admin_user)

            # Create admin profile
            admin_profile = UserProfile(
                id=str(uuid.uuid4()),
                user_id=admin_user.id,
                college_id=college_id,
                force_password_change=True
            )
            session.add(admin_profile)

            await session.commit()
            logger.info(f"[provision] Successfully provisioned {college_name} with admin {admin_email}")

            # Optionally, send an email to the admin with their credentials.
    except Exception as e:
        logger.error(f"[provision] Failed to provision tenant {college_name}: {e}")
        raise e

# ═══════════════════════════════════════════════════════════════════════════════
# WORKER SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

from app.workers.pdf_generator import (
    generate_naac_ssr_task, 
    generate_nba_sar_task,
    generate_nirf_dcs_task,
    generate_nep_compliance_task
)

class WorkerSettings:
    functions = [
        process_ai_review_task,
        generate_interview_feedback_task,
        warm_results_cache_task,
        notify_results_task,
        # WhatsApp on-demand tasks
        process_gatepass_approval_request,
        process_vending_receipt,
        process_hardware_alert,
        process_proxy_request,
        broadcast_college_alert_task,
        send_fee_payment_receipt_task,
        # Library on-demand tasks
        process_library_hold_queue,
        # Accreditation tasks
        generate_naac_ssr_task,
        generate_nba_sar_task,
        generate_nirf_dcs_task,
        generate_nep_compliance_task,
        # Onboarding
        provision_tenant,
    ]
    
    # Scheduled background jobs
    cron_jobs = [
        # Hostel
        cron(sweep_expired_bed_locks, second=0),                               # every minute at :00
        cron(check_gatepass_violations, minute={0, 15, 30, 45}),               # every 15 min
        # WhatsApp digests & alerts
        cron(send_daily_attendance_digest, hour=18, minute=0),                 # 6 PM daily
        cron(send_weekly_ami_digest, weekday=6, hour=19, minute=0),            # Sunday 7 PM
        cron(check_low_wallet_balances, hour={9, 14}, minute=0),               # 9 AM & 2 PM
        cron(check_overdue_fees, hour=10, minute=0),                           # 10 AM daily
        cron(send_fee_due_reminders_cron, hour=9, minute=0),                   # 9 AM daily
        cron(send_bus_departure_alerts_cron, hour=16, minute=45),              # 4:45 PM daily
        # Transport
        cron(transport_cleanup_stale_trips, hour=22, minute=0),                # 10 PM daily
        cron(transport_morning_reminder, hour=6, minute=30),                   # 6:30 AM daily
        # Library
        cron(calculate_overdue_fines, hour=0, minute=5),                        # 12:05 AM daily
        cron(expire_library_reservations, minute={0, 30}),                      # every 30 min
        # Analytics
        cron(compute_leaderboard_ranks, minute=set(range(0, 60, 5))),           # every 5 min
    ]

    redis_settings = "redis://localhost:6379"  # Bound to local dev container config
    if settings.REDIS_URL:
        from arq.connections import RedisSettings
        redis_settings = RedisSettings.from_dsn(settings.REDIS_URL)

    # Global Timeouts mapped globally due to large Stagger Batching intervals
    job_timeout = 600  # Max 10m ceiling for deep-batch operations 
    max_tries = 2     # Allow one retry generally (handled internally via job_try logic dynamically)
    
    # Pre-flight hook
    async def on_startup(ctx):
        print("ARQ Async Worker Node spinning up...")
        
    async def on_shutdown(ctx):
        print("ARQ Async Worker Node shutting down gracefully...")
