import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from langchain_core.messages import SystemMessage
from backend.models.schema import AppState, NavigationExtraction
from backend.utils.llm_pick import pick_llm
from backend.utils.mail_api_tools import get_email_thread, search_gmail_messages

nav_llm = pick_llm("medium")
nav_extractor = nav_llm.with_structured_output(NavigationExtraction)

def handle_navigate(state: AppState) -> dict:
    print("--- NAVIGATION AGENT: RESOLVING CONTEXT ---")
    
    messages = state.get("messages", [])
    current_inbox = state.get("inbox_emails", [])
    open_email_id = state.get("open_email_id")
    
    # 1. NEW STRICT INSTRUCTION APPLIED HERE
    system_instruction = SystemMessage(content="""
    The user wants to interact with an email or open a specific email thread.
    Extract:
    - target_sender: Sender name, brand, or email if mentioned (e.g., 'Groww', 'CDSL')
    - target_keyword: Any subject or topic keyword (e.g., 'demat account closure', 'reply procedure')
    - action: 'open', 'reply', or 'forward'. 
      CRITICAL RULE: Only extract 'reply' if the user explicitly wants to SEND a reply to someone. 
      If the user says "show me" or "find" an email that just happens to contain the word 'reply' (e.g., "show me the reply procedure"), the action MUST be 'open'.
    """)
    
    extraction: NavigationExtraction = nav_extractor.invoke([system_instruction] + messages)
    
    query_parts = []
    if extraction.target_sender:
        query_parts.append(extraction.target_sender)
    if extraction.target_keyword:
        query_parts.append(extraction.target_keyword)
        
    search_query = " ".join(query_parts).lower().strip()
    print(f"Navigation Intent -> Action: {extraction.action} | Target: {search_query}")
    
    if extraction.action in ["reply", "forward"]:
        if open_email_id:
            return {
                "ui_view": "compose",
                "compose_draft": {"to": "", "subject": "", "body": ""},
                "messages": [{"role": "assistant", "content": "Opened compose view to reply."}]
            }
        return {"messages": [{"role": "assistant", "content": "No email is currently open."}]}

    target_email = None
    
    # 1. Try matching locally first (Reading subject, sender, and preview)
    if isinstance(current_inbox, list):
        for email in current_inbox:
            if isinstance(email, dict):
                content_to_check = f"{email.get('subject', '')} {email.get('sender', '')} {email.get('preview', '')}".lower()
                if search_query and all(word in content_to_check for word in search_query.split()):
                    target_email = email
                    print("DEBUG: Found a precise matching email in current state!")
                    break

    # 2. IF NOT FOUND: Execute historical search
    if not target_email and search_query:
        print(f"DEBUG: No local match. Invoking search_gmail_messages tool with: '{search_query}'")
        historical_results = search_gmail_messages.invoke({
            "query": search_query, 
            "max_results": 5
        })
        
        if historical_results and len(historical_results) > 0:
            print("DEBUG: Reading the content of search results to find the exact match...")
            
            best_match = None
            search_terms = search_query.split()
            
            # 3. THE NEW LOGIC: Read through the subject, preview, AND body of the returned emails!
            for email in historical_results:
                # Combine everything we know about this email into one massive text block
                full_content = f"{email.get('subject', '')} {email.get('preview', '')} {email.get('body', '')}".lower()
                
                # Check if ALL the important words (like "groww", "demat", "closure") actually appear in the text
                if all(term in full_content for term in search_terms):
                    best_match = email
                    print(f"DEBUG: Content match verified for email ID: {email['id']}")
                    break
            
            if best_match:
                target_email = best_match
                current_inbox = [target_email] + [e for e in current_inbox if e['id'] != target_email['id']]
            else:
                print("DEBUG: Google returned results, but upon reading them, none matched your specific topic.")

    if not target_email:
        print("DEBUG: No match found anywhere.")
        return {
            "messages": [{"role": "assistant", "content": f"I checked your inbox and history, but I couldn't find any email actually containing the details for '{search_query}'."}],
            "ui_view": state.get("ui_view", "inbox")
        }

    # Fetch full HTML body (if it wasn't fully loaded already)
    full_thread = get_email_thread.invoke({"email_id": target_email["id"]})
    if full_thread and isinstance(target_email, dict):
        target_email["body"] = full_thread

    result = {
        "ui_view": "email_detail",
        "open_email_id": target_email["id"],
        "inbox_emails": current_inbox,
        "messages": [{"role": "assistant", "content": f"I found it! Opening '{target_email.get('subject', 'Email')}' from {target_email.get('sender', 'Unknown')}."}]
    }
    
    return result