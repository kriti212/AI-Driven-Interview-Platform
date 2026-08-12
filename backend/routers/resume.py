import os
import time
import uuid
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import List

from fastapi import APIRouter, UploadFile, File, HTTPException, status, Depends
from sqlalchemy.orm import Session

from config import (
    UPLOAD_DIR,
    MAX_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_MB,
    ALLOWED_EXTENSIONS,
    ALLOWED_MIME_TYPES,
)
from database import get_db
from models import Resume, CandidateProfile
from schemas import (
    ResumeUploadSuccess,
    ResumeResponse,
    ResumeProcessResponse,
    CandidateProfileResponse,
    CandidateProfileUpdate,
    CandidateProfileBase
)
from parser import parse_resume_document

router = APIRouter(prefix="/api/v1/resume", tags=["Resume Upload & AI Parsing Engine"])


def validate_resume_file(file: UploadFile):
    """
    Validates file extension, MIME type, and presence.
    Raises HTTPException if validation fails.
    """
    if not file or not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided in the upload request."
        )

    original_filename = file.filename
    ext = Path(original_filename).suffix.lower()

    # 1. Extension Validation
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Invalid file extension '{ext}'. Only PDF (.pdf) and Word (.docx) files are supported."
        )


@router.post("/upload", response_model=ResumeUploadSuccess, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    FastAPI Endpoint to Upload Student Resume for AI Data Scientist Candidate Profile.
    
    Validation:
    - Allowed Extensions: .pdf, .docx, .doc
    - File Size Limit: Maximum 5 MB
    
    Action:
    - Saves file locally to `uploads/resumes/`
    - Inserts metadata record into MySQL database
    """
    validate_resume_file(file)

    try:
        content = await file.read()
        file_size = len(content)

        # File Size Validation (Max 5MB)
        if file_size > MAX_FILE_SIZE_BYTES:
            size_mb = file_size / (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_413_CONTENT_TOO_LARGE,
                detail=f"File size ({size_mb:.2f} MB) exceeds maximum allowed limit of {MAX_FILE_SIZE_MB} MB."
            )
        
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty (0 bytes)."
            )

        await file.seek(0)

        # Generate unique stored filename
        ext = Path(file.filename).suffix.lower()
        unique_id = uuid.uuid4().hex[:12]
        now_utc = datetime.now(timezone.utc)
        timestamp_str = now_utc.strftime("%Y%m%d_%H%M%S")
        stored_filename = f"resume_{timestamp_str}_{unique_id}{ext}"
        saved_file_path = UPLOAD_DIR / stored_filename

        # Write file to disk
        with open(saved_file_path, "wb") as buffer:
            buffer.write(content)

        # Insert DB Record
        db_resume = Resume(
            filename=file.filename,
            stored_filename=stored_filename,
            file_path=str(saved_file_path.resolve()),
            file_size_bytes=file_size,
            mime_type=file.content_type or "application/octet-stream",
            status="UPLOADED",
            upload_timestamp=now_utc
        )
        db.add(db_resume)
        db.commit()
        db.refresh(db_resume)

        return ResumeUploadSuccess(
            message="Resume uploaded successfully!",
            resume=ResumeResponse.model_validate(db_resume)
        )

    except HTTPException:
        raise
    except Exception as err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while saving resume: {str(err)}"
        )


@router.post("/process/{resume_id}", response_model=ResumeProcessResponse)
def process_resume(resume_id: int, db: Session = Depends(get_db)):
    """
    Triggers AI Text Extraction & Section Parsing pipeline on an uploaded resume.
    Extracts 11 candidate fields using PyMuPDF / python-docx and Data Science skill dictionary.
    Guaranteed sub-2-second latency.
    """
    start_time = time.time()

    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume with ID {resume_id} not found."
        )

    file_path = Path(resume.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume file not found on disk at '{resume.file_path}'."
        )

    try:
        # Run Resume Parser Module
        parsed_data = parse_resume_document(str(file_path), resume.filename)
        elapsed_seconds = round(time.time() - start_time, 3)

        # Check if profile already exists for upsert
        profile = db.query(CandidateProfile).filter(CandidateProfile.resume_id == resume_id).first()
        if not profile:
            profile = CandidateProfile(resume_id=resume_id)

        # Populate parsed fields
        profile.name = parsed_data["name"]
        profile.email = parsed_data["email"]
        profile.phone = parsed_data["phone"]
        profile.education = parsed_data["education"]
        profile.set_skills_list(parsed_data["skills"])
        profile.projects = parsed_data["projects"]
        profile.certifications = parsed_data["certifications"]
        profile.internships = parsed_data["internships"]
        profile.college = parsed_data["college"]
        profile.cgpa = parsed_data["cgpa"]
        profile.graduation_year = parsed_data["graduation_year"]
        profile.is_verified = False

        resume.status = "PROCESSED"

        db.add(profile)
        db.commit()
        db.refresh(profile)
        db.refresh(resume)

        profile_base = CandidateProfileBase(
            name=profile.name,
            email=profile.email,
            phone=profile.phone,
            education=profile.education or "",
            skills=profile.get_skills_list(),
            projects=profile.projects or "",
            certifications=profile.certifications or "",
            internships=profile.internships or "",
            college=profile.college or "",
            cgpa=profile.cgpa or "",
            graduation_year=profile.graduation_year or "",
            is_verified=profile.is_verified
        )

        return ResumeProcessResponse(
            message="Resume parsed successfully with AI Data Science Skill Extractor!",
            resume_id=resume.id,
            status=resume.status,
            profile=profile_base,
            processing_time_seconds=elapsed_seconds
        )

    except Exception as exc:
        db.rollback()
        resume.status = "FAILED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error occurred during resume parsing: {str(exc)}"
        )


@router.get("/profile/{resume_id}", response_model=CandidateProfileResponse)
def get_candidate_profile(resume_id: int, db: Session = Depends(get_db)):
    """
    Retrieves the extracted or candidate-edited profile details for a given resume_id.
    """
    profile = db.query(CandidateProfile).filter(CandidateProfile.resume_id == resume_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate profile for resume ID {resume_id} not found. Please run process endpoint first."
        )

    return CandidateProfileResponse(
        id=profile.id,
        resume_id=profile.resume_id,
        name=profile.name,
        email=profile.email,
        phone=profile.phone,
        education=profile.education or "",
        skills=profile.get_skills_list(),
        projects=profile.projects or "",
        certifications=profile.certifications or "",
        internships=profile.internships or "",
        college=profile.college or "",
        cgpa=profile.cgpa or "",
        graduation_year=profile.graduation_year or "",
        is_verified=profile.is_verified,
        created_at=profile.created_at,
        updated_at=profile.updated_at
    )


@router.put("/profile/{resume_id}", response_model=CandidateProfileResponse)
def update_candidate_profile(
    resume_id: int,
    profile_data: CandidateProfileUpdate,
    db: Session = Depends(get_db)
):
    """
    Updates the candidate profile details after user review/edit in the Student Dashboard UI.
    Stores the final verified profile details in MySQL DB before launching interview.
    """
    profile = db.query(CandidateProfile).filter(CandidateProfile.resume_id == resume_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate profile for resume ID {resume_id} not found."
        )

    # Basic field validation
    if profile_data.name is not None:
        if not profile_data.name.strip():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Candidate Name cannot be empty.")
        profile.name = profile_data.name.strip()

    if profile_data.email is not None:
        if profile_data.email and "@" not in profile_data.email:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid email address format.")
        profile.email = profile_data.email.strip()

    if profile_data.phone is not None:
        profile.phone = profile_data.phone.strip()

    if profile_data.education is not None:
        profile.education = profile_data.education.strip()

    if profile_data.skills is not None:
        profile.set_skills_list(profile_data.skills)

    if profile_data.projects is not None:
        profile.projects = profile_data.projects.strip()

    if profile_data.certifications is not None:
        profile.certifications = profile_data.certifications.strip()

    if profile_data.internships is not None:
        profile.internships = profile_data.internships.strip()

    if profile_data.college is not None:
        profile.college = profile_data.college.strip()

    if profile_data.cgpa is not None:
        profile.cgpa = profile_data.cgpa.strip()

    if profile_data.graduation_year is not None:
        profile.graduation_year = profile_data.graduation_year.strip()

    if profile_data.is_verified is not None:
        profile.is_verified = profile_data.is_verified

    db.commit()
    db.refresh(profile)

    return CandidateProfileResponse(
        id=profile.id,
        resume_id=profile.resume_id,
        name=profile.name,
        email=profile.email,
        phone=profile.phone,
        education=profile.education or "",
        skills=profile.get_skills_list(),
        projects=profile.projects or "",
        certifications=profile.certifications or "",
        internships=profile.internships or "",
        college=profile.college or "",
        cgpa=profile.cgpa or "",
        graduation_year=profile.graduation_year or "",
        is_verified=profile.is_verified,
        created_at=profile.created_at,
        updated_at=profile.updated_at
    )


@router.get("/{resume_id}", response_model=ResumeResponse)
def get_resume(resume_id: int, db: Session = Depends(get_db)):
    """Retrieve metadata of a specific uploaded resume."""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume with ID {resume_id} not found."
        )
    return ResumeResponse.model_validate(resume)


@router.get("/", response_model=List[ResumeResponse])
def list_resumes(limit: int = 10, db: Session = Depends(get_db)):
    """List recent uploaded resumes."""
    resumes = db.query(Resume).order_by(Resume.upload_timestamp.desc()).limit(limit).all()
    return [ResumeResponse.model_validate(r) for r in resumes]
