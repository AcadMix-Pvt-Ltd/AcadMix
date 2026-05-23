from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from app.core.security import require_role
from app.services.hr_payroll_service import HRPayrollService


router = APIRouter(prefix="/hr-payroll")

HR_PAYROLL_ROLES = ("admin", "principal", "director", "finance_officer", "hr", "hr_manager")


def get_hr_payroll_service(session: AsyncSession = Depends(get_db)):
    return HRPayrollService(session)


class StaffProfilePayload(BaseModel):
    user_id: str
    employee_code: str
    department: Optional[str] = ""
    designation: Optional[str] = ""
    employment_type: str = "full_time"
    joining_date: Optional[date] = None
    bank_account: Optional[str] = ""
    ifsc: Optional[str] = ""
    pan: Optional[str] = ""
    pf_number: Optional[str] = ""
    esi_number: Optional[str] = ""
    status: str = "active"


class SalaryStructurePayload(BaseModel):
    basic: float = Field(0, ge=0)
    hra: float = Field(0, ge=0)
    da: float = Field(0, ge=0)
    allowances: float = Field(0, ge=0)
    pf: float = Field(0, ge=0)
    esi: float = Field(0, ge=0)
    tds: float = Field(0, ge=0)
    other_deductions: float = Field(0, ge=0)
    effective_from: Optional[date] = None


class PayrollGeneratePayload(BaseModel):
    month: str


@router.get("/summary")
async def hr_payroll_summary(
    user: dict = Depends(require_role(*HR_PAYROLL_ROLES)),
    svc: HRPayrollService = Depends(get_hr_payroll_service),
):
    return await svc.summary(user["college_id"])


@router.get("/staff/search")
async def search_staff(
    q: str = Query("", max_length=120),
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(require_role(*HR_PAYROLL_ROLES)),
    svc: HRPayrollService = Depends(get_hr_payroll_service),
):
    return await svc.search_staff(user["college_id"], q, limit)


@router.post("/staff")
async def upsert_staff_profile(
    payload: StaffProfilePayload,
    user: dict = Depends(require_role(*HR_PAYROLL_ROLES)),
    svc: HRPayrollService = Depends(get_hr_payroll_service),
):
    return await svc.upsert_staff_profile(user["college_id"], payload.model_dump())


@router.post("/staff/{staff_id}/salary")
async def upsert_salary_structure(
    staff_id: str,
    payload: SalaryStructurePayload,
    user: dict = Depends(require_role(*HR_PAYROLL_ROLES)),
    svc: HRPayrollService = Depends(get_hr_payroll_service),
):
    return await svc.upsert_salary_structure(user["college_id"], staff_id, payload.model_dump())


@router.get("/runs")
async def list_payroll_runs(
    limit: int = Query(12, ge=1, le=50),
    user: dict = Depends(require_role(*HR_PAYROLL_ROLES)),
    svc: HRPayrollService = Depends(get_hr_payroll_service),
):
    return await svc.list_payroll_runs(user["college_id"], limit)


@router.post("/runs/generate")
async def generate_payroll_run(
    payload: PayrollGeneratePayload,
    user: dict = Depends(require_role(*HR_PAYROLL_ROLES)),
    svc: HRPayrollService = Depends(get_hr_payroll_service),
):
    return await svc.generate_payroll(user["college_id"], user["id"], payload.month)


@router.get("/runs/{run_id}")
async def get_payroll_run(
    run_id: str,
    user: dict = Depends(require_role(*HR_PAYROLL_ROLES)),
    svc: HRPayrollService = Depends(get_hr_payroll_service),
):
    return await svc.get_payroll_run(user["college_id"], run_id)


@router.post("/runs/{run_id}/lock")
async def lock_payroll_run(
    run_id: str,
    user: dict = Depends(require_role(*HR_PAYROLL_ROLES)),
    svc: HRPayrollService = Depends(get_hr_payroll_service),
):
    return await svc.lock_payroll_run(user["college_id"], user["id"], run_id)


@router.get("/payslips/{payslip_id}")
async def get_payslip(
    payslip_id: str,
    user: dict = Depends(require_role(*HR_PAYROLL_ROLES)),
    svc: HRPayrollService = Depends(get_hr_payroll_service),
):
    return await svc.get_payslip(user["college_id"], payslip_id)
