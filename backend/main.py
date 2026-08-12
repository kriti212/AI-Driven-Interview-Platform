import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from database import init_db
from config import UPLOAD_DIR
from routers.resume import router as resume_router
from routers.interview import router as interview_router
from routers.admin import router as admin_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("uvicorn")

app = FastAPI(
    title="AI-Powered Data Scientist Interview Platform",
    description="FastAPI service for Resume parsing & LLM-driven Speech-to-Speech Data Science Interviews.",
    version="1.0.0"
)

# Configure CORS for ReactJS Frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend domain (e.g. http://localhost:5173)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from services.llm_service import warmup_ollama_model

# Startup Event: Initialize database tables & warm up Ollama model
@app.on_event("startup")
def on_startup():
    logger.info("Initializing Database Tables...")
    try:
        init_db()
        logger.info("Database initialized successfully.")
    except Exception as e:
        logger.error(f"Error during DB initialization: {e}")

    try:
        warmup_ollama_model()
    except Exception as e:
        logger.warning(f"Ollama warmup failed: {e}")

# Include Resume, Interview & Admin Routers
app.include_router(resume_router)
app.include_router(interview_router)
app.include_router(admin_router)



# Mount Uploads directory for static access if needed
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

@app.get("/health", tags=["Health Check"])
def health_check():
    return {"status": "healthy", "service": "Resume Upload & Processing API", "version": "1.0.0"}

# Custom Exception Handler for uncaught exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

