import os
import sys
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

# Ensure backend path is in sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

# Force SQLite for testing environment
os.environ["USE_SQLITE_FALLBACK"] = "true"

from main import app
from database import init_db

class TestResumeUploadAndParserAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        init_db()
        cls.client = TestClient(app)
        cls.pdf_resume_id = None
        cls.docx_resume_id = None

    def test_01_health_check(self):
        """Test API Health Check"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "healthy")

    def test_02_valid_pdf_upload(self):
        """Test uploading a valid PDF resume (<= 5MB)"""
        import fitz
        doc = fitz.open()
        page = doc.new_page()
        page.insert_text((50, 50), 
            "Alexander Mercer\n"
            "Email: alex.mercer@data-ai.org | Phone: +1-555-019-2834\n"
            "Education: B.Tech in Data Science & Machine Learning from Stanford University (2024), CGPA: 9.2/10\n"
            "Technical Skills: Python, SQL, Machine Learning, TensorFlow, PyTorch, Pandas, NumPy, Scikit-learn, MLOps, Tableau\n"
            "Projects: Customer Churn Classification Model using PyTorch and FastAPI\n"
            "Certifications: AWS Certified Data Engineer, Coursera Deep Learning Specialization\n"
            "Internships: Data Science Intern at AI Labs\n"
        )
        pdf_content = doc.tobytes()
        doc.close()

        response = self.client.post(
            "/api/v1/resume/upload",
            files={"file": ("alex_mercer_data_scientist.pdf", pdf_content, "application/pdf")}
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertIn("resume", data)
        resume = data["resume"]
        self.assertEqual(resume["filename"], "alex_mercer_data_scientist.pdf")
        self.assertEqual(resume["status"], "UPLOADED")
        TestResumeUploadAndParserAPI.pdf_resume_id = resume["id"]

    def test_03_valid_docx_upload(self):
        """Test uploading a valid DOCX resume (<= 5MB)"""
        import docx
        doc = docx.Document()
        doc.add_paragraph("Jane Smith")
        doc.add_paragraph("Email: jane.smith@example.com | Phone: +1 555-012-3456")
        doc.add_paragraph("Education: B.S. in Computer Science, MIT (2023), GPA: 3.9/4.0")
        doc.add_paragraph("Skills: Python, R, SQL, Pandas, NumPy, Scikit-learn, Spark, Docker")
        
        test_docx_path = BASE_DIR / "uploads" / "temp_test_resume.docx"
        doc.save(str(test_docx_path))
        with open(test_docx_path, "rb") as f:
            docx_content = f.read()

        response = self.client.post(
            "/api/v1/resume/upload",
            files={"file": ("jane_smith_resume.docx", docx_content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["resume"]["filename"], "jane_smith_resume.docx")
        TestResumeUploadAndParserAPI.docx_resume_id = data["resume"]["id"]

        if test_docx_path.exists():
            os.remove(test_docx_path)

    def test_04_invalid_file_extension(self):
        """Test uploading disallowed file extension (.png)"""
        image_content = b"\x89PNG\r\n\x1a\nFake PNG image content..."
        response = self.client.post(
            "/api/v1/resume/upload",
            files={"file": ("avatar.png", image_content, "image/png")}
        )
        self.assertEqual(response.status_code, 415)
        self.assertIn("Only PDF (.pdf) and Word (.docx) files are supported", response.json()["detail"])

    def test_05_oversized_file(self):
        """Test uploading file exceeding 5 MB limit"""
        oversized_content = b"A" * (5 * 1024 * 1024 + 1024)
        response = self.client.post(
            "/api/v1/resume/upload",
            files={"file": ("huge_resume.pdf", oversized_content, "application/pdf")}
        )
        self.assertEqual(response.status_code, 413)

    def test_06_process_and_parse_pdf_resume(self):
        """Test processing PDF resume & extracting 11 candidate fields under 2 seconds"""
        resume_id = TestResumeUploadAndParserAPI.pdf_resume_id
        response = self.client.post(f"/api/v1/resume/process/{resume_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "PROCESSED")
        self.assertLess(data["processing_time_seconds"], 2.0)

        profile = data["profile"]
        self.assertIn("Python", profile["skills"])
        self.assertIn("SQL", profile["skills"])
        self.assertEqual(profile["name"], "Alexander Mercer")
        self.assertEqual(profile["email"], "alex.mercer@data-ai.org")

    def test_07_process_and_parse_docx_resume(self):
        """Test processing DOCX resume & extracting candidate fields"""
        resume_id = TestResumeUploadAndParserAPI.docx_resume_id
        response = self.client.post(f"/api/v1/resume/process/{resume_id}")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "PROCESSED")
        profile = data["profile"]
        self.assertIn("Python", profile["skills"])
        self.assertEqual(profile["name"], "Jane Smith")

    def test_08_get_candidate_profile(self):
        """Test GET candidate profile by resume_id"""
        resume_id = TestResumeUploadAndParserAPI.pdf_resume_id
        response = self.client.get(f"/api/v1/resume/profile/{resume_id}")
        self.assertEqual(response.status_code, 200)
        profile = response.json()
        self.assertEqual(profile["resume_id"], resume_id)
        self.assertEqual(profile["name"], "Alexander Mercer")

    def test_09_update_candidate_profile(self):
        """Test candidate editing and saving profile in MySQL DB before starting interview"""
        resume_id = TestResumeUploadAndParserAPI.pdf_resume_id
        updated_payload = {
            "name": "Alex Mercer (Verified)",
            "email": "alex.mercer@stanford.edu",
            "phone": "+1 (555) 999-8888",
            "education": "B.Tech in Computer Science & AI",
            "skills": ["Python", "SQL", "Machine Learning", "PyTorch", "TensorFlow", "FastAPI", "LLMs"],
            "college": "Stanford University",
            "cgpa": "9.5/10",
            "graduation_year": "2024",
            "is_verified": True
        }
        response = self.client.put(f"/api/v1/resume/profile/{resume_id}", json=updated_payload)
        self.assertEqual(response.status_code, 200)
        updated_profile = response.json()
        self.assertEqual(updated_profile["name"], "Alex Mercer (Verified)")
        self.assertEqual(updated_profile["email"], "alex.mercer@stanford.edu")
        self.assertEqual(updated_profile["cgpa"], "9.5/10")
        self.assertTrue(updated_profile["is_verified"])
        self.assertIn("LLMs", updated_profile["skills"])


if __name__ == "__main__":
    unittest.main()
