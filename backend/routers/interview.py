"""
interview.py
------------
FastAPI router for LLM-driven Conversation-Focused Data Scientist Interview Platform.

Key Features:
- Conversation-Driven: Zero evaluation overhead during real-time interview loop.
- Structure: 4 Technical Questions across 4 distinct random topics + 1 Coding Question (Total 5).
- Low Latency: Single Ollama LLM call per technical question (1 follow-up question only).
- Post-Interview Evaluation: Asynchronous evaluation run after session finish.
"""

import json
import logging
import random
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from database import get_db, SessionLocal
from models import Resume, CandidateProfile, InterviewQuestion, InterviewSession, InterviewLog
from schemas import (
    InterviewStartRequest,
    InterviewSessionResponse,
    AnswerSubmissionRequest,
    AnswerEvaluationResponse,
    InterviewResultSummary,
)
from services.llm_service import (
    generate_llm_response,
    generate_ds_coding_question_llm,
    generate_dsa_coding_question_llm,
)
from services.evaluation_service import evaluate_response

router = APIRouter(prefix="/api/interview", tags=["AI Speech-to-Speech Interview"])
logger = logging.getLogger("uvicorn")


def utc_now():
    return datetime.now(timezone.utc)


REQUIRED_TECHNICAL_TOPICS = [
    "Python", "SQL", "Statistics", "Machine Learning", "Pandas",
    "NumPy", "Data Visualization", "Feature Engineering",
    "Model Evaluation", "Regression", "Classification", "Deep Learning", "NLP"
]


def build_technical_round_questions(db: Session, max_questions: int = 4) -> List[Dict[str, Any]]:
    """
    1. Fetches all available topics from interview_questions in MySQL.
    2. Randomly selects 4 distinct topics from MySQL.
    3. For each selected topic, fetches 1 question randomly from MySQL database.
    """
    db_topics_query = db.query(InterviewQuestion.topic).filter(
        InterviewQuestion.topic.isnot(None),
        InterviewQuestion.topic != ""
    ).distinct().all()

    available_topics = [t[0].strip() for t in db_topics_query if t[0] and t[0].strip()]

    if len(available_topics) >= max_questions:
        selected_topics = random.sample(available_topics, max_questions)
    elif available_topics:
        selected_topics = available_topics.copy()
        random.shuffle(selected_topics)
    else:
        selected_topics = list(REQUIRED_TECHNICAL_TOPICS[:max_questions])
        random.shuffle(selected_topics)

    selected_questions: List[Dict[str, Any]] = []
    used_q_ids = set()

    for topic_name in selected_topics:
        q_list = db.query(InterviewQuestion).filter(
            InterviewQuestion.topic == topic_name
        ).all()

        available_in_topic = [q for q in q_list if q.question_id not in used_q_ids]
        if available_in_topic:
            chosen_q = random.choice(available_in_topic)
            used_q_ids.add(chosen_q.question_id)
            q_dict = chosen_q.to_dict()
            q_dict["section"] = "SECTION_2_TECHNICAL"
            q_dict["section_title"] = f"Technical Round ({chosen_q.topic})"
            selected_questions.append(q_dict)

    if len(selected_questions) < max_questions:
        all_remaining = db.query(InterviewQuestion).filter(
            InterviewQuestion.question_id.notin_(used_q_ids) if used_q_ids else True
        ).all()
        random.shuffle(all_remaining)
        for q in all_remaining:
            if len(selected_questions) >= max_questions:
                break
            used_q_ids.add(q.question_id)
            q_dict = q.to_dict()
            q_dict["section"] = "SECTION_2_TECHNICAL"
            q_dict["section_title"] = f"Technical Round ({q.topic})"
            selected_questions.append(q_dict)

    return selected_questions[:max_questions]


@router.post("/start", response_model=InterviewSessionResponse)
def start_interview_session(req: InterviewStartRequest, db: Session = Depends(get_db)):
    """
    Starts a new interview session.
    Structure: 4 Technical Questions from MySQL DB + 2 LLM-Generated Coding Questions (DS + DSA) = 6 Questions.
    """
    # 1. Verify Resume exists
    resume = db.query(Resume).filter(Resume.id == req.resume_id).first()
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resume ID {req.resume_id} not found. Upload resume before starting interview."
        )

    # 2. Check for an existing IN_PROGRESS session (if force_new is False)
    if not req.force_new:
        existing = db.query(InterviewSession).filter(
            InterviewSession.resume_id == req.resume_id,
            InterviewSession.status == "IN_PROGRESS"
        ).order_by(InterviewSession.created_at.desc()).first()

        if existing:
            state = existing.get_section_state()
            active_q = state.get("active_question")
            if not active_q and state.get("questions"):
                active_q = state["questions"][0]

            return InterviewSessionResponse(
                session_id=existing.id,
                resume_id=existing.resume_id,
                candidate_name=existing.candidate_name,
                candidate_email=existing.candidate_email,
                role=existing.role,
                status=existing.status,
                current_section=existing.current_section or "SECTION_2_TECHNICAL",
                current_step_index=existing.current_step_index,
                total_predefined_questions=existing.total_predefined_questions,
                active_question=active_q,
                is_completed=False,
                message="Resuming active interview session."
            )

    # 3. Prepare 4 Technical Questions from MySQL + 2 Coding Questions generated ONLY by gemma4:e2b
    tech_qs = build_technical_round_questions(db, max_questions=4)
    ds_coding_q = generate_ds_coding_question_llm()
    dsa_coding_q = generate_dsa_coding_question_llm()

    all_qs = tech_qs + [ds_coding_q, dsa_coding_q]
    total_q = len(all_qs)  # Total 6 questions
    first_q = all_qs[0] if all_qs else None

    initial_state = {
        "current_section": "SECTION_2_TECHNICAL",
        "step_type": "PREDEFINED",
        "questions": all_qs,
        "question_index": 0,
        "active_question": first_q,
    }

    # 4. Create new InterviewSession
    new_session = InterviewSession(
        resume_id=req.resume_id,
        candidate_name=req.candidate_name,
        candidate_email=req.candidate_email,
        role=req.role,
        status="IN_PROGRESS",
        current_section="SECTION_2_TECHNICAL",
        current_step_index=0,
        total_predefined_questions=total_q,
        start_time=utc_now(),
    )
    new_session.set_section_state(initial_state)

    db.add(new_session)
    db.commit()
    db.refresh(new_session)

    return InterviewSessionResponse(
        session_id=new_session.id,
        resume_id=new_session.resume_id,
        candidate_name=new_session.candidate_name,
        candidate_email=new_session.candidate_email,
        role=new_session.role,
        status=new_session.status,
        current_section="SECTION_2_TECHNICAL",
        current_step_index=0,
        total_predefined_questions=total_q,
        active_question=first_q,
        is_completed=False,
        message="Technical Data Science Interview session initialized (4 Technical + 2 Coding Questions). Good luck!"
    )


@router.get("/session/{session_id}", response_model=InterviewSessionResponse)
def get_session_status(session_id: int, db: Session = Depends(get_db)):
    """Fetches the current status, section, and active question for a session."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    is_comp = (session.status == "COMPLETED")
    state = session.get_section_state()
    active_q = state.get("active_question") if not is_comp else None

    return InterviewSessionResponse(
        session_id=session.id,
        resume_id=session.resume_id,
        candidate_name=session.candidate_name,
        candidate_email=session.candidate_email,
        role=session.role,
        status=session.status,
        current_section=session.current_section or "SECTION_2_TECHNICAL",
        current_step_index=session.current_step_index,
        total_predefined_questions=session.total_predefined_questions,
        active_question=active_q,
        is_completed=is_comp,
        message="Session status fetched."
    )


@router.post("/submit-answer", response_model=AnswerEvaluationResponse)
def submit_candidate_answer(req: AnswerSubmissionRequest, db: Session = Depends(get_db)):
    """
    Receives candidate answer, saves transcript/code to MySQL database (interview_logs),
    and advances directly to the next question.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == req.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    if session.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Interview session is already completed.")

    state = session.get_section_state()
    current_section = session.current_section or "SECTION_2_TECHNICAL"

    question_ref = db.query(InterviewQuestion).filter(InterviewQuestion.question_id == req.question_id).first()
    golden_ans = question_ref.golden_answer if question_ref else ""
    exp_kws = question_ref.expected_keywords if question_ref else ""
    q_type = question_ref.question_type if question_ref else "TECHNICAL"

    # If golden answer is in active question state dict (for LLM generated coding questions), use it
    active_q_dict = state.get("active_question", {})
    if active_q_dict:
        if active_q_dict.get("golden_answer"):
            golden_ans = active_q_dict["golden_answer"]
        if active_q_dict.get("expected_keywords"):
            exp_kws = active_q_dict["expected_keywords"]
        if active_q_dict.get("question_type"):
            q_type = active_q_dict["question_type"]

    next_step_type = ""
    next_q_dict = None

    all_qs = state.get("questions", state.get("technical_questions", []))
    q_idx = state.get("question_index", state.get("technical_index", 0)) + 1

    state["question_index"] = q_idx
    state["technical_index"] = q_idx
    session.current_step_index = q_idx

    if q_idx < len(all_qs):
        next_q_dict = all_qs[q_idx]
        state["active_question"] = next_q_dict

        if next_q_dict.get("question_type") == "CODING" or "CODING" in next_q_dict.get("section", ""):
            session.current_section = "SECTION_3_CODING"
            state["current_section"] = "SECTION_3_CODING"
            state["step_type"] = "CODING"
            next_step_type = "NEXT_SECTION"
        else:
            state["step_type"] = "PREDEFINED"
            next_step_type = "NEXT_PREDEFINED"
    else:
        # All 6 questions completed -> Finish session
        session.status = "COMPLETED"
        session.current_section = "COMPLETED"
        state["current_section"] = "COMPLETED"
        state["active_question"] = None
        next_q_dict = None
        next_step_type = "FINISH"

    # Save session state to DB
    session.set_section_state(state)
    db.commit()

    valid_q_id = req.question_id if question_ref else None

    # Store Interview Log Entry in MySQL DB
    log_entry = InterviewLog(
        session_id=session.id,
        question_id=valid_q_id,
        section=current_section,
        question_type=q_type,
        step_type="CODING" if q_type == "CODING" else "PREDEFINED",
        question_text=req.question_text,
        golden_answer=golden_ans,
        expected_keywords=exp_kws,
        candidate_transcript=req.candidate_transcript,
        audio_metadata=json.dumps(req.audio_metadata or {}),
        keyword_match_score=0.0,
        semantic_similarity_score=0.0,
        concept_score=0.0,
        rubric_score=0.0,
        overall_question_score=0.0,
        eval_feedback="Evaluation pending until interview finish.",
        followup_question_text=None,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)


    return AnswerEvaluationResponse(
        log_id=log_entry.id,
        session_id=session.id,
        question_id=req.question_id,
        step_type="CODING" if q_type == "CODING" else "PREDEFINED",
        question_text=req.question_text,
        candidate_transcript=req.candidate_transcript,
        keyword_match_score=0.0,
        semantic_similarity_score=0.0,
        concept_score=0.0,
        rubric_score=0.0,
        overall_question_score=0.0,
        eval_feedback="Response saved successfully.",
        followup_question_text=None,
        next_step_type=next_step_type,
        next_question=next_q_dict,
        current_section=session.current_section,
    )


def evaluate_completed_session_task(session_id: int):
    """
    Background Task: Evaluates candidate answers, calculates keyword match,
    TF-IDF similarity, concept score, rubric score, and overall feedback summary AFTER session finish.
    """
    db = SessionLocal()
    try:
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session:
            return

        logs = db.query(InterviewLog).filter(InterviewLog.session_id == session_id).all()
        if not logs:
            session.overall_score = 75.0
            session.feedback_summary = "Session completed. No recorded logs to evaluate."
            db.commit()
            return

        scores = []
        for log in logs:
            # Find reference question
            q_ref = None
            if log.question_id:
                q_ref = db.query(InterviewQuestion).filter(InterviewQuestion.question_id == log.question_id).first()

            golden_ans = log.golden_answer or (q_ref.golden_answer if q_ref else "Standard technical explanation.")
            exp_kws = log.expected_keywords or (q_ref.expected_keywords if q_ref else "data science, python, algorithms")
            topic = q_ref.topic if q_ref else "General Data Science"
            difficulty = q_ref.difficulty if q_ref else "Medium"

            eval_res = evaluate_response(
                candidate_transcript=log.candidate_transcript,
                golden_answer=golden_ans,
                expected_keywords=exp_kws,
                topic=topic,
                difficulty=difficulty,
                step_type=log.step_type,
                question_text=log.question_text
            )

            log.keyword_match_score = eval_res["keyword_match_score"]
            log.semantic_similarity_score = eval_res["semantic_similarity_score"]
            log.concept_score = eval_res["concept_score"]
            log.rubric_score = eval_res["rubric_score"]
            log.overall_question_score = eval_res["overall_question_score"]
            log.eval_feedback = eval_res["eval_feedback"]

            scores.append(eval_res["overall_question_score"])

        overall_avg = round(sum(scores) / len(scores), 2) if scores else 75.0

        summary_prompt = (
            f"Generate a concise 3-sentence performance feedback summary for Data Scientist candidate "
            f"{session.candidate_name} with an overall score of {overall_avg}% across Technical and Coding sections."
        )
        feedback_summary = generate_llm_response(summary_prompt, timeout_seconds=15.0)

        if not feedback_summary or len(feedback_summary) < 20:
            if overall_avg >= 80:
                feedback_summary = (
                    f"Candidate {session.candidate_name} demonstrated exceptional overall performance ({overall_avg}%). "
                    "Technical and coding responses were well-structured, accurate, and interview-ready."
                )
            elif overall_avg >= 60:
                feedback_summary = (
                    f"Candidate {session.candidate_name} achieved a solid overall score of {overall_avg}%. "
                    "Demonstrated good core understanding with minor opportunities to deepen practical implementation details."
                )
            else:
                feedback_summary = (
                    f"Candidate {session.candidate_name} scored {overall_avg}% overall. "
                    "Further preparation in core algorithms, trade-offs, and coding efficiency is recommended."
                )

        # Re-fetch session before committing to prevent StaleDataError if detached or updated concurrently
        session_to_update = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if session_to_update:
            session_to_update.overall_score = overall_avg
            session_to_update.feedback_summary = feedback_summary
            try:
                db.commit()
                logger.info(f"Asynchronous post-interview evaluation completed for Session {session_id} (Score: {overall_avg}%).")
            except Exception as commit_err:
                db.rollback()
                logger.warning(f"Could not commit session {session_id} evaluation: {commit_err}")
    except Exception as e:
        logger.error(f"Error evaluating completed session {session_id}: {e}")
    finally:
        db.close()



@router.post("/finish", response_model=InterviewResultSummary)
def finish_interview_session(
    session_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Finalizes an interview session immediately.
    Schedules asynchronous post-interview evaluation in background.
    """
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    session.status = "COMPLETED"
    session.current_section = "COMPLETED"
    session.end_time = utc_now()
    db.commit()

    # Trigger background evaluation task
    background_tasks.add_task(evaluate_completed_session_task, session_id)

    logs = db.query(InterviewLog).filter(InterviewLog.session_id == session_id).all()
    log_dicts = [l.to_dict() for l in logs]

    return InterviewResultSummary(
        session_id=session.id,
        candidate_name=session.candidate_name,
        candidate_email=session.candidate_email,
        role=session.role,
        status=session.status,
        overall_score=session.overall_score or 0.0,
        feedback_summary=session.feedback_summary or "Evaluation processing in background...",
        total_questions_answered=len(logs),
        start_time=session.start_time.isoformat() if session.start_time else "",
        end_time=session.end_time.isoformat() if session.end_time else "",
        logs=log_dicts,
    )


@router.get("/results/{session_id}", response_model=InterviewResultSummary)
def get_interview_results(session_id: int, db: Session = Depends(get_db)):
    """Retrieves full evaluation report and score breakdown for a completed session."""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found.")

    logs = db.query(InterviewLog).filter(InterviewLog.session_id == session_id).all()
    log_dicts = [l.to_dict() for l in logs]

    return InterviewResultSummary(
        session_id=session.id,
        candidate_name=session.candidate_name,
        candidate_email=session.candidate_email,
        role=session.role,
        status=session.status,
        overall_score=session.overall_score or 0.0,
        feedback_summary=session.feedback_summary or "Evaluation processing...",
        total_questions_answered=len(logs),
        start_time=session.start_time.isoformat() if session.start_time else "",
        end_time=session.end_time.isoformat() if session.end_time else "",
        logs=log_dicts,
    )

