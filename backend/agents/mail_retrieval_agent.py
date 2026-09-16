import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from langchain_core.messages import SystemMessage
from backend.models.schema import AppState, FilterExtraction
from backend.utils.llm_pick import pick_llm
# Import both tools so we can choose between them
from backend.utils.mail_api_tools import fetch_recent_emails, search_gmail_messages, send_email, get_email_thread

# Initialize the medium-level LLM for structured filter extraction
retrieval_llm = pick_llm("medium")

# Bind the LLM to strictly output our FilterExtraction schema
filter_extractor = retrieval_llm.with_structured_output(FilterExtraction)

def handle_search_filter(state: AppState) -> dict:
    """
    Extracts search filters from the user's prompt, dynamically chooses 
    between recent fetch or full historical search, and updates the UI state.
    """
    print("--- MAIL RETRIEVAL AGENT: EXTRACTING FILTERS ---")
    
    messages = state.get("messages", [])
    
    system_instruction = SystemMessage(content=""""
    You are an AI assistant controlling an email application interface.
    The user wants to search, filter, or view their inbox.
    
    Look at the conversation history and extract the filtering criteria:
    - date_range: "today", "last_7_days", "this_month", or "all"
    - sender: specific email address or name if mentioned
    - is_unread: true if they ask for unread/new emails, false otherwise
    - keyword: any specific topic or search term (e.g., "Groww", "demat", "investment")
    """)
    
    # Run the fast extraction
    extraction: FilterExtraction = filter_extractor.invoke([system_instruction] + messages)
    
    print(f"Filters extracted -> Date: {extraction.date_range} | Sender: {extraction.sender} | Unread: {extraction.is_unread} | Keyword: {extraction.keyword}")
    
    fetched_emails = []

    # INTELLIGENT ROUTING: 
    # If a specific keyword/topic is requested, search the ENTIRE Gmail history.
    # Otherwise, perform a standard recent inbox lookup.
    if extraction.keyword and extraction.keyword.strip():
        # Build a precise Gmail search query string (e.g., "Groww demat")
        query_parts = [extraction.keyword.strip()]
        if extraction.sender:
            query_parts.append(f"from:{extraction.sender}")
            
        full_query = " ".join(query_parts)
        print(f"Executing Deep Historical Search with query: {full_query}")
        
        fetched_emails = search_gmail_messages.invoke({
            "query": full_query,
            "max_results": 15
        })
    else:
        # Map the extracted date_range to integer days for our tool
        days_map = {
            "today": 1,
            "last_7_days": 7,
            "this_month": 30,
            "all": 365
        }
        days_back = days_map.get(extraction.date_range, 7) # Default to 7 days
        
        print(f"Executing standard fetch_recent_emails tool (days_back: {days_back})...")
        fetched_emails = fetch_recent_emails.invoke({
            "days_back": days_back,
            "unread_only": extraction.is_unread or False,
            "keyword": None
        })
    
    # Return the updated state to drive the frontend UI
    return {
        "ui_view": "inbox",            # Force the UI to switch to the inbox view
        "inbox_emails": fetched_emails  # Populate the UI with the searched data
    }