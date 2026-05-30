import { useState } from 'react';
import './App.css';
import jsPDF from 'jspdf';

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
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

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
    setChatMessages([]);

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
        setChatMessages([{
          role: 'ai',
          text: '👋 Hi! I have analyzed this video. Ask me anything about it!'
        }]);
      }
    } catch (err) {
      setError('Something went wrong. Please try again!');
    }
    setLoading(false);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    const response = await fetch('http://127.0.0.1:5000/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: chatInput,
        video_id: result.video_id
      })
    });
    const data = await response.json();
    setChatMessages(prev => [...prev, { role: 'ai', text: data.answer }]);
    setChatLoading(false);
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
    setChatMessages([]);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    doc.setFontSize(20);
    doc.setTextColor(255, 0, 0);
    doc.text('YouTube Video Summary', pageWidth / 2, y, { align: 'center' });
    y += 15;

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Source: ${link}`, 15, y);
    y += 15;

    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0);
    doc.text('Summary', 15, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    const summaryLines = doc.splitTextToSize(result.summary, pageWidth - 30);
    doc.text(summaryLines, 15, y);
    y += summaryLines.length * 7 + 10;

    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0);
    doc.text('Key Points', 15, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    result.key_points.forEach((point) => {
      const lines = doc.splitTextToSize(`• ${point}`, pageWidth - 30);
      doc.text(lines, 15, y);
      y += lines.length * 7 + 3;
    });
    y += 10;

    doc.setFontSize(14);
    doc.setTextColor(255, 0, 0);
    doc.text('Timestamps', 15, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    result.timestamps.forEach((ts) => {
      const lines = doc.splitTextToSize(`⏱ ${ts.time} — ${ts.description}`, pageWidth - 30);
      doc.text(lines, 15, y);
      y += lines.length * 7 + 3;
    });

    doc.save('youtube-summary.pdf');
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
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>{lang.label}</option>
            ))}
          </select>
        </div>

        {link && (
          <button className="clear-btn" onClick={handleClear}>✕ Clear</button>
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
              <div className="action-btns">
                <button className="copy-btn" onClick={handleCopy}>
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
                <button className="pdf-btn" onClick={handleDownloadPDF}>
                  📄 Download PDF
                </button>
              </div>
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

          <div className="result-card chat-card">
            <h2>💬 Chat with Video</h2>
            <div className="chat-messages">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`chat-bubble ${msg.role}`}>
                  {msg.text}
                </div>
              ))}
              {chatLoading && (
                <div className="chat-bubble ai">
                  <span className="typing">AI is thinking...</span>
                </div>
              )}
            </div>
            <div className="chat-input-section">
              <input
                type="text"
                placeholder="Ask anything about this video..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChat()}
              />
              <button onClick={handleChat} disabled={chatLoading}>
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;