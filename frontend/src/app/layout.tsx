import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SpeakScore — AI Pronunciation Checker",
  description:
    "Upload your English speech recording and get instant AI-powered pronunciation feedback with word-level analysis.",
  keywords: ["pronunciation", "English", "speech analysis", "AI", "language learning"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950 text-white relative overflow-x-hidden">
          {/* Ambient background orbs */}
          <div className="bg-orb bg-orb-1" />
          <div className="bg-orb bg-orb-2" />
          <div className="bg-orb bg-orb-3" />

          <header className="border-b border-white/5 backdrop-blur-xl bg-slate-950/60 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-lg font-bold shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40 transition-shadow">
                  S
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                  SpeakScore
                </span>
              </Link>
              <nav className="flex items-center gap-6 text-sm text-gray-400">
                <Link href="/" className="hover:text-orange-400 transition-colors">Home</Link>
                <Link href="/privacy" className="hover:text-orange-400 transition-colors">Privacy</Link>
                <a
                  href="https://github.com/itzrahuldas/pronunciation-checker-web-app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-orange-400 transition-colors"
                >
                  GitHub
                </a>
              </nav>
            </div>
          </header>
          <main>{children}</main>
          <footer className="border-t border-white/5 py-8 mt-20">
            <div className="max-w-6xl mx-auto px-6 text-center text-sm text-gray-500">
              <p>Built for Livo AI SWE Assessment &mdash; DPDP Act 2023 Compliant</p>
              <p className="mt-1">Audio is processed in real-time and never stored. Your data stays yours.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
