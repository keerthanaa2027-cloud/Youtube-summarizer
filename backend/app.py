
from googleapiclient.discovery import build
from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from groq import Groq
from pymongo import MongoClient
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt
import json
import os

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# MongoDB connection
from urllib.parse import quote_plus
password = quote_plus("Kokila11")
pw = quote_plus("Kokila11")
client_db = MongoClient(f"mongodb+srv://keerthigowda765_db_user:{pw}@cluster0.frmqmm5.mongodb.net/?appName=Cluster0")
db = client_db['youtube_summarizer']
users = db['users']

# JWT setup
app.config['JWT_SECRET_KEY'] = 'keerthana2006'
jwt = JWTManager(app)

# Groq AI client
client = Groq(api_key="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")
youtube = build('youtube', 'v3', developerKey='AIzaSyDNe-yOe5eeX3x8SV73r8FyJGunZaZVOqU')

# Store transcript globally for chat
transcript_store = {}

@app.route('/')
def home():
    return "YouTube Summarizer Backend is running!"

# Register route
@app.route('/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')

    if users.find_one({'email': email}):
        return jsonify({'error': 'Email already exists!'}), 400

    hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
    users.insert_one({
        'email': email,
        'password': hashed,
        'name': name
    })
    return jsonify({'message': 'Registration successful!'})

# Login route
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    user = users.find_one({'email': email})
    if not user:
        return jsonify({'error': 'User not found!'}), 404

    if bcrypt.checkpw(password.encode('utf-8'), user['password']):
        token = create_access_token(identity=email)
        return jsonify({'token': token, 'name': user['name']})
    else:
        return jsonify({'error': 'Wrong password!'}), 401

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

    from datetime import datetime
    db['summaries'].insert_one({
        'user_email': request.json.get('user_email'),
        'video_url': url,
        'video_id': video_id,
        'summary': result['summary'],
        'key_points': result['key_points'],
        'timestamps': result['timestamps'],
        'language': language,
        'created_at': datetime.now()
    })

    return jsonify(result)
        

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    question = data.get('question')
    video_id = data.get('video_id')

    transcript = transcript_store.get(video_id, '')

    if not transcript:
        return jsonify({'answer': 'Please summarize a video first!'})

    prompt = f"""Answer the user's question based ONLY on this YouTube video transcript.
If answer is not in transcript say "This wasn't covered in the video."

Transcript:
{transcript}

Question: {question}

Give a clear, concise answer."""

    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model="llama-3.3-70b-versatile",
    )

    answer = chat_completion.choices[0].message.content
    return jsonify({'answer': answer})



@app.route('/history', methods=['GET'])
def get_history():
    email = request.args.get('email')
    summaries = list(db['summaries'].find(
        {'user_email': email},
        {'_id': 0}
    ).sort('created_at', -1).limit(10))
    return jsonify(summaries)

@app.route('/image-search', methods=['POST'])
def image_search():
    data = request.json
    image_base64 = data.get('image')
    
    # Use Groq Vision to describe the image
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        }
                    },
                    {
                        "type": "text",
                        "text": "Describe this image in 5-6 words for a YouTube search query. Return ONLY the search query, nothing else."
                    }
                ]
            }
        ],
        model="meta-llama/llama-4-scout-17b-16e-instruct",
    )
    
    search_query = chat_completion.choices[0].message.content.strip()
    
    # Search YouTube
    search_response = youtube.search().list(
        q=search_query,
        part='snippet',
        maxResults=5,
        type='video'
    ).execute()
    
    videos = []
    for item in search_response['items']:
        videos.append({
            'title': item['snippet']['title'],
            'video_id': item['id']['videoId'],
            'thumbnail': item['snippet']['thumbnails']['medium']['url'],
            'channel': item['snippet']['channelTitle']
        })
    
    return jsonify({'query': search_query, 'videos': videos})


@app.route('/share', methods=['POST'])
def share():
    import uuid
    data = request.json
    share_id = str(uuid.uuid4())[:8]
    
    db['shares'].insert_one({
        'share_id': share_id,
        'summary': data.get('summary'),
        'key_points': data.get('key_points'),
        'timestamps': data.get('timestamps'),
        'video_url': data.get('video_url'),
        'language': data.get('language')
    })
    
    return jsonify({'share_id': share_id})

@app.route('/share/<share_id>', methods=['GET'])
def get_share(share_id):
    item = db['shares'].find_one({'share_id': share_id}, {'_id': 0})
    if item:
        return jsonify(item)
    return jsonify({'error': 'Share not found'}), 404


if __name__ == '__main__':
    app.run(debug=True)