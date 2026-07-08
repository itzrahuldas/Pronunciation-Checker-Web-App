"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Upload, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2, Play } from "lucide-react";
import { validateAudioDuration, MAX_FILE_SIZE_MB, isAcceptedAudioType, formatDuration } from "@/lib/audio-utils";
import { analyzeAudio, AnalyzeResponse, WordResult } from "@/lib/api";
import { REFERENCE_PASSAGES } from "@/lib/constants";

export default function Home() {
  const [mode, setMode] = useState<"read" | "free">("read");
  const [passageId, setPassageId] = useState(REFERENCE_PASSAGES[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const [isConsentGiven, setIsConsentGiven] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activePassage = REFERENCE_PASSAGES.find((p) => p.id === passageId);

  // Load consent from localStorage on mount
  useEffect(() => {
    const consent = localStorage.getItem("dpdp_consent");
    if (consent === "true") {
      setIsConsentGiven(true);
    }
  }, []);

  const handleConsent = (agreed: boolean) => {
    if (agreed) {
      localStorage.setItem("dpdp_consent", "true");
      setIsConsentGiven(true);
      setShowConsentModal(false);
    } else {
      setShowConsentModal(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const processFile = async (selectedFile: File) => {
    setError(null);
    setResult(null);

    // 1. File size check
    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    // 2. File type check
    if (!isAcceptedAudioType(selectedFile)) {
      setError("Unsupported audio format. Please upload WAV, MP3, M4A, OGG, or WEBM.");
      return;
    }

    try {
      // 3. Duration check
      const dur = await validateAudioDuration(selectedFile);
      setDuration(dur);
      setFile(selectedFile);
      setAudioUrl(URL.createObjectURL(selectedFile));
    } catch (err: any) {
      setError(err.message || "Failed to process audio file.");
      setFile(null);
      setDuration(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      await processFile(droppedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    
    if (!isConsentGiven) {
      setShowConsentModal(true);
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    
    try {
      const expectedText = mode === "read" ? activePassage?.text : undefined;
      const res = await analyzeAudio(file, expectedText);
      setResult(res);
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setDuration(null);
    setResult(null);
    setError(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], "recording.webm", { type: "audio/webm" });
        processFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 45) {
            stopRecording();
            return 45;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err) {
      setError("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  // Render components
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Modals & Overlays */}
      {showConsentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full p-8 animate-fade-in-up">
            <h3 className="text-xl font-bold mb-4">Data Privacy Consent</h3>
            <p className="text-gray-300 text-sm mb-4">
              To analyze your pronunciation, we need to process your audio recording. 
              As per the DPDP Act 2023, please note:
            </p>
            <ul className="list-disc pl-5 text-sm text-gray-400 space-y-2 mb-6">
              <li>Your audio is processed solely for pronunciation scoring.</li>
              <li>Audio is deleted immediately from our servers after analysis.</li>
              <li>No personal identifiers are stored with your results.</li>
              <li>Audio may be transmitted to our AI partner (Groq Inc.) for processing.</li>
            </ul>
            <div className="flex gap-4">
              <button 
                onClick={() => handleConsent(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
              >
                Decline
              </button>
              <button 
                onClick={() => handleConsent(true)}
                className="flex-1 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 font-medium transition-colors"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="text-center mb-12 stagger-children">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
          Perfect Your <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Pronunciation</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Get instant, AI-powered feedback on your spoken English with word-level accuracy.
        </p>
      </div>

      {!result ? (
        <div className="stagger-children">
          {/* Mode Selector */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/5 p-1 rounded-xl flex gap-1 border border-white/10">
              <button
                onClick={() => setMode("read")}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "read" ? "bg-violet-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                }`}
              >
                Read-Aloud
              </button>
              <button
                onClick={() => setMode("free")}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "free" ? "bg-violet-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
                }`}
              >
                Free Speech
              </button>
            </div>
          </div>

          {/* Reference Passage (Read Mode) */}
          {mode === "read" && (
            <div className="glass-card p-6 mb-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4">
                <select 
                  value={passageId}
                  onChange={(e) => setPassageId(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-violet-500"
                >
                  {REFERENCE_PASSAGES.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.difficulty})</option>
                  ))}
                </select>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-violet-300">Read this passage:</h3>
              <p className="text-xl md:text-2xl leading-relaxed text-gray-200 font-medium">
                "{activePassage?.text}"
              </p>
            </div>
          )}

          {/* Upload / Record Area */}
          <div 
            className="glass-card p-10 text-center relative overflow-hidden group border-dashed border-2 hover:border-violet-500/50 transition-colors"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-active'); }}
            onDragLeave={(e) => e.currentTarget.classList.remove('drag-active')}
            onDrop={(e) => { e.currentTarget.classList.remove('drag-active'); handleDrop(e); }}
          >
            {isAnalyzing ? (
              <div className="flex flex-col items-center py-12">
                <div className="flex gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-violet-500 loading-dot"></div>
                  <div className="w-3 h-3 rounded-full bg-cyan-500 loading-dot"></div>
                  <div className="w-3 h-3 rounded-full bg-violet-500 loading-dot"></div>
                </div>
                <h3 className="text-xl font-bold mb-2">Analyzing your speech...</h3>
                <p className="text-gray-400">Our AI is breaking down your pronunciation at the phoneme level.</p>
              </div>
            ) : file ? (
              <div className="py-8">
                <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-xl font-bold mb-2">Audio ready for analysis</h3>
                <p className="text-gray-400 mb-6">
                  {file.name} • {duration ? formatDuration(duration) : 'Unknown duration'}
                </p>
                {audioUrl && (
                  <audio src={audioUrl} controls className="mx-auto mb-8 h-10 rounded-full" />
                )}
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={resetState}
                    className="px-6 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors font-medium"
                  >
                    Change File
                  </button>
                  <button 
                    onClick={handleAnalyze}
                    className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 font-bold shadow-lg shadow-violet-500/25 transition-all transform hover:scale-105"
                  >
                    Analyze Pronunciation
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8">
                {isRecording ? (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 pulse-glow">
                      <Mic size={40} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-red-400">Recording... {formatDuration(recordingTime)}</h3>
                    <p className="text-gray-400 mb-8">Speak clearly. Limit: 45 seconds.</p>
                    <button 
                      onClick={stopRecording}
                      className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 font-bold shadow-lg transition-all"
                    >
                      Stop Recording
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white/5 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Upload size={32} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Upload or record audio</h3>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                      Drag and drop your audio file here, or click to browse. Must be 30-45 seconds.
                    </p>
                    
                    <input 
                      type="file" 
                      accept="audio/*" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileChange}
                    />
                    
                    <div className="flex justify-center gap-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 font-medium transition-colors"
                      >
                        Browse Files
                      </button>
                      <button 
                        onClick={startRecording}
                        className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 font-medium transition-colors flex items-center gap-2"
                      >
                        <Mic size={18} /> Record Audio
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          
          {error && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3 animate-fade-in-up">
              <AlertCircle className="shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>
      ) : (
        /* Results View */
        <div className="animate-fade-in-up">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold">Analysis Results</h2>
            <button 
              onClick={resetState}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium"
            >
              <RefreshCw size={16} /> Start Over
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-card p-6 md:col-span-1 flex flex-col items-center justify-center text-center">
              <h3 className="text-gray-400 mb-2">Overall Score</h3>
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="45" 
                    fill="none" 
                    stroke="url(#scoreGradient)" 
                    strokeWidth="8" 
                    strokeDasharray="283" 
                    strokeDashoffset={283 - (283 * result.overall_score) / 100}
                    strokeLinecap="round"
                    className="score-gauge-animate"
                  />
                  <defs>
                    <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute text-4xl font-bold">
                  {result.overall_score}<span className="text-lg text-gray-500">/100</span>
                </div>
              </div>
            </div>
            
            <div className="glass-card p-6 md:col-span-2">
              <h3 className="text-xl font-bold mb-4">Feedback Summary</h3>
              <p className="text-gray-300 leading-relaxed mb-6">
                {result.overall_feedback}
              </p>
              
              <div className="flex gap-8">
                <div>
                  <div className="text-sm text-gray-400 mb-1">Accuracy</div>
                  <div className="text-2xl font-bold text-violet-400">{result.accuracy_score}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-1">Fluency</div>
                  <div className="text-2xl font-bold text-cyan-400">{result.fluency_score}%</div>
                </div>
              </div>
              
              {result.focus_areas.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <div className="text-sm text-gray-400 mb-3">Key areas for improvement:</div>
                  <div className="flex flex-wrap gap-2">
                    {result.focus_areas.map((area, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="glass-card p-6 md:p-8">
            <h3 className="text-xl font-bold mb-6">Word-by-Word Analysis</h3>
            
            <div className="flex flex-wrap gap-2 mb-8 leading-loose">
              {result.words.map((w, i) => {
                let colorClass = "text-gray-300";
                let bgClass = "";
                
                if (w.status === "correct") {
                  colorClass = "text-green-400";
                } else if (w.status === "substitution" || w.status === "insertion") {
                  colorClass = "text-red-400 font-semibold";
                  bgClass = "bg-red-500/10 border border-red-500/20 px-1 rounded";
                } else if (w.status === "deletion") {
                  colorClass = "text-gray-500 line-through";
                } else if (w.status === "unclear") {
                  colorClass = "text-yellow-400 underline decoration-yellow-500/50 decoration-wavy";
                }
                
                return (
                  <span key={i} className={`text-lg cursor-pointer transition-colors ${colorClass} ${bgClass}`} title={w.issue || "Correct"}>
                    {w.word}
                  </span>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex gap-4 text-xs text-gray-400 border-t border-white/10 pt-4">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-400"></div> Correct</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-400"></div> Mispronounced</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Unclear</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-500"></div> Skipped</span>
            </div>
            
            {/* Detailed Issues */}
            {result.words.filter(w => w.issue).length > 0 && (
              <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                <h4 className="font-semibold text-gray-300 mb-4">Specific Mistakes</h4>
                {result.words.filter(w => w.issue).map((w, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 font-bold">
                        !
                      </div>
                      <div>
                        <h5 className="font-bold text-lg mb-1">{w.word}</h5>
                        <p className="text-gray-300 mb-2">{w.issue}</p>
                        {w.tip && (
                          <div className="text-sm text-cyan-400 bg-cyan-500/10 px-3 py-2 rounded-lg inline-block">
                            💡 Tip: {w.tip}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
