const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface WordResult {
  word: string;
  status: "correct" | "substitution" | "insertion" | "deletion" | "unclear";
  expected_phonemes: string | null;
  issue: string | null;
  tip: string | null;
  start_time: number | null;
  end_time: number | null;
  confidence: number | null;
}

export interface AnalyzeResponse {
  overall_score: number;
  fluency_score: number;
  accuracy_score: number;
  words: WordResult[];
  overall_feedback: string;
  focus_areas: string[];
  transcribed_text: string;
}

export async function analyzeAudio(
  file: File,
  expectedText?: string
): Promise<AnalyzeResponse> {
  const formData = new FormData();
  formData.append("audio_file", file);
  if (expectedText) {
    formData.append("expected_text", expectedText);
  }

  const response = await fetch(`${API_BASE_URL}/api/analyze`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Server error" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
