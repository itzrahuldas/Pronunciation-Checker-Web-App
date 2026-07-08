import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from utils.audio import validate_and_save_audio
from services.transcription import transcribe_audio
from services.pronunciation import extract_phonemes_dict
from services.llm_analyzer import analyze_with_llm
from services.scoring import compute_final_score

router = APIRouter()

@router.post("/analyze")
async def analyze_pronunciation(
    audio_file: UploadFile = File(...),
    expected_text: str = Form(None)
):
    tmp_path = None
    try:
        # 1. Validate & Save Audio
        file_bytes = await audio_file.read()
        tmp_path = validate_and_save_audio(file_bytes, audio_file.filename)
        
        # 2. Transcribe Audio
        transcription_result = transcribe_audio(tmp_path)
        transcribed_text = transcription_result.text
        
        # 3. Phoneme Extraction
        expected_phonemes = {}
        if expected_text:
            expected_phonemes = extract_phonemes_dict(expected_text)
        transcribed_phonemes = extract_phonemes_dict(transcribed_text)
        
        # 4. LLM Analysis
        llm_analysis = analyze_with_llm(
            expected_text=expected_text,
            expected_phonemes=expected_phonemes,
            transcription_result=transcription_result,
            transcribed_phonemes=transcribed_phonemes
        )
        
        # 5. Score Computation
        final_response = compute_final_score(llm_analysis, transcription_result, expected_text)
        
        return final_response
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # DPDP Compliance: Delete the audio file immediately after processing
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
            except:
                pass
