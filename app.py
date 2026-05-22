from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return "YouTube Summarizer Backend is running!"

@app.route('/transcript', methods=['POST'])
def get_transcript():
    data = request.json
    url = data.get('url')
    
    if 'v=' in url:
        video_id = url.split('v=')[1].split('&')[0]
    else:
        return jsonify({'error': 'Invalid YouTube URL'}), 400
    
    transcript = YouTubeTranscriptApi().fetch(video_id)
    full_text = ' '.join([t.text for t in transcript])
    
    return jsonify({'transcript': full_text})

if __name__ == '__main__':
    app.run(debug=True)