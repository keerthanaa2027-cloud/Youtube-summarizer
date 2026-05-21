import { useState } from 'react';
import './App.css';

function App() {
  const [link, setLink] = useState('');

  const handleSummarize = () => {
    console.log('YouTube Link:', link);
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
        <button onClick={handleSummarize}>Summarize</button>
      </div>
    </div>
  );
}

export default App;