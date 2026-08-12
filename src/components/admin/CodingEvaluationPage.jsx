import React from 'react';

/**
 * CodingEvaluationPage Component
 * ------------------------------
 * Dedicated page for Python Coding Evaluations featuring:
 * - Candidate Python solution code vs Golden code
 * - Correctness, Logic, Readability, Edge Case handling scores
 * - Time Complexity & Space Complexity rating badges
 */
export default function CodingEvaluationPage({ codingEvals = [] }) {
  if (!codingEvals || codingEvals.length === 0) {
    return (
      <div style={{ background: '#1e293b', borderRadius: '14px', padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
        <h3>💻 Python Coding Evaluation</h3>
        <p>No coding submissions recorded yet for this session. The candidate completes two coding questions at the end of the interview round.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
        💻 Dedicated Python Coding Evaluation ({codingEvals.length} Submissions)
      </h2>

      {codingEvals.map((item, idx) => (
        <div key={idx} style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Question Title Bar */}
          <div style={{ borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
            <span style={{ fontSize: '0.8rem', color: '#818cf8', fontWeight: 700 }}>Python Challenge {idx + 1}</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '4px 0 0 0' }}>{item.question_text}</h3>
          </div>

          {/* Complexity & Performance Badges Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {/* Time Complexity */}
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #3b82f633', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Time Complexity</span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#60a5fa', margin: '4px 0 0 0' }}>{item.time_complexity || 'O(N)'}</h4>
            </div>

            {/* Space Complexity */}
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #10b98133', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Space Complexity</span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#34d399', margin: '4px 0 0 0' }}>{item.space_complexity || 'O(1)'}</h4>
            </div>

            {/* Coding Score */}
            <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #8b5cf633', textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Overall Score</span>
              <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#a78bfa', margin: '4px 0 0 0' }}>{item.score}%</h4>
            </div>
          </div>

          {/* Code Viewer Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
            {/* Candidate Submitted Code */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8' }}>🐍 Candidate Solution Code</span>
              </div>
              <textarea
                readOnly
                value={item.candidate_code || '# No code submitted.'}
                rows={10}
                style={{
                  width: '100%',
                  fontFamily: 'Consolas, Monaco, "Fira Code", monospace',
                  fontSize: '0.9rem',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #334155',
                  lineHeight: '1.5',
                  resize: 'none'
                }}
              />
            </div>

            {/* Golden Reference Code */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399' }}>✨ Golden Reference Code</span>
              </div>
              <textarea
                readOnly
                value={item.golden_code || '# Golden reference code available in database.'}
                rows={10}
                style={{
                  width: '100%',
                  fontFamily: 'Consolas, Monaco, "Fira Code", monospace',
                  fontSize: '0.9rem',
                  backgroundColor: '#0f172a',
                  color: '#cbd5e1',
                  padding: '14px',
                  borderRadius: '10px',
                  border: '1px solid #10b98144',
                  lineHeight: '1.5',
                  resize: 'none'
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
