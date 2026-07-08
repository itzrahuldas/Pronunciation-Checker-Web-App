from models.schemas import AnalyzeResponse, WordResult

def _get(obj, key, default=None):
    """Safely get a value from either a dict or an object attribute."""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)

def compute_final_score(llm_analysis: dict, transcription_result, expected_text: str = "") -> AnalyzeResponse:
    words_analyzed = llm_analysis.get("words_analyzed", [])
    
    total_words = len(words_analyzed)
    correct_words = sum(1 for w in words_analyzed if w.get("status") == "correct")
    
    # Base accuracy
    accuracy_score = int((correct_words / total_words) * 100) if total_words > 0 else 0
    
    # Acoustic fluency based on avg_logprob
    segments = _get(transcription_result, "segments", [])
    if segments and len(segments) > 0:
        avg_logprob = _get(segments[0], "avg_logprob", -0.1)
    else:
        avg_logprob = -0.1
    
    # Normalize logprob to a 0-100 score roughly. -1.0 is bad, 0.0 is perfect.
    fluency_score = int(max(0, min(100, (avg_logprob + 1.0) * 100)))

    # Overall = 60% accuracy + 40% fluency
    overall_score = int((accuracy_score * 0.6) + (fluency_score * 0.4))
    
    word_results = []
    
    # Match timestamps to words
    t_words = _get(transcription_result, "words", [])
    
    for i, w_data in enumerate(words_analyzed):
        # basic mapping
        start_time, end_time = None, None
        if i < len(t_words):
            start_time = _get(t_words[i], "start")
            end_time = _get(t_words[i], "end")

        word_results.append(
            WordResult(
                word=w_data.get("heard") or w_data.get("expected", ""),
                status=w_data.get("status", "unclear"),
                expected_phonemes=None,
                issue=w_data.get("phoneme_issue"),
                tip=w_data.get("tip"),
                start_time=start_time,
                end_time=end_time,
                confidence=None
            )
        )

    return AnalyzeResponse(
        overall_score=overall_score,
        fluency_score=fluency_score,
        accuracy_score=accuracy_score,
        words=word_results,
        overall_feedback=llm_analysis.get("overall_feedback", ""),
        focus_areas=llm_analysis.get("focus_areas", []),
        transcribed_text=_get(transcription_result, "text", "")
    )

