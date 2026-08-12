from datetime import datetime, timezone
import json
from sqlalchemy import Column, Integer, String, BigInteger, DateTime, Text, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from database import Base


def utc_now():
    return datetime.now(timezone.utc)

class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False, comment="Original uploaded filename")
    stored_filename = Column(String(255), nullable=False, comment="Saved unique filename on disk")
    file_path = Column(String(500), nullable=False, comment="Server filesystem path")
    file_size_bytes = Column(BigInteger, nullable=False, comment="Size of file in bytes")
    mime_type = Column(String(100), nullable=False, comment="MIME type of uploaded file")
    status = Column(String(50), nullable=False, default="UPLOADED", comment="UPLOADED, PROCESSING, PROCESSED, FAILED")
    upload_timestamp = Column(DateTime, default=utc_now, nullable=False, comment="UTC upload timestamp")
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    profile = relationship("CandidateProfile", back_populates="resume", uselist=False, cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "stored_filename": self.stored_filename,
            "file_path": self.file_path,
            "file_size_bytes": self.file_size_bytes,
            "mime_type": self.mime_type,
            "status": self.status,
            "upload_timestamp": self.upload_timestamp.isoformat() if self.upload_timestamp else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class CandidateProfile(Base):
    """
    Candidate Profile model storing extracted & user-reviewed resume details in MySQL.
    Contains Name, Email, Phone, Education, Skills, Projects, Certifications,
    Internships, College, CGPA, and Graduation Year.
    """
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False, default="Candidate Name")
    email = Column(String(255), nullable=False, default="")
    phone = Column(String(50), nullable=False, default="")
    education = Column(Text, nullable=True)
    skills = Column(Text, nullable=True, comment="JSON encoded array of Data Science skills")
    projects = Column(Text, nullable=True)
    certifications = Column(Text, nullable=True)
    internships = Column(Text, nullable=True)
    college = Column(String(255), nullable=True)
    cgpa = Column(String(50), nullable=True)
    graduation_year = Column(String(20), nullable=True)
    is_verified = Column(Boolean, default=False, comment="Set to True after candidate verifies/edits details")
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    resume = relationship("Resume", back_populates="profile")

    def get_skills_list(self):
        """Returns skills list from JSON string."""
        if not self.skills:
            return []
        try:
            return json.loads(self.skills)
        except Exception:
            return [s.strip() for s in self.skills.split(",") if s.strip()]

    def set_skills_list(self, skill_list):
        """Sets skills as JSON string."""
        if isinstance(skill_list, list):
            self.skills = json.dumps(skill_list)
        else:
            self.skills = json.dumps([s.strip() for s in str(skill_list).split(",") if s.strip()])

    def to_dict(self):
        return {
            "id": self.id,
            "resume_id": self.resume_id,
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "education": self.education or "",
            "skills": self.get_skills_list(),
            "projects": self.projects or "",
            "certifications": self.certifications or "",
            "internships": self.internships or "",
            "college": self.college or "",
            "cgpa": self.cgpa or "",
            "graduation_year": self.graduation_year or "",
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class InterviewQuestion(Base):
    """
    Interview Question model storing golden interview questions and answers in SQL database.
    Schema: Question ID | Rewritten professional interview question | Detailed golden answer | Topic | Difficulty | Expected keywords | Question Type
    """
    __tablename__ = "interview_questions"

    question_id = Column(Integer, primary_key=True, index=True, comment="Question ID")
    rewritten_question = Column(Text, nullable=False, comment="Rewritten professional interview question")
    golden_answer = Column(Text, nullable=False, comment="Detailed golden answer (interview-quality)")
    topic = Column(String(255), nullable=False, index=True, comment="Topic domain")
    difficulty = Column(String(50), nullable=False, index=True, comment="Difficulty (Easy, Medium, Hard)")
    expected_keywords = Column(Text, nullable=False, comment="Expected keywords")
    question_type = Column(String(50), nullable=False, default="TECHNICAL", index=True, comment="TECHNICAL, CODING, BEHAVIORAL")
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    def to_dict(self):
        return {
            "question_id": self.question_id,
            "rewritten_question": self.rewritten_question,
            "golden_answer": self.golden_answer,
            "topic": self.topic,
            "difficulty": self.difficulty,
            "expected_keywords": self.expected_keywords,
            "question_type": self.question_type or "TECHNICAL",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class InterviewSession(Base):
    """
    Interview Session model tracking attempt state, section progress, score, and completion status per candidate.
    """
    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_name = Column(String(255), nullable=False)
    candidate_email = Column(String(255), nullable=False, index=True)
    role = Column(String(100), nullable=False, default="Data Scientist (Fresher)")
    status = Column(String(50), nullable=False, default="IN_PROGRESS", index=True, comment="IN_PROGRESS, COMPLETED, TERMINATED")
    current_section = Column(String(50), nullable=False, default="SECTION_1_INTRO", index=True, comment="SECTION_1_INTRO, SECTION_2_TECHNICAL, SECTION_3_CODING, SECTION_4_BEHAVIORAL, COMPLETED")
    current_step_index = Column(Integer, nullable=False, default=0)
    total_predefined_questions = Column(Integer, nullable=False, default=5)
    section_state_json = Column(Text, nullable=True, comment="JSON state tracking section questions, active step, coding state")
    overall_score = Column(Float, nullable=True)
    feedback_summary = Column(Text, nullable=True)
    start_time = Column(DateTime, default=utc_now, nullable=False)
    end_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    logs = relationship("InterviewLog", back_populates="session", cascade="all, delete-orphan")

    def get_section_state(self):
        if not self.section_state_json:
            return {}
        try:
            return json.loads(self.section_state_json)
        except Exception:
            return {}

    def set_section_state(self, state_dict):
        self.section_state_json = json.dumps(state_dict)

    def to_dict(self):
        return {
            "id": self.id,
            "resume_id": self.resume_id,
            "candidate_name": self.candidate_name,
            "candidate_email": self.candidate_email,
            "role": self.role,
            "status": self.status,
            "current_section": self.current_section or "SECTION_1_INTRO",
            "current_step_index": self.current_step_index,
            "total_predefined_questions": self.total_predefined_questions,
            "section_state": self.get_section_state(),
            "overall_score": self.overall_score,
            "feedback_summary": self.feedback_summary or "",
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class InterviewLog(Base):
    """
    Interview Log model storing candidate transcript, audio metadata, question evaluation metrics & follow-ups.
    """
    __tablename__ = "interview_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(Integer, ForeignKey("interview_questions.question_id", ondelete="SET NULL"), nullable=True, index=True)
    section = Column(String(50), nullable=False, default="SECTION_1_INTRO", index=True)
    question_type = Column(String(50), nullable=False, default="TECHNICAL")
    step_type = Column(String(50), nullable=False, default="PREDEFINED", comment="PREDEFINED, FOLLOW_UP, CODING")
    question_text = Column(Text, nullable=False)
    golden_answer = Column(Text, nullable=True)
    expected_keywords = Column(Text, nullable=True)
    candidate_transcript = Column(Text, nullable=False)
    audio_metadata = Column(Text, nullable=True, comment="JSON string of duration, mime type, etc.")
    keyword_match_score = Column(Float, nullable=False, default=0.0)
    semantic_similarity_score = Column(Float, nullable=False, default=0.0)
    concept_score = Column(Float, nullable=False, default=0.0)
    rubric_score = Column(Float, nullable=False, default=0.0)
    overall_question_score = Column(Float, nullable=False, default=0.0)
    eval_feedback = Column(Text, nullable=True)
    followup_question_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    session = relationship("InterviewSession", back_populates="logs")

    def to_dict(self):
        audio_meta = None
        if self.audio_metadata:
            try:
                audio_meta = json.loads(self.audio_metadata)
            except Exception:
                audio_meta = {"raw": self.audio_metadata}

        return {
            "id": self.id,
            "session_id": self.session_id,
            "question_id": self.question_id,
            "section": self.section or "SECTION_1_INTRO",
            "question_type": self.question_type or "TECHNICAL",
            "step_type": self.step_type,
            "question_text": self.question_text,
            "golden_answer": self.golden_answer or "",
            "expected_keywords": self.expected_keywords or "",
            "candidate_transcript": self.candidate_transcript,
            "audio_metadata": audio_meta,
            "keyword_match_score": self.keyword_match_score,
            "semantic_similarity_score": self.semantic_similarity_score,
            "concept_score": self.concept_score,
            "rubric_score": self.rubric_score,
            "overall_question_score": self.overall_question_score,
            "eval_feedback": self.eval_feedback or "",
            "followup_question_text": self.followup_question_text or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }



