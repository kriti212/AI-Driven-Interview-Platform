import React, { useState } from 'react';

/**
 * CodeEditor Component
 * --------------------
 * Interactive Python Code Editor for coding questions in the interview round:
 * - Line numbers gutter
 * - Tab key support for 4-space indentation
 * - Reset to Template button
 * - Copy Code & Clear Code buttons
 * - Line and word count stats
 */
export default function CodeEditor({
  value,
  onChange,
  initialTemplate = '',
  placeholder = "# Write your Python code solution here...\n# Include necessary imports and functions."
}) {
  const [copied, setCopied] = useState(false);

  const lines = value ? value.split('\n') : [''];
  const lineCount = lines.length;
  const wordCount = value ? value.trim().split(/\s+/).filter(Boolean).length : 0;

  // Tab key interceptor for 4-space indent
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;

      // Insert 4 spaces
      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      onChange(newValue);

      // Reset cursor position after React render cycle
      setTimeout(() => {
        e.target.selectionStart = e.target.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleResetTemplate = () => {
    if (initialTemplate) {
      onChange(initialTemplate);
    } else {
      onChange('');
    }
  };

  const handleCopyCode = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-editor-container" style={{
      border: '2px solid #4f46e5',
      borderRadius: '12px',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(79, 70, 229, 0.15)',
      fontFamily: 'Consolas, Monaco, "Fira Code", monospace'
    }}>
      {/* Editor Header Toolbar */}
      <div className="code-editor-toolbar" style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.1rem' }}>🐍</span>
          <strong style={{ color: '#818cf8', fontSize: '0.95rem' }}>Python 3 Code Editor</strong>
          <span style={{
            backgroundColor: '#312e81',
            color: '#c7d2fe',
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 600
          }}>
            Data Science IDE
          </span>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', marginRight: '8px' }}>
            {lineCount} lines | {wordCount} words
          </span>

          {initialTemplate && (
            <button
              onClick={handleResetTemplate}
              title="Reset code to initial question template"
              style={{
                background: '#334155',
                color: '#e2e8f0',
                border: 'none',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              🔄 Reset Template
            </button>
          )}

          <button
            onClick={handleCopyCode}
            disabled={!value}
            title="Copy code to clipboard"
            style={{
              background: copied ? '#16a34a' : '#334155',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: value ? 'pointer' : 'not-allowed',
              fontWeight: 600
            }}
          >
            {copied ? '✓ Copied' : '📋 Copy'}
          </button>

          <button
            onClick={() => onChange('')}
            disabled={!value}
            title="Clear all code"
            style={{
              background: '#991b1b',
              color: '#ffffff',
              border: 'none',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '0.8rem',
              cursor: value ? 'pointer' : 'not-allowed',
              fontWeight: 600
            }}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Editor Body: Line Numbers Gutter + Textarea */}
      <div className="code-editor-body" style={{
        display: 'flex',
        minHeight: '260px',
        backgroundColor: '#0f172a',
        position: 'relative'
      }}>
        {/* Line Numbers Column */}
        <div className="line-numbers-gutter" style={{
          padding: '12px 10px',
          backgroundColor: '#182234',
          color: '#64748b',
          textAlign: 'right',
          userSelect: 'none',
          fontSize: '0.9rem',
          lineHeight: '1.6',
          borderRight: '1px solid #1e293b',
          minWidth: '42px'
        }}>
          {lines.map((_, idx) => (
            <div key={idx}>{idx + 1}</div>
          ))}
        </div>

        {/* Code Textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            color: '#f8fafc',
            border: 'none',
            outline: 'none',
            padding: '12px 14px',
            fontSize: '0.92rem',
            lineHeight: '1.6',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '260px',
            whiteSpace: 'pre',
            tabSize: 4
          }}
        />
      </div>
    </div>
  );
}
