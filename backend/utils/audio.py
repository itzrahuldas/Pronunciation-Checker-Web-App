import os
import tempfile
from fastapi import HTTPException
from pydub import AudioSegment
from backend.config import settings

def validate_and_save_audio(file_bytes: bytes, filename: str) -> str:
    """Validates the audio size and duration and returns path to temporary file."""
    if len(file_bytes) > settings.MAX_FILE_SIZE_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large. Max is {settings.MAX_FILE_SIZE_BYTES} bytes.")
    
    # Save temporarily to parse with pydub
    _, ext = os.path.splitext(filename)
    if not ext:
        ext = ".wav"
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        # Check duration
        audio = AudioSegment.from_file(tmp_path)
        duration = audio.duration_seconds
        
        if duration < settings.MIN_DURATION_SEC:
            os.unlink(tmp_path)
            raise HTTPException(status_code=400, detail=f"Audio too short ({duration:.1f}s). Minimum: {settings.MIN_DURATION_SEC}s")
        if duration > settings.MAX_DURATION_SEC:
            os.unlink(tmp_path)
            raise HTTPException(status_code=400, detail=f"Audio too long ({duration:.1f}s). Maximum: {settings.MAX_DURATION_SEC}s")
        
        return tmp_path
    except HTTPException:
        raise
    except Exception as e:
        os.unlink(tmp_path)
        raise HTTPException(status_code=400, detail=f"Invalid audio file: {str(e)}")
