from fastapi import APIRouter

from app.routers import (
    auth, code_execution, health, leaves, attendance, cia, marks, parents, users, departments, 
    quizzes, timetable, teaching_records, registrations, hall_tickets, placements, alumni, expert, 
    principal, grievances, tasks, retired_faculty, sections, roles, assignments, calendars, 
    exam_cell_core, student_core, hod_core, faculty_core, admin_core, attempts, results, analytics, 
    leaderboard, dashboards, marks_extra, timetable_extra, announcements, challenges, industry, tpo, fees, webhooks,
    interview, resume, hostel, career_tools, iot_webhooks, transport, transport_admin, library,
    visitors, websocket, notifications, audit, insights, pre_enroll, modules, resume_vault, outcomes, assessments, placement_prep, accreditation,
    campus, flashcards, ai_study, validation, hr_payroll, sso, billing, materials
)
from app.api.v1.endpoints import syllabus as syllabus_endpoints
from app.api.v1.endpoints import simulation as simulation_endpoints
from app.routers import nodal_routes, superadmin

api_router = APIRouter()
api_router.include_router(simulation_endpoints.router, prefix="/simulate", tags=["simulation"])

# Domain routes without extra prefix (mounted under /api globally).
# Notice 'tasks' was duplicated in previous config, kept single here.
api_router.include_router(industry.router, tags=["industry"])
api_router.include_router(challenges.router, tags=["challenges"])
api_router.include_router(announcements.router, tags=["announcements"])
api_router.include_router(timetable_extra.router, tags=["timetable_extra"])
api_router.include_router(marks_extra.router, tags=["marks_extra"])
api_router.include_router(dashboards.router, tags=["dashboards"])
api_router.include_router(insights.router, prefix="/insights", tags=["insights"])
api_router.include_router(outcomes.router, tags=["outcomes"])
api_router.include_router(assessments.router, tags=["assessments"])
api_router.include_router(leaderboard.router, tags=["leaderboard"])
api_router.include_router(analytics.router, tags=["analytics"])
api_router.include_router(results.router, tags=["results"])
api_router.include_router(attempts.router, tags=["attempts"])
api_router.include_router(tpo.router, tags=["tpo"])
api_router.include_router(fees.router, tags=["fees"])
api_router.include_router(hr_payroll.router, tags=["hr_payroll"])
api_router.include_router(interview.router, tags=["interview_warroom"])
api_router.include_router(resume.router, tags=["interview_warroom"])
api_router.include_router(placement_prep.router, tags=["placement_prep"])
api_router.include_router(hostel.router, tags=["hostel"])
api_router.include_router(library.router, tags=["library"])
api_router.include_router(career_tools.router, tags=["career_toolkit"])
api_router.include_router(resume_vault.router, prefix="/resume-vault", tags=["resume_vault"])
api_router.include_router(accreditation.router, prefix="/accreditation", tags=["accreditation"])
api_router.include_router(validation.router, prefix="/validation", tags=["validation"])
api_router.include_router(tasks.router, tags=["tasks"])
api_router.include_router(admin_core.router, tags=["admin_core"])
api_router.include_router(faculty_core.router, tags=["faculty_core"])
api_router.include_router(hod_core.router, tags=["hod_core"])
api_router.include_router(student_core.router, tags=["student_core"])
api_router.include_router(exam_cell_core.router, tags=["exam_cell_core"])
api_router.include_router(calendars.router, tags=["calendars"])
api_router.include_router(assignments.router, tags=["assignments"])
api_router.include_router(roles.router, tags=["roles"])
api_router.include_router(sections.router, tags=["sections"])
api_router.include_router(retired_faculty.router, tags=["retired_faculty"])
api_router.include_router(grievances.router, tags=["grievances"])
api_router.include_router(principal.router, tags=["principal"])
api_router.include_router(expert.router, tags=["expert"])
api_router.include_router(alumni.router, tags=["alumni"])
api_router.include_router(placements.router, tags=["placements"])
api_router.include_router(hall_tickets.router, tags=["hall_tickets"])
api_router.include_router(registrations.router, tags=["registrations"])
api_router.include_router(teaching_records.router, tags=["teaching_records"])
api_router.include_router(timetable.router, tags=["timetable"])
api_router.include_router(quizzes.router, tags=["quizzes"])
api_router.include_router(departments.router, tags=["departments"])
api_router.include_router(users.router, tags=["users"])
api_router.include_router(parents.router, tags=["parents"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(leaves.router, tags=["leaves"])
api_router.include_router(attendance.router, tags=["attendance"])
api_router.include_router(syllabus_endpoints.router, tags=["syllabus"])
api_router.include_router(cia.router, tags=["cia"])
api_router.include_router(marks.router, tags=["marks"])
api_router.include_router(websocket.router, tags=["websocket"])
api_router.include_router(materials.router, tags=["materials"])

# Sub-prefixes — these routers use relative paths, so we add auth/code here
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(sso.router)
api_router.include_router(billing.router)
api_router.include_router(code_execution.router, prefix="/code", tags=["code"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(iot_webhooks.router, tags=["iot"])
api_router.include_router(transport.router, tags=["transport"])
api_router.include_router(transport_admin.router, tags=["transport-admin"])
api_router.include_router(visitors.router, tags=["visitors"])
api_router.include_router(notifications.router, tags=["notifications"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(pre_enroll.router, tags=["pre_enrollment"])
api_router.include_router(modules.router, tags=["college_modules"])
api_router.include_router(campus.router, tags=["campus"])

# Nodal Router (historical top-level route, now safely namespaced if possible, keeping legacy /api scope mostly)
api_router.include_router(nodal_routes.nodal_router, tags=["nodal_officer"])
api_router.include_router(superadmin.router, tags=["superadmin"])
api_router.include_router(flashcards.router, prefix="/flashcards-api", tags=["flashcards"])
api_router.include_router(ai_study.router, prefix="/study-api", tags=["ai_study"])
