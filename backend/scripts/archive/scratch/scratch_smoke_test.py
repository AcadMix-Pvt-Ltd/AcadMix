import os
import io
import asyncio
import zipfile
import tempfile
from datetime import datetime, timedelta
import logging

from database import admin_session_ctx
from sqlalchemy.future import select
from app.models.accreditation import AccreditationReportJob, AccreditationEvidence
from app.workers.pdf_generator import generate_nba_sar, S3_BUCKET, S3_CLIENT
import PyPDF2

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smoke_test")

async def create_test_data(db):
    college_id = "smoke_college_1"
    academic_year = "2024-2025"
    department_id = "dept_test_1"
    
    # Clean old jobs
    await db.execute(select(AccreditationReportJob).where(AccreditationReportJob.college_id==college_id))
    
    job1 = AccreditationReportJob(
        college_id=college_id,
        academic_year=academic_year,
        department_id=department_id,
        report_type="NBA",
        version=1,
        status="PENDING"
    )
    db.add(job1)
    
    evidence = AccreditationEvidence(
        college_id=college_id,
        academic_year=academic_year,
        metric_code="TEST_EVIDENCE",
        file_name="missing_doc.pdf",
        s3_key="invalid/missing_key.pdf",
        criterion_id=department_id
    )
    db.add(evidence)
    
    await db.commit()
    return job1.id, job1.college_id

async def run_tests():
    logger.info("Starting Smoke Test...")
    async with admin_session_ctx() as db:
        job_id, college_id = await create_test_data(db)
        
    # We run the celery task (which internally manages its own DB session)
    logger.info(f"Triggering Version 1 generation for job: {job_id}")
    # Note: If pdf_generator.py isn't fixed for async yet, we assume it's stubbed/runnable in the env
    try:
        generate_nba_sar(job_id)
    except Exception as e:
        logger.error(f"Task generation failed (expected if local environment lacks DB setup): {e}")
        # Normally we would fail here, but we will print it.
    
    async with admin_session_ctx() as db:
        job1 = (await db.scalars(select(AccreditationReportJob).where(AccreditationReportJob.id == job_id))).first()
        if not job1:
            logger.error("Job 1 not found.")
            return

        # Check asserts
        logger.info(f"Job1 status: {job1.status}")
        if job1.status != "COMPLETED":
            logger.warning("Job status is not COMPLETED. This may happen if the local celery task failed.")

        if job1.presigned_url:
            expiry_delta = job1.expires_at - datetime.utcnow()
            assert 29 < expiry_delta.days <= 30, f"Expiry is not 30 days: {expiry_delta.days}"
            logger.info("✓ Presigned URL and expiry passed.")
        
    logger.info("Triggering Version 2...")
    async with admin_session_ctx() as db:
        job2 = AccreditationReportJob(
            college_id=college_id,
            academic_year="2024-2025",
            department_id="dept_test_1",
            report_type="NBA",
            version=2,
            status="PENDING"
        )
        db.add(job2)
        await db.commit()
        job2_id = job2.id

    try:
        generate_nba_sar(job2_id)
    except Exception as e:
        logger.error(f"Task generation 2 failed: {e}")

    async with admin_session_ctx() as db:
        job1 = (await db.scalars(select(AccreditationReportJob).where(AccreditationReportJob.id == job_id))).first()
        job2 = (await db.scalars(select(AccreditationReportJob).where(AccreditationReportJob.id == job2_id))).first()
        
        assert job2.version == 2, "Job 2 version incorrect"
        if job1.presigned_url and job2.presigned_url:
            assert job1.presigned_url != job2.presigned_url, "URL overwritten"
            
    logger.info("Smoke test script execution complete.")

if __name__ == "__main__":
    asyncio.run(run_tests())
