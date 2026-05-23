from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import models


STAFF_ROLES = (
    "teacher",
    "faculty",
    "hod",
    "admin",
    "principal",
    "director",
    "exam_cell",
    "tp_officer",
    "librarian",
    "warden",
    "security",
    "transport_admin",
    "finance_officer",
    "cashier",
    "nodal_officer",
    "expert",
    "retired_faculty",
)


def _amount(value: Any) -> float:
    try:
        return round(float(value or 0), 2)
    except (TypeError, ValueError):
        return 0.0


class HRPayrollService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def _latest_salary(self, college_id: str, staff_id: str) -> Optional[models.SalaryStructure]:
        result = await self.session.execute(
            select(models.SalaryStructure)
            .where(
                models.SalaryStructure.college_id == college_id,
                models.SalaryStructure.staff_id == staff_id,
                models.SalaryStructure.status == "active",
                models.SalaryStructure.is_deleted == False,  # noqa: E712
            )
            .order_by(models.SalaryStructure.created_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    def _salary_payload(self, salary: Optional[models.SalaryStructure]) -> Optional[Dict[str, Any]]:
        if not salary:
            return None
        gross = _amount(salary.basic + salary.hra + salary.da + salary.allowances)
        deductions = _amount(salary.pf + salary.esi + salary.tds + salary.other_deductions)
        return {
            "id": salary.id,
            "basic": _amount(salary.basic),
            "hra": _amount(salary.hra),
            "da": _amount(salary.da),
            "allowances": _amount(salary.allowances),
            "pf": _amount(salary.pf),
            "esi": _amount(salary.esi),
            "tds": _amount(salary.tds),
            "other_deductions": _amount(salary.other_deductions),
            "gross": gross,
            "deductions": deductions,
            "net": _amount(gross - deductions),
            "effective_from": salary.effective_from.isoformat() if salary.effective_from else None,
            "status": salary.status,
        }

    def _staff_payload(
        self,
        user: models.User,
        staff: Optional[models.StaffProfile],
        salary: Optional[models.SalaryStructure] = None,
    ) -> Dict[str, Any]:
        profile = user.profile_data or {}
        return {
            "id": staff.id if staff else None,
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "employee_code": staff.employee_code if staff else "",
            "department": (staff.department if staff else None) or profile.get("department") or "",
            "designation": staff.designation if staff else "",
            "employment_type": staff.employment_type if staff else "full_time",
            "joining_date": staff.joining_date.isoformat() if staff and staff.joining_date else None,
            "bank_account": staff.bank_account if staff else "",
            "ifsc": staff.ifsc if staff else "",
            "pan": staff.pan if staff else "",
            "pf_number": staff.pf_number if staff else "",
            "esi_number": staff.esi_number if staff else "",
            "status": staff.status if staff else "not_onboarded",
            "salary": self._salary_payload(salary),
        }

    async def summary(self, college_id: str) -> Dict[str, Any]:
        staff_count = (
            await self.session.execute(
                select(func.count(models.StaffProfile.id)).where(
                    models.StaffProfile.college_id == college_id,
                    models.StaffProfile.status == "active",
                    models.StaffProfile.is_deleted == False,  # noqa: E712
                )
            )
        ).scalar() or 0

        salary_rows = (
            await self.session.execute(
                select(models.SalaryStructure).where(
                    models.SalaryStructure.college_id == college_id,
                    models.SalaryStructure.status == "active",
                    models.SalaryStructure.is_deleted == False,  # noqa: E712
                )
            )
        ).scalars().all()
        gross = sum(_amount(s.basic + s.hra + s.da + s.allowances) for s in salary_rows)
        deductions = sum(_amount(s.pf + s.esi + s.tds + s.other_deductions) for s in salary_rows)

        latest_run = (
            await self.session.execute(
                select(models.PayrollRun)
                .where(
                    models.PayrollRun.college_id == college_id,
                    models.PayrollRun.is_deleted == False,  # noqa: E712
                )
                .order_by(models.PayrollRun.generated_at.desc())
                .limit(1)
            )
        ).scalars().first()

        draft_runs = (
            await self.session.execute(
                select(func.count(models.PayrollRun.id)).where(
                    models.PayrollRun.college_id == college_id,
                    models.PayrollRun.status == "draft",
                    models.PayrollRun.is_deleted == False,  # noqa: E712
                )
            )
        ).scalar() or 0

        return {
            "active_staff": staff_count,
            "configured_salaries": len(salary_rows),
            "monthly_gross": _amount(gross),
            "monthly_deductions": _amount(deductions),
            "monthly_net": _amount(gross - deductions),
            "draft_runs": draft_runs,
            "latest_run": self._run_payload(latest_run) if latest_run else None,
        }

    async def search_staff(self, college_id: str, q: str = "", limit: int = 50) -> List[Dict[str, Any]]:
        term = f"%{q.strip()}%"
        user_filters = [
            models.User.college_id == college_id,
            models.User.role.in_(STAFF_ROLES),
            models.User.is_deleted == False,  # noqa: E712
        ]
        if q.strip():
            user_filters.append(
                or_(
                    models.User.name.ilike(term),
                    models.User.email.ilike(term),
                    models.User.role.ilike(term),
                )
            )

        users = (
            await self.session.execute(
                select(models.User)
                .where(*user_filters)
                .order_by(models.User.name.asc())
                .limit(max(1, min(limit, 100)))
            )
        ).scalars().unique().all()

        payloads: List[Dict[str, Any]] = []
        for user in users:
            staff = (
                await self.session.execute(
                    select(models.StaffProfile).where(
                        models.StaffProfile.college_id == college_id,
                        models.StaffProfile.user_id == user.id,
                        models.StaffProfile.is_deleted == False,  # noqa: E712
                    )
                )
            ).scalars().first()
            salary = await self._latest_salary(college_id, staff.id) if staff else None
            payloads.append(self._staff_payload(user, staff, salary))
        return payloads

    async def upsert_staff_profile(self, college_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        user_id = data.get("user_id")
        employee_code = (data.get("employee_code") or "").strip()
        if not user_id or not employee_code:
            raise HTTPException(status_code=400, detail="user_id and employee_code are required")

        user = (
            await self.session.execute(
                select(models.User).where(
                    models.User.id == user_id,
                    models.User.college_id == college_id,
                    models.User.is_deleted == False,  # noqa: E712
                )
            )
        ).scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="Staff user not found")

        existing_by_code = (
            await self.session.execute(
                select(models.StaffProfile).where(
                    models.StaffProfile.college_id == college_id,
                    models.StaffProfile.employee_code == employee_code,
                    models.StaffProfile.user_id != user_id,
                    models.StaffProfile.is_deleted == False,  # noqa: E712
                )
            )
        ).scalars().first()
        if existing_by_code:
            raise HTTPException(status_code=409, detail="Employee code is already assigned")

        staff = (
            await self.session.execute(
                select(models.StaffProfile).where(
                    models.StaffProfile.college_id == college_id,
                    models.StaffProfile.user_id == user_id,
                    models.StaffProfile.is_deleted == False,  # noqa: E712
                )
            )
        ).scalars().first()
        if not staff:
            staff = models.StaffProfile(college_id=college_id, user_id=user_id, employee_code=employee_code)
            self.session.add(staff)

        for field in (
            "employee_code",
            "department",
            "designation",
            "employment_type",
            "joining_date",
            "bank_account",
            "ifsc",
            "pan",
            "pf_number",
            "esi_number",
            "status",
        ):
            if field in data:
                setattr(staff, field, data[field])

        await self.session.commit()
        await self.session.refresh(staff)
        salary = await self._latest_salary(college_id, staff.id)
        return self._staff_payload(user, staff, salary)

    async def upsert_salary_structure(self, college_id: str, staff_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        staff, user = await self._get_staff_with_user(college_id, staff_id)
        existing = await self._latest_salary(college_id, staff.id)
        if existing:
            existing.status = "archived"

        salary = models.SalaryStructure(
            college_id=college_id,
            staff_id=staff.id,
            basic=_amount(data.get("basic")),
            hra=_amount(data.get("hra")),
            da=_amount(data.get("da")),
            allowances=_amount(data.get("allowances")),
            pf=_amount(data.get("pf")),
            esi=_amount(data.get("esi")),
            tds=_amount(data.get("tds")),
            other_deductions=_amount(data.get("other_deductions")),
            effective_from=data.get("effective_from") or date.today(),
            status="active",
        )
        self.session.add(salary)
        await self.session.commit()
        await self.session.refresh(salary)
        return self._staff_payload(user, staff, salary)

    async def generate_payroll(self, college_id: str, user_id: str, month: str) -> Dict[str, Any]:
        if not month or len(month) != 7:
            raise HTTPException(status_code=400, detail="month must be in YYYY-MM format")

        run = (
            await self.session.execute(
                select(models.PayrollRun).where(
                    models.PayrollRun.college_id == college_id,
                    models.PayrollRun.month == month,
                    models.PayrollRun.is_deleted == False,  # noqa: E712
                )
            )
        ).scalars().first()
        if run and run.status == "locked":
            raise HTTPException(status_code=409, detail="Payroll run is locked")
        if not run:
            run = models.PayrollRun(college_id=college_id, month=month, generated_by=user_id, status="draft")
            self.session.add(run)
            await self.session.flush()
        else:
            run.generated_by = user_id
            run.generated_at = datetime.now(timezone.utc)

        staff_rows = (
            await self.session.execute(
                select(models.StaffProfile, models.User)
                .join(models.User, models.User.id == models.StaffProfile.user_id)
                .where(
                    models.StaffProfile.college_id == college_id,
                    models.StaffProfile.status == "active",
                    models.StaffProfile.is_deleted == False,  # noqa: E712
                )
                .order_by(models.User.name.asc())
            )
        ).all()

        for staff, _user in staff_rows:
            salary = await self._latest_salary(college_id, staff.id)
            if not salary:
                continue
            gross = _amount(salary.basic + salary.hra + salary.da + salary.allowances)
            deductions = _amount(salary.pf + salary.esi + salary.tds + salary.other_deductions)
            existing = (
                await self.session.execute(
                    select(models.Payslip).where(
                        models.Payslip.college_id == college_id,
                        models.Payslip.run_id == run.id,
                        models.Payslip.staff_id == staff.id,
                        models.Payslip.is_deleted == False,  # noqa: E712
                    )
                )
            ).scalars().first()
            if not existing:
                existing = models.Payslip(college_id=college_id, run_id=run.id, staff_id=staff.id)
                self.session.add(existing)
            existing.gross_pay = gross
            existing.deductions = deductions
            existing.net_pay = _amount(gross - deductions)
            existing.status = "draft"
            existing.components = {
                "earnings": {
                    "basic": _amount(salary.basic),
                    "hra": _amount(salary.hra),
                    "da": _amount(salary.da),
                    "allowances": _amount(salary.allowances),
                },
                "deductions": {
                    "pf": _amount(salary.pf),
                    "esi": _amount(salary.esi),
                    "tds": _amount(salary.tds),
                    "other": _amount(salary.other_deductions),
                },
            }

        await self.session.commit()
        await self.session.refresh(run)
        return await self.get_payroll_run(college_id, run.id)

    async def list_payroll_runs(self, college_id: str, limit: int = 12) -> List[Dict[str, Any]]:
        runs = (
            await self.session.execute(
                select(models.PayrollRun)
                .where(
                    models.PayrollRun.college_id == college_id,
                    models.PayrollRun.is_deleted == False,  # noqa: E712
                )
                .order_by(models.PayrollRun.generated_at.desc())
                .limit(max(1, min(limit, 50)))
            )
        ).scalars().all()
        return [await self._run_with_totals(run) for run in runs]

    async def get_payroll_run(self, college_id: str, run_id: str) -> Dict[str, Any]:
        run = await self._get_run(college_id, run_id)
        payload = await self._run_with_totals(run)
        slips = (
            await self.session.execute(
                select(models.Payslip, models.StaffProfile, models.User)
                .join(models.StaffProfile, models.StaffProfile.id == models.Payslip.staff_id)
                .join(models.User, models.User.id == models.StaffProfile.user_id)
                .where(
                    models.Payslip.college_id == college_id,
                    models.Payslip.run_id == run.id,
                    models.Payslip.is_deleted == False,  # noqa: E712
                )
                .order_by(models.User.name.asc())
            )
        ).all()
        payload["payslips"] = [self._payslip_payload(slip, staff, user, run) for slip, staff, user in slips]
        return payload

    async def lock_payroll_run(self, college_id: str, user_id: str, run_id: str) -> Dict[str, Any]:
        run = await self._get_run(college_id, run_id)
        if run.status == "locked":
            return await self.get_payroll_run(college_id, run.id)
        slips = (
            await self.session.execute(
                select(models.Payslip).where(
                    models.Payslip.college_id == college_id,
                    models.Payslip.run_id == run.id,
                    models.Payslip.is_deleted == False,  # noqa: E712
                )
            )
        ).scalars().all()
        if not slips:
            raise HTTPException(status_code=400, detail="Cannot lock an empty payroll run")
        run.status = "locked"
        run.locked_by = user_id
        run.locked_at = datetime.now(timezone.utc)
        for slip in slips:
            slip.status = "issued"
        await self.session.commit()
        await self.session.refresh(run)
        return await self.get_payroll_run(college_id, run.id)

    async def get_payslip(self, college_id: str, payslip_id: str) -> Dict[str, Any]:
        result = await self.session.execute(
            select(models.Payslip, models.StaffProfile, models.User, models.PayrollRun)
            .join(models.StaffProfile, models.StaffProfile.id == models.Payslip.staff_id)
            .join(models.User, models.User.id == models.StaffProfile.user_id)
            .join(models.PayrollRun, models.PayrollRun.id == models.Payslip.run_id)
            .where(
                models.Payslip.id == payslip_id,
                models.Payslip.college_id == college_id,
                models.Payslip.is_deleted == False,  # noqa: E712
            )
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Payslip not found")
        slip, staff, user, run = row
        return self._payslip_payload(slip, staff, user, run)

    async def _get_staff_with_user(self, college_id: str, staff_id: str):
        result = await self.session.execute(
            select(models.StaffProfile, models.User)
            .join(models.User, models.User.id == models.StaffProfile.user_id)
            .where(
                models.StaffProfile.id == staff_id,
                models.StaffProfile.college_id == college_id,
                models.StaffProfile.is_deleted == False,  # noqa: E712
            )
        )
        row = result.first()
        if not row:
            raise HTTPException(status_code=404, detail="Staff profile not found")
        return row

    async def _get_run(self, college_id: str, run_id: str) -> models.PayrollRun:
        run = (
            await self.session.execute(
                select(models.PayrollRun).where(
                    models.PayrollRun.id == run_id,
                    models.PayrollRun.college_id == college_id,
                    models.PayrollRun.is_deleted == False,  # noqa: E712
                )
            )
        ).scalars().first()
        if not run:
            raise HTTPException(status_code=404, detail="Payroll run not found")
        return run

    def _run_payload(self, run: models.PayrollRun) -> Dict[str, Any]:
        return {
            "id": run.id,
            "month": run.month,
            "status": run.status,
            "generated_at": run.generated_at.isoformat() if run.generated_at else None,
            "locked_at": run.locked_at.isoformat() if run.locked_at else None,
        }

    async def _run_with_totals(self, run: models.PayrollRun) -> Dict[str, Any]:
        totals = (
            await self.session.execute(
                select(
                    func.count(models.Payslip.id),
                    func.coalesce(func.sum(models.Payslip.gross_pay), 0),
                    func.coalesce(func.sum(models.Payslip.deductions), 0),
                    func.coalesce(func.sum(models.Payslip.net_pay), 0),
                ).where(
                    models.Payslip.run_id == run.id,
                    models.Payslip.college_id == run.college_id,
                    models.Payslip.is_deleted == False,  # noqa: E712
                )
            )
        ).first()
        payload = self._run_payload(run)
        payload.update(
            {
                "payslip_count": int(totals[0] or 0),
                "gross_pay": _amount(totals[1]),
                "deductions": _amount(totals[2]),
                "net_pay": _amount(totals[3]),
            }
        )
        return payload

    def _payslip_payload(
        self,
        slip: models.Payslip,
        staff: models.StaffProfile,
        user: models.User,
        run: models.PayrollRun,
    ) -> Dict[str, Any]:
        return {
            "id": slip.id,
            "run_id": slip.run_id,
            "month": run.month,
            "status": slip.status,
            "staff_id": staff.id,
            "user_id": user.id,
            "employee_code": staff.employee_code,
            "name": user.name,
            "department": staff.department or "",
            "designation": staff.designation or "",
            "gross_pay": _amount(slip.gross_pay),
            "deductions": _amount(slip.deductions),
            "net_pay": _amount(slip.net_pay),
            "components": slip.components or {},
            "created_at": slip.created_at.isoformat() if slip.created_at else None,
        }
