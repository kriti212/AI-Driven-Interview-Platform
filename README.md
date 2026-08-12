# AI-Powered Data Scientist Interview Platform - Resume Upload Module

Production-ready Resume Upload module for the Student Dashboard of an AI-Powered Data Scientist Interview Platform, built with **ReactJS**, **Vanilla CSS**, **FastAPI**, and **MySQL**.

---

## 🌟 Key Features

### 🎨 Frontend (ReactJS + Vanilla CSS)
- **Modern AI Dashboard UI**: Glassmorphism dark mode aesthetic featuring Google Fonts (*Plus Jakarta Sans* & *Inter*), glowing accents, and fluid animations.
- **Drag-and-Drop & File Picker**: Interactive dropzone with active drag state styling and native browse file dialog.
- **Strict Client-Side Validation**:
  - Validates file extensions (`.pdf`, `.docx`, `.doc`).
  - Enforces maximum file size limit of **5.0 MB** ($\le 5,242,880$ bytes).
  - Displays instant error toasts/banners if validation fails.
- **Real-Time Progress Bar**: Tracks live XHR upload progress percentage with animated shimmer effect.
- **Success & Error States**:
  - Displays uploaded file details (filename, size, upload timestamp, MySQL storage badge, file removal option).
  - Shows clear, dismissible error banners on upload failure.
- **State-Gated Action Button**: The **"Process Resume"** button remains disabled until a valid resume file is successfully uploaded to the server.

### ⚡ Backend (FastAPI + SQLAlchemy + MySQL)
- **FastAPI Endpoint (`POST /api/v1/resume/upload`)**:
  - Validates file extension and size ($\le 5\text{MB}$) on the server.
  - Generates secure unique stored filenames on disk under `uploads/resumes/`.
  - Records file metadata (`filename`, `stored_filename`, `file_path`, `file_size_bytes`, `mime_type`, `status`, `upload_timestamp`) in **MySQL**.
- **Resume Processing Endpoint (`POST /api/v1/resume/process/{resume_id}`)**:
  - Simulates AI Data Science skill extraction (Python, SQL, Machine Learning, PyTorch, FastAPI).
- **Graceful Error Handling**: Standard HTTP status codes (`400 Bad Request`, `413 Payload Too Large`, `415 Unsupported Media Type`, `500 Internal Error`).
- **Database Engine**: SQLAlchemy with MySQL support (`mysql+pymysql`) and fallback to SQLite for offline/testing environments.

---

## 📁 Directory Structure

```
LLM_interview/
├── backend/
│   ├── config.py             # Configuration (5MB limit, allowed MIME/ext, DB URLs)
│   ├── database.py           # SQLAlchemy MySQL engine & session management
│   ├── main.py               # FastAPI entry point & CORS configuration
│   ├── models.py             # SQLAlchemy Resume model for MySQL
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── schema.sql            # MySQL DDL script for database & table creation
│   ├── requirements.txt      # Python dependencies
│   └── routers/
│       └── resume.py         # Upload, Process, & Retrieve API endpoints
├── frontend/
│   ├── index.html            # Entry HTML with Google Fonts
│   ├── package.json          # Node dependencies & Vite scripts
│   ├── vite.config.js        # Vite dev server & proxy settings
│   └── src/
│       ├── App.jsx           # Main Dashboard container
│       ├── App.css           # Design system stylesheet
│       ├── main.jsx          # React DOM root
│       └── components/
│           ├── StudentDashboardHeader.jsx  # Navigation bar
│           ├── ResumeUpload.jsx            # Drag-and-drop upload component
│           └── CandidateStats.jsx          # Sidebar widgets & guidelines
└── README.md
```

---

## 🛠️ Step-by-Step Run & Test Instructions

### 1. Database Setup (MySQL)

Ensure MySQL Server is running locally. Execute the schema script `schema.sql`:

```bash
mysql -u root -p < backend/schema.sql
```

*Note: If MySQL is not running, the application will automatically log a warning and fall back to local `interview_db.sqlite3` for effortless offline testing.*

---

### 2. Backend Setup & Startup (FastAPI)

1. Open terminal in the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server using Uvicorn:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
5. Verify backend health check at: [http://localhost:8000/health](http://localhost:8000/health) or explore Swagger docs at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 3. Frontend Setup & Startup (ReactJS)

1. Open a new terminal in the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Launch Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser at: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Testing the Module

### Manual UI Test Matrix

| # | Action | Expected Behavior |
|---|--------|-------------------|
| 1 | Launch App | Drag-and-drop zone visible; "Process Resume" button is **disabled**. |
| 2 | Drop invalid file (e.g. `.png`, `.txt`) | Red error toast displayed ("Invalid file format"). "Process Resume" remains disabled. |
| 3 | Drop file $> 5\text{MB}$ | Red error toast displayed ("File size exceeds limit of 5 MB"). "Process Resume" remains disabled. |
| 4 | Drag & drop or browse a valid `.pdf` or `.docx` ($\le 5\text{MB}$) | Upload progress bar animates $0\% \to 100\%$. Success card displays filename, size, upload timestamp, and green checkmark. |
| 5 | Observe Action Button | **"Process Resume" button becomes ENABLED.** |
| 6 | Click "Process Resume" | Button shows loading spinner, calls `/api/v1/resume/process/{id}`, and displays extracted AI skills (Python, SQL, ML, etc.). |
| 7 | Click "Remove File" | Clears uploaded file state, resets dropzone, and disables "Process Resume" button again. |

---

### API Testing via cURL

**Valid Upload (PDF / DOCX):**
```bash
curl -X POST "http://localhost:8000/api/v1/resume/upload" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/sample_resume.pdf"
```

**Process Resume:**
```bash
curl -X POST "http://localhost:8000/api/v1/resume/process/1"
```

---

## 🛡️ Best Practices & Architecture Highlights

- **Sanitization & Security**: Uploaded files receive unique UUID-timestamped filenames to prevent path traversal or collision vulnerabilities.
- **SQL Persistence**: Every upload automatically records timestamped metadata in MySQL.
- **Modular Codebase**: Clear separation of concerns between Database models, Pydantic schemas, API Routers, and React UI components.
