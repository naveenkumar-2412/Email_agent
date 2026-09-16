import os
os.environ['OAUTHLIB_RELAX_TOKEN_SCOPE'] = '1'

import base64
from email.message import EmailMessage
from typing import Optional, List
from langchain.tools import tool

# Google API imports
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send"
]

def get_gmail_service():
    """Handles Google OAuth2 authentication."""
    creds = None
    current_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(current_dir, "..")
    token_path = os.path.join(backend_dir, "token.json")
    creds_path = os.path.join(backend_dir, "credentials.json")

    if os.path.exists(token_path):
        creds = Credentials.from_authorized_user_file(token_path, SCOPES)
        
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)
            
        with open(token_path, "w") as token:
            token.write(creds.to_json())

    return build("gmail", "v1", credentials=creds)

# ==========================================
# THIS IS YOUR 50 LINES OF DECODING LOGIC
# Wrapped in a function so all tools can use it!
# ==========================================
def extract_full_html_body(msg_data) -> str:
    payload = msg_data.get('payload', {})
    
    def decode_data(data_str):
        if not data_str: return ""
        try:
            return base64.urlsafe_b64decode(data_str.encode('ASCII')).decode('utf-8', errors='ignore')
        except Exception:
            return ""

    html_body = ""
    plain_body = ""
    
    def parse_parts(parts):
        nonlocal html_body, plain_body
        for part in parts:
            mime_type = part.get('mimeType', '')
            body_data = part.get('body', {}).get('data', '')
            
            if mime_type == 'text/html' and body_data:
                html_body += decode_data(body_data)
            elif mime_type == 'text/plain' and body_data:
                plain_body += decode_data(body_data)
                
            if 'parts' in part:
                parse_parts(part['parts'])

    if 'body' in payload and 'data' in payload['body']:
        mime = payload.get('mimeType', '')
        if mime == 'text/html':
            html_body = decode_data(payload['body']['data'])
        else:
            plain_body = decode_data(payload['body']['data'])
    elif 'parts' in payload:
        parse_parts(payload['parts'])
        
    # Prefer HTML. Wrap plain text so it doesn't lose line breaks.
    final_body = html_body if html_body else f"<pre style='font-family: sans-serif;'>{plain_body}</pre>"
    
    if not final_body.strip() or final_body == "<pre style='font-family: sans-serif;'></pre>":
        final_body = msg_data.get('snippet', 'Could not read email body content.')
        
    return final_body

# ==========================================
# AGENT TOOLS
# ==========================================

@tool
def fetch_recent_emails(days_back: int = 7, unread_only: bool = False, keyword: Optional[str] = None) -> List[dict]:
    """Fetches generic recent emails from the user's real Gmail inbox."""
    service = get_gmail_service()
    query_parts = [f"newer_than:{days_back}d"]
    if unread_only: query_parts.append("is:unread")
    if keyword: query_parts.append(keyword)
        
    query = " ".join(query_parts)
    print(f"Executing Generic Gmail Search: {query}")
    
    try:
        results = service.users().messages().list(userId='me', q=query, maxResults=10).execute()
        messages = results.get('messages', [])
        
        parsed_emails = []
        for msg in messages:
            # We must fetch 'full' here so the UI has the HTML ready when you click it
            msg_data = service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
            headers = msg_data.get('payload', {}).get('headers', [])
            subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), "No Subject")
            sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), "Unknown Sender")
            date = next((h['value'] for h in headers if h['name'].lower() == 'date'), "")
            
            parsed_emails.append({
                "id": msg['id'],
                "sender": sender,
                "subject": subject,
                "preview": msg_data.get('snippet', ''),
                "body": extract_full_html_body(msg_data), # <--- NOW IT SENDS FULL HTML
                "date": date,
                "is_read": not unread_only 
            })
        return parsed_emails
    except Exception as e:
        print(f"Gmail Fetch Error: {e}")
        return []

@tool
def search_gmail_messages(query: Optional[str] = None, max_results: int = 15) -> List[dict]:
    """Searches the ENTIRE Gmail history using advanced keywords or queries."""
    service = get_gmail_service()
    q_param = query if query else "in:inbox"
    print(f"Executing Deep Historical Gmail Search: {q_param}")
    
    try:
        results = service.users().messages().list(userId='me', q=q_param, maxResults=max_results).execute()
        messages = results.get('messages', [])
        detailed_emails = []
        
        for msg in messages:
            msg_data = service.users().messages().get(userId='me', id=msg['id'], format='full').execute()
            headers = msg_data['payload']['headers']
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
            sender = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown Sender')
            date = next((h['value'] for h in headers if h['name'] == 'Date'), '')
            
            detailed_emails.append({
                "id": msg['id'],
                "subject": subject,
                "sender": sender,
                "date": date,
                "preview": msg_data.get('snippet', ''),
                "body": extract_full_html_body(msg_data) # <--- NOW IT SENDS FULL HTML
            })
            
        return detailed_emails
    except Exception as e:
        print(f"Error searching historical Gmail: {e}")
        return []

@tool
def get_email_thread(email_id: str) -> str:
    """Fetches the RAW HTML body of an email to preserve tables and formatting."""
    service = get_gmail_service()
    try:
        msg_data = service.users().messages().get(userId='me', id=email_id, format='full').execute()
        return extract_full_html_body(msg_data) # <--- Uses the shared logic safely
    except Exception as e:
        return f"Error reading email body: {str(e)}"

@tool
def send_email(to_email: str, subject: str, body: str) -> str:
    """Sends a real email from the user's Gmail account."""
    service = get_gmail_service()
    try:
        message = EmailMessage()
        message.set_content(body)
        message['To'] = to_email
        message['From'] = "me"
        message['Subject'] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        create_message = {'raw': encoded_message}

        service.users().messages().send(userId="me", body=create_message).execute()
        return f"Success: Email sent to {to_email}."
    except Exception as e:
        return f"Error sending email: {str(e)}"