import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    MIN_DURATION_SEC: float = 1.0
    MAX_DURATION_SEC: float = 45.0
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024 # 10MB
    GROQ_TRANSCRIPTION_TIMEOUT_SEC: float = 45.0
    GROQ_LLM_TIMEOUT_SEC: float = 30.0
    
    class Config:
        env_file = ".env"

settings = Settings()
