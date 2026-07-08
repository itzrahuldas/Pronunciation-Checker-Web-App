import json
from groq import Groq
from backend.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

PRONUNCIATION_ANALYSIS_PROMPT = """You are a pronunciation assessment expert for English language learners.

## Task
Analyze the student's speech. If an expected text is provided, compare their transcription against it. Identify specific pronunciation issues.

## Input Data
- **Expected Text**: "{expected_text}"
- **Expected Phonemes (ARPAbet)**: {expected_phonemes}
- **Transcribed Text**: "{transcribed_text}"
- **Transcribed Phonemes**: {transcribed_phonemes}
- **Word Timestamps**: {word_timestamps}
- **Segment Avg LogProb**: {avg_logprob}
- **No-Speech Probability**: {no_speech_prob}

## Analysis Rules
1. Compare word-by-word. For each mismatched word, identify if it's a:
   - **substitution**: Wrong word transcribed (indicates mispronunciation)
   - **insertion**: Extra word in transcription
   - **deletion**: Missing word from transcription (word was skipped/mumbled)
   - **correct**: Correctly spoken
   - **unclear**: Low confidence word, heavily mumbled.
2. For substitutions, analyze the phonemic difference to identify the specific sound error.
3. Consider that the ASR may have corrected grammar — prioritize ACOUSTIC fidelity analysis.
4. Low avg_logprob (< -0.5) suggests the ASR was uncertain about the transcription.
5. High no_speech_prob (> 0.5) suggests silence or very quiet speech.

## Output Format (JSON)
Provide the output strictly as a JSON object with this structure:
{{
  "overall_feedback": "<2-3 sentence summary>",
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

def analyze_with_llm(expected_text: str, expected_phonemes: dict, transcription_result, transcribed_phonemes: dict):
    if not settings.GROQ_API_KEY:
        raise Exception("Groq API Key is not set")
    
    words = transcription_result.words if hasattr(transcription_result, "words") else []
    segments = transcription_result.segments if hasattr(transcription_result, "segments") else []
    
    word_timestamps = [{"word": w.word, "start": w.start, "end": w.end} for w in words]
    avg_logprob = segments[0].avg_logprob if segments else -0.1
    no_speech_prob = segments[0].no_speech_prob if segments else 0.0

    prompt = PRONUNCIATION_ANALYSIS_PROMPT.format(
        expected_text=expected_text or "FREE SPEECH (NO REFERENCE)",
        expected_phonemes=json.dumps(expected_phonemes),
        transcribed_text=transcription_result.text,
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
