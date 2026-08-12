import React, { useState } from 'react';
import StudentDashboardHeader from './components/StudentDashboardHeader.jsx';
import ResumeUpload from './components/ResumeUpload.jsx';
import ResumeParsingReview from './components/ResumeParsingReview.jsx';
import CandidateStats from './components/CandidateStats.jsx';
import SpeechToSpeechInterview from './components/interview/SpeechToSpeechInterview.jsx';
import AdminDashboard from './components/admin/AdminDashboard.jsx';

export default function App() {
  // Top View Mode: 'CANDIDATE' | 'ADMIN'
  const [viewMode, setViewMode] = useState('CANDIDATE');

  // Candidate Navigation / Dashboard Steps: 'UPLOAD' | 'REVIEW_EDIT' | 'INTERVIEW_STARTED'
  const [currentStep, setCurrentStep] = useState('UPLOAD');
  
  const [isUploadSuccessful, setIsUploadSuccessful] = useState(false);
  const [uploadedResumeData, setUploadedResumeData] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);

  const handleUploadSuccessStateChange = (success, resumeData) => {
    setIsUploadSuccessful(success);
    setUploadedResumeData(resumeData);
  };

  // Called when Resume processing finishes
  const handleProcessSuccess = (resumeData, profile) => {
    setUploadedResumeData(resumeData);
    setCandidateProfile(profile);
    setCurrentStep('REVIEW_EDIT');
  };

  // "Go Back" button handler in review screen
  const handleGoBackToUpload = () => {
    setCurrentStep('UPLOAD');
  };

  // "Start Interview" button handler in review screen
  const handleStartInterview = (finalProfile) => {
    setCandidateProfile(finalProfile);
    setCurrentStep('INTERVIEW_STARTED');
  };

  if (viewMode === 'ADMIN') {
    return <AdminDashboard onSwitchToCandidateView={() => setViewMode('CANDIDATE')} />;
  }

  return (
    <div className="dashboard-app">
      {/* Navbar Header with Admin Switcher */}
      <StudentDashboardHeader onSwitchToAdminView={() => setViewMode('ADMIN')} />

      {/* Main Container */}
      <main className="main-content-container">
        {/* Hero Section */}
        <section className="page-hero">
          <div className="hero-badge">
            <span>✨ AI Data Scientist Student Dashboard</span>
          </div>
          <h1 className="hero-title">
            Prepare for Your <span className="gradient-text">Data Science Interview</span>
          </h1>
          <p className="hero-subtitle">
            Upload your resume to allow our LLM agent to analyze your Machine Learning, Python, and Data Engineering background before launching your custom mock interview.
          </p>
          
          {/* Step Breadcrumb Progress */}
          <div className="step-breadcrumb-container">
            <div className={`step-item ${currentStep === 'UPLOAD' ? 'active' : 'completed'}`}>
              <span className="step-number">1</span>
              <span className="step-label">Upload Resume</span>
            </div>
            <div className="step-connector"></div>
            <div className={`step-item ${currentStep === 'REVIEW_EDIT' ? 'active' : currentStep === 'INTERVIEW_STARTED' ? 'completed' : ''}`}>
              <span className="step-number">2</span>
              <span className="step-label">Review & Edit Details</span>
            </div>
            <div className="step-connector"></div>
            <div className={`step-item ${currentStep === 'INTERVIEW_STARTED' ? 'active' : ''}`}>
              <span className="step-number">3</span>
              <span className="step-label">Speech AI Interview</span>
            </div>
          </div>
        </section>

        {/* Dashboard Layout */}
        {currentStep === 'INTERVIEW_STARTED' ? (
          <SpeechToSpeechInterview
            candidateProfile={candidateProfile}
            resumeData={uploadedResumeData}
            onGoBack={handleGoBackToUpload}
          />
        ) : (
          <div className="dashboard-grid">
            {/* Main Content Column */}
            <div className="main-upload-column">
              {currentStep === 'UPLOAD' && (
                <ResumeUpload
                  onUploadSuccessStateChange={handleUploadSuccessStateChange}
                  onProcessSuccess={handleProcessSuccess}
                />
              )}

              {currentStep === 'REVIEW_EDIT' && (
                <ResumeParsingReview
                  resumeData={uploadedResumeData}
                  initialProfile={candidateProfile}
                  onGoBack={handleGoBackToUpload}
                  onStartInterview={handleStartInterview}
                />
              )}
            </div>

            {/* Sidebar Column */}
            <div className="sidebar-column">
              <CandidateStats
                uploadSuccess={isUploadSuccessful}
                resumeData={uploadedResumeData}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


