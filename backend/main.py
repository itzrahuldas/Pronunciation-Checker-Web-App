from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import analyze

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
