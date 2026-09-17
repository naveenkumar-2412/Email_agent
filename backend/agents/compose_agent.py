import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))




from langchain_core.messages import SystemMessage
from backend.models.schema import AppState, ComposeExtraction
from backend.utils.llm_pick import pick_llm
from backend.utils.mail_api_tools import send_email

# Initialize the medium-level LLM for blazing-fast entity extraction
compose_llm = pick_llm("medium")

# Bind the LLM to output the structured UI payload
extractor = compose_llm.with_structured_output(ComposeExtraction)

def handle_compose(state: AppState) -> dict:
    """
    Extracts 'To', 'Subject', and 'Body' from the user's natural language request.
    Updates the frontend state to display the compose view and fill the form fields.
    """
    print("--- COMPOSE AGENT: EXTRACTING ENTITIES ---")
    
    messages = state.get("messages", [])
    
    system_instruction = SystemMessage(content="""
    You are an AI assistant controlling an email application interface.
    The user wants to draft or send an email.
    
    Look at the conversation history and extract the recipient (to_email), 
    the subject line (subject), and the message body (body).
    
    If a field is not explicitly mentioned, leave it null.
    CRITICAL RULE: NEVER set the action to "send" unless the user explicitly and unambiguously asks you to send it (e.g., "send it now", "send the email"). 
    If the user says "mail someone", "draft an email", or "compose an email", ALWAYS set action to "draft". 
    When in doubt, ALWAYS default to "draft" so the user can safely review it in the UI.
    """)
    
    # Run the fast extraction
    extraction: ComposeExtraction = extractor.invoke([system_instruction] + messages)
    
    print(f"Extracted -> To: {extraction.to_email} | Subject: {extraction.subject} | Action: {extraction.action}")
    
    # Prepare the draft state for the UI
    draft_data = {
        "to": extraction.to_email or "",
        "subject": extraction.subject or "",
        "body": extraction.body or ""
    }
    
    # Optional: Human-in-the-loop implementation
    # If the LLM determined the user wants to send it immediately, we execute the tool.
    # Otherwise, we just update the UI state to let the user review it.
    if extraction.action == "send" and extraction.to_email and extraction.body:
        print("Executing send_email tool...")
        result = send_email.invoke({
            "to_email": extraction.to_email,
            "subject": extraction.subject or "No Subject",
            "body": extraction.body
        })
        # We append a system message so the graph remembers it was sent
        return {
            "ui_view": "inbox", # Redirect back to inbox after sending
            "compose_draft": {"to": "", "subject": "", "body": ""}, # Clear draft
            "messages": [{"role": "system", "content": result}]
        }
    
    # Standard Draft Path: Just update the UI state so CopilotKit can visually fill the form
    return {
        "ui_view": "compose",
        "compose_draft": draft_data
    }