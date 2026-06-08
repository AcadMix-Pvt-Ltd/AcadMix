"""
Data Migration: backfill_interview_data.py
Backfills legacy JSONB transcripts into mock_interview_messages.
Extracts assembly_ai_job_id from ai_feedback JSONB into its indexed column.
"""
import asyncio
import logging
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.core.config import settings
from app.models.interview_prep import MockInterview, MockInterviewMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("acadmix.migration.backfill")

async def backfill():
    logger.info("Initializing DB engine for migration...")
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        connect_args={"statement_cache_size": 0}
    )
    
    SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    
    async with SessionLocal() as db:
        logger.info("Fetching all mock interviews...")
        stmt = select(MockInterview).where(MockInterview.is_deleted == False)
        res = await db.execute(stmt)
        interviews = res.scalars().all()
        
        logger.info(f"Found {len(interviews)} interview records to inspect.")
        
        count_messages = 0
        count_jobs = 0
        
        for idx, interview in enumerate(interviews):
            # 1. Backfill conversation JSONB turns
            conv = interview.conversation or []
            if isinstance(conv, list):
                for turn_idx, turn in enumerate(conv):
                    if not isinstance(turn, dict):
                        continue
                    role = turn.get("role")
                    content = turn.get("content")
                    if not role or not content:
                        continue
                        
                    # Check if already exists in new table to prevent duplicates
                    stmt_msg = select(MockInterviewMessage).where(
                        MockInterviewMessage.interview_id == interview.id,
                        MockInterviewMessage.role == role,
                        MockInterviewMessage.content == content
                    )
                    res_msg = await db.execute(stmt_msg)
                    existing = res_msg.scalars().first()
                    
                    if not existing:
                        msg = MockInterviewMessage(
                            college_id=interview.college_id,
                            student_id=interview.student_id,
                            interview_id=interview.id,
                            role=role,
                            content=content,
                            timestamp=turn.get("timestamp"),
                            source=turn.get("source") or "http",
                            kind=turn.get("kind") or ("question" if role == "assistant" else "answer"),
                            q_number=turn.get("q_number") or (turn_idx + 1)
                        )
                        db.add(msg)
                        count_messages += 1

            # 2. Extract assembly_ai_job_id from JSONB feedback
            feedback = interview.ai_feedback or {}
            if isinstance(feedback, dict):
                job_id = feedback.get("assembly_ai_job_id")
                if job_id and not interview.assembly_ai_job_id:
                    interview.assembly_ai_job_id = job_id
                    flag_modified(interview, "assembly_ai_job_id")
                    count_jobs += 1
                    
            if idx > 0 and idx % 100 == 0:
                logger.info(f"Processed {idx} interviews...")
                await db.commit()
                
        await db.commit()
        logger.info(f"Migration completed! Backfilled {count_messages} turns, indexed {count_jobs} AssemblyAI jobs.")
        
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(backfill())
