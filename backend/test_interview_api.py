"""
test_interview_api.py
---------------------
Standard Python unittest suite for AI-Powered Data Scientist Interview Platform.
Verifies topic and question random selection from MySQL database,
4 technical questions flow without live follow-ups, and post-interview LLM evaluation.

Run with: `python backend/test_interview_api.py`
"""

import os
import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure backend path is in sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Force SQLite fallback for standalone unittest environment
os.environ["USE_SQLITE_FALLBACK"] = "true"

from main import app
from database import engine, SessionLocal, Base, init_db
from models import Resume, CandidateProfile, InterviewQuestion, InterviewSession, InterviewLog
from services.evaluation_service import evaluate_response, compute_keyword_match_score, compute_tfidf_cosine_similarity
from services.llm_service import LLM_MODEL_NAME

client = TestClient(app)


class TestInterviewModule(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Initializes database tables and seeds test data."""
        Base.metadata.drop_all(bind=engine)
        init_db()
        db = SessionLocal()

        # Seed test resume
        test_resume = db.query(Resume).filter(Resume.filename == "test_ds_fresher.pdf").first()
        if not test_resume:
            test_resume = Resume(
                filename="test_ds_fresher.pdf",
                stored_filename="stored_test_ds_fresher.pdf",
                file_path="/tmp/test_ds_fresher.pdf",
                file_size_bytes=1024,
                mime_type="application/pdf",
                status="PROCESSED"
            )
            db.add(test_resume)
            db.commit()
            db.refresh(test_resume)

            test_profile = CandidateProfile(
                resume_id=test_resume.id,
                name="Alex Mercer",
                email="alex.mercer@example.com",
                skills='["Python", "Machine Learning", "SQL", "Pandas"]',
                is_verified=True
            )
            db.add(test_profile)
        cls.resume_id = test_resume.id

        # Clean up any existing session for clean test run
        db.query(InterviewSession).filter(InterviewSession.resume_id == cls.resume_id).delete()
        db.commit()

        # Ensure predefined questions exist for 4 distinct technical topics
        if db.query(InterviewQuestion).count() == 0:
            q1 = InterviewQuestion(
                question_id=1,
                rewritten_question="Explain vector embeddings and how to interpret them on a 2D graph.",
                golden_answer="Vector embeddings represent high-dimensional data as dense vectors in continuous space where semantic similarity corresponds to spatial proximity using metrics like cosine similarity. PCA or t-SNE are used for 2D visualization.",
                topic="Embeddings",
                difficulty="Medium",
                expected_keywords="embedding, PCA, t-SNE, cosine similarity",
                question_type="TECHNICAL"
            )
            q2 = InterviewQuestion(
                question_id=2,
                rewritten_question="Given an employee salary-by-quarter table and exit table, explain how to build an SQL dataset for attrition classification.",
                golden_answer="Use a LEFT JOIN between quarterly salary tables and exit records using employee ID, calculate quarterly tenure, generate binary attrition target labels using CASE WHEN, and impute missing features.",
                topic="SQL",
                difficulty="Medium",
                expected_keywords="LEFT JOIN, CASE, labels, feature engineering, NULL",
                question_type="TECHNICAL"
            )
            q3 = InterviewQuestion(
                question_id=3,
                rewritten_question="What is the difference between L1 and L2 regularization in logistic regression?",
                golden_answer="L1 regularization adds absolute weight values penalizing features to zero creating sparse models. L2 adds squared weights penalizing large weights.",
                topic="Machine Learning",
                difficulty="Medium",
                expected_keywords="L1, L2, regularization, lasso, ridge, weights",
                question_type="TECHNICAL"
            )
            q4 = InterviewQuestion(
                question_id=4,
                rewritten_question="What is the central limit theorem and why is it important in statistical inference?",
                golden_answer="The Central Limit Theorem states that the sampling distribution of the sample mean approaches a normal distribution as sample size increases regardless of population distribution.",
                topic="Statistics",
                difficulty="Medium",
                expected_keywords="sample mean, normal distribution, sample size, population",
                question_type="TECHNICAL"
            )
            db.add_all([q1, q2, q3, q4])
            db.commit()

        db.close()

    def test_01_evaluation_service_metrics(self):
        """Tests evaluation service for candidate technical answer."""
        cand_text = "Vector embeddings map data into continuous vector space using cosine similarity and PCA for t-SNE dimension reduction."
        gold_text = "Vector embeddings represent high-dimensional data as dense vectors where spatial proximity matches cosine similarity. PCA and t-SNE are used."
        expected_kw = "embedding, PCA, t-SNE, cosine similarity"

        kw_score = compute_keyword_match_score(cand_text, expected_kw)
        self.assertGreaterEqual(kw_score, 75.0)

        sim_score = compute_tfidf_cosine_similarity(cand_text, gold_text)
        self.assertGreater(sim_score, 30.0)

        eval_res = evaluate_response(cand_text, gold_text, expected_kw, "Embeddings", "Medium", step_type="PREDEFINED")
        self.assertIn("overall_question_score", eval_res)
        self.assertGreaterEqual(eval_res["overall_question_score"], 0.0)

    def test_02_llm_model_configuration(self):
        """Verifies Ollama model configuration parameter."""
        self.assertEqual(LLM_MODEL_NAME, "gemma4:e2b")

    def test_03_multiple_interview_attempts(self):
        """Tests starting new interview attempts."""
        payload = {
            "resume_id": self.resume_id,
            "candidate_name": "Alex Mercer",
            "candidate_email": "alex.mercer@example.com",
            "role": "Data Scientist (Fresher)"
        }

        response1 = client.post("/api/interview/start", json=payload)
        self.assertEqual(response1.status_code, 200)
        data1 = response1.json()
        session1_id = data1["session_id"]

        payload2 = dict(payload)
        payload2["force_new"] = True
        response2 = client.post("/api/interview/start", json=payload2)
        self.assertEqual(response2.status_code, 200)
        data2 = response2.json()
        session2_id = data2["session_id"]

        self.assertNotEqual(session1_id, session2_id)

    def test_04_six_question_interview_flow_with_coding(self):
        """Tests full progression through 4 Technical questions from DB + 2 LLM Coding questions and finish."""
        payload = {
            "resume_id": self.resume_id,
            "candidate_name": "Test Candidate",
            "candidate_email": "test.candidate@example.com",
            "role": "Data Scientist (Fresher)",
            "force_new": True
        }

        # 1. Start Session
        start_res = client.post("/api/interview/start", json=payload)
        self.assertEqual(start_res.status_code, 200)
        sess = start_res.json()
        session_id = sess["session_id"]
        self.assertEqual(sess["total_predefined_questions"], 6)
        self.assertIsNotNone(sess["active_question"])

        # 2. Sequential submission across all 6 questions (4 Technical + 2 Coding)
        for idx in range(6):
            q_active = sess["active_question"]
            self.assertIsNotNone(q_active)

            ans_text = (
                "def solve_problem(df):\n    return df.dropna().median()"
                if idx >= 4 else
                f"Answer for question {idx + 1} with technical explanation and details."
            )

            sub_res = client.post("/api/interview/submit-answer", json={
                "session_id": session_id,
                "question_id": q_active["question_id"],
                "step_type": "CODING" if idx >= 4 else "PREDEFINED",
                "question_text": q_active.get("rewritten_question") or q_active.get("question_text", ""),
                "candidate_transcript": ans_text
            })
            self.assertEqual(sub_res.status_code, 200)
            eval_data = sub_res.json()

            if idx < 5:
                self.assertIn(eval_data["next_step_type"], ["NEXT_PREDEFINED", "NEXT_SECTION"])
                self.assertIsNotNone(eval_data["next_question"])
                sess["active_question"] = eval_data["next_question"]
            else:
                self.assertEqual(eval_data["next_step_type"], "FINISH")

        # 3. Finish session
        finish_res = client.post(f"/api/interview/finish?session_id={session_id}")
        self.assertEqual(finish_res.status_code, 200)
        fin_data = finish_res.json()
        self.assertEqual(fin_data["status"], "COMPLETED")

    def test_05_admin_dashboard_apis(self):
        """Tests Admin HR Analytics APIs (Dashboard Stats, Candidates, Report, Comparison, Analytics, CSV)."""
        # 1. Dashboard Stats API
        stats_res = client.get("/api/admin/dashboard-stats")
        self.assertEqual(stats_res.status_code, 200)
        stats = stats_res.json()
        self.assertIn("kpi", stats)
        self.assertIn("score_distribution", stats)

        # 2. Candidates Directory List API
        cands_res = client.get("/api/admin/candidates")
        self.assertEqual(cands_res.status_code, 200)
        cands = cands_res.json()
        self.assertIn("candidates", cands)

        # 3. Candidate Detail Report API
        if cands["candidates"]:
          sid = cands["candidates"][0]["session_id"]
          rep_res = client.get(f"/api/admin/candidate/{sid}")
          self.assertEqual(rep_res.status_code, 200)

          # 4. Candidate Comparison API
          comp_res = client.get(f"/api/admin/candidate-comparison?session_ids={sid}")
          self.assertEqual(comp_res.status_code, 200)

        # 5. Question Analytics API
        q_res = client.get("/api/admin/question-analytics")
        self.assertEqual(q_res.status_code, 200)

        # 6. Export CSV API
        csv_res = client.get("/api/admin/export/csv")
        self.assertEqual(csv_res.status_code, 200)
        self.assertIn("text/csv", csv_res.headers["content-type"])


if __name__ == "__main__":
    unittest.main()


