import { useState } from 'react';
import './App.css';

function App() {
  const [link, setLink] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSummarize = async () => {
    setLoading(true);
    const response = await fetch('http://127.0.0.1:5000/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: link })
    });
    const data = await response.json();
    setTranscript(data.transcript);
    setLoading(false);
  };

  return (
    <div className="container">
      <h1>YouTube Video Summarizer</h1>
      <p>Paste a YouTube link and get a smart summary instantly</p>
      <div className="input-section">
        <input 
          type="text" 
          placeholder="Paste YouTube link here..."
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button onClick={handleSummarize}>
          {loading ? 'Loading...' : 'Summarize'}
        </button>
      </div>
      {transcript && (
        <div className="result">
          <h2>Transcript:</h2>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}

export default App;