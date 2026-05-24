from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, Boolean, Date
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func, text
import uuid
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class SoftDeleteMixin:
    is_deleted = Column(Boolean, nullable=False, server_default=text('false'), index=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

class InfrastructureExpenditure(Base, SoftDeleteMixin):
    """
    Tracks annual expenditure on library, lab equipment, IT, etc.
    Crucial for NIRF (TLR - LL parameter) and NAAC (Criterion 4).
    """
    __tablename__ = "infrastructure_expenditures"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    academic_year = Column(Integer, nullable=False) # e.g. 2024
    
    # categories: 'library_physical', 'library_digital', 'lab_equipment', 'it_infrastructure', 'maintenance'
    category = Column(String, nullable=False)
    
    budgeted_amount = Column(Float, nullable=False, server_default=text('0.0'))
    actual_expenditure = Column(Float, nullable=False, server_default=text('0.0'))
    
    # For audit trails
    evidence_s3_key = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class InstitutionalMoU(Base, SoftDeleteMixin):
    """
    Tracks Memorandums of Understanding with industry/academia.
    Crucial for NAAC (C3.7) and NBA.
    """
    __tablename__ = "institutional_mous"
    id = Column(String, primary_key=True, index=True, default=generate_uuid)
    college_id = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False, index=True)
    
    partner_name = Column(String, nullable=False)
    partner_type = Column(String, nullable=False) # 'industry', 'academic', 'ngo', etc.
    activity_type = Column(String, nullable=False) # 'internship', 'research', 'faculty_exchange', 'training'
    
    valid_from = Column(Date, nullable=False)
    valid_till = Column(Date, nullable=False)
    
    is_active = Column(Boolean, nullable=False, server_default=text('true'))
    evidence_s3_key = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
