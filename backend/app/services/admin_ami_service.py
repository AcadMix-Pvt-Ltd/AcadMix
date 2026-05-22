from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app import models


ERP_MODULES = [
    {"id": "admissions", "name": "Admissions CRM", "status": "beta", "entities": ["enquiries", "applications", "documents", "offers"]},
    {"id": "student_lifecycle", "name": "Student Lifecycle", "status": "production", "entities": ["students", "profiles", "sections", "certificates"]},
    {"id": "academics", "name": "Academics", "status": "production", "entities": ["timetable", "syllabus", "attendance", "mentoring"]},
    {"id": "exams", "name": "Exams", "status": "production", "entities": ["cia", "hall tickets", "valuation", "results"]},
    {"id": "finance", "name": "Finance", "status": "production", "entities": ["fees", "invoices", "receipts", "cashier", "reports"]},
    {"id": "hrms", "name": "HRMS", "status": "beta", "entities": ["staff", "leave", "payroll", "payslips", "appraisal"]},
    {"id": "hostel", "name": "Hostel", "status": "beta", "entities": ["rooms", "beds", "gatepasses", "mess billing"]},
    {"id": "transport", "name": "Transport", "status": "beta", "entities": ["routes", "passes", "drivers", "trip logs"]},
    {"id": "library", "name": "Library", "status": "demo", "entities": ["catalog", "copies", "checkout", "fines"]},
    {"id": "inventory", "name": "Inventory & Procurement", "status": "demo", "entities": ["vendors", "PO", "GRN", "assets"]},
    {"id": "communication", "name": "Communication", "status": "demo", "entities": ["announcements", "messages", "notification center"]},
    {"id": "placement", "name": "Placement & Career", "status": "production", "entities": ["drives", "applications", "interviews", "offers"]},
    {"id": "alumni", "name": "Alumni & Industry", "status": "beta", "entities": ["alumni", "mentors", "events", "MOUs"]},
    {"id": "accreditation", "name": "Accreditation", "status": "beta", "entities": ["NAAC", "NBA", "NIRF", "OBE"]},
    {"id": "governance", "name": "Governance", "status": "beta", "entities": ["approvals", "audit logs", "tasks", "compliance"]},
    {"id": "ami", "name": "Ami AI Layer", "status": "beta", "entities": ["context map", "queries", "citations", "action previews"]},
]

SAFE_ACTIONS = [
    {"id": "draft_notice", "name": "Draft notice", "mutation": False},
    {"id": "fee_reminder_preview", "name": "Prepare fee reminder list", "mutation": False},
    {"id": "attendance_defaulter_preview", "name": "Prepare attendance defaulter list", "mutation": False},
    {"id": "placement_readiness_preview", "name": "Prepare placement readiness list", "mutation": False},
]


async def _role_counts(session: AsyncSession, college_id: str) -> list[dict[str, Any]]:
    result = await session.execute(
        select(models.User.role, func.count(models.User.id))
        .where(models.User.college_id == college_id)
        .group_by(models.User.role)
    )
    return [{"role": role or "unknown", "count": count} for role, count in result.all()]


async def get_context_map(user: dict, session: AsyncSession) -> dict:
    role_counts = await _role_counts(session, user["college_id"])
    return {
        "college_id": user["college_id"],
        "role": user.get("role"),
        "modules": ERP_MODULES,
        "searchable_entities": sorted({entity for module in ERP_MODULES for entity in module["entities"]}),
        "permissions": {
            "read": [module["id"] for module in ERP_MODULES],
            "action_preview": [action["id"] for action in SAFE_ACTIONS],
            "direct_write": [],
        },
        "safe_actions": SAFE_ACTIONS,
        "snapshots": {"user_roles": role_counts},
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


async def answer_query(message: str, user: dict, session: AsyncSession) -> dict:
    text = (message or "").strip().lower()
    role_counts = await _role_counts(session, user["college_id"])
    total_users = sum(item["count"] for item in role_counts)
    production = [m for m in ERP_MODULES if m["status"] == "production"]
    beta = [m for m in ERP_MODULES if m["status"] == "beta"]
    demo = [m for m in ERP_MODULES if m["status"] == "demo"]

    if any(key in text for key in ["module", "coverage", "roadmap", "erp"]):
        answer = (
            f"AcadMix currently maps {len(ERP_MODULES)} ERP modules: "
            f"{len(production)} production, {len(beta)} beta, and {len(demo)} demo. "
            "The next highest leverage gaps are inventory/procurement, communication center, "
            "library depth, admissions CRM depth, and governance approvals."
        )
        table = [{"module": m["name"], "status": m["status"], "entities": ", ".join(m["entities"])} for m in ERP_MODULES]
    elif any(key in text for key in ["student", "staff", "role", "count"]):
        answer = f"I found {total_users} active user records grouped by role for this college."
        table = role_counts
    else:
        answer = (
            "Ami Admin is in read-only copilot mode. I can summarize ERP coverage, role/user counts, "
            "module readiness, and produce draft action previews. Direct writes are intentionally disabled."
        )
        table = [{"metric": "total_users", "value": total_users}, {"metric": "modules", "value": len(ERP_MODULES)}]

    return {
        "answer": answer,
        "confidence": 0.82,
        "provenance": [
            {"source": "models.User", "scope": "college_id", "mode": "aggregate"},
            {"source": "admin_ami_service.ERP_MODULES", "scope": "static readiness map", "mode": "curated"},
        ],
        "tables": [{"title": "Result", "rows": table}],
        "charts": [],
        "suggested_actions": SAFE_ACTIONS[:3],
        "guardrails": ["read_only", "college_scoped", "no_direct_mutations"],
    }


async def preview_action(action: str, payload: dict, user: dict, session: AsyncSession) -> dict:
    allowed = {item["id"] for item in SAFE_ACTIONS}
    if action not in allowed:
        return {
            "allowed": False,
            "reason": "This action is not in the current safe-preview allowlist.",
            "safe_actions": SAFE_ACTIONS,
        }

    role_counts = await _role_counts(session, user["college_id"])
    return {
        "allowed": True,
        "mutation": False,
        "action": action,
        "draft": {
            "title": payload.get("title") or action.replace("_", " ").title(),
            "audience": payload.get("audience") or "selected users",
            "summary": payload.get("summary") or "Draft prepared for admin review. Nothing has been sent or changed.",
            "college_id": user["college_id"],
        },
        "preview_data": {"role_counts": role_counts},
        "audit": {
            "requested_by": user.get("id"),
            "requested_role": user.get("role"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    }
