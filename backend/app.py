from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
import os
from groq import Groq
import json

app = Flask(__name__)
CORS(app)

client = Groq(api_key="YOUR_GROQ_KEY_HERE")

# Store transcript globally for chat
transcript_store = {}

@app.route('/')
def home():
    return "YouTube Summarizer Backend is running!"

@app.route('/summarize', methods=['POST'])
def summarize():
    data = request.json
    url = data.get('url')
    language = data.get('language', 'english')

    if 'v=' in url:
        video_id = url.split('v=')[1].split('&')[0]
    else:
        return jsonify({'error': 'Invalid YouTube URL'}), 400

    transcript = YouTubeTranscriptApi().fetch(video_id)

    transcript_with_time = '\n'.join([
        f"[{int(t.start//60)}:{int(t.start%60):02d}] {t.text}"
        for t in transcript
    ])

    full_text = ' '.join([t.text for t in transcript])

    # Store transcript for chat feature
    transcript_store[video_id] = full_text

    prompt = f"""Analyze this YouTube video transcript and respond in exactly this JSON format.
Write everything in {language} language.

{{
  "summary": "5-6 line summary in {language}",
  "key_points": [
    "Point 1",
    "Point 2",
    "Point 3",
    "Point 4",
    "Point 5"
  ],
  "timestamps": [
    {{"time": "0:00", "description": "What happens"}},
    {{"time": "1:30", "description": "What happens"}},
    {{"time": "3:00", "description": "What happens"}},
    {{"time": "4:30", "description": "What happens"}},
    {{"time": "6:00", "description": "What happens"}}
  ],
  "video_id": "{video_id}"
}}

Transcript:
{transcript_with_time}

{full_text}

Return ONLY the JSON."""

    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
    )

    result = json.loads(chat_completion.choices[0].message.content)
    result['video_id'] = video_id
    return jsonify(result)


@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    question = data.get('question')
    video_id = data.get('video_id')

    transcript = transcript_store.get(video_id, '')

    if not transcript:
        return jsonify({'answer': 'Please summarize a video first before asking questions!'})

    prompt = f"""You are a helpful assistant. Answer the user's question based ONLY on this YouTube video transcript.
If the answer is not in the transcript, say "This wasn't covered in the video."

Transcript:
{transcript}

User question: {question}

Give a clear, concise answer."""

    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
    )

    answer = chat_completion.choices[0].message.content
    return jsonify({'answer': answer})


if __name__ == '__main__':
    app.run(debug=True)