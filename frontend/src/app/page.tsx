"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, Upload, CheckCircle, XCircle, AlertCircle, RefreshCw, Loader2, Play, Zap, Globe, Shield, BarChart3 } from "lucide-react";
import { validateAudioDuration, MAX_FILE_SIZE_MB, isAcceptedAudioType, formatDuration } from "@/lib/audio-utils";
import { analyzeAudio, AnalyzeResponse, WordResult } from "@/lib/api";
import { REFERENCE_PASSAGES } from "@/lib/constants";

/* ─── Sound Wave Component ─── */
function SoundWave() {
  return (
    <div className="sound-wave-container absolute inset-0 flex items-center justify-center pointer-events-none">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="sound-wave-bar" />
      ))}
    </div>
  );
}

/* ─── Score Progress Bar ─── */
function ScoreBar({ label, score, color }: { label: string; score: number; color: string }) {
  const barColor =
    score >= 80 ? "bg-green-500" :
    score >= 50 ? "bg-amber-500" :
    "bg-red-500";

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 text-sm text-gray-400 shrink-0">{label}</div>
      <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor} progress-bar-animate`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className={`w-12 text-right font-bold ${color}`}>{score}%</div>
    </div>
  );
}

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

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    if (!isAcceptedAudioType(selectedFile)) {
      setError("Unsupported audio format. Please upload WAV, MP3, M4A, OGG, or WEBM.");
      return;
    }

    try {
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
      const expectedText = mode === "read" ? activePassage?.text || "" : "";
      const response = await analyzeAudio(file, expectedText);
      setResult(response);
    } catch (err: any) {
      setError(err.message || "Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const audioFile = new File([blob], 'recording.webm', { type: 'audio/webm' });
        await processFile(audioFile);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 45) {
            recorder.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      setError("Could not access microphone. Please check browser permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const resetState = () => {
    setFile(null);
    setDuration(null);
    setResult(null);
    setError(null);
    setIsAnalyzing(false);
    setAudioUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 relative">
      {/* ─── DPDP Consent Modal ─── */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-md w-full animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-orange-400" size={24} />
              <h2 className="text-xl font-bold">Data Processing Consent</h2>
            </div>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Under India&apos;s DPDP Act 2023, we need your consent to process your audio data.
            </p>
            <ul className="text-sm text-gray-400 mb-6 space-y-2 list-disc list-inside">
              <li>Your audio will be analyzed using AI and deleted immediately after.</li>
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
                className="flex-1 py-2.5 rounded-lg bg-orange-600 hover:bg-orange-500 font-medium transition-colors"
              >
                I Agree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hero Section with Sound Wave ─── */}
      <div className="text-center mb-12 stagger-children relative">
        <div className="relative inline-block">
          <SoundWave />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight relative z-10">
            Perfect Your{" "}
            <span className="bg-gradient-to-r from-orange-400 via-amber-400 to-orange-500 bg-clip-text text-transparent">
              Pronunciation
            </span>
          </h1>
        </div>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Get instant, AI-powered feedback on your spoken English with word-level accuracy.
        </p>
      </div>

      {!result ? (
        <div className="stagger-children">
          {/* ─── Mode Selector ─── */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/5 p-1 rounded-xl flex gap-1 border border-white/10">
              <button
                onClick={() => setMode("read")}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "read" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/25" : "text-gray-400 hover:text-white"
                }`}
              >
                Read-Aloud
              </button>
              <button
                onClick={() => setMode("free")}
                className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "free" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/25" : "text-gray-400 hover:text-white"
                }`}
              >
                Free Speech
              </button>
            </div>
          </div>

          {/* ─── Reference Passage ─── */}
          {mode === "read" && (
            <div className="glass-card p-6 mb-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4">
                <select 
                  value={passageId}
                  onChange={(e) => setPassageId(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-md px-3 py-1.5 text-sm text-gray-300 outline-none focus:border-orange-500"
                >
                  {REFERENCE_PASSAGES.map(p => (
                    <option key={p.id} value={p.id}>{p.title} ({p.difficulty})</option>
                  ))}
                </select>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-orange-300">Read this passage:</h3>
              <p className="text-xl md:text-2xl leading-relaxed text-gray-200 font-medium">
                &quot;{activePassage?.text}&quot;
              </p>
            </div>
          )}

          {/* ─── Upload / Record Area ─── */}
          <div 
            className="glass-card p-10 text-center relative overflow-hidden group border-dashed border-2 hover:border-orange-500/50 transition-colors"
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-active'); }}
            onDragLeave={(e) => e.currentTarget.classList.remove('drag-active')}
            onDrop={(e) => { e.currentTarget.classList.remove('drag-active'); handleDrop(e); }}
          >
            {isAnalyzing ? (
              <div className="flex flex-col items-center py-12">
                <div className="flex gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-orange-500 loading-dot"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500 loading-dot"></div>
                  <div className="w-3 h-3 rounded-full bg-orange-500 loading-dot"></div>
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
                  {file.name} • {duration && duration > 0 ? formatDuration(duration) : 'Ready to analyze'}
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
                    className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 font-bold shadow-lg shadow-orange-500/25 transition-all transform hover:scale-105"
                  >
                    Analyze Pronunciation
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-8">
                {isRecording ? (
                  <div className="flex flex-col items-center">
                    <div className="w-24 h-24 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 relative recording-ring pulse-glow">
                      <Mic size={44} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-red-400">Recording... {formatDuration(recordingTime)}</h3>
                    <p className="text-gray-400 mb-4">Speak clearly into your microphone.</p>
                    {/* Recording progress bar */}
                    <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden mb-6">
                      <div 
                        className="h-full bg-red-500 rounded-full transition-all duration-1000"
                        style={{ width: `${(recordingTime / 45) * 100}%` }}
                      />
                    </div>
                    <button 
                      onClick={stopRecording}
                      className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 font-bold shadow-lg transition-all"
                    >
                      Stop Recording
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-20 h-20 bg-orange-500/10 text-orange-400 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-orange-500/20">
                      <Upload size={36} />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Upload or record audio</h3>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">
                      Drag and drop your audio file here, or click to browse. Supports WAV, MP3, M4A, WebM.
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
                        className="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 font-medium transition-colors flex items-center gap-2 shadow-lg shadow-orange-600/20"
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

          {/* ─── Feature Cards ─── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            <div className="glass-card feature-card p-5 text-center">
              <div className="w-10 h-10 bg-orange-500/10 text-orange-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <BarChart3 size={20} />
              </div>
              <h4 className="font-semibold text-sm mb-1">Word-Level</h4>
              <p className="text-xs text-gray-500">Analysis for every word you speak</p>
            </div>
            <div className="glass-card feature-card p-5 text-center">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Zap size={20} />
              </div>
              <h4 className="font-semibold text-sm mb-1">AI-Powered</h4>
              <p className="text-xs text-gray-500">Whisper + LLaMA advanced AI models</p>
            </div>
            <div className="glass-card feature-card p-5 text-center">
              <div className="w-10 h-10 bg-orange-500/10 text-orange-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Globe size={20} />
              </div>
              <h4 className="font-semibold text-sm mb-1">All Accents</h4>
              <p className="text-xs text-gray-500">US, UK, Indian & more supported</p>
            </div>
            <div className="glass-card feature-card p-5 text-center">
              <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Shield size={20} />
              </div>
              <h4 className="font-semibold text-sm mb-1">Privacy First</h4>
              <p className="text-xs text-gray-500">DPDP compliant, no data stored</p>
            </div>
          </div>
        </div>
      ) : (
        /* ─── Results View ─── */
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
            {/* Score Gauge */}
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
                      <stop offset="0%" stopColor="#F97316" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute text-4xl font-bold">
                  {result.overall_score}<span className="text-lg text-gray-500">/100</span>
                </div>
              </div>
            </div>
            
            {/* Feedback + Score Bars */}
            <div className="glass-card p-6 md:col-span-2">
              <h3 className="text-xl font-bold mb-4">Feedback Summary</h3>
              <p className="text-gray-300 leading-relaxed mb-6">
                {result.overall_feedback}
              </p>
              
              {/* Progress Bars */}
              <div className="space-y-3 mb-6">
                <ScoreBar label="Accuracy" score={result.accuracy_score} color="text-orange-400" />
                <ScoreBar label="Fluency" score={result.fluency_score} color="text-amber-400" />
              </div>
              
              {result.focus_areas.length > 0 && (
                <div className="pt-4 border-t border-white/10">
                  <div className="text-sm text-gray-400 mb-3">Areas to improve:</div>
                  <div className="flex flex-wrap gap-2">
                    {result.focus_areas.map((area, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs text-orange-300">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Word-by-Word */}
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
                  bgClass = "bg-red-500/10 border border-red-500/20 px-1.5 rounded-md";
                } else if (w.status === "deletion") {
                  colorClass = "text-gray-500 line-through";
                } else if (w.status === "unclear") {
                  colorClass = "text-yellow-400 underline decoration-yellow-500/50 decoration-wavy";
                }
                
                return (
                  <span 
                    key={i} 
                    className={`text-lg cursor-default transition-colors hover:opacity-80 ${colorClass} ${bgClass}`} 
                    title={w.issue || "Correct"}
                  >
                    {w.word}
                  </span>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-gray-400 border-t border-white/10 pt-4">
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-green-400"></div> Correct</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400"></div> Mispronounced</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Unclear</span>
              <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gray-500"></div> Skipped</span>
            </div>
            
            {/* Detailed Issues */}
            {result.words.filter(w => w.issue).length > 0 && (
              <div className="mt-8 pt-8 border-t border-white/10 space-y-4">
                <h4 className="font-semibold text-gray-300 mb-4">Specific Feedback</h4>
                {result.words.filter(w => w.issue).map((w, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-orange-500/20 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 font-bold text-sm">
                        !
                      </div>
                      <div>
                        <h5 className="font-bold text-lg mb-1">{w.word}</h5>
                        <p className="text-gray-300 mb-2">{w.issue}</p>
                        {w.tip && (
                          <div className="text-sm text-amber-400 bg-amber-500/10 px-3 py-2 rounded-lg inline-block">
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
