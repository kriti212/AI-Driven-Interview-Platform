import os
from pathlib import Path

# Base Directory
BASE_DIR = Path(__file__).resolve().parent

# Upload Configuration
UPLOAD_DIR = BASE_DIR / "uploads" / "resumes"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Maximum file size: 5 MB (5 * 1024 * 1024 bytes)
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
MAX_FILE_SIZE_MB = 5

# Allowed file extensions and MIME types for Resumes
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/octet-stream", # Some browsers send binary stream for docx/pdf
}

# MySQL Database Configuration
# Default MySQL Connection: mysql+pymysql://<user>:<password>@<host>:<port>/<dbname>
# Override via DATABASE_URL environment variable if needed
DEFAULT_MYSQL_URL = 'mysql+pymysql://root:g%40reen!123@localhost:3306/interview_db'
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_MYSQL_URL)

# Fallback to SQLite if USE_SQLITE_FALLBACK=1 or MySQL driver connection fails during dev testing
USE_SQLITE_FALLBACK = os.getenv("USE_SQLITE_FALLBACK", "false").lower() in ("true", "1", "t")
SQLITE_URL = f"sqlite:///{BASE_DIR}/interview_db.sqlite3"
