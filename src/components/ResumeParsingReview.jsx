import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/v1/resume';

export default function ResumeParsingReview({ resumeData, initialProfile, onGoBack, onStartInterview }) {
  // Form State initialized from extracted profile
  const [formData, setFormData] = useState({
    name: initialProfile?.name || 'Candidate Name',
    email: initialProfile?.email || '',
    phone: initialProfile?.phone || '',
    education: initialProfile?.education || '',
    college: initialProfile?.college || '',
    cgpa: initialProfile?.cgpa || '',
    graduation_year: initialProfile?.graduation_year || '',
    projects: initialProfile?.projects || '',
    certifications: initialProfile?.certifications || '',
    internships: initialProfile?.internships || '',
  });

  const [skillsList, setSkillsList] = useState(initialProfile?.skills || ['Python', 'SQL', 'Machine Learning', 'Pandas', 'NumPy']);
  const [newSkillInput, setNewSkillInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');

  useEffect(() => {
    if (initialProfile) {
      setFormData({
        name: initialProfile.name || '',
        email: initialProfile.email || '',
        phone: initialProfile.phone || '',
        education: initialProfile.education || '',
        college: initialProfile.college || '',
        cgpa: initialProfile.cgpa || '',
        graduation_year: initialProfile.graduation_year || '',
        projects: initialProfile.projects || '',
        certifications: initialProfile.certifications || '',
        internships: initialProfile.internships || '',
      });
      if (Array.isArray(initialProfile.skills)) {
        setSkillsList(initialProfile.skills);
      }
    }
  }, [initialProfile]);

  // Field change handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Add new skill tag
  const handleAddSkill = (e) => {
    e.preventDefault();
    const trimmed = newSkillInput.trim();
    if (trimmed && !skillsList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillsList((prev) => [...prev, trimmed]);
      setNewSkillInput('');
    }
  };

  // Remove skill tag
  const handleRemoveSkill = (skillToRemove) => {
    setSkillsList((prev) => prev.filter((s) => s !== skillToRemove));
  };

  // Save changes to MySQL DB and Launch Interview
  const handleSaveAndStartInterview = async () => {
    if (!formData.name.trim()) {
      setSaveError('Candidate Name is required.');
      return;
    }
    if (!formData.email.trim()) {
      setSaveError('Email Address is required.');
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setSaveSuccessMessage('');

    const resumeId = resumeData?.id || initialProfile?.resume_id;

    try {
      const payload = {
        ...formData,
        skills: skillsList,
        is_verified: true,
      };

      const response = await fetch(`${API_BASE_URL}/profile/${resumeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errResp = await response.json();
        throw new Error(errResp.detail || 'Failed to update candidate details.');
      }

      const updatedProfile = await response.json();
      setSaveSuccessMessage('Candidate profile successfully verified & saved to MySQL database!');
      
      // Trigger Interview Callback after brief toast
      setTimeout(() => {
        if (onStartInterview) {
          onStartInterview(updatedProfile);
        }
      }, 1000);

    } catch (err) {
      setSaveError(`Save Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="card-panel review-card-panel">
      {/* Header Banner */}
      <div className="review-header">
        <div className="review-title-group">
          <div className="card-title-icon review-icon-pulse">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div>
            <h2 className="card-title">Review & Edit Parsed Resume Details</h2>
            <p className="card-desc">
              Our AI engine parsed <strong>{resumeData?.filename || 'your resume'}</strong>. Verify or edit any fields below to tailor your AI Data Science Mock Interview.
            </p>
          </div>
        </div>

        {/* Go Back Button */}
        <button className="btn-go-back" onClick={onGoBack} type="button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Go Back / Change File
        </button>
      </div>

      {/* Alert Error / Success */}
      {saveError && (
        <div className="error-banner">
          <div className="error-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div className="error-content">
            <div className="error-title">Validation / Update Error</div>
            <div className="error-desc">{saveError}</div>
          </div>
          <button className="error-close-btn" onClick={() => setSaveError('')}>✕</button>
        </div>
      )}

      {saveSuccessMessage && (
        <div className="success-banner">
          <div className="success-left">
            <div className="success-check-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="success-file-meta">
              <span className="success-file-title">Profile Confirmed</span>
              <span className="success-file-sub">{saveSuccessMessage}</span>
            </div>
          </div>
        </div>
      )}

      {/* Form Sections Grid */}
      <div className="form-sections-grid">
        {/* Section 1: Contact Information */}
        <div className="form-section-card">
          <h3 className="section-subtitle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            Personal & Contact Information
          </h3>

          <div className="input-group-grid">
            <div className="form-field">
              <label htmlFor="name-input" className="form-label">
                Candidate Name <span className="required-star">*</span>
              </label>
              <input
                id="name-input"
                type="text"
                name="name"
                className="form-input"
                placeholder="e.g. Alex Mercer"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="email-input" className="form-label">
                Email Address <span className="required-star">*</span>
              </label>
              <input
                id="email-input"
                type="email"
                name="email"
                className="form-input"
                placeholder="e.g. alex.mercer@example.com"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="phone-input" className="form-label">
                Phone Number
              </label>
              <input
                id="phone-input"
                type="tel"
                name="phone"
                className="form-input"
                placeholder="e.g. +1 (555) 019-2834"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Academic Details */}
        <div className="form-section-card">
          <h3 className="section-subtitle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
              <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
            </svg>
            Education & Academics
          </h3>

          <div className="input-group-grid">
            <div className="form-field full-width">
              <label htmlFor="college-input" className="form-label">
                College / University Name
              </label>
              <input
                id="college-input"
                type="text"
                name="college"
                className="form-input"
                placeholder="e.g. National Institute of Technology / Stanford University"
                value={formData.college}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="education-input" className="form-label">
                Degree & Major
              </label>
              <input
                id="education-input"
                type="text"
                name="education"
                className="form-input"
                placeholder="e.g. B.Tech in Data Science & Machine Learning"
                value={formData.education}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="cgpa-input" className="form-label">
                CGPA / GPA Score
              </label>
              <input
                id="cgpa-input"
                type="text"
                name="cgpa"
                className="form-input"
                placeholder="e.g. 8.75/10 or 3.8/4.0"
                value={formData.cgpa}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="gradyear-input" className="form-label">
                Graduation Year
              </label>
              <input
                id="gradyear-input"
                type="text"
                name="graduation_year"
                className="form-input"
                placeholder="e.g. 2025"
                value={formData.graduation_year}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Data Science & Technical Skills */}
        <div className="form-section-card">
          <h3 className="section-subtitle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Extracted Data Science Skills ({skillsList.length})
          </h3>

          {/* Skill Tag Chips */}
          <div className="skills-chip-container">
            {skillsList.map((skill, index) => (
              <span key={index} className="skill-editable-chip">
                ⚡ {skill}
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={() => handleRemoveSkill(skill)}
                  title={`Remove ${skill}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          {/* Add Skill Input */}
          <div className="add-skill-bar">
            <input
              type="text"
              className="form-input add-skill-input"
              placeholder="Type extra skill (e.g. PyTorch, MLOps, LLMs)..."
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddSkill(e);
              }}
            />
            <button type="button" className="btn-add-skill" onClick={handleAddSkill}>
              + Add Skill
            </button>
          </div>
        </div>

        {/* Section 4: Projects, Certifications & Internships */}
        <div className="form-section-card">
          <h3 className="section-subtitle">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
            </svg>
            Projects, Internships & Certifications
          </h3>

          <div className="input-group-grid">
            <div className="form-field full-width">
              <label htmlFor="projects-input" className="form-label">
                Key Data Science Projects
              </label>
              <textarea
                id="projects-input"
                name="projects"
                rows="3"
                className="form-textarea"
                placeholder="e.g. Customer Churn Prediction Model using XGBoost & Flask API..."
                value={formData.projects}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="internships-input" className="form-label">
                Internships & Work Experience
              </label>
              <textarea
                id="internships-input"
                name="internships"
                rows="2"
                className="form-textarea"
                placeholder="e.g. Machine Learning Intern at DataCorp (Built ETL pipelines & PySpark tasks)..."
                value={formData.internships}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-field full-width">
              <label htmlFor="certifications-input" className="form-label">
                Certifications & Online Courses
              </label>
              <textarea
                id="certifications-input"
                name="certifications"
                rows="2"
                className="form-textarea"
                placeholder="e.g. Deep Learning Specialization (Coursera), AWS Certified Cloud Practitioner..."
                value={formData.certifications}
                onChange={handleInputChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Buttons */}
      <div className="review-action-footer">
        <button type="button" className="btn-secondary-back" onClick={onGoBack}>
          ← Go Back to Upload
        </button>

        <button
          type="button"
          className="btn-start-interview"
          onClick={handleSaveAndStartInterview}
          disabled={isSaving}
          id="btn-start-interview"
        >
          {isSaving ? (
            <>
              <svg className="spinner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="10"></circle>
              </svg>
              Saving to MySQL & Launching...
            </>
          ) : (
            <>
              🚀 Save Details & Start Interview
            </>
          )}
        </button>
      </div>
    </section>
  );
}
