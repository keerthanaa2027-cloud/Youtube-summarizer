import { useState } from 'react';
import './App.css';

const LANGUAGES = [
  { code: 'english', label: '🇬🇧 English' },
  { code: 'hindi', label: '🇮🇳 Hindi' },
  { code: 'tamil', label: '🇮🇳 Tamil' },
  { code: 'kannada', label: '🇮🇳 Kannada' },
  { code: 'spanish', label: '🇪🇸 Spanish' },
  { code: 'french', label: '🇫🇷 French' },
  { code: 'german', label: '🇩🇪 German' },
  { code: 'japanese', label: '🇯🇵 Japanese' },
];

function App() {
  const [link, setLink] = useState('');
  const [language, setLanguage] = useState('english');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const getVideoId = (url) => {
    if (url.includes('v=')) {
      return url.split('v=')[1].split('&')[0];
    }
    return null;
  };

  const handleSummarize = async () => {
    if (!link) {
      setError('Please paste a YouTube link first!');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link, language: language })
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError('Something went wrong. Please try again!');
    }
    setLoading(false);
  };

  const handleCopy = () => {
    const text = `Summary:\n${result.summary}\n\nKey Points:\n${result.key_points.join('\n')}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLink('');
    setResult(null);
    setError('');
  };

  const videoId = getVideoId(link);

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

        <div className="language-section">
          <label>🌐 Summary Language:</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {link && (
          <button className="clear-btn" onClick={handleClear}>
            ✕ Clear
          </button>
        )}
      </div>

      {videoId && (
        <div className="thumbnail-card">
          <img
            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
            alt="Video thumbnail"
            className="thumbnail"
          />
        </div>
      )}

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

      {result && !loading && (
        <div className="results">
          <div className="result-card">
            <div className="result-header">
              <h2>📝 Summary</h2>
              <button className="copy-btn" onClick={handleCopy}>
                {copied ? '✅ Copied!' : '📋 Copy All'}
              </button>
            </div>
            <p className="summary-text">{result.summary}</p>
          </div>

          <div className="result-card">
            <h2>📌 Key Points</h2>
            <ul className="key-points">
              {result.key_points.map((point, index) => (
                <li key={index}>{point}</li>
              ))}
            </ul>
          </div>

          <div className="result-card">
            <h2>⏱️ Timestamps</h2>
            <div className="timestamps">
              {result.timestamps.map((ts, index) => (
                <div key={index} className="timestamp-item">
                  <span className="time-badge">{ts.time}</span>
                  <span className="time-desc">{ts.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;