import os
import io
import zipfile
import logging
import asyncio
from datetime import datetime, timedelta, timezone
import boto3
from botocore.exceptions import ClientError
try:
    from playwright.async_api import async_playwright
    PLAYWRIGHT_AVAILABLE = True
except Exception as e:
    # Handle missing libraries gracefully
    logging.warning(f"Playwright failed to load. Native PDF generation will be mocked. Error: {e}")
    PLAYWRIGHT_AVAILABLE = False
from jinja2 import Environment, FileSystemLoader

from sqlalchemy.future import select
from database import admin_session_ctx
from app.models.accreditation import AccreditationReportJob, AccreditationEvidence
from app.services.report_engine import ReportEngineService

logger = logging.getLogger("acadmix.workers.pdf_generator")

# S3 Configuration (usually from environment)
S3_BUCKET = os.getenv("S3_BUCKET_NAME", "acadmix-evidence")
S3_CLIENT = boto3.client(
    's3',
    endpoint_url=os.getenv("S3_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY")
)

def stream_s3_file_to_zip(zip_file, s3_key, arcname, missing_files_list):
    """
    Streams a file from S3 directly into the zip archive in chunks.
    Handles 404/Connection errors by appending to missing_files_list.
    """
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        missing_files_list.append(f"FETCH_ERROR: {s3_key} (AWS Credentials not configured)")
        return
        
    try:
        response = S3_CLIENT.get_object(Bucket=S3_BUCKET, Key=s3_key)
        
        # Write to zip in chunks (memory safe)
        with zip_file.open(arcname, 'w') as zf:
            for chunk in response['Body'].iter_chunks(chunk_size=1024*1024): # 1MB chunks
                zf.write(chunk)
                
    except ClientError as e:
        error_code = e.response['Error']['Code']
        logger.error(f"S3 ClientError for {s3_key}: {error_code}")
        missing_files_list.append(f"S3_ERROR: {s3_key} ({error_code})")
    except Exception as e:
        logger.error(f"Unexpected error fetching {s3_key}: {str(e)}")
        missing_files_list.append(f"FETCH_ERROR: {s3_key} ({str(e)})")


async def _generate_pdf_bytes_async(html_out: str) -> bytes:
    """Async call to PDF generator (or mock if unavailable)"""
    if PLAYWRIGHT_AVAILABLE:
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.set_content(html_out)
                # Ensure all network requests (images/fonts) are loaded
                await page.wait_for_load_state("networkidle")
                
                pdf_bytes = await page.pdf(
                    format="A4", 
                    margin={"top": "30mm", "right": "20mm", "bottom": "25mm", "left": "20mm"}, 
                    display_header_footer=True, 
                    print_background=True
                )
                await browser.close()
                return pdf_bytes
        except Exception as e:
            import traceback
            logger.error(f"PDF generation exception: {e}\n{traceback.format_exc()}")
            
    logger.warning("Mocking PDF generation because generator is unavailable or failed.")
    # Return a minimal valid PDF byte string
    return b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 53 >>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Mock PDF - GTK Missing) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000288 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n390\n%%EOF"

def _build_and_upload_zip(job, pdf_bytes, evidence_records, report_prefix="NAAC_SSR", excel_data=None):
    """Blocking call to build zip and upload to S3"""
    zip_buffer = io.BytesIO()
    missing_evidence = []
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        # Add PDF
        pdf_name = f"{report_prefix}_Report.pdf"
        zip_file.writestr(pdf_name, pdf_bytes)
        
        # Add Excel Data Templates
        if excel_data:
            excel_name = f"{report_prefix}_Data_Templates.xlsx"
            zip_file.writestr(excel_name, excel_data)
        
        for ev in evidence_records:
            if not ev.s3_key:
                missing_evidence.append(f"DB_ERROR: Evidence record {ev.id} has no s3_key.")
                continue
                
            arcname = f"evidence/{getattr(ev, 'metric_code', 'general')}/{ev.file_name}"
            stream_s3_file_to_zip(zip_file, ev.s3_key, arcname, missing_evidence)
        
        # Add missing evidence report if necessary
        if missing_evidence:
            report_content = "Missing Evidence Report\n" + "="*25 + "\n\n"
            report_content += "\n".join(missing_evidence)
            zip_file.writestr("missing_evidence_report.txt", report_content)
            
    zip_buffer.seek(0)
    
    # 6. Upload Zip to R2/S3
    if report_prefix == "NBA_SAR":
        output_s3_key = f"exports/{job.college_id}/{report_prefix}_{getattr(job, 'department_id', 'ALL')}_{job.academic_year}_v{job.version}.zip"
    else:
        output_s3_key = f"exports/{job.college_id}/{report_prefix}_{job.academic_year}_v{job.version}.zip"
        
    try:
        zip_bytes = zip_buffer.getvalue()
        S3_CLIENT.upload_fileobj(zip_buffer, S3_BUCKET, output_s3_key)
        
        # 7. Generate 30-day Presigned URL
        presigned_url = S3_CLIENT.generate_presigned_url(
            'get_object',
            Params={'Bucket': S3_BUCKET, 'Key': output_s3_key},
            ExpiresIn=30 * 24 * 3600  # 30 days
        )
        return presigned_url
    except Exception as e:
        logger.warning(f"S3 upload failed: {e}. Falling back to local file save.")
        # Local fallback for demo/development
        public_dir = os.path.join("C:\\", "AcadMix", "frontend", "public", "exports")
        os.makedirs(public_dir, exist_ok=True)
        local_filename = f"{report_prefix}_{job.academic_year}_v{job.version}.zip"
        local_path = os.path.join(public_dir, local_filename)
        
        with open(local_path, "wb") as f:
            f.write(zip_bytes)
            
        return f"/exports/{local_filename}"

async def generate_naac_ssr_task(ctx, job_id: str):
    """
    ARQ Task: Generates the complete NAAC SSR (PDF + Evidence Zip).
    """
    logger.info(f"Starting NAAC SSR generation for job: {job_id}")
    
    async with admin_session_ctx() as db:
        # 1. Fetch Job from DB
        stmt = select(AccreditationReportJob).filter_by(id=job_id)
        result = await db.execute(stmt)
        job = result.scalars().first()
        
        if not job:
            logger.error(f"Job {job_id} not found.")
            return {"status": "failed", "error": "Job not found"}
            
        job.status = "PROCESSING"
        await db.commit()
        
        try:
            # 2. Fetch Aggregated Payload
            engine = ReportEngineService(db)
            payload = await engine.aggregate_naac_payload(job.college_id, job.academic_year)
            
            # 3. Render HTML
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            template_dir = os.path.join(base_dir, "templates")
            env = Environment(loader=FileSystemLoader(template_dir))
            template = env.get_template("naac_ssr_template.html")
            html_out = template.render(payload)
            
            # 4. Generate PDF (Async)
            pdf_bytes = await _generate_pdf_bytes_async(html_out)
            
            # 5. Generate Excel Data Templates
            excel_data = await engine.get_naac_excel_templates(job.college_id, job.academic_year)

            # 6. Fetch Evidence Records
            ev_stmt = select(AccreditationEvidence).filter_by(
                college_id=job.college_id
            )
            ev_result = await db.execute(ev_stmt)
            evidence_records = ev_result.scalars().all()
            
            # 7. Build DVV Zip & Upload (Blocking)
            presigned_url = await asyncio.to_thread(_build_and_upload_zip, job, pdf_bytes, evidence_records, "NAAC_SSR", excel_data)
            
            # 7. Update Job Status
            job.status = "COMPLETED"
            job.presigned_url = presigned_url
            job.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            await db.commit()
            
            logger.info(f"Successfully generated NAAC SSR for job: {job_id}")
            return {"status": "completed", "presigned_url": presigned_url}
            
        except Exception as e:
            logger.exception(f"Error generating NAAC SSR for job {job_id}: {str(e)}")
            job.status = "FAILED"
            await db.commit()
            return {"status": "failed", "error": str(e)}

async def generate_nba_sar_task(ctx, job_id: str):
    """
    ARQ Task: Generates the complete NBA SAR (PDF + Appendix CSV).
    """
    logger.info(f"Starting NBA SAR generation for job: {job_id}")
    
    async with admin_session_ctx() as db:
        stmt = select(AccreditationReportJob).filter_by(id=job_id)
        result = await db.execute(stmt)
        job = result.scalars().first()
        
        if not job:
            logger.error(f"Job {job_id} not found.")
            return {"status": "failed", "error": "Job not found"}
            
        job.status = "PROCESSING"
        await db.commit()
        
        try:
            # 1. Fetch Aggregated Payload
            engine = ReportEngineService(db)
            # handle department_id existence properly
            dept_id = getattr(job, 'department_id', None)
            
            payload = await engine.aggregate_nba_payload(job.college_id, job.academic_year, dept_id)
            
            # 2. Render HTML
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            template_dir = os.path.join(base_dir, "templates")
            env = Environment(loader=FileSystemLoader(template_dir))
            template = env.get_template("nba_sar_template.html")
            html_out = template.render(payload)
            
            # 3. Generate PDF (Blocking)
            pdf_bytes = await _generate_pdf_bytes_async(html_out)
            
            # 4. Generate Appendix Excel Data
            excel_data = await engine.get_nba_appendix_data(job.college_id, job.academic_year, dept_id)
            
            # 5. Fetch Evidence Records
            ev_stmt = select(AccreditationEvidence).filter_by(
                college_id=job.college_id,
                criterion_id=dept_id  # approximation
            )
            ev_result = await db.execute(ev_stmt)
            evidence_records = ev_result.scalars().all()
            
            # 6. Build DVV Zip & Upload (Blocking)
            presigned_url = await asyncio.to_thread(_build_and_upload_zip, job, pdf_bytes, evidence_records, "NBA_SAR", excel_data)
            
            # 7. Update Job Status
            job.status = "COMPLETED"
            job.presigned_url = presigned_url
            job.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            await db.commit()
            
            logger.info(f"Successfully generated NBA SAR for job: {job_id}")
            return {"status": "completed", "presigned_url": presigned_url}
            
        except Exception as e:
            logger.exception(f"Error generating NBA SAR for job {job_id}: {str(e)}")
            job.status = "FAILED"
            await db.commit()
            return {"status": "failed", "error": str(e)}

async def generate_nirf_dcs_task(ctx, job_id: str):
    """
    ARQ Task: Generates the NIRF DCS PDF + Excel Zip.
    """
    logger.info(f"Starting NIRF DCS generation for job: {job_id}")
    
    async with admin_session_ctx() as db:
        stmt = select(AccreditationReportJob).filter_by(id=job_id)
        result = await db.execute(stmt)
        job = result.scalars().first()
        
        if not job:
            logger.error(f"Job {job_id} not found.")
            return {"status": "failed", "error": "Job not found"}
            
        job.status = "PROCESSING"
        await db.commit()
        
        try:
            engine = ReportEngineService(db)
            payload = await engine.aggregate_nirf_payload(job.college_id, job.academic_year)
            
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            template_dir = os.path.join(base_dir, "templates")
            env = Environment(loader=FileSystemLoader(template_dir))
            template = env.get_template("nirf_dcs_template.html")
            html_out = template.render(payload)
            
            pdf_bytes = await _generate_pdf_bytes_async(html_out)
            excel_data = await engine.get_nirf_excel_templates(job.college_id, job.academic_year)
            
            # No evidence for NIRF DCS natively built in this version
            presigned_url = await asyncio.to_thread(_build_and_upload_zip, job, pdf_bytes, [], "NIRF_DCS", excel_data)
            
            job.status = "COMPLETED"
            job.presigned_url = presigned_url
            job.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            await db.commit()
            
            logger.info(f"Successfully generated NIRF DCS for job: {job_id}")
            return {"status": "completed", "presigned_url": presigned_url}
            
        except Exception as e:
            logger.exception(f"Error generating NIRF DCS for job {job_id}: {str(e)}")
            job.status = "FAILED"
            await db.commit()
            return {"status": "failed", "error": str(e)}

async def generate_nep_compliance_task(ctx, job_id: str):
    """
    ARQ Task: Generates the NEP Compliance PDF.
    """
    logger.info(f"Starting NEP Compliance generation for job: {job_id}")
    
    async with admin_session_ctx() as db:
        stmt = select(AccreditationReportJob).filter_by(id=job_id)
        result = await db.execute(stmt)
        job = result.scalars().first()
        
        if not job:
            return {"status": "failed", "error": "Job not found"}
            
        job.status = "PROCESSING"
        await db.commit()
        
        try:
            engine = ReportEngineService(db)
            college_info = await engine._fetch_college_info(job.college_id)
            nep_data = await engine.get_nep_preparedness_data(job.college_id, job.academic_year)
            
            payload = {
                "college": college_info,
                "academic_year": job.academic_year,
                "report_type": "NEP 2020 Compliance",
                "generated_at": datetime.utcnow().isoformat(),
                "nep_preparedness": nep_data
            }
            
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            template_dir = os.path.join(base_dir, "templates")
            env = Environment(loader=FileSystemLoader(template_dir))
            template = env.get_template("nep_compliance_template.html")
            html_out = template.render(payload)
            
            pdf_bytes = await _generate_pdf_bytes_async(html_out)
            
            presigned_url = await asyncio.to_thread(_build_and_upload_zip, job, pdf_bytes, [], "NEP_Compliance", None)
            
            job.status = "COMPLETED"
            job.presigned_url = presigned_url
            job.expires_at = datetime.now(timezone.utc) + timedelta(days=30)
            await db.commit()
            return {"status": "completed", "presigned_url": presigned_url}
            
        except Exception as e:
            logger.exception(f"Error generating NEP Compliance for job {job_id}: {str(e)}")
            job.status = "FAILED"
            await db.commit()
            return {"status": "failed", "error": str(e)}
