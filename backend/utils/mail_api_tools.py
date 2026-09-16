from langchain.tools import tool
from typing import Optional, List
import datetime

# Note: In production, replace the mock returns with actual Gmail/Microsoft API calls.

@tool
def fetch_recent_emails(days_back: int = 7, unread_only: bool = False, keyword: Optional[str] = None) -> List[dict]:
    """
    Fetches recent emails from the user's inbox based on filters.
    Use this to get data to display when the user asks to 'see emails'.
    """
    # TODO: Connect to googleapiclient.discovery / Microsoft Graph API here
    print(f"Fetching emails from last {days_back} days. Unread only: {unread_only}")
    
    # Mock data structure matching our Pydantic EmailData schema
    return [
        {
            "id": "msg_123",
            "sender": "sarah@example.com",
            "subject": "Project Update",
            "preview": "Here are the latest metrics for the Nebula project...",
            "date": datetime.datetime.now().isoformat(),
            "is_read": not unread_only
        }
    ]

@tool
def send_email(to_email: str, subject: str, body: str) -> str:
    """
    Sends an email to the specified recipient. 
    Validate all arguments before calling this tool.
    """
    if not to_email or "@" not in to_email:
        return "Error: Invalid email address provided."
        
    # TODO: Connect to Gmail API raw message sending here
    print(f"Sending email to {to_email} | Subject: {subject}")
    
    return f"Success: Email sent to {to_email}."

@tool
def get_email_thread(email_id: str) -> str:
    """
    Fetches the full text content of a specific email thread by its ID.
    Use this when the user wants to read a specific email or asks to 'reply to this'.
    """
    # TODO: Fetch full message payload via API
    return "This is the full body content of the requested email..."