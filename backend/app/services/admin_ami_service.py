"""
Admin Ami Service - read-only copilot foundation.

This is intentionally conservative: it exposes a context map, safe aggregate
answers, and action previews without mutating production data.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app import models


ERP_MODULES: List[Dict[str, Any]] = [
    {"id": "admissions", "name": "Admissions CRM", "status": "beta", "entities": ["enquiries", "applications", "documents", "offers"]},
    {"id": "student_lifecycle", "name": "Student Lifecycle", "status": "production", "entities": ["students", "profiles", "sections", "certificates"]},
    {"id": "academics", "name": "Academics", "status": "production", "entities": ["attendance", "timetable", "syllabus", "outcomes"]},
    {"id": "exams", "name": "Exams", "status": "production", "entities": ["cia", "marks", "hall_tickets", "results"]},
    {"id": "finance", "name": "Finance", "status": "production", "entities": ["fees", "invoices", "receipts", "concessions", "refunds"]},
    {"id": "hrms", "name": "HRMS", "status": "beta", "entities": ["staff", "salary_structures", "payroll_runs", "payslips"]},
    {"id": "hostel", "name": "Hostel", "status": "production", "entities": ["buildings", "rooms", "beds", "allocations", "gatepasses"]},
    {"id": "transport", "name": "Transport", "status": "production", "entities": ["routes", "enrollments", "devices", "trips"]},
    {"id": "library", "name": "Library", "status": "production", "entities": ["books", "copies", "issues", "fines", "reservations"]},
    {"id": "inventory", "name": "Inventory & Procurement", "status": "planned", "entities": ["vendors", "purchase_requests", "assets", "stock"]},
    {"id": "communication", "name": "Communication", "status": "beta", "entities": ["announcements", "notifications", "messages"]},
    {"id": "placement", "name": "Placement & Career", "status": "production", "entities": ["companies", "drives", "applications", "offers"]},
    {"id": "alumni_industry", "name": "Alumni & Industry", "status": "beta", "entities": ["alumni", "mentors", "mous", "feedback"]},
    {"id": "accreditation", "name": "Accreditation", "status": "beta", "entities": ["naac", "nba", "obe", "evidence"]},
    {"id": "governance", "name": "Governance", "status": "beta", "entities": ["approvals", "audit_logs", "tasks", "compliance"]},
    {"id": "ami", "name": "Ami AI Layer", "status": "beta", "entities": ["queries", "pinned_insights", "action_previews"]},
]


SAFE_ACTIONS = [
    {"id": "draft_notice", "label": "Draft notice", "mutation": False},
    {"id": "fee_reminder_preview", "label": "Preview fee reminder list", "mutation": False},
    {"id": "attendance_defaulter_preview", "label": "Preview attendance defaulters", "mutation": False},
    {"id": "placement_readiness_preview", "label": "Preview placement readiness gaps", "mutation": False},
]


async def get_context_map(user: dict, session: AsyncSession) -> Dict[str, Any]:
    college_id = user["college_id"]
    total_users = await _count(session, models.User, models.User.college_id == college_id)
    students = await _count(session, models.User, models.User.college_id == college_id, models.User.role == "student")
    faculty = await _count(session, models.User, models.User.college_id == college_id, models.User.role.in_(["teacher", "faculty", "hod"]))

    return {
        "role": user.get("role"),
        "college_id": college_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "modules": ERP_MODULES,
        "permissions": {
            "read": [m["id"] for m in ERP_MODULES],
            "preview_actions": [a["id"] for a in SAFE_ACTIONS],
            "write_actions": [],
        },
        "safe_actions": SAFE_ACTIONS,
        "health": {
            "total_users": total_users,
            "students": students,
            "faculty": faculty,
            "module_coverage": {
                "production": len([m for m in ERP_MODULES if m["status"] == "production"]),
                "beta": len([m for m in ERP_MODULES if m["status"] == "beta"]),
                "planned": len([m for m in ERP_MODULES if m["status"] == "planned"]),
            },
        },
    }


async def answer_query(message: str, user: dict, session: AsyncSession) -> Dict[str, Any]:
    context = await get_context_map(user, session)
    msg = (message or "").lower()
    rows: List[Dict[str, Any]] = []
    answer = "Ami can currently answer read-only admin questions using safe aggregates. Try asking about modules, students, finance, HR, hostel, transport, library, or placement."
    confidence = 0.68

    if "module" in msg or "erp" in msg or "coverage" in msg:
        rows = [
            {"module": m["name"], "status": m["status"], "entities": ", ".join(m["entities"][:4])}
            for m in ERP_MODULES
        ]
        answer = "AcadMix is organized into 16 ERP modules. Production areas are strongest today; beta/planned areas are the next implementation targets."
        confidence = 0.92
    elif "student" in msg or "faculty" in msg or "staff" in msg:
        rows = [
            {"metric": "Students", "value": context["health"]["students"]},
            {"metric": "Faculty/HOD", "value": context["health"]["faculty"]},
            {"metric": "Total users", "value": context["health"]["total_users"]},
        ]
        answer = "Here is the current user composition available to Admin Ami from the tenant database."
        confidence = 0.86
    elif "finance" in msg or "fee" in msg or "cashier" in msg:
        rows = [
            {"queue": "Fee structures", "status": "available in Finance"},
            {"queue": "Cashier session", "status": "available in Cashier Counter"},
            {"queue": "Concessions/refunds", "status": "available for review workflow"},
        ]
        answer = "Finance and cashier workflows are available. This read-only response avoids exposing receipt-level data until a narrower query and permission check are implemented."
        confidence = 0.76
    elif "placement" in msg or "career" in msg or "company" in msg:
        rows = [
            {"area": "Placement drives", "status": "available"},
            {"area": "Resume ATS", "status": "available"},
            {"area": "Mock interviews", "status": "being upgraded"},
            {"area": "Company Intel", "status": "v2 enabled"},
        ]
        answer = "Placement and career workflows are a strong AcadMix wedge: drives, ATS, interviews, and Company Intel are connected under one student account."
        confidence = 0.83

    return {
        "answer": answer,
        "confidence": confidence,
        "tables": [{"title": "Ami read-only result", "rows": rows}] if rows else [],
        "charts": [],
        "provenance": [
            "Admin Ami read-only context map",
            "Tenant-scoped aggregate counts",
            "No production mutation performed",
        ],
        "suggested_actions": SAFE_ACTIONS[:3],
    }


async def preview_action(action: str, payload: dict, user: dict, session: AsyncSession) -> Dict[str, Any]:
    action_map = {a["id"]: a for a in SAFE_ACTIONS}
    action_meta = action_map.get(action) or SAFE_ACTIONS[0]
    return {
        "action": action_meta,
        "status": "preview_only",
        "mutation_performed": False,
        "title": action_meta["label"],
        "draft": _draft_for_action(action_meta["id"], payload or {}, user),
        "requires_confirmation": True,
        "audit_note": "Generated by Admin Ami preview endpoint. No database writes were performed.",
    }


async def _count(session: AsyncSession, model: Any, *criteria: Any) -> int:
    result = await session.execute(select(func.count(model.id)).where(*criteria))
    return int(result.scalar() or 0)


def _draft_for_action(action: str, payload: dict, user: dict) -> str:
    if action == "fee_reminder_preview":
        return "Draft reminder: Dear student/parent, your pending fee balance requires attention. Please clear dues or contact the finance office for assistance."
    if action == "attendance_defaulter_preview":
        return "Draft notice: Students below attendance threshold should meet their mentor/HOD and submit improvement plans before the next review."
    if action == "placement_readiness_preview":
        return "Draft action plan: Students missing resume, ATS score, or mock interview attempts should complete Career Toolkit readiness steps this week."
    return f"Draft notice prepared by {user.get('name') or 'Admin'}: {payload.get('message') or 'Please review the attached college update.'}"
