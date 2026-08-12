"""
seed_questions.py
-----------------
Extracts questions and golden answers from Word documents (.docx files)
and seeds them into the SQL database (`interview_db` or SQLite fallback).

Target Schema in interview_db:
- question_id (INT PRIMARY KEY)
- rewritten_question (TEXT)
- golden_answer (LONGTEXT)
- topic (VARCHAR)
- difficulty (VARCHAR)
- expected_keywords (TEXT)
"""

import os
import sys
import logging
from pathlib import Path
import docx

# Ensure backend path is in sys.path
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from database import engine, SessionLocal, Base, init_db
from models import InterviewQuestion

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed_questions")


def get_docx_files():
    """Returns candidate file paths for Q1-Q11, Q12-Q22, Q23-Q33."""
    file_groups = [
        ["Interview_Golden_Answers_Q1_Q11.docx", "Interview_Golden_Answers_Q1_to_Q11.docx"],
        ["Interview_Golden_Answers_Q12_to_Q22.docx", "Interview_Golden_Answers_Q12_Q22.docx"],
        ["Interview_Golden_Answers_Q23_to_Q33.docx", "Interview_Golden_Answers_Q23_Q33.docx"],
    ]

    found_files = []
    search_dirs = [PROJECT_ROOT, BASE_DIR]

    for group in file_groups:
        matched = None
        for filename in group:
            for s_dir in search_dirs:
                target_path = s_dir / filename
                if target_path.exists():
                    matched = target_path
                    break
            if matched:
                break
        if matched:
            found_files.append(matched)
        else:
            logger.warning(f"Could not find docx file for group {group}")

    return found_files


def extract_questions_from_docx(file_paths):
    """
    Parses table data from docx files.
    Expected Table Columns:
    0: Question ID
    1: Rewritten professional interview question
    2: Detailed golden answer (interview-quality)
    3: Topic
    4: Difficulty
    5: Expected keywords
    """
    parsed_questions = []

    for fpath in file_paths:
        logger.info(f"Reading file: {fpath.name}")
        doc = docx.Document(fpath)

        if not doc.tables:
            logger.warning(f"No tables found in {fpath.name}")
            continue

        table = doc.tables[0]
        # Skip header row (row 0)
        for row_idx, row in enumerate(table.rows[1:], start=2):
            cells = [cell.text.strip() for cell in row.cells]

            if len(cells) < 6:
                logger.warning(f"Row {row_idx} in {fpath.name} has fewer than 6 cells. Skipping.")
                continue

            try:
                q_id = int(cells[0].strip())
            except ValueError:
                logger.warning(f"Invalid Question ID '{cells[0]}' in {fpath.name} line {row_idx}. Skipping.")
                continue

            rewritten_q = cells[1].strip()
            golden_ans = cells[2].strip()
            topic = cells[3].strip()
            difficulty = cells[4].strip()
            keywords = cells[5].strip()

            q_type = "TECHNICAL"
            if "behavioral" in topic.lower() or "conflict" in topic.lower() or "leadership" in topic.lower():
                q_type = "BEHAVIORAL"
            elif "coding" in topic.lower() or "programming" in topic.lower() or "code" in rewritten_q.lower():
                q_type = "CODING"

            parsed_questions.append({
                "question_id": q_id,
                "rewritten_question": rewritten_q,
                "golden_answer": golden_ans,
                "topic": topic,
                "difficulty": difficulty,
                "expected_keywords": keywords,
                "question_type": q_type,
            })

    # Sort questions by question_id
    parsed_questions.sort(key=lambda x: x["question_id"])
    logger.info(f"Total questions parsed successfully: {len(parsed_questions)}")
    return parsed_questions


def generate_sql_seed_file(questions, output_path):
    """Generates a raw .sql file with CREATE TABLE and INSERT statements."""
    lines = [
        "-- interview_db SQL Seed File for Golden Questions & Answers",
        "-- Generated automatically by seed_questions.py",
        "",
        "USE interview_db;",
        "",
        "CREATE TABLE IF NOT EXISTS interview_questions (",
        "    question_id INT PRIMARY KEY COMMENT 'Question ID (1 to 33)',",
        "    rewritten_question TEXT NOT NULL COMMENT 'Rewritten professional interview question',",
        "    golden_answer LONGTEXT NOT NULL COMMENT 'Detailed golden answer (interview-quality)',",
        "    topic VARCHAR(255) NOT NULL COMMENT 'Topic / Domain area',",
        "    difficulty VARCHAR(50) NOT NULL COMMENT 'Difficulty level (Easy, Medium, Hard)',",
        "    expected_keywords TEXT NOT NULL COMMENT 'Comma-separated expected keywords',",
        "    question_type VARCHAR(50) NOT NULL DEFAULT 'TECHNICAL' COMMENT 'TECHNICAL, CODING, BEHAVIORAL',",
        "    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,",
        "    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,",
        "    INDEX idx_topic (topic),",
        "    INDEX idx_difficulty (difficulty),",
        "    INDEX idx_question_type (question_type)",
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",
        "",
    ]

    def escape_sql_str(val):
        return val.replace("'", "''").replace("\\", "\\\\")

    for q in questions:
        q_id = q["question_id"]
        q_text = escape_sql_str(q["rewritten_question"])
        g_ans = escape_sql_str(q["golden_answer"])
        topic = escape_sql_str(q["topic"])
        diff = escape_sql_str(q["difficulty"])
        kw = escape_sql_str(q["expected_keywords"])
        q_type = escape_sql_str(q.get("question_type", "TECHNICAL"))

        sql_stmt = (
            f"INSERT INTO interview_questions (question_id, rewritten_question, golden_answer, topic, difficulty, expected_keywords, question_type)\n"
            f"VALUES ({q_id}, '{q_text}', '{g_ans}', '{topic}', '{diff}', '{kw}', '{q_type}')\n"
            f"ON DUPLICATE KEY UPDATE\n"
            f"  rewritten_question = VALUES(rewritten_question),\n"
            f"  golden_answer = VALUES(golden_answer),\n"
            f"  topic = VALUES(topic),\n"
            f"  difficulty = VALUES(difficulty),\n"
            f"  expected_keywords = VALUES(expected_keywords),\n"
            f"  question_type = VALUES(question_type);\n"
        )
        lines.append(sql_stmt)

    with open(output_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    logger.info(f"Saved raw SQL seed file to: {output_path}")


def seed_database(questions):
    """Inserts or updates all parsed questions in the target SQL database using SQLAlchemy."""
    init_db()  # Ensures tables exist
    session = SessionLocal()

    inserted_count = 0
    updated_count = 0

    try:
        for q_data in questions:
            existing = session.query(InterviewQuestion).filter_by(question_id=q_data["question_id"]).first()

            if existing:
                existing.rewritten_question = q_data["rewritten_question"]
                existing.golden_answer = q_data["golden_answer"]
                existing.topic = q_data["topic"]
                existing.difficulty = q_data["difficulty"]
                existing.expected_keywords = q_data["expected_keywords"]
                existing.question_type = q_data.get("question_type", "TECHNICAL")
                updated_count += 1
            else:
                new_q = InterviewQuestion(
                    question_id=q_data["question_id"],
                    rewritten_question=q_data["rewritten_question"],
                    golden_answer=q_data["golden_answer"],
                    topic=q_data["topic"],
                    difficulty=q_data["difficulty"],
                    expected_keywords=q_data["expected_keywords"],
                    question_type=q_data.get("question_type", "TECHNICAL"),
                )
                session.add(new_q)
                inserted_count += 1

        session.commit()
        logger.info(f"Database Seeding Complete: {inserted_count} inserted, {updated_count} updated.")
    except Exception as e:
        session.rollback()
        logger.error(f"Error seeding database: {e}", exc_info=True)
        raise
    finally:
        session.close()


def main():
    docx_files = get_docx_files()
    if not docx_files:
        logger.error("No valid docx files found! Exiting.")
        sys.exit(1)

    questions = extract_questions_from_docx(docx_files)
    if not questions:
        logger.error("No questions parsed from docx files! Exiting.")
        sys.exit(1)

    # 1. Seed database (MySQL or SQLite fallback)
    seed_database(questions)

    # 2. Export SQL dump script
    sql_out_path = BASE_DIR / "interview_questions_seed.sql"
    generate_sql_seed_file(questions, sql_out_path)

    logger.info("🎉 All operations completed successfully!")


if __name__ == "__main__":
    main()
