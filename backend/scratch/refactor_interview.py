"""
Scratch script: refactor_interview.py
Simulates DB optimization changes, including:
1. Normalizing transcripts into a mock_interview_messages table.
2. Indexing assembly_ai_job_id on mock_interviews.
3. Simulating data migration (backfilling).
4. Simulating service-level database operations.
"""
import uuid
import json
import datetime
from sqlalchemy import create_engine, Column, String, Integer, Float, ForeignKey, DateTime, Text, Boolean, Index, JSON
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from sqlalchemy.sql import func

Base = declarative_base()

def generate_uuid():
    return str(uuid.uuid4())

# ═══════════════════════════════════════════════════════════════════════════════
# 1. NEW MODELS DEFINITION
# ═══════════════════════════════════════════════════════════════════════════════

class SoftDeleteMixin:
    is_deleted = Column(Boolean, default=False, nullable=False)

class MockInterview(Base, SoftDeleteMixin):
    """Tracks each AI mock interview session with full conversation history and scoring."""
    __tablename__ = "mock_interviews"

    id               = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id       = Column(String, nullable=False, index=True)
    student_id       = Column(String, nullable=False, index=True)
    interview_type   = Column(String, nullable=False)
    target_role      = Column(String, nullable=True)
    target_company   = Column(String, nullable=True)
    difficulty       = Column(String, nullable=False, default='intermediate')
    resume_context   = Column(Text, nullable=True)
    
    # Keep old JSON conversation column temporarily for backward compatibility
    conversation     = Column(JSON, nullable=False, default=[])
    ai_feedback      = Column(JSON, nullable=True)
    scores           = Column(JSON, nullable=True)
    overall_score    = Column(Float, nullable=True)
    question_count   = Column(Integer, nullable=False, default=0)
    duration_seconds = Column(Integer, nullable=True)
    status           = Column(String, nullable=False, default='in_progress')
    current_stage    = Column(String, nullable=False, default='icebreaker')
    
    # NEW indexed column for AssemblyAI webhook lookups (O(1) search instead of JSONB search)
    assembly_ai_job_id = Column(String, nullable=True, index=True)
    
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    completed_at     = Column(DateTime(timezone=True), nullable=True)

    # Relationship to new normalized table
    messages = relationship("MockInterviewMessage", back_populates="interview", cascade="all, delete-orphan")


class MockInterviewMessage(Base, SoftDeleteMixin):
    """Stores individual conversation turns of a mock interview (normalized table)."""
    __tablename__ = "mock_interview_messages"

    id           = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id   = Column(String, nullable=False, index=True)
    student_id   = Column(String, nullable=False, index=True)
    interview_id = Column(String, ForeignKey("mock_interviews.id", ondelete="CASCADE"), nullable=False, index=True)
    
    role         = Column(String, nullable=False)                        # assistant / user
    content      = Column(Text, nullable=False)                          # message text
    timestamp    = Column(String, nullable=True)                          # ISO string
    source       = Column(String, nullable=False, default='http')         # livekit / http
    kind         = Column(String, nullable=False, default='question')     # question / answer / nudge
    q_number     = Column(Integer, nullable=True)                        # sequence count
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship to parent
    interview = relationship("MockInterview", back_populates="messages")


# ═══════════════════════════════════════════════════════════════════════════════
# 2. DATA MIGRATION SIMULATION (BACKFILL)
# ═══════════════════════════════════════════════════════════════════════════════

def backfill_data(session):
    """Backfills legacy JSONB conversation records into mock_interview_messages."""
    print("[backfill] Starting backfill migration...")
    interviews = session.query(MockInterview).all()
    count_messages = 0
    count_jobs = 0
    
    for interview in interviews:
        # 1. Backfill conversation JSONB array to mock_interview_messages table
        conv_list = interview.conversation or []
        for index, turn in enumerate(conv_list):
            # Check if already backfilled to avoid duplicates
            existing = session.query(MockInterviewMessage).filter_by(
                interview_id=interview.id,
                role=turn.get("role"),
                content=turn.get("content")
            ).first()
            
            if not existing:
                msg = MockInterviewMessage(
                    college_id=interview.college_id,
                    student_id=interview.student_id,
                    interview_id=interview.id,
                    role=turn.get("role"),
                    content=turn.get("content"),
                    timestamp=turn.get("timestamp"),
                    source=turn.get("source", "http"),
                    kind=turn.get("kind", "question" if turn.get("role") == "assistant" else "answer"),
                    q_number=turn.get("q_number", index + 1)
                )
                session.add(msg)
                count_messages += 1
                
        # 2. Extract assembly_ai_job_id from JSONB feedback and save to indexed column
        feedback = interview.ai_feedback or {}
        job_id = feedback.get("assembly_ai_job_id")
        if job_id and not interview.assembly_ai_job_id:
            interview.assembly_ai_job_id = job_id
            count_jobs += 1
            
    session.commit()
    print(f"[backfill] Successfully migrated {count_messages} message turns and {count_jobs} AssemblyAI job IDs.")


# ═══════════════════════════════════════════════════════════════════════════════
# 3. REFACTORED SERVICE SIMULATION (DUAL-WRITES FOR ZERO DOWNTIME)
# ═══════════════════════════════════════════════════════════════════════════════

def start_interview_sim(session, college_id, student_id, first_question):
    """Simulates starting an interview with dual-write to both JSONB and table."""
    now_iso = datetime.datetime.utcnow().isoformat()
    
    # 1. Create interview record
    interview = MockInterview(
        college_id=college_id,
        student_id=student_id,
        interview_type="technical",
        target_role="SDE",
        conversation=[
            {"role": "assistant", "content": first_question, "timestamp": now_iso, "q_number": 1}
        ],
        question_count=1,
        status="in_progress"
    )
    session.add(interview)
    session.flush()  # get generated interview.id
    
    # 2. Create message record (normalized table)
    first_msg = MockInterviewMessage(
        college_id=college_id,
        student_id=student_id,
        interview_id=interview.id,
        role="assistant",
        content=first_question,
        timestamp=now_iso,
        source="http",
        kind="question",
        q_number=1
    )
    session.add(first_msg)
    session.commit()
    return interview.id


def send_message_sim(session, interview_id, student_response, ai_question):
    """Simulates a conversation turn with dual-write to maintain compatibility."""
    interview = session.query(MockInterview).filter_by(id=interview_id).first()
    if not interview:
        raise ValueError("Interview not found")
        
    now_iso = datetime.datetime.utcnow().isoformat()
    q_number = interview.question_count + 1
    
    # 1. Update legacy JSONB array
    conversation = list(interview.conversation or [])
    conversation.append({"role": "user", "content": student_response, "timestamp": now_iso})
    conversation.append({"role": "assistant", "content": ai_question, "timestamp": now_iso, "q_number": q_number})
    interview.conversation = conversation
    interview.question_count = q_number
    
    # 2. Insert into normalized table
    student_msg = MockInterviewMessage(
        college_id=interview.college_id,
        student_id=interview.student_id,
        interview_id=interview.id,
        role="user",
        content=student_response,
        timestamp=now_iso,
        source="http",
        kind="answer",
        q_number=q_number
    )
    ai_msg = MockInterviewMessage(
        college_id=interview.college_id,
        student_id=interview.student_id,
        interview_id=interview.id,
        role="assistant",
        content=ai_question,
        timestamp=now_iso,
        source="http",
        kind="question",
        q_number=q_number
    )
    session.add(student_msg)
    session.add(ai_msg)
    session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# 4. DRY-RUN AUTOMATED TESTING
# ═══════════════════════════════════════════════════════════════════════════════

def run_dry_run_tests():
    print("================================================================")
    print("STARTING DRY-RUN DATABASE OPTIMIZATION TEST SUITE")
    print("================================================================")
    
    # Setup an in-memory SQLite database for testing
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Seed legacy data
    college_id = "test-college"
    student_id = "test-student"
    interview_id_1 = str(uuid.uuid4())
    
    legacy_interview = MockInterview(
        id=interview_id_1,
        college_id=college_id,
        student_id=student_id,
        interview_type="hr",
        conversation=[
            {"role": "assistant", "content": "Welcome to your HR round. Tell me about yourself.", "timestamp": "2026-06-08T10:00:00Z"},
            {"role": "user", "content": "I am a CSE student interested in cloud.", "timestamp": "2026-06-08T10:01:00Z"},
        ],
        ai_feedback={
            "overall_score": 80,
            "assembly_ai_job_id": "job_12345"
        },
        question_count=1,
        status="completed"
    )
    session.add(legacy_interview)
    session.commit()
    
    # TEST 1: Backfill Data Migration
    print("\n--- Test 1: Data Migration ---")
    backfill_data(session)
    
    # Assertions
    refetched = session.query(MockInterview).filter_by(id=interview_id_1).first()
    assert refetched.assembly_ai_job_id == "job_12345", f"Expected job_12345, got {refetched.assembly_ai_job_id}"
    print("[PASS] Verified: assembly_ai_job_id extracted and saved to column.")
    
    messages = session.query(MockInterviewMessage).filter_by(interview_id=interview_id_1).order_by(MockInterviewMessage.q_number).all()
    assert len(messages) == 2, f"Expected 2 messages, got {len(messages)}"
    assert messages[0].role == "assistant", "First message role should be assistant"
    assert messages[0].content == "Welcome to your HR round. Tell me about yourself."
    assert messages[1].role == "user", "Second message role should be user"
    print("[PASS] Verified: conversation array backfilled into normalized table rows.")
 
    # TEST 2: Dual Write Simulation for start_interview
    print("\n--- Test 2: Start Interview Dual Write ---")
    new_id = start_interview_sim(session, college_id, student_id, "Hello, let's start the technical round.")
    
    new_int = session.query(MockInterview).filter_by(id=new_id).first()
    new_msgs = session.query(MockInterviewMessage).filter_by(interview_id=new_id).all()
    
    assert len(new_int.conversation) == 1, "Legacy array should have 1 item"
    assert len(new_msgs) == 1, "Normalized table should have 1 item"
    assert new_msgs[0].content == "Hello, let's start the technical round."
    print("[PASS] Verified: start_interview correctly executes dual-writes.")
    
    # TEST 3: Dual Write Simulation for send_message
    print("\n--- Test 3: Send Message Dual Write ---")
    send_message_sim(session, new_id, "I have built a web portal.", "Excellent. What tech stack did you use?")
    
    updated_int = session.query(MockInterview).filter_by(id=new_id).first()
    updated_msgs = session.query(MockInterviewMessage).filter_by(interview_id=new_id).order_by(MockInterviewMessage.q_number).all()
    
    assert len(updated_int.conversation) == 3, f"Expected legacy array to have 3 items, got {len(updated_int.conversation)}"
    assert len(updated_msgs) == 3, f"Expected normalized table to have 3 items, got {len(updated_msgs)}"
    assert updated_msgs[1].role == "user" and updated_msgs[1].content == "I have built a web portal."
    assert updated_msgs[2].role == "assistant" and updated_msgs[2].content == "Excellent. What tech stack did you use?"
    print("[PASS] Verified: send_message correctly executes dual-writes.")
 
    # TEST 4: AssemblyAI Indexed Lookup (O(1))
    print("\n--- Test 4: Webhook Index Lookup ---")
    webhook_target_id = "job_12345"
    webhook_interview = session.query(MockInterview).filter_by(assembly_ai_job_id=webhook_target_id).first()
    assert webhook_interview is not None
    assert webhook_interview.id == interview_id_1
    print("[PASS] Verified: O(1) indexed lookup on assembly_ai_job_id functions successfully.")
 
    print("\n================================================================")
    print("ALL TESTS PASSED SUCCESSFULLY!")
    print("================================================================")

if __name__ == "__main__":
    run_dry_run_tests()
