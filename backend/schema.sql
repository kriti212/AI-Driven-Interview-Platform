-- Database creation script for AI-Powered Data Scientist Interview Platform
-- Database: interview_db

CREATE DATABASE IF NOT EXISTS interview_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE interview_db;

-- Table structure for storing student resume uploads
CREATE TABLE IF NOT EXISTS resumes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL COMMENT 'Original name of uploaded resume file',
    stored_filename VARCHAR(255) NOT NULL COMMENT 'Unique filename saved on disk',
    file_path VARCHAR(500) NOT NULL COMMENT 'Absolute or relative file storage path',
    file_size_bytes BIGINT NOT NULL COMMENT 'File size in bytes',
    mime_type VARCHAR(100) NOT NULL COMMENT 'Validated MIME type (application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, etc)',
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED' COMMENT 'Status: UPLOADED, PROCESSING, PROCESSED, FAILED',
    upload_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when file was uploaded',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_upload_timestamp (upload_timestamp),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for storing extracted and candidate-verified details
CREATE TABLE IF NOT EXISTS candidate_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL DEFAULT 'Candidate Name',
    email VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(50) NOT NULL DEFAULT '',
    education TEXT NULL,
    skills TEXT NULL COMMENT 'JSON array string of extracted skills',
    projects TEXT NULL,
    certifications TEXT NULL,
    internships TEXT NULL,
    college VARCHAR(255) NULL,
    cgpa VARCHAR(50) NULL,
    graduation_year VARCHAR(20) NULL,
    is_verified TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 if candidate reviewed & approved data',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_candidate_profiles_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    INDEX idx_resume_id (resume_id),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for storing interview questions and golden answers
CREATE TABLE IF NOT EXISTS interview_questions (
    question_id INT PRIMARY KEY COMMENT 'Question ID (1 to 33)',
    rewritten_question TEXT NOT NULL COMMENT 'Rewritten professional interview question',
    golden_answer LONGTEXT NOT NULL COMMENT 'Detailed golden answer (interview-quality)',
    topic VARCHAR(255) NOT NULL COMMENT 'Topic / Domain area',
    difficulty VARCHAR(50) NOT NULL COMMENT 'Difficulty level (Easy, Medium, Hard)',
    expected_keywords TEXT NOT NULL COMMENT 'Comma-separated expected keywords',
    question_type VARCHAR(50) NOT NULL DEFAULT 'TECHNICAL' COMMENT 'TECHNICAL, CODING, BEHAVIORAL',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_topic (topic),
    INDEX idx_difficulty (difficulty),
    INDEX idx_question_type (question_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for storing interview sessions (supports multiple attempts per candidate)
CREATE TABLE IF NOT EXISTS interview_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resume_id INT NOT NULL COMMENT 'Foreign key to resumes.id (supports multiple interview attempts per candidate)',
    candidate_name VARCHAR(255) NOT NULL,
    candidate_email VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'Data Scientist (Fresher)' COMMENT 'Exclusive targeted role',
    status VARCHAR(50) NOT NULL DEFAULT 'IN_PROGRESS' COMMENT 'IN_PROGRESS, COMPLETED, TERMINATED',
    current_section VARCHAR(50) NOT NULL DEFAULT 'SECTION_1_INTRO' COMMENT 'SECTION_1_INTRO, SECTION_2_TECHNICAL, SECTION_3_CODING, SECTION_4_BEHAVIORAL, COMPLETED',
    current_step_index INT NOT NULL DEFAULT 0 COMMENT 'Index of active predefined question within current section',
    total_predefined_questions INT NOT NULL DEFAULT 5 COMMENT 'Number of predefined questions in session',
    section_state_json LONGTEXT NULL COMMENT 'JSON tracking selected section topics, questions, and coding submission',
    overall_score FLOAT NULL COMMENT 'Final aggregated percentage score (0-100)',
    feedback_summary LONGTEXT NULL COMMENT 'Comprehensive LLM evaluation summary',
    start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_interview_sessions_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
    INDEX idx_resume_id (resume_id),
    INDEX idx_status (status),
    INDEX idx_current_section (current_section),
    INDEX idx_candidate_email (candidate_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for storing question-by-question candidate transcripts, audio metadata & evaluations
CREATE TABLE IF NOT EXISTS interview_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL COMMENT 'Foreign key to interview_sessions.id',
    question_id INT NULL COMMENT 'Foreign key to interview_questions.question_id (NULL for dynamic/intro/coding)',
    section VARCHAR(50) NOT NULL DEFAULT 'SECTION_1_INTRO' COMMENT 'SECTION_1_INTRO, SECTION_2_TECHNICAL, SECTION_3_CODING, SECTION_4_BEHAVIORAL',
    question_type VARCHAR(50) NOT NULL DEFAULT 'TECHNICAL' COMMENT 'TECHNICAL, CODING, BEHAVIORAL',
    step_type VARCHAR(50) NOT NULL DEFAULT 'PREDEFINED' COMMENT 'PREDEFINED, FOLLOW_UP, CODING',
    question_text TEXT NOT NULL COMMENT 'Prompt presented to candidate',
    golden_answer LONGTEXT NULL COMMENT 'Reference golden answer for scoring',
    expected_keywords TEXT NULL COMMENT 'Target expected keywords',
    candidate_transcript LONGTEXT NOT NULL COMMENT 'Real-time transcribed speech or code submission',
    audio_metadata TEXT NULL COMMENT 'JSON string storing audio duration, mime type, sample rate, etc.',
    keyword_match_score FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Keyword presence score (0-100)',
    semantic_similarity_score FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Semantic TF-IDF similarity score (0-100)',
    concept_score FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Concept understanding score (0-100)',
    rubric_score FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Overall rubric evaluation score (0-100)',
    overall_question_score FLOAT NOT NULL DEFAULT 0.0 COMMENT 'Composite weighted score for question',
    eval_feedback LONGTEXT NULL COMMENT 'Detailed evaluation breakdown and feedback',
    followup_question_text TEXT NULL COMMENT 'Generated LLM follow-up question text',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_interview_logs_session FOREIGN KEY (session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE,
    INDEX idx_session_id (session_id),
    INDEX idx_question_id (question_id),
    INDEX idx_section (section)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



