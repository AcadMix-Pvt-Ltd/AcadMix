import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, MagicMock
from app.services.report_engine import ReportEngineService

class MockUser:
    def __init__(self, id, name, role):
        self.id = id
        self.name = name
        self.role = role

class MockUserProfile:
    def __init__(self, department):
        self.department = department

class MockFacultyProfile:
    def __init__(self, qualification, experience_years, designation):
        self.qualification = qualification
        self.experience_years = experience_years
        self.designation = designation

class MockGrade:
    def __init__(self, grade, credits, student_id):
        self.grade = grade
        self.credits_earned = credits
        self.student_id = student_id

@pytest.mark.asyncio
async def test_calculate_faculty_metrics():
    # Setup mock session
    mock_session = AsyncMock()
    service = ReportEngineService(mock_session)
    
    # Mocking query result
    # Let's say we have 29 faculty members to test the 3:6:20 ratio
    rows = []
    # 3 Professors with PhD
    for i in range(3):
        u = MockUser(f"prof_{i}", f"Prof {i}", "faculty")
        up = MockUserProfile("dept_1")
        fp = MockFacultyProfile("PhD", 15, "Professor")
        rows.append((u, up, fp))
    # 6 Associate Professors with PhD
    for i in range(6):
        u = MockUser(f"assoc_{i}", f"Assoc {i}", "faculty")
        up = MockUserProfile("dept_1")
        fp = MockFacultyProfile("PhD", 10, "Associate Professor")
        rows.append((u, up, fp))
    # 20 Assistant Professors with PG (MTech)
    for i in range(20):
        u = MockUser(f"asst_{i}", f"Asst {i}", "faculty")
        up = MockUserProfile("dept_1")
        fp = MockFacultyProfile("MTech", 5, "Assistant Professor")
        rows.append((u, up, fp))
        
    mock_result = MagicMock()
    mock_result.all.return_value = rows
    mock_session.execute = AsyncMock(return_value=mock_result)
    
    metrics = await service._calculate_faculty_metrics("col_1", "dept_1")
    
    # Qualification score: 1.5 * ((10X + 4Y) / F)
    # X (PhD) = 9, Y (PG) = 20, F = 29
    # 1.5 * ((90 + 80) / 29) = 1.5 * (170 / 29) = 1.5 * 5.862 = 8.79
    expected_qual = round(1.5 * ((10 * 9) + (4 * 20)) / 29, 2)
    assert metrics["qualification_score"] == expected_qual
    
    # Cadre Proportion Score: 3:6:20 fulfilled exactly
    # 1.0 + 1.0 + 1.0 / 3 * 15 = 15.0
    assert metrics["cadre_proportion_score"] == 15.0
    
    assert metrics["total_faculty"] == 29
    assert metrics["phd_count"] == 9
    assert metrics["pg_count"] == 20
    assert metrics["prof_count"] == 3
    assert metrics["assoc_count"] == 6
    assert metrics["asst_count"] == 20

@pytest.mark.asyncio
async def test_calculate_student_metrics():
    # Setup mock session
    mock_session = AsyncMock()
    service = ReportEngineService(mock_session)
    
    # Mocking grades
    # Student 1: All A+ (9 points)
    # Student 2: All A (8 points)
    # Student 3: F (0 points)
    grades = [
        MockGrade("A+", 3, "S1"), MockGrade("A+", 4, "S1"),
        MockGrade("A", 3, "S2"), MockGrade("A", 4, "S2"),
        MockGrade("F", 3, "S3"), MockGrade("B+", 4, "S3")
    ]
    
    mock_result = MagicMock()
    mock_result.all.return_value = grades
    mock_session.scalars.return_value = mock_result
    
    metrics = await service._calculate_student_metrics("col_1", "2024")
    
    # Total points = (9*3 + 9*4) + (8*3 + 8*4) + (0*3 + 7*4)
    # = 27 + 36 + 24 + 32 + 0 + 28 = 147
    # Total credits = 7 + 7 + 7 = 21
    # Mean CGPA = 147 / 21 = 7.0
    
    # Successful = S1 and S2 (S3 has an F)
    # Appeared = 3
    # API = Mean CGPA * (Successful / Appeared) = 7.0 * (2/3) = 4.67
    
    assert metrics["mean_cgpa"] == 7.0
    assert metrics["api"] == 4.67
    assert metrics["success_without_backlog"] == round((2/3)*100, 2)
    assert metrics["success_within_period"] == round((2/3)*100, 2)

@pytest.mark.asyncio
async def test_calculate_empty_metrics():
    mock_session = AsyncMock()
    service = ReportEngineService(mock_session)
    
    mock_result = MagicMock()
    mock_result.all.return_value = []
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.scalars.return_value = mock_result
    
    fac_metrics = await service._calculate_faculty_metrics("c", "d")
    assert fac_metrics["qualification_score"] == 0.0
    assert fac_metrics["cadre_proportion_score"] == 0.0
    assert fac_metrics["total_faculty"] == 0
    
    stu_metrics = await service._calculate_student_metrics("c", "y")
    assert stu_metrics["api"] == 0.0
    assert stu_metrics["mean_cgpa"] == 0.0
