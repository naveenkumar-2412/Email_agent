import os
from langchain_google_genai import ChatGoogleGenerativeAI

def pick_llm(level: str):
    """
    Returns the appropriate LLM. 
    We are routing all levels to Gemini 1.5 Flash to guarantee stability and avoid Groq 404s.
    """
    return ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        temperature=0,
        api_key=os.environ.get("GEMINI_API_KEY")
    )
    