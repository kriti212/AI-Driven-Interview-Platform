from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, EmailStr, Field

class ResumeBase(BaseModel):
    filename: str
    file_size_bytes: int
    mime_type: str

class ResumeResponse(ResumeBase):
    id: int
    stored_filename: str
    file_path: str
    status: str
    upload_timestamp: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ResumeUploadSuccess(BaseModel):
    message: str
    resume: ResumeResponse

class CandidateProfileBase(BaseModel):
    name: str = Field(..., description="Candidate Full Name")
    email: str = Field(..., description="Candidate Email Address")
    phone: str = Field("", description="Candidate Phone Number")
    education: Optional[str] = Field("", description="Educational Qualifications")
    skills: List[str] = Field(default_factory=list, description="List of Data Science and tech skills")
    projects: Optional[str] = Field("", description="Key projects summary")
    certifications: Optional[str] = Field("", description="Certifications and courses")
    internships: Optional[str] = Field("", description="Internships or work experience")
    college: Optional[str] = Field("", description="College/University Name")
    cgpa: Optional[str] = Field("", description="CGPA / GPA Score")
    graduation_year: Optional[str] = Field("", description="Graduation Year")
    is_verified: bool = Field(False, description="Flag indicating if candidate reviewed & approved data")

class CandidateProfileCreate(CandidateProfileBase):
    resume_id: int

class CandidateProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    education: Optional[str] = None
    skills: Optional[List[str]] = None
    projects: Optional[str] = None
    certifications: Optional[str] = None
    internships: Optional[str] = None
    college: Optional[str] = None
    cgpa: Optional[str] = None
    graduation_year: Optional[str] = None
    is_verified: Optional[bool] = True

class CandidateProfileResponse(CandidateProfileBase):
    id: int
    resume_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ResumeProcessResponse(BaseModel):
    message: str
    resume_id: int
    status: str
    profile: CandidateProfileBase
    processing_time_seconds: float

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None


class InterviewQuestionBase(BaseModel):
    question_id: int = Field(..., description="Unique Question ID (e.g. 1 to 33)")
    rewritten_question: str = Field(..., description="Rewritten professional interview question")
    golden_answer: str = Field(..., description="Detailed golden answer (interview-quality)")
    topic: str = Field(..., description="Topic area / domain tag")
    difficulty: str = Field(..., description="Difficulty level (Easy, Medium, Hard)")
    expected_keywords: str = Field(..., description="Expected keywords for candidate evaluation")
    question_type: Optional[str] = Field("TECHNICAL", description="TECHNICAL, CODING, or BEHAVIORAL")

class InterviewQuestionCreate(InterviewQuestionBase):
    pass

class InterviewQuestionResponse(InterviewQuestionBase):
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InterviewStartRequest(BaseModel):
    resume_id: int = Field(..., description="Uploaded Resume ID")
    candidate_name: str = Field(..., description="Candidate Full Name")
    candidate_email: str = Field(..., description="Candidate Email Address")
    role: str = Field("Data Scientist (Fresher)", description="Target Role")
    force_new: bool = Field(False, description="Force start a new interview attempt session")

class InterviewSessionResponse(BaseModel):
    session_id: int
    resume_id: int
    candidate_name: str
    candidate_email: str
    role: str
    status: str
    current_section: str = Field("SECTION_1_INTRO", description="SECTION_1_INTRO, SECTION_2_TECHNICAL, SECTION_3_CODING, SECTION_4_BEHAVIORAL, COMPLETED")
    current_step_index: int
    total_predefined_questions: int
    active_question: Optional[dict] = None
    is_completed: bool = False
    message: str = ""

class AnswerSubmissionRequest(BaseModel):
    session_id: int = Field(..., description="Active interview session ID")
    question_id: int = Field(0, description="Predefined question ID")
    step_type: str = Field("PREDEFINED", description="PREDEFINED, FOLLOW_UP, or CODING")
    question_text: str = Field(..., description="The prompt given to candidate")
    candidate_transcript: str = Field(..., description="Real-time transcribed text from microphone or code submission")
    audio_metadata: Optional[dict] = Field(default_factory=dict, description="Audio length, mime, sample rate metadata")
    section: Optional[str] = Field(None, description="SECTION_1_INTRO, SECTION_2_TECHNICAL, SECTION_3_CODING, SECTION_4_BEHAVIORAL")

class AnswerEvaluationResponse(BaseModel):
    log_id: int
    session_id: int
    question_id: int
    step_type: str
    question_text: str
    candidate_transcript: str
    keyword_match_score: float
    semantic_similarity_score: float
    concept_score: float
    rubric_score: float
    overall_question_score: float
    eval_feedback: str
    followup_question_text: Optional[str] = None
    next_step_type: str  # "FOLLOW_UP", "NEXT_PREDEFINED", "NEXT_SECTION", or "FINISH"
    next_question: Optional[dict] = None
    current_section: Optional[str] = None

class InterviewResultSummary(BaseModel):
    session_id: int
    candidate_name: str
    candidate_email: str
    role: str
    status: str
    overall_score: float
    feedback_summary: str
    total_questions_answered: int
    start_time: str
    end_time: Optional[str] = None
    logs: List[dict] = Field(default_factory=list)


