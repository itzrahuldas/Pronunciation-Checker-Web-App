from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import analyze
import nltk

# Ensure required NLTK data is downloaded for g2p-en/pronouncing
try:
    nltk.data.find('taggers/averaged_perceptron_tagger_eng')
except LookupError:
    nltk.download('averaged_perceptron_tagger_eng')

# Some older versions of NLTK/g2p-en might look for this exact name instead
try:
    nltk.data.find('taggers/averaged_perceptron_tagger')
except LookupError:
    nltk.download('averaged_perceptron_tagger')


app = FastAPI(
    title="Pronunciation Checker API",
    description="API for Livo AI SWE Assessment - Analyzes English pronunciation.",
    version="1.0.0"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to Vercel domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api", tags=["Analysis"])

@app.get("/")
def health_check():
    return {"status": "healthy", "service": "Pronunciation Checker API"}
