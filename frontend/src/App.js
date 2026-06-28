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
  const [page, setPage] = useState('login');
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [userName, setUserName] = useState(localStorage.getItem('userName') || '');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail') || '');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [link, setLink] = useState('');
  const [language, setLanguage] = useState('english');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [imageSearch, setImageSearch] = useState(false);
  const [imageResults, setImageResults] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');

  const handleAuth = async (type) => {
    setAuthError('');
    const url = `https://keerthana32-youtube-summarizer-backend.hf.space/${type}`;
    const body = type === 'login'
      ? { email: authForm.email, password: authForm.password }
      : { name: authForm.name, email: authForm.email, password: authForm.password };
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.error) {
        setAuthError(data.error);
      } else if (type === 'login') {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userName', data.name);
        localStorage.setItem('userEmail', authForm.email);
        setToken(data.token);
        setUserName(data.name);
        setUserEmail(authForm.email);
        setPage('home');
      } else {
        setPage('login');
        setAuthError('Registered! Please login now.');
      }
    } catch (err) {
      setAuthError('Something went wrong. Try again!');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    setToken('');
    setUserName('');
    setUserEmail('');
    setPage('login');
    setResult(null);
  };

  const getVideoId = (url) => {
    if (url.includes('v=')) return url.split('v=')[1].split('&')[0];
    return null;
  };

  const handleSummarize = async () => {
    if (!link) { setError('Please paste a YouTube link first!'); return; }
    setLoading(true);
    setError('');
    setResult(null);
    setChatMessages([]);
    try {
      const response = await fetch('https://keerthana32-youtube-summarizer-backend.hf.space/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: link, language, user_email: userEmail })
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setChatMessages([{ role: 'ai', text: '👋 Hi! I have analyzed this video. Ask me anything!' }]);
      }
    } catch (err) {
      setError('Something went wrong. Please try again!');
    }
    setLoading(false);
  };

  const handleFetchHistory = async () => {
    const res = await fetch(`https://keerthana32-youtube-summarizer-backend.hf.space/history?email=${userEmail}`);
    const data = await res.json();
    setHistory(data);
    setShowHistory(true);
  };

  const handleImageSearch = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageLoading(true);
    setImageResults(null);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result.split(',')[1];
      const response = await fetch('https://keerthana32-youtube-summarizer-backend.hf.space/image-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 })
      });
      const data = await response.json();
      setImageResults(data);
      setImageLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const userMessage = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);
    const response = await fetch('https://keerthana32-youtube-summarizer-backend.hf.space/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: chatInput, video_id: result.video_id })
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

  const handleShare = async () => {
    const response = await fetch('https://keerthana32-youtube-summarizer-backend.hf.space/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: result.summary,
        key_points: result.key_points,
        timestamps: result.timestamps,
        video_url: link,
        language: language
      })
    });
    const data = await response.json();
    const shareUrl = `${window.location.origin}/share/${data.share_id}`;
    setShareLink(shareUrl);
    navigator.clipboard.writeText(shareUrl);
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
    doc.save('youtube-summary.pdf');
  };

  const videoId = getVideoId(link);

  if (page === 'login' && !token) {
    return (
      <div className="auth-container">
        <h1>🎥 YouTube Summarizer</h1>
        <div className="auth-card">
          <h2>Login</h2>
          {authError && <div className="error">{authError}</div>}
          <input type="email" placeholder="Email" value={authForm.email}
            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
          <input type="password" placeholder="Password" value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
          <button onClick={() => handleAuth('login')}>Login</button>
          <p className="switch-auth">
            Don't have an account?{' '}
            <span onClick={() => { setPage('register'); setAuthError(''); }}>Register</span>
          </p>
        </div>
      </div>
    );
  }

  if (page === 'register') {
    return (
      <div className="auth-container">
        <h1>🎥 YouTube Summarizer</h1>
        <div className="auth-card">
          <h2>Register</h2>
          {authError && <div className="error">{authError}</div>}
          <input type="text" placeholder="Full Name" value={authForm.name}
            onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} />
          <input type="email" placeholder="Email" value={authForm.email}
            onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
          <input type="password" placeholder="Password" value={authForm.password}
            onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
          <button onClick={() => handleAuth('register')}>Register</button>
          <p className="switch-auth">
            Already have an account?{' '}
            <span onClick={() => { setPage('login'); setAuthError(''); }}>Login</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="hero">
        <h1>🎥 YouTube Summarizer</h1>
        <div className="user-info">
          <span>👋 Welcome, {userName}!</span>
          <button className="history-btn" onClick={handleFetchHistory}>📋 History</button>
          <button className="image-btn" onClick={() => setImageSearch(!imageSearch)}>🖼️ Image Search</button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {imageSearch && (
        <div className="image-search-card">
          <h2>🖼️ Search YouTube by Image</h2>
          <p>Upload any image to find related YouTube videos</p>
          <input type="file" accept="image/*" onChange={handleImageSearch} className="image-input" />
          {imageLoading && <p className="loading-text">🔍 AI is analyzing your image...</p>}
          {imageResults && (
            <div className="image-results">
              <p className="search-query">🔎 Searching for: <strong>{imageResults.query}</strong></p>
              <div className="video-grid">
                {imageResults.videos.map((video, index) => (
                  <div key={index} className="video-card" onClick={() => {
                    setLink(`https://www.youtube.com/watch?v=${video.video_id}`);
                    setImageSearch(false);
                  }}>
                    <img src={video.thumbnail} alt={video.title} />
                    <div className="video-info">
                      <p className="video-title">{video.title}</p>
                      <p className="video-channel">{video.channel}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showHistory && (
        <div className="history-card">
          <div className="history-header">
            <h2>📋 Your History</h2>
            <button className="clear-btn" onClick={() => setShowHistory(false)}>✕ Close</button>
          </div>
          {history.length === 0 ? (
            <p style={{color: '#888'}}>No summaries yet!</p>
          ) : (
            history.map((item, index) => (
              <div key={index} className="history-item" onClick={() => {
                setResult(item);
                setLink(item.video_url);
                setShowHistory(false);
              }}>
                <span className="history-url">🎥 {item.video_url}</span>
                <span className="history-lang">🌐 {item.language}</span>
              </div>
            ))
          )}
        </div>
      )}

      <div className="card">
        <div className="input-section">
          <input type="text" placeholder="Paste YouTube link here..."
            value={link} onChange={(e) => setLink(e.target.value)} />
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
        {link && <button className="clear-btn" onClick={handleClear}>✕ Clear</button>}
      </div>

      {videoId && (
        <div className="thumbnail-card">
          <img src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`} alt="thumbnail" className="thumbnail" />
        </div>
      )}

      {error && <div className="error">⚠️ {error}</div>}

      {loading && (
        <div className="loading-card">
          <div className="spinner"></div>
          <p>AI is reading the video...</p>
          <div className="progress-bar"><div className="progress-fill"></div></div>
        </div>
      )}

      {result && !loading && (
        <div className="results">
          <div className="result-card">
            <div className="result-header">
              <h2>📝 Summary</h2>
              <div className="action-btns">
                <button className="copy-btn" onClick={handleCopy}>{copied ? '✅ Copied!' : '📋 Copy'}</button>
                <button className="pdf-btn" onClick={handleDownloadPDF}>📄 PDF</button>
                <button className="share-btn" onClick={handleShare}>🔗 Share</button>
              </div>
            </div>
            {shareLink && (
              <div className="share-link">
                ✅ Link copied! <span>{shareLink}</span>
              </div>
            )}
            <p className="summary-text">{result.summary}</p>
          </div>

          <div className="result-card">
            <h2>📌 Key Points</h2>
            <ul className="key-points">
              {result.key_points.map((point, index) => <li key={index}>{point}</li>)}
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
                <div key={index} className={`chat-bubble ${msg.role}`}>{msg.text}</div>
              ))}
              {chatLoading && <div className="chat-bubble ai"><span className="typing">AI is thinking...</span></div>}
            </div>
            <div className="chat-input-section">
              <input type="text" placeholder="Ask anything about this video..."
                value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleChat()} />
              <button onClick={handleChat} disabled={chatLoading}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;