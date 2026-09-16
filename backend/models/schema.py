import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))



from typing import Annotated, Literal, Optional
from typing_extensions import TypedDict
from pydantic import BaseModel, Field
from operator import add

# ==========================================
# 1. LLM STRUCTURED OUTPUT SCHEMAS (PYDANTIC)
# ==========================================

class RouterDecision(BaseModel):
    """Used by the Parent Router to classify the user's intent."""
    route: Literal["compose", "search_filter", "navigate", "general_chat"] = Field(
        description="The action the user wants to perform."
    )
    comments: str = Field(
        description="Reasoning for the chosen route."
    )

class ComposeExtraction(BaseModel):
    """Used by the Compose Agent to extract email fields from natural language."""
    to_email: Optional[str] = Field(description="The recipient's email address if mentioned.")
    subject: Optional[str] = Field(description="The subject line of the email if mentioned.")
    body: Optional[str] = Field(description="The main text/body of the email to draft.")
    action: Literal["draft", "send"] = Field(
        description="Whether the user just wants to fill the UI (draft) or explicitly send it now (send)."
    )

class FilterExtraction(BaseModel):
    """Used by the Mail Retrieval Agent to convert text into search filters."""
    date_range: Optional[Literal["today", "last_7_days", "this_month", "all"]]
    sender: Optional[str]
    is_unread: Optional[bool]
    keyword: Optional[str]

# ==========================================
# 2. LANGGRAPH STATE SCHEMAS (TYPEDDICT)
# ==========================================

class EmailData(TypedDict):
    """Represents a single email object sent to the frontend."""
    id: str
    sender: str
    subject: str
    preview: str
    date: str
    is_read: bool

# The Message Reducer: Annotated[list, add] ensures we append messages 
# instead of overwriting them as the graph loops.
class AppState(TypedDict):
    """The master state shared across all LangGraph nodes and synced with CopilotKit."""
    # Conversation History
    messages: Annotated[list, add]
    
    # Internal Routing State
    current_route: str
    
    # Frontend UI State (CopilotKit will react to these changing)
    ui_view: Literal["inbox", "sent", "compose", "email_detail"]
    open_email_id: Optional[str]
    
    # Data payloads driving the UI
    inbox_emails: list[EmailData]
    compose_draft: dict  # Contains to, subject, body
    # Add this to backend/models/schema.py

class NavigationExtraction(BaseModel):
    """Used by the Navigation Agent to figure out which email to open."""
    target_sender: Optional[str] = Field(description="The name or email of the sender the user wants to open.")
    target_keyword: Optional[str] = Field(description="Keywords about the email the user wants to open.")
    action: Literal["open", "reply", "forward"] = Field(description="What the user wants to do with the email.")