from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from database import get_db
from app.core.security import require_role
from app.services.fees_service import FeesService
from app import models
from pydantic import BaseModel, Field

router = APIRouter()


def get_fees_service(session: AsyncSession = Depends(get_db)):
    return FeesService(session)


async def _resolve_student_id(user: dict, student_id: Optional[str], session: AsyncSession) -> str:
    if user["role"] == "parent":
        if not student_id:
            raise HTTPException(status_code=400, detail="student_id query parameter is required for parent role")
        link_r = await session.execute(
            select(models.ParentStudentLink).where(
                models.ParentStudentLink.parent_id == user["id"],
                models.ParentStudentLink.student_id == student_id,
                models.ParentStudentLink.college_id == user["college_id"],
            )
        )
        if not link_r.scalars().first():
            raise HTTPException(status_code=403, detail="Unverified parent-student relationship")
        return student_id
    return user["id"]


FINANCE_ROLES = ("admin", "principal", "director", "finance_officer")
FINANCE_FULL_ROLES = ("admin", "principal", "director", "finance_officer")
CASHIER_ROLES = ("cashier", "admin", "principal", "director", "finance_officer")


class CreateOrderPayload(BaseModel):
    invoice_id: str
    amount_to_pay: float = Field(..., gt=0, le=1_000_000)
    student_id: Optional[str] = None


class VerifyPaymentPayload(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    student_id: Optional[str] = None


class BulkInvoicePayload(BaseModel):
    invoices: List[dict]


class FeeStructurePayload(BaseModel):
    name: str
    academic_year: str
    program_id: Optional[str] = None
    department: Optional[str] = None
    batch: Optional[str] = None
    category: Optional[str] = None
    due_date: Optional[datetime] = None
    status: str = "active"


class FeeStructureItemPayload(BaseModel):
    fee_head: str
    amount: float = Field(..., gt=0)
    refundable: bool = False
    sort_order: int = 0


class AllocationPayload(BaseModel):
    structure_id: str
    student_ids: List[str]


class AllocationFilterPayload(BaseModel):
    structure_id: Optional[str] = None
    department: str = ""
    batch: str = ""
    section: str = ""
    q: str = ""


class ConcessionPayload(BaseModel):
    student_id: str
    invoice_id: str
    amount: float = Field(..., gt=0)
    reason: str


class ReviewPayload(BaseModel):
    status: str
    notes: str = ""


class RefundPayload(BaseModel):
    student_id: str
    invoice_id: str
    payment_id: Optional[str] = None
    amount: float = Field(..., gt=0)
    reason: str


class OpenSessionPayload(BaseModel):
    opening_cash: float = Field(0, ge=0)


class CloseSessionPayload(BaseModel):
    actual_cash: float = Field(..., ge=0)
    notes: str = ""


class CollectionPayload(BaseModel):
    invoice_id: str
    amount: float = Field(..., gt=0)
    payment_mode: str = "cash"
    transaction_reference: Optional[str] = None
    received_from: Optional[str] = None
    remarks: Optional[str] = None


class CancelInvoicePayload(BaseModel):
    reason: str = ""


class ReceiptActionPayload(BaseModel):
    reason: str = ""


@router.get("/fees/due")
async def get_my_due_fees(
    student_id: Optional[str] = Query(None, description="Required for parent role"),
    user: dict = Depends(require_role("student", "parent")),
    svc: FeesService = Depends(get_fees_service),
    session: AsyncSession = Depends(get_db),
):
    sid = await _resolve_student_id(user, student_id, session)
    return await svc.get_student_due_fees(sid, user["college_id"])


@router.get("/fees/history")
async def get_payment_history(
    student_id: Optional[str] = Query(None, description="Required for parent role"),
    user: dict = Depends(require_role("student", "parent")),
    svc: FeesService = Depends(get_fees_service),
    session: AsyncSession = Depends(get_db),
):
    sid = await _resolve_student_id(user, student_id, session)
    return await svc.get_payment_history(sid, user["college_id"])


@router.post("/fees/create-order")
async def create_fee_order(
    payload: CreateOrderPayload,
    user: dict = Depends(require_role("student", "parent")),
    svc: FeesService = Depends(get_fees_service),
    session: AsyncSession = Depends(get_db),
):
    try:
        sid = await _resolve_student_id(user, payload.student_id, session)
        data = await svc.create_razorpay_order(
            student_id=sid,
            college_id=user["college_id"],
            invoice_id=payload.invoice_id,
            amount_to_pay=payload.amount_to_pay,
        )
        return {"success": True, "order": data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/fees/verify-payment")
async def verify_fee_payment(
    payload: VerifyPaymentPayload,
    user: dict = Depends(require_role("student", "parent")),
    svc: FeesService = Depends(get_fees_service),
    session: AsyncSession = Depends(get_db),
):
    sid = await _resolve_student_id(user, payload.student_id, session)
    is_valid = await svc.verify_payment_signature(
        student_id=sid,
        college_id=user["college_id"],
        payload=payload.model_dump(),
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    return {"success": True, "message": "Payment verified successfully"}


@router.get("/fees/receipts/verify/{token}")
async def verify_public_receipt(token: str, svc: FeesService = Depends(get_fees_service)):
    return await svc.verify_receipt(token)


@router.get("/fees/receipts/{receipt_no}")
async def get_receipt(
    receipt_no: str,
    user: dict = Depends(require_role("student", "parent", "cashier", "finance_officer", "admin", "principal", "director")),
    svc: FeesService = Depends(get_fees_service),
):
    receipt = await svc.get_receipt(user["college_id"], receipt_no)
    if user["role"] in ("student", "parent") and receipt["student_id"] != user["email"]:
        raise HTTPException(status_code=403, detail="Receipt belongs to another student")
    return receipt


@router.post("/admin/fees/invoices/bulk")
async def create_bulk_invoices(
    payload: BulkInvoicePayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    created = await svc.create_invoice_bulk(user["college_id"], payload.invoices, created_by=user["id"])
    return {"success": True, "created": created}


@router.get("/finance/summary")
async def finance_summary(user: dict = Depends(require_role(*FINANCE_ROLES)), svc: FeesService = Depends(get_fees_service)):
    return await svc.finance_summary(user["college_id"])


@router.get("/finance/students/search")
async def finance_student_search(
    q: str = "",
    academic_year: Optional[str] = None,
    batch: Optional[str] = None,
    semester: Optional[int] = None,
    department: Optional[str] = None,
    section: Optional[str] = None,
    limit: int = Query(15, ge=1, le=100),
    offset: int = Query(0, ge=0),
    paginated: bool = False,
    user: dict = Depends(require_role(*CASHIER_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.search_students(
        user["college_id"],
        q,
        limit,
        offset,
        paginated,
        academic_year,
        batch,
        semester,
        department,
        section,
    )


@router.get("/finance/students/{student_id}/ledger")
async def finance_student_ledger(
    student_id: str,
    academic_year: Optional[str] = None,
    user: dict = Depends(require_role(*CASHIER_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.student_ledger(user["college_id"], student_id, academic_year)


@router.post("/finance/invoices/{invoice_id}/cancel")
async def cancel_invoice(
    invoice_id: str,
    payload: CancelInvoicePayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.cancel_invoice(user["college_id"], user["id"], invoice_id, payload.reason)


@router.get("/finance/fee-structures")
async def list_fee_structures(
    status: Optional[str] = None,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.list_fee_structures(user["college_id"], status)


@router.post("/finance/fee-structures")
async def create_fee_structure(
    payload: FeeStructurePayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.create_fee_structure(user["college_id"], user["id"], payload.model_dump())


@router.put("/finance/fee-structures/{structure_id}")
async def update_fee_structure(
    structure_id: str,
    payload: FeeStructurePayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.update_fee_structure(user["college_id"], structure_id, payload.model_dump())


@router.delete("/finance/fee-structures/{structure_id}")
async def delete_fee_structure(
    structure_id: str,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.delete_fee_structure(user["college_id"], structure_id)


@router.post("/finance/fee-structures/{structure_id}/items")
async def add_fee_structure_item(
    structure_id: str,
    payload: FeeStructureItemPayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.add_fee_structure_item(user["college_id"], structure_id, payload.model_dump())


@router.post("/finance/allocations/targets")
async def allocation_targets(
    payload: AllocationFilterPayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.allocation_targets(user["college_id"], payload.structure_id, payload.department, payload.batch, payload.section, payload.q)


@router.post("/finance/allocations/generate")
async def generate_fee_allocations(
    payload: AllocationPayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.generate_allocations(user["college_id"], user["id"], payload.structure_id, payload.student_ids)


@router.get("/finance/work-queue")
async def finance_work_queue(user: dict = Depends(require_role(*FINANCE_FULL_ROLES)), svc: FeesService = Depends(get_fees_service)):
    return await svc.finance_work_queue(user["college_id"])


@router.get("/finance/receipts/search")
async def finance_receipt_search(
    q: str = "",
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.search_receipts(user["college_id"], q, limit)


@router.post("/finance/receipts/{receipt_no}/cancel")
async def finance_cancel_receipt(
    receipt_no: str,
    payload: ReceiptActionPayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.cancel_receipt(user["college_id"], user["id"], receipt_no, payload.reason)


@router.post("/finance/receipts/{receipt_no}/reissue")
async def finance_reissue_receipt(
    receipt_no: str,
    payload: ReceiptActionPayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.reissue_receipt(user["college_id"], user["id"], receipt_no, payload.reason)


@router.post("/finance/receipts/{receipt_no}/print")
async def finance_record_receipt_print(
    receipt_no: str,
    user: dict = Depends(require_role("cashier", *FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.record_receipt_print(user["college_id"], user["id"], receipt_no)


@router.get("/finance/reports")
async def finance_reports(
    from_date: Optional[datetime] = None,
    to_date: Optional[datetime] = None,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.finance_reports(user["college_id"], from_date, to_date)


@router.post("/finance/concessions")
async def create_concession(
    payload: ConcessionPayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.create_concession(user["college_id"], user["id"], payload.model_dump())


@router.put("/finance/concessions/{concession_id}/review")
async def review_concession(
    concession_id: str,
    payload: ReviewPayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    if payload.status not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="status must be approved or rejected")
    return await svc.review_concession(user["college_id"], user["id"], concession_id, payload.status, payload.notes)


@router.post("/finance/refunds")
async def create_refund(
    payload: RefundPayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    return await svc.create_refund(user["college_id"], user["id"], payload.model_dump())


@router.put("/finance/refunds/{refund_id}/review")
async def review_refund(
    refund_id: str,
    payload: ReviewPayload,
    user: dict = Depends(require_role(*FINANCE_FULL_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    if payload.status not in {"approved", "rejected", "processed"}:
        raise HTTPException(status_code=400, detail="Invalid refund status")
    return await svc.review_refund(user["college_id"], user["id"], refund_id, payload.status, payload.notes)


@router.get("/cashier/sessions/current")
async def current_cashier_session(user: dict = Depends(require_role(*CASHIER_ROLES)), svc: FeesService = Depends(get_fees_service)):
    session = await svc.current_cashier_session(user["college_id"], user["id"])
    if not session:
        return {"session": None}
    return {"session": {"id": session.id, "status": session.status, "opened_at": session.opened_at.isoformat() if session.opened_at else None, "opening_cash": session.opening_cash, "expected_cash": session.expected_cash}}


@router.post("/cashier/sessions/open")
async def open_cashier_session(payload: OpenSessionPayload, user: dict = Depends(require_role(*CASHIER_ROLES)), svc: FeesService = Depends(get_fees_service)):
    return await svc.open_cashier_session(user["college_id"], user["id"], payload.opening_cash)


@router.post("/cashier/sessions/close")
async def close_cashier_session(payload: CloseSessionPayload, user: dict = Depends(require_role(*CASHIER_ROLES)), svc: FeesService = Depends(get_fees_service)):
    return await svc.close_cashier_session(user["college_id"], user["id"], payload.actual_cash, payload.notes)


@router.post("/cashier/collections")
async def collect_cashier_fee(payload: CollectionPayload, user: dict = Depends(require_role(*CASHIER_ROLES)), svc: FeesService = Depends(get_fees_service)):
    return await svc.collect_offline_payment(user["college_id"], user["id"], payload.model_dump())


@router.get("/cashier/day-close")
async def cashier_day_close(user: dict = Depends(require_role(*CASHIER_ROLES)), svc: FeesService = Depends(get_fees_service)):
    return await svc.day_close(user["college_id"], user["id"])


@router.get("/cashier/sessions/history")
async def cashier_session_history(
    limit: int = Query(20, ge=1, le=100),
    user: dict = Depends(require_role(*CASHIER_ROLES)),
    svc: FeesService = Depends(get_fees_service),
):
    cashier_id = user["id"] if user["role"] == "cashier" else None
    return await svc.cashier_session_history(user["college_id"], cashier_id, limit)
