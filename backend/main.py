import sys
import os

# Append the project root to the Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv

# Load the .env file we just created
load_dotenv()

# Import LangChain message types
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from backend.agents.parent_agent import parent_agent

app = FastAPI(title="Nebula Mail AI Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    messages: List[dict]
    ui_view: Optional[str] = "inbox"
    open_email_id: Optional[str] = None
    inbox_emails: Optional[List[dict]] = []

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    print("--- RECEIVED REQUEST FROM FRONTEND ---")
    
    # 1. Convert JSON dictionaries to LangChain Message Objects
    langchain_messages = []
    for msg in request.messages:
        role = msg.get("role")
        content = msg.get("content", "")
        
        if role == "user":
            langchain_messages.append(HumanMessage(content=content))
        elif role == "assistant":
            langchain_messages.append(AIMessage(content=content))
        elif role == "system":
            langchain_messages.append(SystemMessage(content=content))

    # 2. Inject the converted messages into the AppState
    initial_state = {
        "messages": langchain_messages,
        "ui_view": request.ui_view,
        "open_email_id": request.open_email_id,
        "inbox_emails": request.inbox_emails,
        "compose_draft": {},
        "current_route": ""
    }
    
    # 3. Invoke the LangGraph agent[cite: 1]
    final_state = parent_agent.invoke(initial_state)
    
    # 4. Convert LangChain messages BACK to JSON dictionaries for the frontend
    serializable_messages = []
    for msg in final_state.get("messages", []):
        if hasattr(msg, "content"):
            # Determine role based on class type
            role = "assistant"
            if isinstance(msg, HumanMessage):
                role = "user"
            elif isinstance(msg, SystemMessage):
                role = "system"
                
            serializable_messages.append({"role": role, "content": msg.content})
        else:
            serializable_messages.append(msg)
            
    final_state["messages"] = serializable_messages
    
    print(f"--- RETURNING NEW UI STATE: {final_state.get('ui_view')} ---")
    return final_state

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)