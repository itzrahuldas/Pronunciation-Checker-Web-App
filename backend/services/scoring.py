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
    unclear_words = sum(1 for w in words_analyzed if w.get("status") == "unclear")
    
    # Base accuracy
    accuracy_score = int((correct_words / total_words) * 100) if total_words > 0 else 0
    
    # Acoustic fluency based on avg_logprob across ALL segments
    segments = _get(transcription_result, "segments", [])
    if segments and len(segments) > 0:
        # Average across all segments, not just the first one
        logprobs = []
        for seg in segments:
            lp = _get(seg, "avg_logprob", -0.3)
            if lp is not None:
                logprobs.append(lp)
        avg_logprob = sum(logprobs) / len(logprobs) if logprobs else -0.3
    else:
        avg_logprob = -0.3
    
    # Better fluency normalization:
    # -1.0 = very bad (0%), -0.5 = below average (50%), -0.2 = good (80%), 0.0 = perfect (100%)
    # Use a more generous curve
    if avg_logprob >= -0.1:
        fluency_score = 95
    elif avg_logprob >= -0.2:
        fluency_score = 85
    elif avg_logprob >= -0.3:
        fluency_score = 75
    elif avg_logprob >= -0.5:
        fluency_score = 60
    elif avg_logprob >= -0.7:
        fluency_score = 40
    else:
        fluency_score = int(max(0, min(30, (avg_logprob + 1.0) * 30)))

    # Overall = 60% accuracy + 40% fluency
    overall_score = int((accuracy_score * 0.6) + (fluency_score * 0.4))
    
    # Ensure minimum scores for mostly-clear speech
    if total_words > 0 and unclear_words == 0 and overall_score < 50:
        overall_score = max(overall_score, 50)
    
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
                you_said=w_data.get("you_said"),
                correct_pronunciation=w_data.get("correct_pronunciation"),
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

