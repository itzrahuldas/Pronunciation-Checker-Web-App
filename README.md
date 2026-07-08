# SpeakScore — AI Pronunciation Checker

Built for the Livo AI SWE Technical Assessment.

SpeakScore is a full-stack web application that allows users to upload or record English speech and receive instant, word-level pronunciation feedback. It uses a multi-signal AI pipeline (Groq Whisper + Llama 4 + Phoneme Analysis) to evaluate acoustic quality, accuracy, and fluency.

## 🚀 Live Demo
- **Frontend (Vercel)**: `[Insert Vercel URL after deployment]`
- **Backend (Render)**: `[Insert Render URL after deployment]`

## 🏗️ Architecture
See [`docs/architecture.md`](docs/architecture.md) for a detailed breakdown of the system architecture, scoring methodology, and DPDP Act 2023 compliance posture.

## 🛠️ Tech Stack
- **Frontend**: Next.js 14, React, Tailwind CSS, TypeScript
- **Backend**: FastAPI (Python), `pydub`, `pronouncing`
- **AI Models**: Groq Whisper API (`whisper-large-v3`), Groq LLM API (`llama-3.3-70b-versatile`)
- **Hosting**: Vercel (Frontend), Render (Backend)

## 🏃‍♂️ Running Locally

### Prerequisites
- Node.js 18+
- Python 3.11+
- FFmpeg (required for `pydub` audio processing)
- A free [Groq API Key](https://console.groq.com)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
echo "GROQ_API_KEY=your_key_here" > .env

# Run server
uvicorn main:app --reload --port 8000
```

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

## 🔒 DPDP Compliance
This app was built with a privacy-first approach complying with India's DPDP Act 2023. Audio is processed ephemerally in-memory and deleted immediately. Explicit consent is required before any data is transmitted. Read more in the [Privacy Policy](frontend/src/app/privacy/page.tsx).