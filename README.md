# SpeakScore — AI Pronunciation Checker

Built for the Livo AI SWE Technical Assessment.

SpeakScore is a full-stack web application that allows users to upload or record English speech and receive instant, word-level pronunciation feedback. It uses a multi-signal AI pipeline (Groq Whisper + Llama 3.3 70B + Phoneme Analysis) to evaluate acoustic quality, accuracy, and fluency.

## ✨ Key Features
- **Word-Level Analysis**: Every spoken word is analyzed for accuracy. Mispronunciations are highlighted with specific phonetic spelling comparisons (e.g., `You said: [throow] → Correct: [throo]`).
- **Accent Agnostic**: The AI pipeline respects all major English varieties (American, British, Indian, etc.) focusing on intelligibility rather than matching a single "standard" accent.
- **Dual Modes**: 
  - *Read-Aloud*: Read from provided reference passages to test reading accuracy.
  - *Free Speech*: Speak naturally and get feedback purely on clarity, fluency, and pacing.
- **Modern Orange/Amber UI**: A sleek, dark-mode-first user interface with sound-wave animations, progress bars, hover states, and ambient background orbs.
- **DPDP Act 2023 Compliant**: Built with a privacy-first approach. Audio is processed ephemerally in-memory and deleted immediately. No personal data or audio is stored on our servers. Explicit consent is captured before processing.

## 🚀 Live Demo
- **Frontend (Vercel)**: https://pronunciation-checker-web-app.vercel.app/
- **Backend (Render)**: https://livo-pronunciation-backend.onrender.com/

## 🏗️ Architecture
See [`docs/architecture.md`](docs/architecture.md) for a detailed breakdown of the system architecture, scoring methodology, and DPDP compliance posture.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS, TypeScript
- **Backend**: FastAPI (Python), `pydub`, `pronouncing`, `nltk`
- **AI Models**: Groq Whisper API (`whisper-large-v3`), Groq LLM API (`llama-3.3-70b-versatile`)
- **Hosting**: Vercel (Frontend), Render (Backend)

## 🏃‍♂️ Running Locally

### Prerequisites
- Node.js 18+
- Python 3.11+ (Make sure to use <3.13 if pyaudio is required, though standard pydub runs fine on 3.11)
- FFmpeg (required for `pydub` audio processing)
- A free [Groq API Key](https://console.groq.com)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Mac/Linux:
source venv/bin/activate 

pip install -r requirements.txt

# Create .env file
echo "GROQ_API_KEY=your_key_here" > .env

# Run server
uvicorn main:app --reload --port 8000
```
*Note: On first run, the backend will automatically download required NLTK datasets (averaged_perceptron_tagger_eng).*

### 2. Frontend Setup
```bash
cd frontend
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🔒 Privacy & Data Processing
This app employs a strict zero-retention policy for audio data. Audio files are held in server memory only for the duration of the analysis (typically 3-5 seconds) and are immediately deleted. Read more in the [Privacy Policy](frontend/src/app/privacy/page.tsx).