import React, { useState, useRef } from 'react';

// API Endpoint configuration
const API_BASE_URL = 'http://localhost:8000/api/v1/resume';
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc'];

export default function ResumeUpload({ onUploadSuccessStateChange, onProcessSuccess }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('IDLE'); // IDLE | UPLOADING | SUCCESS | ERROR
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedResumeData, setUploadedResumeData] = useState(null);

  // Processing state for "Process Resume" button
  const [isProcessing, setIsProcessing] = useState(false);
  const [processResult, setProcessResult] = useState(null);

  const fileInputRef = useRef(null);

  // Format File Size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Client-side Validation
  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected.' };

    const filename = file.name || '';
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();

    // 1. Extension Validation
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `Invalid file format (${ext || 'unknown'}). Please upload a PDF or DOCX file.`
      };
    }

    // 2. Size Validation (5MB limit)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return {
        valid: false,
        error: `File size (${sizeMB} MB) exceeds maximum allowed limit of 5.0 MB.`
      };
    }

    if (file.size === 0) {
      return { valid: false, error: 'Selected file is empty (0 bytes).' };
    }

    return { valid: true, error: null };
  };

  // Upload File to FastAPI Backend
  const uploadFileToBackend = (file) => {
    setSelectedFile(file);
    setUploadStatus('UPLOADING');
    setUploadProgress(10);
    setErrorMessage('');
    setProcessResult(null);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/upload`, true);

    // Track real upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status === 201 || xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          setUploadProgress(100);
          setUploadStatus('SUCCESS');
          setUploadedResumeData(response.resume);
          if (onUploadSuccessStateChange) onUploadSuccessStateChange(true, response.resume);
        } catch (e) {
          setUploadStatus('ERROR');
          setErrorMessage('Failed to parse server response.');
          if (onUploadSuccessStateChange) onUploadSuccessStateChange(false, null);
        }
      } else {
        setUploadStatus('ERROR');
        try {
          const errResp = JSON.parse(xhr.responseText);
          setErrorMessage(errResp.detail || `Upload failed with status ${xhr.status}`);
        } catch (e) {
          setErrorMessage(`Upload failed with HTTP code ${xhr.status}`);
        }
        if (onUploadSuccessStateChange) onUploadSuccessStateChange(false, null);
      }
    };

    xhr.onerror = () => {
      setUploadStatus('ERROR');
      setErrorMessage('Network error: Could not reach backend upload service. Ensure FastAPI server is running on port 8000.');
      if (onUploadSuccessStateChange) onUploadSuccessStateChange(false, null);
    };

    xhr.send(formData);
  };

  // Handle File Selection (Browse or Drop)
  const handleFilesSelected = (files) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadStatus('ERROR');
      setErrorMessage(validation.error);
      setSelectedFile(null);
      setUploadedResumeData(null);
      if (onUploadSuccessStateChange) onUploadSuccessStateChange(false, null);
      return;
    }

    uploadFileToBackend(file);
  };

  // Drag Event Handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(e.dataTransfer.files);
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFilesSelected(e.target.files);
    }
  };

  // Remove uploaded file
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadStatus('IDLE');
    setUploadProgress(0);
    setErrorMessage('');
    setUploadedResumeData(null);
    setProcessResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onUploadSuccessStateChange) onUploadSuccessStateChange(false, null);
  };

  // Trigger "Process Resume"
  const handleProcessResume = async () => {
    if (!uploadedResumeData || !uploadedResumeData.id) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/process/${uploadedResumeData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to process resume.');
      }

      const result = await response.json();
      setProcessResult(result);
      if (onUploadSuccessStateChange) onUploadSuccessStateChange(true, uploadedResumeData);
      
      // Auto-trigger transition to Review & Edit screen if callback provided
      if (onProcessSuccess && result.profile) {
        onProcessSuccess(uploadedResumeData, result.profile);
      }
    } catch (err) {
      setErrorMessage(`Processing Error: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Determine if Process button is enabled
  const isProcessButtonEnabled = uploadStatus === 'SUCCESS' && uploadedResumeData && !isProcessing;

  return (
    <section className="card-panel">
      <div className="upload-card-header">
        <div className="card-title-group">
          <div className="card-title-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="12" y1="18" x2="12" y2="12"></line>
              <line x1="9" y1="15" x2="15" y2="15"></line>
            </svg>
          </div>
          <div>
            <h2 className="card-title">Upload Candidate Resume</h2>
            <p className="card-desc">Upload your latest Data Scientist resume to customize your AI interview session.</p>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="file-input-hidden"
        id="resume-file-input"
      />

      {/* Drag & Drop Zone */}
      {uploadStatus !== 'SUCCESS' && (
        <div
          className={`dropzone-container ${isDragActive ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}

        >
          <div className="dropzone-icon-box">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <p className="dropzone-prompt-primary">
            Drag & drop your resume here, or <span className="browse-highlight">browse files</span>
          </p>
          <p className="dropzone-prompt-secondary">
            Supported formats: PDF or DOCX (Max size: 5.0 MB)
          </p>
          <div className="dropzone-pills">
            <span className="pill-badge">📄 PDF</span>
            <span className="pill-badge">📝 DOCX</span>
            <span className="pill-badge">⚡ Max 5MB</span>
          </div>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploadStatus === 'UPLOADING' && (
        <div className="progress-container">
          <div className="progress-header">
            <span className="progress-filename">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
              </svg>
              Uploading {selectedFile?.name}...
            </span>
            <span className="progress-percent">{uploadProgress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {uploadStatus === 'SUCCESS' && uploadedResumeData && (
        <div className="success-banner">
          <div className="success-left">
            <div className="success-check-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="success-file-meta">
              <span className="success-file-title">{uploadedResumeData.filename}</span>
              <div className="success-file-sub">
                <span>Size: {formatFileSize(uploadedResumeData.file_size_bytes)}</span>
                <span>Uploaded: {new Date(uploadedResumeData.upload_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span style={{ color: 'var(--color-success)', fontWeight: '600' }}>✓ Stored in MySQL</span>
              </div>
            </div>
          </div>
          <button className="btn-remove-file" onClick={handleRemoveFile}>
            Remove File
          </button>
        </div>
      )}

      {/* Error Message Toast / Alert */}
      {uploadStatus === 'ERROR' && errorMessage && (
        <div className="error-banner">
          <div className="error-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div className="error-content">
            <div className="error-title">Upload Failed</div>
            <div className="error-desc">{errorMessage}</div>
          </div>
          <button className="error-close-btn" onClick={() => setErrorMessage('')}>✕</button>
        </div>
      )}

      {/* Process Resume Result View */}
      {processResult && (
        <div className="results-panel">
          <div className="results-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            AI Resume Analysis Complete
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            The AI engine successfully parsed <strong>{processResult.details.parsed_filename}</strong> and identified candidate skills for your Data Science interview.
          </p>
          <div className="skills-tags-grid">
            {processResult.details.extracted_skills.map((skill, i) => (
              <span key={i} className="skill-tag">🧠 {skill}</span>
            ))}
          </div>
        </div>
      )}

      {/* Action Footer with State-Gated "Process Resume" Button */}
      <div className="action-footer">
        <button
          className="btn-process-resume"
          disabled={!isProcessButtonEnabled}
          onClick={handleProcessResume}
          id="btn-process-resume"
        >
          {isProcessing ? (
            <>
              <svg className="spinner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10"></circle>
              </svg>
              Processing Resume with AI Engine...
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Process Resume
            </>
          )}
        </button>

        {!isProcessButtonEnabled && uploadStatus !== 'SUCCESS' && (
          <p className="btn-hint-text">
            ℹ Upload a valid PDF or DOCX resume (≤ 5 MB) to unlock the Process Resume button.
          </p>
        )}
      </div>
    </section>
  );
}
