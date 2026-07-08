from groq import Groq
from backend.config import settings
import json

client = Groq(api_key=settings.GROQ_API_KEY)

def transcribe_audio(file_path: str):
    """
    Transcribes audio using Groq Whisper API and returns the transcription 
    along with word-level timestamps and segment logprobs.
    """
    if not settings.GROQ_API_KEY:
        raise Exception("Groq API Key is not set")
        
    with open(file_path, "rb") as file:
        transcription = client.audio.transcriptions.create(
            file=(file_path, file.read()),
            model="whisper-large-v3",
            response_format="verbose_json",
            timestamp_granularities=["word", "segment"]
        )
    return transcription
