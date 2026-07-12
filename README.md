# SpeakScore - AI Pronunciation Checker

SpeakScore is a full-stack web application built for the Livo AI SWE Technical Assessment. It lets users upload or record English speech and receive fast, word-level pronunciation feedback with scores, transcript alignment, phonetic comparisons, and actionable practice tips.

The project is designed as a realistic assessment submission: it has a deployed frontend, deployed backend, documented system architecture, privacy-aware audio handling, provider failure behavior, and a scoring pipeline that is explainable instead of being a black-box LLM response.

## Live Demo

| Service | URL |
| --- | --- |
| Frontend | https://pronunciation-checker-web-app.vercel.app/ |
| Backend Health Check | https://livo-pronunciation-backend.onrender.com/ |

## Architecture Documents

- [System Architecture Markdown](docs/architecture.md)
- [Upload-ready System Architecture PDF](docs/SpeakScore_System_Architecture.pdf)

## What It Does

SpeakScore supports two assessment modes:

- **Read-Aloud Mode:** the user reads a selected reference passage. The backend compares expected text against the transcription and identifies correct words, substitutions, insertions, deletions, and unclear words.
- **Free-Speech Mode:** the user speaks naturally without a reference passage. The system focuses on clarity, fluency, pacing, and intelligibility.

The result includes:

- Overall, accuracy, and fluency scores
- Full transcribed text
- Word-by-word status highlighting
- Phonetic "you said" vs "correct" feedback
- Focus areas and short learner-friendly tips
- Privacy consent flow before audio processing

## Key Engineering Highlights

### Multi-Signal Pronunciation Pipeline

SpeakScore does not rely on one signal alone. The backend combines:

1. **Groq Whisper (`whisper-large-v3`)** for speech-to-text, timestamps, and acoustic confidence.
2. **CMU Pronouncing Dictionary + `g2p-en`** for ARPAbet phoneme context.
3. **Groq Llama (`llama-3.3-70b-versatile`)** for structured pronunciation reasoning.
4. **Deterministic scoring logic** for final numeric accuracy, fluency, and overall scores.

### Accent-Aware Feedback

The LLM prompt explicitly treats major English varieties as valid and focuses on intelligibility rather than forcing one accent standard. The system is designed to flag pronunciation issues that reduce understanding, not normal accent differences.

### Scalability and Concurrency

The FastAPI route is asynchronous and offloads blocking work to FastAPI's threadpool:

- Audio validation with `pydub`
- Groq Whisper transcription calls
- Phoneme extraction
- Groq Llama analysis calls
- Final scoring

The backend is stateless, so it can be horizontally scaled by increasing Render instances/workers. Practical concurrency is bounded by Render resources, Uvicorn worker/threadpool settings, request duration, and Groq rate limits. File size and duration caps keep each request bounded.

### Error Handling and Fallbacks

The backend now handles AI provider failure deliberately:

| Failure | Behavior |
| --- | --- |
| Invalid, corrupt, too short, or too long audio | Returns a clear `400` validation error |
| Oversized file | Returns `413` before provider calls |
| Whisper/Groq transcription failure | Returns `502` with a user-safe retry message |
| Llama/Groq analysis failure | Falls back to deterministic transcript/reference alignment |
| Provider latency spike | Uses explicit Groq request timeouts |
| Temporary file cleanup | Runs in `finally`, even on errors |

Timeouts:

- Whisper transcription timeout: `45s`
- Llama analysis timeout: `30s`

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16.2.10, React 19.2.4, TypeScript |
| Styling | Tailwind CSS 4, lucide-react |
| Browser Audio | MediaRecorder API, file upload, HTML audio metadata |
| Backend | FastAPI, Python 3.11 |
| Audio Processing | pydub, FFmpeg |
| Phoneme Context | pronouncing, CMU Dict, g2p-en, NLTK |
| AI Providers | Groq Whisper, Groq Llama |
| Deployment | Vercel frontend, Render backend |

## Repository Structure

```text
.
├── backend/
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   └── analyze.py
│   ├── services/
│   │   ├── transcription.py
│   │   ├── pronunciation.py
│   │   ├── llm_analyzer.py
│   │   └── scoring.py
│   ├── utils/
│   │   └── audio.py
│   └── models/
│       └── schemas.py
├── frontend/
│   ├── src/app/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── privacy/page.tsx
│   └── src/lib/
│       ├── api.ts
│       ├── audio-utils.ts
│       └── constants.ts
├── docs/
│   ├── architecture.md
│   ├── SpeakScore_System_Architecture.pdf
│   └── pdf.css
├── render.yaml
└── README.md
```

## API Overview

### Health Check

```http
GET /
```

Example response:

```json
{
  "status": "healthy",
  "service": "Pronunciation Checker API"
}
```

### Analyze Audio

```http
POST /api/analyze
Content-Type: multipart/form-data

audio_file=<binary audio>
expected_text=<optional reference passage>
```

Example response shape:

```json
{
  "overall_score": 82,
  "fluency_score": 85,
  "accuracy_score": 80,
  "overall_feedback": "Your speech was clear overall...",
  "focus_areas": ["word endings", "th sounds"],
  "transcribed_text": "The sun is shining brightly today",
  "words": [
    {
      "word": "through",
      "status": "substitution",
      "issue": "Extra final sound added after the vowel.",
      "tip": "End the word cleanly after the oo sound.",
      "you_said": "throo-w",
      "correct_pronunciation": "throo",
      "start_time": 1.24,
      "end_time": 1.62
    }
  ]
}
```

## Scoring Methodology

```text
accuracy_score = correct_words / total_words * 100
fluency_score  = normalized Whisper avg_logprob
overall_score  = (accuracy_score * 0.60) + (fluency_score * 0.40)
```

Fluency is mapped from Whisper segment confidence:

| Avg Logprob | Fluency |
| --- | ---: |
| `>= -0.1` | 95 |
| `>= -0.2` | 85 |
| `>= -0.3` | 75 |
| `>= -0.5` | 60 |
| `>= -0.7` | 40 |
| `< -0.7` | 0-30 |

## Privacy and Data Processing

SpeakScore follows a zero-retention application design:

- Audio is used only for pronunciation analysis.
- Audio is temporarily written during the active request for validation/provider processing.
- Temporary audio is deleted in the backend `finally` cleanup path.
- No app database stores users, audio, or analysis history.
- The consent modal blocks analysis until the user agrees.
- The privacy page lets users clear local browser consent state.
- Groq is disclosed as the third-party processor for transcription and LLM analysis.

## Running Locally

### Prerequisites

- Node.js 18+
- Python 3.11+
- FFmpeg installed and available on `PATH`
- Groq API key from https://console.groq.com

### Backend Setup

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Edit `backend/.env`:

```env
GROQ_API_KEY="your_groq_api_key_here"
```

Start the backend:

```bash
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open http://localhost:3000.

## Quality Checks

Frontend lint:

```bash
cd frontend
npm run lint
```

Backend syntax check:

```bash
python -m py_compile backend/main.py backend/config.py backend/routers/analyze.py \
  backend/services/transcription.py backend/services/pronunciation.py \
  backend/services/llm_analyzer.py backend/services/scoring.py \
  backend/utils/audio.py backend/models/schemas.py
```

Regenerate the architecture PDF:

```bash
npx --yes md-to-pdf docs/architecture.md \
  --stylesheet docs/pdf.css \
  --document-title "SpeakScore System Architecture" \
  --pdf-options '{"format":"A4","printBackground":true,"margin":{"top":"12mm","right":"10mm","bottom":"12mm","left":"10mm"}}'

mv docs/architecture.pdf docs/SpeakScore_System_Architecture.pdf
```

## Deployment

### Frontend: Vercel

The frontend is deployed as a Next.js app from `frontend/`.

Required environment variable:

```env
NEXT_PUBLIC_API_URL=https://livo-pronunciation-backend.onrender.com
```

### Backend: Render

The backend is deployed using `render.yaml`.

Required environment variable:

```env
GROQ_API_KEY=your_render_managed_secret
```

## Future Improvements

- Add rate limiting to protect Groq quota.
- Add structured request IDs and latency metrics.
- Add retry/circuit-breaker behavior around provider calls.
- Add forced alignment or GOP scoring for deeper phoneme-level evidence.
- Add optional authenticated progress tracking.
- Add multi-language support with language-specific phoneme resources.

## Assessment Notes

This project intentionally prioritizes:

- End-to-end functionality over a mock-only UI
- Explainable scoring over hidden LLM-only judgment
- Privacy-aware data flow over unnecessary persistence
- Real deployment over local-only execution
- Clear architecture documentation over undocumented implementation

