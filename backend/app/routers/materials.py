import os
import uuid
import shutil
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from database import get_db
from app.core.security import get_current_user, require_role
from app.core.audit import log_audit
from app import models
from app.schemas.academic import CourseMaterialResponse

router = APIRouter()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

@router.get("/materials/{course_id}", response_model=List[CourseMaterialResponse])
async def list_course_materials(
    course_id: str,
    user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    # Verify course exists
    course_r = await session.execute(
        select(models.Course).where(
            models.Course.id == course_id,
            models.Course.college_id == user["college_id"]
        )
    )
    if not course_r.scalars().first():
        raise HTTPException(status_code=404, detail="Course not found")

    materials_r = await session.execute(
        select(models.CourseMaterial)
        .where(models.CourseMaterial.course_id == course_id)
        .order_by(models.CourseMaterial.created_at.desc())
    )
    return materials_r.scalars().all()


@router.post("/materials/{course_id}", response_model=CourseMaterialResponse)
async def upload_course_material(
    course_id: str,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    material_type: str = Form(...),
    web_link: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    user: dict = Depends(require_role("teacher", "admin", "hod")),
    session: AsyncSession = Depends(get_db)
):
    course_r = await session.execute(
        select(models.Course).where(
            models.Course.id == course_id,
            models.Course.college_id == user["college_id"]
        )
    )
    course = course_r.scalars().first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    file_url = None
    if file and material_type != "link":
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        if size > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large. Max size is 50MB.")
        
        ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
        filename = f"{uuid.uuid4()}.{ext}"
        upload_dir = os.path.join("uploads", "materials")
        os.makedirs(upload_dir, exist_ok=True)
        filepath = os.path.join(upload_dir, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        file_url = f"/api/uploads/materials/{filename}"
    elif material_type == "link" and not web_link:
        raise HTTPException(status_code=400, detail="Web link is required for 'link' material type.")

    material = models.CourseMaterial(
        college_id=user["college_id"],
        course_id=course_id,
        faculty_id=user["id"],
        title=title,
        description=description,
        material_type=material_type,
        file_url=file_url,
        web_link=web_link
    )
    session.add(material)
    await log_audit(session, user["id"], "course_material", "create", {"course_id": course_id, "title": title})
    await session.commit()
    await session.refresh(material)
    return material


@router.delete("/materials/{material_id}")
async def delete_course_material(
    material_id: str,
    user: dict = Depends(require_role("teacher", "admin", "hod")),
    session: AsyncSession = Depends(get_db)
):
    material_r = await session.execute(
        select(models.CourseMaterial).where(
            models.CourseMaterial.id == material_id,
            models.CourseMaterial.college_id == user["college_id"]
        )
    )
    material = material_r.scalars().first()
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")
        
    if user["role"] == "teacher" and material.faculty_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this material")

    await log_audit(session, user["id"], "course_material", "delete", {"material_id": material_id, "title": material.title})
    await session.delete(material)
    await session.commit()
    return {"message": "Material deleted successfully"}
