import json
from groq import Groq
from config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

PRONUNCIATION_ANALYSIS_PROMPT = """You are a pronunciation assessment expert specializing in evaluating English pronunciation for speakers from diverse linguistic backgrounds, including Indian English speakers.

## Task
Analyze the student's speech. If an expected text is provided, compare their transcription against it. Identify specific pronunciation issues that affect INTELLIGIBILITY (being understood), not accent.

## Important: Accent vs. Pronunciation Error
- **Indian English** is a valid variety of English. Do NOT penalize features that are normal in Indian English such as:
  - Retroflex /t/, /d/ sounds (tongue touching the roof of the mouth)
  - V/W merging (saying "wery" for "very" or vice versa) — mark as CORRECT unless it causes confusion
  - Th-stopping (saying "da" for "the") — common L1 transfer, mark as mild issue only
  - Syllable-timed rhythm instead of stress-timed — do NOT penalize
- ONLY flag errors that genuinely reduce intelligibility: word substitutions, skipped words, heavily mumbled segments, or completely wrong vowel sounds.
- Be generous with scoring. If the word is recognizable, mark it "correct".

## Input Data
- **Expected Text**: "{expected_text}"
- **Expected Phonemes (ARPAbet)**: {expected_phonemes}
- **Transcribed Text**: "{transcribed_text}"
- **Transcribed Phonemes**: {transcribed_phonemes}
- **Word Timestamps**: {word_timestamps}
- **Segment Avg LogProb**: {avg_logprob}
- **No-Speech Probability**: {no_speech_prob}

## Analysis Rules
1. Compare word-by-word. For each word, classify as:
   - **correct**: The intended word was clearly spoken (even with accent)
   - **substitution**: A completely different word was said
   - **insertion**: An extra word appeared that shouldn't be there
   - **deletion**: A word from the reference was skipped entirely
   - **unclear**: Speech was too mumbled or quiet to understand
2. For substitutions, analyze the phonemic difference to identify the specific sound error.
3. The ASR (Whisper) is very good at understanding accented speech. If the transcription matches the expected text, trust it — the pronunciation was clear enough.
4. Low avg_logprob (< -0.5) suggests the ASR was uncertain about the transcription.
5. High no_speech_prob (> 0.5) suggests silence or very quiet speech.
6. Give constructive, encouraging feedback. Mention what was done well before issues.

## Output Format (JSON)
Provide the output strictly as a JSON object with this structure:
{{
  "overall_feedback": "<2-3 sentence encouraging summary. Start with something positive, then mention 1-2 areas to improve.>",
  "focus_areas": ["<sound1>", "<sound2>"],
  "words_analyzed": [
    {{
      "expected": "<word if in reference text, otherwise null>",
      "heard": "<word transcribed or null if deleted>",
      "status": "correct|substitution|insertion|deletion|unclear",
      "phoneme_issue": "<description of specific sound error or null>",
      "tip": "<actionable pronunciation tip or null>"
    }}
  ]
}}
"""

def _get(obj, key, default=None):
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)

def analyze_with_llm(expected_text: str, expected_phonemes: dict, transcription_result, transcribed_phonemes: dict):
    if not settings.GROQ_API_KEY:
        raise Exception("Groq API Key is not set")
    
    words = _get(transcription_result, "words", [])
    segments = _get(transcription_result, "segments", [])
    
    word_timestamps = [{"word": _get(w, "word", ""), "start": _get(w, "start", 0), "end": _get(w, "end", 0)} for w in words]
    avg_logprob = _get(segments[0], "avg_logprob", -0.1) if segments else -0.1
    no_speech_prob = _get(segments[0], "no_speech_prob", 0.0) if segments else 0.0

    prompt = PRONUNCIATION_ANALYSIS_PROMPT.format(
        expected_text=expected_text or "FREE SPEECH (NO REFERENCE)",
        expected_phonemes=json.dumps(expected_phonemes),
        transcribed_text=_get(transcription_result, "text", ""),
        transcribed_phonemes=json.dumps(transcribed_phonemes),
        word_timestamps=json.dumps(word_timestamps),
        avg_logprob=avg_logprob,
        no_speech_prob=no_speech_prob
    )

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.1
    )
    
    return json.loads(response.choices[0].message.content)
