import uuid
import razorpay
from datetime import datetime, timezone
from fastapi import HTTPException
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, case
from typing import List, Dict, Any, Optional

from app.models import (
    User,
    UserProfile,
    College,
    StudentFeeInvoice,
    FeePayment,
    FeeStructure,
    FeeStructureItem,
    FeeConcession,
    FeeRefund,
    CashierSession,
)
from app.core.config import settings

RAZORPAY_KEY_ID = settings.RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET = settings.RAZORPAY_KEY_SECRET
PAYMENT_MODES = {"cash", "upi", "card", "bank_transfer", "cheque", "razorpay", "adjustment"}


class FeesService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.rzp_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

    async def _next_code(self, college_id: str, model, field_name: str, prefix: str) -> str:
        count_q = await self.db.execute(
            select(func.count()).select_from(model).where(
                model.college_id == college_id,
                getattr(model, field_name).is_not(None),
                model.is_deleted == False,
            )
        )
        count = int(count_q.scalar() or 0) + 1
        year = datetime.now(timezone.utc).strftime("%y")
        return f"{prefix}-{year}-{count:06d}"

    async def _invoice_paid_amount(self, invoice_id: str) -> float:
        paid_q = await self.db.execute(
            select(func.coalesce(func.sum(FeePayment.amount_paid), 0)).where(
                FeePayment.invoice_id == invoice_id,
                FeePayment.status == "success",
                FeePayment.is_deleted == False,
            )
        )
        return float(paid_q.scalar() or 0)

    async def _invoice_amounts(self, invoice: StudentFeeInvoice) -> Dict[str, float]:
        paid = await self._invoice_paid_amount(invoice.id)
        concession_q = await self.db.execute(
            select(func.coalesce(func.sum(FeeConcession.amount), 0)).where(
                FeeConcession.invoice_id == invoice.id,
                FeeConcession.status == "approved",
                FeeConcession.is_deleted == False,
            )
        )
        concession = float(concession_q.scalar() or 0)
        net_total = max(float(invoice.total_amount or 0) - concession, 0)
        return {
            "billed": float(invoice.total_amount or 0),
            "concession": concession,
            "net_total": net_total,
            "paid": paid,
            "due": max(net_total - paid, 0),
        }

    async def _refresh_invoice_status(self, invoice: StudentFeeInvoice) -> None:
        paid = await self._invoice_paid_amount(invoice.id)
        concession_q = await self.db.execute(
            select(func.coalesce(func.sum(FeeConcession.amount), 0)).where(
                FeeConcession.invoice_id == invoice.id,
                FeeConcession.status == "approved",
                FeeConcession.is_deleted == False,
            )
        )
        net_total = max(float(invoice.total_amount) - float(concession_q.scalar() or 0), 0)
        if getattr(invoice, "cancelled_at", None):
            invoice.status = "cancelled"
        elif paid <= 0:
            invoice.status = "unpaid"
        elif paid + 0.01 < net_total:
            invoice.status = "partial"
        else:
            invoice.status = "paid"

    async def _receipt_payload(self, payment: FeePayment, invoice: StudentFeeInvoice, student: User, college: Optional[College] = None, public: bool = False):
        payload = {
            "college_name": college.name if college else "AcadMix College",
            "receipt_no": payment.receipt_no,
            "invoice_no": invoice.invoice_no,
            "student_id": student.email,
            "student_name": student.name,
            "fee_head": invoice.fee_type,
            "academic_year": invoice.academic_year,
            "amount": payment.amount_paid,
            "payment_mode": payment.payment_mode,
            "paid_at": payment.transaction_date.isoformat() if payment.transaction_date else None,
            "verified": payment.status == "success",
        }
        if not public:
            payload["transaction_ref"] = payment.transaction_reference or ""
            payload["verification_token"] = payment.verification_token
        return payload

    async def _structure_payload(self, structure: FeeStructure, include_items: bool = True):
        items = []
        if include_items:
            item_rows = (await self.db.execute(
                select(FeeStructureItem)
                .where(
                    FeeStructureItem.structure_id == structure.id,
                    FeeStructureItem.is_deleted == False,
                )
                .order_by(FeeStructureItem.sort_order.asc(), FeeStructureItem.fee_head.asc())
            )).scalars().all()
            items = [
                {
                    "id": item.id,
                    "fee_head": item.fee_head,
                    "amount": item.amount,
                    "refundable": item.refundable,
                    "sort_order": item.sort_order,
                }
                for item in item_rows
            ]
        return {
            "id": structure.id,
            "name": structure.name,
            "academic_year": structure.academic_year,
            "program_id": structure.program_id,
            "department": structure.department or "",
            "batch": structure.batch or "",
            "category": structure.category or "",
            "due_date": structure.due_date.isoformat() if structure.due_date else None,
            "status": structure.status,
            "created_at": structure.created_at.isoformat() if structure.created_at else None,
            "item_count": len(items),
            "total_amount": sum(float(item["amount"] or 0) for item in items),
            "items": items,
        }

    async def get_student_due_fees(self, student_id: str, college_id: str) -> List[Dict[str, Any]]:
        invoices_query = await self.db.execute(
            select(StudentFeeInvoice).where(
                StudentFeeInvoice.student_id == student_id,
                StudentFeeInvoice.college_id == college_id,
                StudentFeeInvoice.is_deleted == False,
                StudentFeeInvoice.status != "cancelled",
            )
        )
        invoices = invoices_query.scalars().all()

        payments_query = await self.db.execute(
            select(FeePayment).where(
                FeePayment.student_id == student_id,
                FeePayment.college_id == college_id,
                FeePayment.is_deleted == False,
            )
        )
        payments = payments_query.scalars().all()
        concessions_query = await self.db.execute(
            select(FeeConcession).where(
                FeeConcession.student_id == student_id,
                FeeConcession.college_id == college_id,
                FeeConcession.status == "approved",
                FeeConcession.is_deleted == False,
            )
        )
        concessions = concessions_query.scalars().all()

        due_list = []
        for inv in invoices:
            paid = sum(p.amount_paid for p in payments if p.invoice_id == inv.id and p.status == "success")
            concession = sum(c.amount for c in concessions if c.invoice_id == inv.id)
            has_pending = any(p for p in payments if p.invoice_id == inv.id and p.status == "pending")
            net_total = max(float(inv.total_amount) - float(concession), 0)
            amount_remaining = net_total - float(paid)
            if amount_remaining > 0:
                due_list.append({
                    "invoice_id": inv.id,
                    "invoice_no": inv.invoice_no,
                    "fee_type": inv.fee_type,
                    "total_amount": inv.total_amount,
                    "amount_paid": paid,
                    "concession": concession,
                    "amount_due": amount_remaining,
                    "academic_year": inv.academic_year,
                    "due_date": inv.due_date.isoformat() if inv.due_date else None,
                    "status": "pending_gateway" if has_pending else (inv.status or "unpaid"),
                    "description": inv.description,
                })
        return due_list

    async def create_razorpay_order(self, student_id: str, college_id: str, invoice_id: str, amount_to_pay: float) -> Dict[str, Any]:
        invoice = await self.db.get(StudentFeeInvoice, invoice_id)
        if not invoice or invoice.college_id != college_id or invoice.student_id != student_id:
            raise ValueError("Invoice not found")
        amounts = await self._invoice_amounts(invoice)
        if amount_to_pay <= 0 or amount_to_pay > (amounts["due"] + 0.01):
            raise ValueError("Invalid payment amount")

        order_data = {
            "amount": int(amount_to_pay * 100),
            "currency": "INR",
            "receipt": f"receipt_{invoice_id[:8]}",
        }
        rzp_order = await run_in_threadpool(self.rzp_client.order.create, data=order_data)

        pending_payment = FeePayment(
            college_id=college_id,
            student_id=student_id,
            invoice_id=invoice_id,
            amount_paid=amount_to_pay,
            status="pending",
            payment_mode="razorpay",
            transaction_reference=rzp_order["id"],
        )
        self.db.add(pending_payment)
        await self.db.commit()

        return {"order_id": rzp_order["id"], "amount": rzp_order["amount"], "currency": rzp_order["currency"], "key_id": RAZORPAY_KEY_ID}

    async def verify_payment_signature(self, student_id: str, college_id: str, payload: dict) -> bool:
        try:
            await run_in_threadpool(
                self.rzp_client.utility.verify_payment_signature,
                {
                    "razorpay_order_id": payload.get("razorpay_order_id"),
                    "razorpay_payment_id": payload.get("razorpay_payment_id"),
                    "razorpay_signature": payload.get("razorpay_signature"),
                },
            )
            order_id = payload.get("razorpay_order_id")
            query = await self.db.execute(
                select(FeePayment).where(
                    FeePayment.transaction_reference == order_id,
                    FeePayment.student_id == student_id,
                    FeePayment.college_id == college_id,
                    FeePayment.status == "pending",
                ).with_for_update()
            )
            payment = query.scalars().first()
            if payment:
                payment.status = "success"
                payment.transaction_date = datetime.now(timezone.utc)
                payment.receipt_no = payment.receipt_no or await self._next_code(college_id, FeePayment, "receipt_no", "RCPT")
                payment.verification_token = payment.verification_token or str(uuid.uuid4())
                payment.transaction_reference = f"{order_id}::{payload.get('razorpay_payment_id')}"
                invoice = await self.db.get(StudentFeeInvoice, payment.invoice_id)
                if invoice:
                    await self._refresh_invoice_status(invoice)
                from app.services.audit_service import AuditService
                await AuditService.log_audit(
                    db=self.db,
                    college_id=college_id,
                    user_id=student_id,
                    action="FEE_RECORDED",
                    resource_type="fees",
                    resource_id=str(payment.id),
                    new_value={"amount": payment.amount_paid, "status": "success", "invoice_id": payment.invoice_id, "receipt_no": payment.receipt_no},
                    status="success",
                )
                await self.db.commit()
                return True
        except razorpay.errors.SignatureVerificationError:
            return False
        return False

    async def create_invoice_bulk(self, college_id: str, invoices_data: List[dict], created_by: Optional[str] = None):
        from app.services.audit_service import AuditService
        created = 0
        for data in invoices_data:
            inv = StudentFeeInvoice(
                college_id=college_id,
                student_id=data["student_id"],
                invoice_no=data.get("invoice_no") or await self._next_code(college_id, StudentFeeInvoice, "invoice_no", "INV"),
                fee_type=data["fee_type"],
                total_amount=float(data["total_amount"]),
                academic_year=data["academic_year"],
                due_date=data.get("due_date"),
                description=data.get("description"),
                status="unpaid",
                created_by=created_by,
            )
            self.db.add(inv)
            created += 1
        await self.db.flush()
        await AuditService.log_audit(
            db=self.db,
            college_id=college_id,
            user_id=created_by or "system_or_admin",
            action="FEE_CREATED",
            resource_type="fees",
            resource_id="bulk_create",
            new_value={"count": created},
            status="success",
        )
        await self.db.commit()
        return created

    async def cancel_invoice(self, college_id: str, user_id: str, invoice_id: str, reason: str = ""):
        invoice = await self.db.get(StudentFeeInvoice, invoice_id)
        if not invoice or invoice.college_id != college_id or invoice.is_deleted:
            raise HTTPException(status_code=404, detail="Invoice not found")
        paid = await self._invoice_paid_amount(invoice.id)
        if paid > 0:
            raise HTTPException(status_code=400, detail="Cannot cancel an invoice with successful payments")
        invoice.status = "cancelled"
        invoice.cancelled_by = user_id
        invoice.cancelled_at = datetime.now(timezone.utc)
        invoice.description = f"{invoice.description or ''}\nCancelled: {reason}".strip()
        await self.db.commit()
        return {"id": invoice.id, "status": invoice.status}

    async def get_payment_history(self, student_id: str, college_id: str) -> List[Dict[str, Any]]:
        payments_query = await self.db.execute(
            select(FeePayment).where(
                FeePayment.student_id == student_id,
                FeePayment.college_id == college_id,
                FeePayment.is_deleted == False,
            ).order_by(FeePayment.transaction_date.desc().nulls_last())
        )
        payments = payments_query.scalars().all()
        invoice_ids = list({p.invoice_id for p in payments if p.invoice_id})
        invoices_map = {}
        if invoice_ids:
            inv_query = await self.db.execute(select(StudentFeeInvoice).where(StudentFeeInvoice.id.in_(invoice_ids)))
            invoices_map = {inv.id: inv for inv in inv_query.scalars().all()}

        return [{
            "payment_id": str(p.id),
            "invoice_id": str(p.invoice_id) if p.invoice_id else None,
            "invoice_no": invoices_map.get(p.invoice_id).invoice_no if invoices_map.get(p.invoice_id) else "",
            "receipt_no": p.receipt_no,
            "verification_token": p.verification_token,
            "fee_type": invoices_map.get(p.invoice_id).fee_type if invoices_map.get(p.invoice_id) else "Fee Payment",
            "academic_year": invoices_map.get(p.invoice_id).academic_year if invoices_map.get(p.invoice_id) else "",
            "amount": p.amount_paid,
            "status": p.status,
            "payment_mode": p.payment_mode,
            "transaction_ref": p.transaction_reference or "",
            "paid_at": p.transaction_date.isoformat() if p.transaction_date else None,
        } for p in payments]

    async def finance_summary(self, college_id: str) -> Dict[str, Any]:
        active_invoice_filter = (
            StudentFeeInvoice.college_id == college_id,
            StudentFeeInvoice.is_deleted == False,
            StudentFeeInvoice.status != "cancelled",
        )
        invoice_total = await self.db.execute(select(func.coalesce(func.sum(StudentFeeInvoice.total_amount), 0)).where(*active_invoice_filter))
        collected = await self.db.execute(select(func.coalesce(func.sum(FeePayment.amount_paid), 0)).where(FeePayment.college_id == college_id, FeePayment.status == "success", FeePayment.is_deleted == False))
        concession_total = await self.db.execute(select(func.coalesce(func.sum(FeeConcession.amount), 0)).where(FeeConcession.college_id == college_id, FeeConcession.status == "approved", FeeConcession.is_deleted == False))
        invoice_count = await self.db.execute(select(func.count()).select_from(StudentFeeInvoice).where(*active_invoice_filter))
        status_rows = await self.db.execute(
            select(StudentFeeInvoice.status, func.count())
            .where(*active_invoice_filter)
            .group_by(StudentFeeInvoice.status)
        )
        overdue_count = await self.db.execute(
            select(func.count()).select_from(StudentFeeInvoice).where(
                *active_invoice_filter,
                StudentFeeInvoice.due_date.is_not(None),
                StudentFeeInvoice.due_date < datetime.now(timezone.utc),
                StudentFeeInvoice.status.in_(["unpaid", "partial", "overdue"]),
            )
        )
        students_with_dues = await self.db.execute(
            select(func.count(func.distinct(StudentFeeInvoice.student_id))).where(
                *active_invoice_filter,
                StudentFeeInvoice.status.in_(["unpaid", "partial", "overdue"]),
            )
        )
        pending_concessions = await self.db.execute(select(func.count()).select_from(FeeConcession).where(FeeConcession.college_id == college_id, FeeConcession.status == "pending", FeeConcession.is_deleted == False))
        pending_refunds = await self.db.execute(select(func.count()).select_from(FeeRefund).where(FeeRefund.college_id == college_id, FeeRefund.status == "pending", FeeRefund.is_deleted == False))
        total = float(invoice_total.scalar() or 0)
        paid = float(collected.scalar() or 0)
        concessions = float(concession_total.scalar() or 0)
        net_billed = max(total - concessions, 0)

        dept_expr = func.coalesce(UserProfile.department, "Unassigned")
        dept_rows = await self.db.execute(
            select(
                dept_expr.label("department"),
                func.coalesce(func.sum(StudentFeeInvoice.total_amount), 0).label("billed"),
                func.coalesce(func.sum(case((StudentFeeInvoice.status == "paid", StudentFeeInvoice.total_amount), else_=0)), 0).label("closed"),
                func.count(StudentFeeInvoice.id).label("invoice_count"),
            )
            .join(User, User.id == StudentFeeInvoice.student_id)
            .outerjoin(UserProfile, UserProfile.user_id == User.id)
            .where(*active_invoice_filter)
            .group_by(dept_expr)
            .order_by(func.coalesce(func.sum(StudentFeeInvoice.total_amount), 0).desc())
            .limit(8)
        )
        fee_rows = await self.db.execute(
            select(
                StudentFeeInvoice.fee_type,
                func.coalesce(func.sum(StudentFeeInvoice.total_amount), 0).label("billed"),
                func.count(StudentFeeInvoice.id).label("invoice_count"),
            )
            .where(*active_invoice_filter)
            .group_by(StudentFeeInvoice.fee_type)
            .order_by(func.coalesce(func.sum(StudentFeeInvoice.total_amount), 0).desc())
            .limit(8)
        )
        recent_rows = await self.db.execute(
            select(FeePayment, User, StudentFeeInvoice)
            .join(User, User.id == FeePayment.student_id)
            .join(StudentFeeInvoice, StudentFeeInvoice.id == FeePayment.invoice_id)
            .where(
                FeePayment.college_id == college_id,
                FeePayment.status == "success",
                FeePayment.receipt_no.is_not(None),
                FeePayment.receipt_no != "",
                FeePayment.verification_token.is_not(None),
                FeePayment.verification_token != "",
                FeePayment.is_deleted == False,
            )
            .order_by(FeePayment.transaction_date.desc().nulls_last())
            .limit(8)
        )
        return {
            "total_billed": total,
            "approved_concessions": concessions,
            "net_billed": net_billed,
            "total_collected": paid,
            "total_due": max(net_billed - paid, 0),
            "collection_rate": round((paid / net_billed) * 100, 2) if net_billed else 0,
            "invoice_count": int(invoice_count.scalar() or 0),
            "students_with_dues": int(students_with_dues.scalar() or 0),
            "overdue_invoices": int(overdue_count.scalar() or 0),
            "status_counts": {status or "unpaid": int(count or 0) for status, count in status_rows.all()},
            "pending_concessions": int(pending_concessions.scalar() or 0),
            "pending_refunds": int(pending_refunds.scalar() or 0),
            "by_department": [
                {"department": dept, "billed": float(billed or 0), "closed_amount": float(closed or 0), "invoice_count": int(count or 0)}
                for dept, billed, closed, count in dept_rows.all()
            ],
            "by_fee_type": [
                {"fee_type": fee_type, "billed": float(billed or 0), "invoice_count": int(count or 0)}
                for fee_type, billed, count in fee_rows.all()
            ],
            "recent_payments": [
                {
                    "payment_id": payment.id,
                    "receipt_no": payment.receipt_no,
                    "student_name": student.name,
                    "student_college_id": student.email,
                    "fee_type": invoice.fee_type,
                    "amount": payment.amount_paid,
                    "payment_mode": payment.payment_mode,
                    "paid_at": payment.transaction_date.isoformat() if payment.transaction_date else None,
                }
                for payment, student, invoice in recent_rows.all()
            ],
        }

    async def search_students(self, college_id: str, q: str = "", limit: int = 15):
        pattern = f"%{q.strip()}%"
        stmt = select(User, UserProfile).join(UserProfile, UserProfile.user_id == User.id, isouter=True).where(
            User.college_id == college_id,
            User.role == "student",
            User.is_deleted == False,
        )
        if q.strip():
            stmt = stmt.where(or_(User.name.ilike(pattern), User.email.ilike(pattern), UserProfile.roll_number.ilike(pattern)))
        res = await self.db.execute(stmt.limit(limit))
        rows = res.all()
        student_ids = [user.id for user, _ in rows]
        paid_by_student: Dict[str, float] = {}
        if student_ids:
            payment_rows = await self.db.execute(
                select(FeePayment.student_id, func.coalesce(func.sum(FeePayment.amount_paid), 0))
                .where(
                    FeePayment.college_id == college_id,
                    FeePayment.student_id.in_(student_ids),
                    FeePayment.status == "success",
                    FeePayment.is_deleted == False,
                )
                .group_by(FeePayment.student_id)
            )
            paid_by_student = {sid: float(total or 0) for sid, total in payment_rows.all()}
        invoice_rows = []
        if student_ids:
            invoice_rows = (await self.db.execute(
                select(StudentFeeInvoice)
                .where(
                    StudentFeeInvoice.college_id == college_id,
                    StudentFeeInvoice.student_id.in_(student_ids),
                    StudentFeeInvoice.is_deleted == False,
                    StudentFeeInvoice.status != "cancelled",
                )
            )).scalars().all()
        billed_by_student: Dict[str, float] = {}
        invoice_count_by_student: Dict[str, int] = {}
        due_invoice_count_by_student: Dict[str, int] = {}
        for inv in invoice_rows:
            billed_by_student[inv.student_id] = billed_by_student.get(inv.student_id, 0) + float(inv.total_amount or 0)
            invoice_count_by_student[inv.student_id] = invoice_count_by_student.get(inv.student_id, 0) + 1
            if (inv.status or "unpaid") in {"unpaid", "partial", "overdue"}:
                due_invoice_count_by_student[inv.student_id] = due_invoice_count_by_student.get(inv.student_id, 0) + 1
        return [
            {
                "id": user.id,
                "college_id": user.email,
                "name": user.name,
                "roll_number": profile.roll_number if profile else "",
                "department": profile.department if profile else "",
                "section": profile.section if profile else "",
                "batch": profile.batch if profile else "",
                "invoice_count": invoice_count_by_student.get(user.id, 0),
                "due_invoice_count": due_invoice_count_by_student.get(user.id, 0),
                "total_billed": billed_by_student.get(user.id, 0),
                "total_paid": paid_by_student.get(user.id, 0),
                "total_due": max(billed_by_student.get(user.id, 0) - paid_by_student.get(user.id, 0), 0),
            }
            for user, profile in rows
        ]

    async def student_ledger(self, college_id: str, student_id: str):
        user = await self.db.get(User, student_id)
        if not user or user.college_id != college_id:
            raise HTTPException(status_code=404, detail="Student not found")
        profile = (await self.db.execute(select(UserProfile).where(UserProfile.user_id == student_id))).scalars().first()
        invoices = (await self.db.execute(select(StudentFeeInvoice).where(StudentFeeInvoice.college_id == college_id, StudentFeeInvoice.student_id == student_id, StudentFeeInvoice.is_deleted == False).order_by(StudentFeeInvoice.due_date.asc().nulls_last(), StudentFeeInvoice.fee_type.asc()))).scalars().all()
        payments = (await self.db.execute(select(FeePayment).where(FeePayment.college_id == college_id, FeePayment.student_id == student_id, FeePayment.is_deleted == False).order_by(FeePayment.transaction_date.desc().nulls_last()))).scalars().all()
        concessions = (await self.db.execute(select(FeeConcession).where(FeeConcession.college_id == college_id, FeeConcession.student_id == student_id, FeeConcession.is_deleted == False).order_by(FeeConcession.created_at.desc()))).scalars().all()
        items = []
        total_due = 0.0
        total_paid = 0.0
        total_billed = 0.0
        total_concession = 0.0
        for inv in invoices:
            paid = sum(float(p.amount_paid) for p in payments if p.invoice_id == inv.id and p.status == "success")
            concession = sum(float(c.amount) for c in concessions if c.invoice_id == inv.id and c.status == "approved")
            net_total = max(float(inv.total_amount) - concession, 0)
            due = max(net_total - paid, 0)
            total_due += due
            total_paid += paid
            total_billed += float(inv.total_amount or 0)
            total_concession += concession
            if due <= 0 and (inv.status or "unpaid") != "paid":
                await self._refresh_invoice_status(inv)
            items.append({
                "invoice_id": inv.id,
                "invoice_no": inv.invoice_no or inv.id[:8].upper(),
                "fee_type": inv.fee_type,
                "academic_year": inv.academic_year,
                "total_amount": inv.total_amount,
                "concession": concession,
                "paid": paid,
                "net_total": net_total,
                "due": due,
                "status": inv.status,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
                "description": inv.description or "",
                "payments": [
                    {
                        "payment_id": p.id,
                        "receipt_no": p.receipt_no,
                        "amount": p.amount_paid,
                        "status": p.status,
                        "payment_mode": p.payment_mode,
                        "paid_at": p.transaction_date.isoformat() if p.transaction_date else None,
                        "transaction_ref": p.transaction_reference or "",
                    }
                    for p in payments if p.invoice_id == inv.id
                ],
                "concessions": [
                    {
                        "id": c.id,
                        "amount": c.amount,
                        "status": c.status,
                        "reason": c.reason,
                        "created_at": c.created_at.isoformat() if c.created_at else None,
                    }
                    for c in concessions if c.invoice_id == inv.id
                ],
            })
        await self.db.commit()
        return {
            "student": {
                "id": user.id,
                "college_id": user.email,
                "name": user.name,
                "roll_number": profile.roll_number if profile else "",
                "department": profile.department if profile else "",
                "section": profile.section if profile else "",
                "batch": profile.batch if profile else "",
            },
            "summary": {
                "total_billed": total_billed,
                "total_concession": total_concession,
                "total_paid": total_paid,
                "total_due": total_due,
                "invoice_count": len(items),
                "due_invoice_count": len([x for x in items if x["due"] > 0]),
            },
            "invoices": items,
            "payments": [
                {
                    "payment_id": p.id,
                    "invoice_id": p.invoice_id,
                    "receipt_no": p.receipt_no,
                    "amount": p.amount_paid,
                    "status": p.status,
                    "payment_mode": p.payment_mode,
                    "paid_at": p.transaction_date.isoformat() if p.transaction_date else None,
                    "transaction_ref": p.transaction_reference or "",
                }
                for p in payments
            ],
        }

    async def create_fee_structure(self, college_id: str, user_id: str, data: dict):
        structure = FeeStructure(college_id=college_id, created_by=user_id, **data)
        self.db.add(structure)
        await self.db.commit()
        await self.db.refresh(structure)
        return await self._structure_payload(structure)

    async def list_fee_structures(self, college_id: str, status: Optional[str] = None):
        stmt = select(FeeStructure).where(FeeStructure.college_id == college_id, FeeStructure.is_deleted == False)
        if status:
            stmt = stmt.where(FeeStructure.status == status)
        stmt = stmt.order_by(FeeStructure.created_at.desc().nulls_last(), FeeStructure.name.asc())
        rows = (await self.db.execute(stmt)).scalars().all()
        return [await self._structure_payload(row) for row in rows]

    async def update_fee_structure(self, college_id: str, structure_id: str, data: dict):
        structure = await self.db.get(FeeStructure, structure_id)
        if not structure or structure.college_id != college_id or structure.is_deleted:
            raise HTTPException(status_code=404, detail="Fee structure not found")
        for field in ("name", "academic_year", "program_id", "department", "batch", "category", "due_date", "status"):
            if field in data:
                setattr(structure, field, data[field])
        await self.db.commit()
        await self.db.refresh(structure)
        return await self._structure_payload(structure)

    async def delete_fee_structure(self, college_id: str, structure_id: str):
        structure = await self.db.get(FeeStructure, structure_id)
        if not structure or structure.college_id != college_id or structure.is_deleted:
            raise HTTPException(status_code=404, detail="Fee structure not found")
        structure.is_deleted = True
        structure.status = "archived"
        await self.db.commit()
        return {"id": structure.id, "status": "archived"}

    async def add_fee_structure_item(self, college_id: str, structure_id: str, data: dict):
        structure = await self.db.get(FeeStructure, structure_id)
        if not structure or structure.college_id != college_id:
            raise HTTPException(status_code=404, detail="Fee structure not found")
        item = FeeStructureItem(college_id=college_id, structure_id=structure_id, **data)
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return {"id": item.id, "fee_head": item.fee_head, "amount": item.amount}

    async def allocation_targets(
        self,
        college_id: str,
        structure_id: Optional[str] = None,
        department: str = "",
        batch: str = "",
        section: str = "",
        q: str = "",
        limit: int = 200,
    ):
        if structure_id:
            structure = await self.db.get(FeeStructure, structure_id)
            if not structure or structure.college_id != college_id or structure.is_deleted:
                raise HTTPException(status_code=404, detail="Fee structure not found")
            department = department or structure.department or ""
            batch = batch or structure.batch or ""
        stmt = (
            select(User, UserProfile)
            .join(UserProfile, UserProfile.user_id == User.id, isouter=True)
            .where(User.college_id == college_id, User.role == "student", User.is_deleted == False)
        )
        if department.strip():
            stmt = stmt.where(UserProfile.department.ilike(department.strip()))
        if batch.strip():
            stmt = stmt.where(UserProfile.batch.ilike(batch.strip()))
        if section.strip():
            stmt = stmt.where(UserProfile.section.ilike(section.strip()))
        if q.strip():
            pattern = f"%{q.strip()}%"
            stmt = stmt.where(or_(User.name.ilike(pattern), User.email.ilike(pattern), UserProfile.roll_number.ilike(pattern)))
        rows = (await self.db.execute(stmt.order_by(UserProfile.department.asc(), UserProfile.batch.asc(), User.name.asc()).limit(limit))).all()
        return [
            {
                "id": user.id,
                "name": user.name,
                "college_id": user.email,
                "roll_number": profile.roll_number if profile else "",
                "department": profile.department if profile else "",
                "section": profile.section if profile else "",
                "batch": profile.batch if profile else "",
            }
            for user, profile in rows
        ]

    async def generate_allocations(self, college_id: str, user_id: str, structure_id: str, student_ids: List[str]):
        structure = await self.db.get(FeeStructure, structure_id)
        if not structure or structure.college_id != college_id:
            raise HTTPException(status_code=404, detail="Fee structure not found")
        items = (await self.db.execute(select(FeeStructureItem).where(FeeStructureItem.structure_id == structure_id, FeeStructureItem.is_deleted == False).order_by(FeeStructureItem.sort_order))).scalars().all()
        if not items:
            raise HTTPException(status_code=400, detail="Add fee heads before allocation")
        invoices = []
        skipped = 0
        for sid in student_ids:
            existing = (await self.db.execute(
                select(StudentFeeInvoice.id).where(
                    StudentFeeInvoice.college_id == college_id,
                    StudentFeeInvoice.student_id == sid,
                    StudentFeeInvoice.fee_type == structure.name,
                    StudentFeeInvoice.academic_year == structure.academic_year,
                    StudentFeeInvoice.status != "cancelled",
                    StudentFeeInvoice.is_deleted == False,
                ).limit(1)
            )).scalar()
            if existing:
                skipped += 1
                continue
            total = sum(float(item.amount) for item in items)
            heads = ", ".join(item.fee_head for item in items)
            invoices.append({
                "student_id": sid,
                "fee_type": structure.name,
                "total_amount": total,
                "academic_year": structure.academic_year,
                "due_date": structure.due_date,
                "description": heads,
            })
        created = await self.create_invoice_bulk(college_id, invoices, created_by=user_id)
        return {"created": created, "skipped": skipped}

    async def create_concession(self, college_id: str, user_id: str, data: dict):
        row = FeeConcession(college_id=college_id, requested_by=user_id, **data)
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        return {"id": row.id, "status": row.status}

    async def finance_work_queue(self, college_id: str):
        concession_rows = (await self.db.execute(
            select(FeeConcession, User, StudentFeeInvoice)
            .join(User, User.id == FeeConcession.student_id)
            .join(StudentFeeInvoice, StudentFeeInvoice.id == FeeConcession.invoice_id)
            .where(FeeConcession.college_id == college_id, FeeConcession.is_deleted == False, FeeConcession.status == "pending")
            .order_by(FeeConcession.created_at.asc().nulls_first())
            .limit(50)
        )).all()
        refund_rows = (await self.db.execute(
            select(FeeRefund, User, StudentFeeInvoice, FeePayment)
            .join(User, User.id == FeeRefund.student_id)
            .join(StudentFeeInvoice, StudentFeeInvoice.id == FeeRefund.invoice_id)
            .outerjoin(FeePayment, FeePayment.id == FeeRefund.payment_id)
            .where(FeeRefund.college_id == college_id, FeeRefund.is_deleted == False, FeeRefund.status == "pending")
            .order_by(FeeRefund.created_at.asc().nulls_first())
            .limit(50)
        )).all()
        return {
            "concessions": [
                {
                    "id": row.id,
                    "student_name": student.name,
                    "student_college_id": student.email,
                    "invoice_no": invoice.invoice_no or invoice.id[:8].upper(),
                    "fee_type": invoice.fee_type,
                    "amount": row.amount,
                    "reason": row.reason,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                }
                for row, student, invoice in concession_rows
            ],
            "refunds": [
                {
                    "id": row.id,
                    "student_name": student.name,
                    "student_college_id": student.email,
                    "invoice_no": invoice.invoice_no or invoice.id[:8].upper(),
                    "receipt_no": payment.receipt_no if payment else "",
                    "fee_type": invoice.fee_type,
                    "amount": row.amount,
                    "reason": row.reason,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                }
                for row, student, invoice, payment in refund_rows
            ],
        }

    async def review_concession(self, college_id: str, user_id: str, concession_id: str, status: str, notes: str = ""):
        row = await self.db.get(FeeConcession, concession_id)
        if not row or row.college_id != college_id:
            raise HTTPException(status_code=404, detail="Concession not found")
        row.status = status
        row.approved_by = user_id
        row.approved_at = datetime.now(timezone.utc)
        row.notes = notes
        if status == "approved":
            invoice = await self.db.get(StudentFeeInvoice, row.invoice_id)
            if invoice:
                await self._refresh_invoice_status(invoice)
        await self.db.commit()
        return {"id": row.id, "status": row.status}

    async def create_refund(self, college_id: str, user_id: str, data: dict):
        row = FeeRefund(college_id=college_id, requested_by=user_id, **data)
        self.db.add(row)
        await self.db.commit()
        await self.db.refresh(row)
        return {"id": row.id, "status": row.status}

    async def review_refund(self, college_id: str, user_id: str, refund_id: str, status: str, notes: str = ""):
        row = await self.db.get(FeeRefund, refund_id)
        if not row or row.college_id != college_id:
            raise HTTPException(status_code=404, detail="Refund not found")
        row.status = status
        row.processed_by = user_id
        row.processed_at = datetime.now(timezone.utc)
        row.notes = notes
        await self.db.commit()
        return {"id": row.id, "status": row.status}

    async def current_cashier_session(self, college_id: str, cashier_id: str):
        res = await self.db.execute(select(CashierSession).where(CashierSession.college_id == college_id, CashierSession.cashier_id == cashier_id, CashierSession.status == "open", CashierSession.is_deleted == False).order_by(CashierSession.opened_at.desc()))
        session = res.scalars().first()
        return session

    async def open_cashier_session(self, college_id: str, cashier_id: str, opening_cash: float = 0.0):
        current = await self.current_cashier_session(college_id, cashier_id)
        if current:
            return {"id": current.id, "status": current.status, "opening_cash": current.opening_cash}
        session = CashierSession(college_id=college_id, cashier_id=cashier_id, opening_cash=opening_cash, expected_cash=opening_cash, status="open")
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return {"id": session.id, "status": session.status, "opening_cash": session.opening_cash}

    async def close_cashier_session(self, college_id: str, cashier_id: str, actual_cash: float, notes: str = ""):
        session = await self.current_cashier_session(college_id, cashier_id)
        if not session:
            raise HTTPException(status_code=400, detail="No open cashier session")
        totals = await self.day_close(college_id, cashier_id)
        session.expected_cash = float(session.opening_cash or 0) + float(totals["by_mode"].get("cash", 0))
        session.actual_cash = actual_cash
        session.notes = notes
        session.status = "closed"
        session.closed_at = datetime.now(timezone.utc)
        await self.db.commit()
        return {"id": session.id, "status": session.status, "expected_cash": session.expected_cash, "actual_cash": session.actual_cash}

    async def collect_offline_payment(self, college_id: str, cashier_id: str, data: dict):
        session = await self.current_cashier_session(college_id, cashier_id)
        if not session:
            raise HTTPException(status_code=400, detail="Open a cashier session before collecting fees")
        mode = data.get("payment_mode", "cash")
        if mode not in PAYMENT_MODES or mode == "razorpay":
            raise HTTPException(status_code=400, detail="Invalid cashier payment mode")
        invoice = await self.db.get(StudentFeeInvoice, data["invoice_id"])
        if not invoice or invoice.college_id != college_id:
            raise HTTPException(status_code=404, detail="Invoice not found")
        amounts = await self._invoice_amounts(invoice)
        amount = float(data["amount"])
        if amount <= 0 or amount > (amounts["due"] + 0.01):
            raise HTTPException(status_code=400, detail="Invalid collection amount")
        payment = FeePayment(
            college_id=college_id,
            student_id=invoice.student_id,
            invoice_id=invoice.id,
            amount_paid=amount,
            status="success",
            transaction_date=datetime.now(timezone.utc),
            transaction_reference=data.get("transaction_reference") or f"OFFLINE-{uuid.uuid4().hex[:10].upper()}",
            receipt_no=await self._next_code(college_id, FeePayment, "receipt_no", "RCPT"),
            payment_mode=mode,
            collected_by=cashier_id,
            cashier_session_id=session.id,
            verification_token=str(uuid.uuid4()),
            remarks=data.get("remarks"),
            received_from=data.get("received_from"),
        )
        self.db.add(payment)
        await self._refresh_invoice_status(invoice)
        if mode == "cash":
            session.expected_cash = float(session.expected_cash or 0) + amount
        from app.services.audit_service import AuditService
        await AuditService.log_audit(
            db=self.db,
            college_id=college_id,
            user_id=cashier_id,
            action="CASHIER_COLLECTION",
            resource_type="fees",
            resource_id=invoice.id,
            new_value={"amount": amount, "mode": mode, "receipt_no": payment.receipt_no},
        )
        await self.db.commit()
        await self.db.refresh(payment)
        return await self.get_receipt(college_id, payment.receipt_no)

    async def day_close(self, college_id: str, cashier_id: str):
        session = await self.current_cashier_session(college_id, cashier_id)
        if not session:
            return {"session": None, "total": 0, "by_mode": {}, "count": 0}
        payments = (await self.db.execute(select(FeePayment).where(FeePayment.college_id == college_id, FeePayment.cashier_session_id == session.id, FeePayment.status == "success", FeePayment.is_deleted == False))).scalars().all()
        by_mode: Dict[str, float] = {}
        for p in payments:
            by_mode[p.payment_mode] = by_mode.get(p.payment_mode, 0) + float(p.amount_paid)
        return {
            "session": {"id": session.id, "opened_at": session.opened_at.isoformat() if session.opened_at else None, "opening_cash": session.opening_cash},
            "total": sum(by_mode.values()),
            "by_mode": by_mode,
            "count": len(payments),
        }

    async def cashier_session_history(self, college_id: str, cashier_id: Optional[str] = None, limit: int = 20):
        stmt = select(CashierSession, User).join(User, User.id == CashierSession.cashier_id).where(
            CashierSession.college_id == college_id,
            CashierSession.is_deleted == False,
        )
        if cashier_id:
            stmt = stmt.where(CashierSession.cashier_id == cashier_id)
        rows = (await self.db.execute(stmt.order_by(CashierSession.opened_at.desc()).limit(limit))).all()
        sessions = []
        for session, cashier in rows:
            payments = (await self.db.execute(select(FeePayment).where(FeePayment.cashier_session_id == session.id, FeePayment.status == "success", FeePayment.is_deleted == False))).scalars().all()
            by_mode: Dict[str, float] = {}
            for payment in payments:
                by_mode[payment.payment_mode] = by_mode.get(payment.payment_mode, 0) + float(payment.amount_paid)
            sessions.append({
                "id": session.id,
                "cashier_name": cashier.name,
                "status": session.status,
                "opened_at": session.opened_at.isoformat() if session.opened_at else None,
                "closed_at": session.closed_at.isoformat() if session.closed_at else None,
                "opening_cash": session.opening_cash,
                "expected_cash": session.expected_cash,
                "actual_cash": session.actual_cash,
                "total_collected": sum(by_mode.values()),
                "by_mode": by_mode,
                "count": len(payments),
            })
        return sessions

    async def get_receipt(self, college_id: str, receipt_no: str):
        payment = (await self.db.execute(select(FeePayment).where(FeePayment.college_id == college_id, FeePayment.receipt_no == receipt_no, FeePayment.is_deleted == False))).scalars().first()
        if not payment:
            raise HTTPException(status_code=404, detail="Receipt not found")
        invoice = await self.db.get(StudentFeeInvoice, payment.invoice_id)
        student = await self.db.get(User, payment.student_id)
        college = await self.db.get(College, college_id)
        return await self._receipt_payload(payment, invoice, student, college)

    async def search_receipts(self, college_id: str, q: str = "", limit: int = 20):
        stmt = (
            select(FeePayment, StudentFeeInvoice, User)
            .join(StudentFeeInvoice, StudentFeeInvoice.id == FeePayment.invoice_id)
            .join(User, User.id == FeePayment.student_id)
            .where(
                FeePayment.college_id == college_id,
                FeePayment.status == "success",
                FeePayment.receipt_no.is_not(None),
                FeePayment.receipt_no != "",
                FeePayment.verification_token.is_not(None),
                FeePayment.verification_token != "",
                FeePayment.is_deleted == False,
            )
        )
        if q.strip():
            pattern = f"%{q.strip()}%"
            stmt = stmt.where(or_(
                FeePayment.receipt_no.ilike(pattern),
                FeePayment.transaction_reference.ilike(pattern),
                User.name.ilike(pattern),
                User.email.ilike(pattern),
                StudentFeeInvoice.fee_type.ilike(pattern),
                StudentFeeInvoice.invoice_no.ilike(pattern),
            ))
        rows = (await self.db.execute(stmt.order_by(FeePayment.transaction_date.desc().nulls_last()).limit(limit))).all()
        return [
            {
                "payment_id": payment.id,
                "receipt_no": payment.receipt_no,
                "invoice_no": invoice.invoice_no or invoice.id[:8].upper(),
                "student_name": student.name,
                "student_college_id": student.email,
                "fee_type": invoice.fee_type,
                "amount": payment.amount_paid,
                "payment_mode": payment.payment_mode,
                "paid_at": payment.transaction_date.isoformat() if payment.transaction_date else None,
                "verification_token": payment.verification_token,
            }
            for payment, invoice, student in rows
        ]

    async def finance_reports(self, college_id: str, from_date: Optional[datetime] = None, to_date: Optional[datetime] = None):
        payment_filters = [
            FeePayment.college_id == college_id,
            FeePayment.status == "success",
            FeePayment.is_deleted == False,
        ]
        if from_date:
            payment_filters.append(FeePayment.transaction_date >= from_date)
        if to_date:
            payment_filters.append(FeePayment.transaction_date <= to_date)

        total_row = (await self.db.execute(
            select(func.coalesce(func.sum(FeePayment.amount_paid), 0), func.count(FeePayment.id)).where(*payment_filters)
        )).one()
        mode_rows = (await self.db.execute(
            select(FeePayment.payment_mode, func.coalesce(func.sum(FeePayment.amount_paid), 0))
            .where(*payment_filters)
            .group_by(FeePayment.payment_mode)
        )).all()
        fee_head_rows = (await self.db.execute(
            select(StudentFeeInvoice.fee_type, func.coalesce(func.sum(FeePayment.amount_paid), 0))
            .join(StudentFeeInvoice, StudentFeeInvoice.id == FeePayment.invoice_id)
            .where(*payment_filters)
            .group_by(StudentFeeInvoice.fee_type)
        )).all()
        cashier_rows = (await self.db.execute(
            select(User.name, func.coalesce(func.sum(FeePayment.amount_paid), 0))
            .join(User, User.id == FeePayment.collected_by)
            .where(*payment_filters, FeePayment.collected_by.is_not(None))
            .group_by(User.name)
        )).all()
        recent_rows = (await self.db.execute(
            select(FeePayment, StudentFeeInvoice, User)
            .join(StudentFeeInvoice, StudentFeeInvoice.id == FeePayment.invoice_id)
            .join(User, User.id == FeePayment.student_id)
            .where(*payment_filters)
            .order_by(FeePayment.transaction_date.desc().nulls_last())
            .limit(20)
        )).all()

        by_mode = {mode: float(total or 0) for mode, total in mode_rows}
        by_fee_head = {fee_head: float(total or 0) for fee_head, total in fee_head_rows}
        by_cashier = {cashier_name: float(total or 0) for cashier_name, total in cashier_rows}
        recent_collections = []
        for payment, invoice, student in recent_rows:
            amount = float(payment.amount_paid or 0)
            recent_collections.append({
                "receipt_no": payment.receipt_no,
                "student_name": student.name,
                "student_college_id": student.email,
                "fee_type": invoice.fee_type,
                "amount": amount,
                "payment_mode": payment.payment_mode,
                "paid_at": payment.transaction_date.isoformat() if payment.transaction_date else None,
            })

        invoice_rows = (await self.db.execute(
            select(StudentFeeInvoice, User)
            .join(User, User.id == StudentFeeInvoice.student_id)
            .where(
                StudentFeeInvoice.college_id == college_id,
                StudentFeeInvoice.status != "cancelled",
                StudentFeeInvoice.is_deleted == False,
            )
            .order_by(StudentFeeInvoice.due_date.asc().nulls_last(), User.name.asc())
            .limit(1000)
        )).all()
        invoice_ids = [invoice.id for invoice, _ in invoice_rows]
        paid_by_invoice: Dict[str, float] = {}
        concession_by_invoice: Dict[str, float] = {}
        if invoice_ids:
            paid_rows = (await self.db.execute(
                select(FeePayment.invoice_id, func.coalesce(func.sum(FeePayment.amount_paid), 0))
                .where(
                    FeePayment.college_id == college_id,
                    FeePayment.invoice_id.in_(invoice_ids),
                    FeePayment.status == "success",
                    FeePayment.is_deleted == False,
                )
                .group_by(FeePayment.invoice_id)
            )).all()
            paid_by_invoice = {invoice_id: float(total or 0) for invoice_id, total in paid_rows}
            concession_totals = (await self.db.execute(
                select(FeeConcession.invoice_id, func.coalesce(func.sum(FeeConcession.amount), 0))
                .where(
                    FeeConcession.college_id == college_id,
                    FeeConcession.invoice_id.in_(invoice_ids),
                    FeeConcession.status == "approved",
                    FeeConcession.is_deleted == False,
                )
                .group_by(FeeConcession.invoice_id)
            )).all()
            concession_by_invoice = {invoice_id: float(total or 0) for invoice_id, total in concession_totals}
        now = datetime.now(timezone.utc)
        total_due = 0.0
        overdue_due = 0.0
        due_count = 0
        overdue_count = 0
        defaulters = []
        for invoice, student in invoice_rows:
            net_total = max(float(invoice.total_amount or 0) - concession_by_invoice.get(invoice.id, 0), 0)
            due = max(net_total - paid_by_invoice.get(invoice.id, 0), 0)
            if due <= 0:
                continue
            due_date = invoice.due_date
            if due_date and due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            is_overdue = bool(due_date and due_date < now)
            total_due += due
            due_count += 1
            if is_overdue:
                overdue_due += due
                overdue_count += 1
            defaulters.append({
                "student_name": student.name,
                "student_college_id": student.email,
                "invoice_no": invoice.invoice_no or invoice.id[:8].upper(),
                "fee_type": invoice.fee_type,
                "due": due,
                "due_date": invoice.due_date.isoformat() if invoice.due_date else None,
                "overdue": is_overdue,
            })

        concession_rows = (await self.db.execute(
            select(FeeConcession).where(FeeConcession.college_id == college_id, FeeConcession.is_deleted == False)
        )).scalars().all()
        refund_rows = (await self.db.execute(
            select(FeeRefund).where(FeeRefund.college_id == college_id, FeeRefund.is_deleted == False)
        )).scalars().all()

        def by_status(rows):
            out: Dict[str, Dict[str, float]] = {}
            for row in rows:
                bucket = out.setdefault(row.status, {"count": 0, "amount": 0.0})
                bucket["count"] += 1
                bucket["amount"] += float(row.amount or 0)
            return out

        return {
            "collection": {
                "total": float(total_row[0] or 0),
                "count": int(total_row[1] or 0),
                "by_mode": by_mode,
                "by_fee_head": by_fee_head,
                "by_cashier": by_cashier,
                "recent": recent_collections,
            },
            "dues": {
                "total_due": total_due,
                "overdue_due": overdue_due,
                "invoice_count": due_count,
                "overdue_count": overdue_count,
                "defaulters": sorted(defaulters, key=lambda row: row["due"], reverse=True)[:30],
            },
            "adjustments": {
                "concessions": by_status(concession_rows),
                "refunds": by_status(refund_rows),
            },
        }

    async def verify_receipt(self, token: str):
        payment = (await self.db.execute(select(FeePayment).where(FeePayment.verification_token == token, FeePayment.status == "success", FeePayment.is_deleted == False))).scalars().first()
        if not payment:
            raise HTTPException(status_code=404, detail="Receipt verification failed")
        invoice = await self.db.get(StudentFeeInvoice, payment.invoice_id)
        student = await self.db.get(User, payment.student_id)
        college = await self.db.get(College, payment.college_id)
        return await self._receipt_payload(payment, invoice, student, college, public=True)
