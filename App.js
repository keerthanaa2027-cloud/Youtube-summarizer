import { useState } from 'react';
import './App.css';

function App() {
  const [link, setLink] = useState('');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSummarize = async () => {
    if (!link) {
      setError('Please paste a YouTube link first!');
      return;
    }
    setLoading(true);
    setError('');
    setSummary('');

    try {
      const response = await fetch('http://127.0.0.1:5000/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link })
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSummary(data.summary);
      }
    } catch (err) {
      setError('Something went wrong. Please try again!');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLink('');
    setSummary('');
    setError('');
  };

  return (
    <div className="container">
      <div className="hero">
        <h1>🎥 YouTube Summarizer</h1>
        <p className="subtitle">Save time — get AI powered summaries instantly</p>
      </div>

      <div className="card">
        <div className="input-section">
          <input
            type="text"
            placeholder="Paste YouTube link here..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <button onClick={handleSummarize} disabled={loading}>
            {loading ? '⏳ Summarizing...' : '⚡ Summarize'}
          </button>
        </div>

        {link && (
          <button className="clear-btn" onClick={handleClear}>
            ✕ Clear
          </button>
        )}
      </div>

      {error && <div className="error">⚠️ {error}</div>}

      {loading && (
        <div className="loading-card">
          <div className="spinner"></div>
          <p>AI is reading the video...</p>
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
        </div>
      )}

      {summary && !loading && (
        <div className="result-card">
          <div className="result-header">
            <h2>📝 AI Summary</h2>
            <button className="copy-btn" onClick={handleCopy}>
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div className="summary-text">
            {summary}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;