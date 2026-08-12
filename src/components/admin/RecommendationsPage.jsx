import React from 'react';

/**
 * RecommendationsPage Component
 * -----------------------------
 * Displays Hiring Recommendation Tiers & Decision Rules.
 */
export default function RecommendationsPage() {
  const rules = [
    { title: 'Strong Hire', range: '90% - 100%', color: '#22c55e', bg: 'rgba(34, 197, 94, 0.15)', desc: 'Exceptional candidate demonstrating deep technical mastery, optimal coding practices, and strong soft skills.' },
    { title: 'Hire', range: '75% - 89%', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', desc: 'Qualified candidate meeting core Data Science competency requirements and clean coding skills.' },
    { title: 'Hold', range: '60% - 74%', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', desc: 'Borderline candidate requiring secondary interview round or code review verification.' },
    { title: 'Reject', range: 'Below 60%', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', desc: 'Candidate failed to demonstrate adequate technical knowledge or problem-solving capability.' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
        🏆 Automated Hiring Recommendation Decision Matrix
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
        {rules.map((rule, idx) => (
          <div
            key={idx}
            style={{
              background: '#1e293b',
              borderRadius: '14px',
              border: `1px solid ${rule.color}44`,
              borderTop: `6px solid ${rule.color}`,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: rule.color, margin: 0 }}>{rule.title}</h3>
              <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700, backgroundColor: rule.bg, color: rule.color }}>
                {rule.range}
              </span>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
              {rule.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
