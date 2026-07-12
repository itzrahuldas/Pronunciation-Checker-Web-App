import os
import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.concurrency import run_in_threadpool
from utils.audio import validate_and_save_audio
from services.transcription import transcribe_audio
from services.pronunciation import extract_phonemes_dict
from services.llm_analyzer import analyze_with_llm, build_fallback_analysis
from services.scoring import compute_final_score

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/analyze")
async def analyze_pronunciation(
    audio_file: UploadFile = File(...),
    expected_text: str = Form(None)
):
    tmp_path = None
    try:
        # 1. Validate & Save Audio
        file_bytes = await audio_file.read()
        tmp_path = await run_in_threadpool(
            validate_and_save_audio,
            file_bytes,
            audio_file.filename
        )
        
        # 2. Transcribe Audio
        try:
            transcription_result = await run_in_threadpool(transcribe_audio, tmp_path)
        except Exception as e:
            logger.exception("Transcription provider failed")
            raise HTTPException(
                status_code=502,
                detail="Speech transcription service is temporarily unavailable. Please try again in a few minutes."
            ) from e

        transcribed_text = transcription_result.get("text", "") if isinstance(transcription_result, dict) else transcription_result.text
        
        # 3. Phoneme Extraction
        expected_phonemes = {}
        if expected_text:
            expected_phonemes = await run_in_threadpool(extract_phonemes_dict, expected_text)
        transcribed_phonemes = await run_in_threadpool(extract_phonemes_dict, transcribed_text)
        
        # 4. LLM Analysis
        try:
            llm_analysis = await run_in_threadpool(
                analyze_with_llm,
                expected_text=expected_text,
                expected_phonemes=expected_phonemes,
                transcription_result=transcription_result,
                transcribed_phonemes=transcribed_phonemes
            )
        except Exception:
            logger.exception("LLM pronunciation analysis failed; using fallback analysis")
            llm_analysis = build_fallback_analysis(expected_text, transcription_result)
        
        # 5. Score Computation
        final_response = await run_in_threadpool(
            compute_final_score,
            llm_analysis,
            transcription_result,
            expected_text
        )
        
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
