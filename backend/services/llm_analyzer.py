import json
from groq import Groq
from config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

PRONUNCIATION_ANALYSIS_PROMPT = """You are a pronunciation assessment expert for English language learners and speakers of all backgrounds.

## Task
Analyze the student's speech. If an expected text is provided, compare their transcription against it. If the expected text says "FREE SPEECH (NO REFERENCE)", evaluate each word purely on CLARITY and CONFIDENCE of delivery.

## Important: Accent Awareness
Recognize all major English varieties as valid:
- **American English (GA)**: Rhotic /r/, flapped /t/ in "water", cot-caught merger — all valid.
- **British English (RP)**: Non-rhotic, broad /ɑː/ in "bath", glottal stops — all valid.
- **Indian English**: Retroflex /t,d/, V/W merging, th-stopping — all valid.
- **Australian, South African, etc.**: All recognized varieties are valid.

Focus on **intelligibility** (can the word be understood?), NOT on matching any single "standard" accent.
Only flag errors that genuinely reduce understanding: completely wrong words, skipped words, heavily mumbled speech, or unintelligible segments.
If the ASR (Whisper) successfully transcribed a word, that means it was clear enough — lean towards marking it "correct".

## Free Speech Mode
When no expected text is provided:
- Evaluate each transcribed word on **clarity of articulation**.
- If a word is clearly spoken and transcribed confidently (high logprob), mark it "correct".
- If a word is mumbled, unclear, or has very low confidence, mark it "unclear".
- Do NOT mark words as "substitution" or "deletion" when there is no reference text.
- Focus feedback on overall fluency, pacing, and clarity.

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
   - **correct**: The word was clearly spoken and understood (even with accent variation)
   - **substitution**: A completely different word was said (ONLY when expected text exists)
   - **insertion**: An extra word appeared that shouldn't be there (ONLY when expected text exists)
   - **deletion**: A word from the reference was skipped entirely (ONLY when expected text exists)
   - **unclear**: Speech was too mumbled or quiet to understand
2. For substitutions, analyze the phonemic difference to identify the specific sound error.
3. The ASR (Whisper) is excellent at understanding accented speech. If the transcription matches the expected text, the pronunciation was clear.
4. Low avg_logprob (< -0.5) suggests the ASR was uncertain. But values above -0.3 indicate confident transcription.
5. High no_speech_prob (> 0.5) suggests silence or very quiet speech.
6. Give constructive, encouraging feedback. Mention what was done well before suggesting improvements.
7. Be generous with scoring overall. Most clearly spoken words should be "correct".

## Pronunciation Spelling Rules (for you_said and correct_pronunciation)
Use simple phonetic respelling (NOT IPA symbols). Write it so a non-expert can read it and understand how to say the word:
- Use everyday English letters to represent sounds
- Examples:
  - "through" → correct: "throo", you_said might be: "th-roo" or "throo-w" etc.
  - "the" → correct: "thuh" (unstressed) or "thee" (stressed)
  - "pronunciation" → correct: "pruh-nun-see-AY-shun"
  - "clothes" → correct: "klohz", not "kloh-thez"
  - Capital letters = stressed syllable
- Only fill you_said if the word had an issue (status is NOT "correct")
- For correct words, set you_said and correct_pronunciation to null

## Output Format (JSON)
Provide the output strictly as a JSON object with this structure:
{{
  "overall_feedback": "<2-3 sentence encouraging summary. Start with something positive.>",
  "focus_areas": ["<sound1>", "<sound2>"],
  "words_analyzed": [
    {{
      "expected": "<word if in reference text, otherwise null>",
      "heard": "<word transcribed or null if deleted>",
      "status": "correct|substitution|insertion|deletion|unclear",
      "you_said": "<simple phonetic spelling of how user said it, or null if correct>",
      "correct_pronunciation": "<simple phonetic spelling of the correct way, or null if correct>",
      "phoneme_issue": "<1 sentence description of the sound error or null>",
      "tip": "<one actionable tip to fix it or null>"
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
