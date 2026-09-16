import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))


from langchain_core.messages import SystemMessage
from backend.models.schema import AppState, NavigationExtraction
from backend.utils.llm_pick import pick_llm
from backend.utils.mail_api_tools import get_email_thread

# Initialize the medium-level LLM for fast entity extraction
nav_llm = pick_llm("medium")
nav_extractor = nav_llm.with_structured_output(NavigationExtraction)

def handle_navigate(state: AppState) -> dict:
    """
    Determines which email the user wants to interact with and updates the UI state.
    Handles context-aware actions like "reply to this".
    """
    print("--- NAVIGATION AGENT: RESOLVING CONTEXT ---")
    
    messages = state.get("messages", [])
    current_inbox = state.get("inbox_emails", [])
    open_email_id = state.get("open_email_id")
    
    system_instruction = SystemMessage(content="""
    You are an AI assistant controlling an email application interface.
    The user wants to open a specific email, or reply/forward the one they are currently reading.
    
    Extract the target sender or keyword they are looking for. 
    Determine if the action is to 'open', 'reply', or 'forward'.
    """)
    
    extraction: NavigationExtraction = nav_extractor.invoke([system_instruction] + messages)
    print(f"Navigation Intent -> Action: {extraction.action} | Target: {extraction.target_sender or extraction.target_keyword}")

    # ==========================================
    # CONTEXT AWARENESS: "Reply to this"
    # ==========================================
    if extraction.action in ["reply", "forward"]:
        if open_email_id:
            # The assistant knows which email is open!
            # In a real app, you would look up the open email's sender from the ID.
            # Here, we mock the transition to the compose view, pre-filled.
            return {
                "ui_view": "compose",
                "compose_draft": {
                    "to": "sender_of_opened_email@example.com", # Pre-filled context
                    "subject": f"Re: Open Email Subject",
                    "body": ""
                }
            }
        else:
            return {"messages": [{"role": "system", "content": "No email is currently open to reply to."}]}

    # ==========================================
    # NAVIGATION: "Open the email from David"
    # ==========================================
    if extraction.action == "open":
        target_email = None
        
        # Search the current inbox state to find the matching email
        for email in current_inbox:
            if extraction.target_sender and extraction.target_sender.lower() in email["sender"].lower():
                target_email = email
                break
            if extraction.target_keyword and extraction.target_keyword.lower() in email["subject"].lower():
                target_email = email
                break
                
        if target_email:
            # Fetch the full thread content using our API tool
            full_thread = get_email_thread.invoke({"email_id": target_email["id"]})
            
            return {
                "ui_view": "email_detail",        # Force UI to switch to detail view
                "open_email_id": target_email["id"], # Set the context for future commands
                "messages": [{"role": "system", "content": f"Opened email: {full_thread}"}]
            }
            
    # Default fallback if nothing matches
    return {"messages": [{"role": "system", "content": "Could not find the requested email."}]}