from pydantic import BaseModel
from typing import List, Optional

class WordResult(BaseModel):
    word: str
    status: str # "correct", "substitution", "insertion", "deletion", "unclear"
    expected_phonemes: Optional[str] = None
    issue: Optional[str] = None
    tip: Optional[str] = None
    you_said: Optional[str] = None          # How user actually pronounced it (e.g. "throow")
    correct_pronunciation: Optional[str] = None  # How it should sound (e.g. "throo")
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    confidence: Optional[float] = None


class AnalyzeResponse(BaseModel):
    overall_score: int
    fluency_score: int
    accuracy_score: int
    words: List[WordResult]
    overall_feedback: str
    focus_areas: List[str]
    transcribed_text: str
