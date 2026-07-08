"use client";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy & Data Processing</h1>
      
      <div className="prose prose-invert max-w-none space-y-6 text-gray-300">
        <p>
          This privacy notice explains how SpeakScore collects, uses, and protects your data in compliance with India's 
          <strong> Digital Personal Data Protection (DPDP) Act 2023</strong>.
        </p>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-white mb-3">1. What Data We Collect</h2>
          <p>
            When you use SpeakScore, we temporarily process:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Voice recordings (audio files) that you upload or record via your microphone.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-white mb-3">2. Purpose of Processing</h2>
          <p>
            Your audio data is processed exclusively for the purpose of analyzing and scoring your English pronunciation. 
            We do not use your voice data to train AI models, identify you, or for marketing purposes.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-white mb-3">3. Storage and Deletion (Zero Retention)</h2>
          <p>
            SpeakScore employs a <strong>strict zero-retention policy</strong> for audio data:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Audio files are held in server memory only for the duration of the analysis (typically 3-5 seconds).</li>
            <li>Once the pronunciation score is generated, the audio file is <strong>immediately and permanently deleted</strong> from our servers.</li>
            <li>We do not store audio recordings in any database or backup system.</li>
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-white mb-3">4. Third-Party Processors & Data Residency</h2>
          <p>
            To provide the AI analysis, we transmit your temporary audio data to our processing partner:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Groq Inc.</strong> (USA): Used for high-speed Speech-to-Text transcription and Large Language Model (LLM) analysis.</li>
          </ul>
          <p className="mt-2">
            By using SpeakScore, you consent to this temporary cross-border transfer of data for processing purposes only. 
            Groq Inc. is bound by strict confidentiality and does not retain the data after processing.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-bold text-white mb-3">5. Your DPDP Rights</h2>
          <p>
            Under the DPDP Act 2023, you have the right to:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>Withdraw Consent:</strong> You may withdraw your consent at any time. If you do, you will no longer be able to upload audio for analysis.</li>
            <li><strong>Right to Erasure:</strong> Since we delete your audio immediately, there is no historical audio data to erase. However, you can clear your local browser consent status at any time.</li>
          </ul>
        </section>
        
        <div className="mt-12 pt-8 border-t border-white/10">
          <button 
            onClick={() => {
              localStorage.removeItem("dpdp_consent");
              alert("Consent withdrawn. Your browser preferences have been cleared.");
              window.location.href = "/";
            }}
            className="px-6 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium"
          >
            Withdraw Consent & Clear Local Data
          </button>
        </div>
      </div>
    </div>
  );
}
