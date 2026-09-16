# Product Requirements Document: AI-Powered Mail Web Application

## 1. Overview & Objective

This project is an AI-powered mail web application where an integrated AI assistant programmatically controls the User Interface (UI). Unlike a conversational chatbot, this assistant acts as an active co-pilot that drives the interface by physically filling forms, navigating between views, and executing actions based on natural language instructions.

---

## 2. Core Features & Scope

The application consists of three main operational pillars:

- **Mail Client Operations:** A functional email client connected to a real mail provider with distinct UI views for Inbox, Sent, Compose, and Email Detail.
- **Real-Time Sync:** The inbox must automatically update with new emails without requiring a manual refresh, utilizing push notifications or webhooks.
- **AI Assistant Control (The Core):**
  - **Compose & Send:** When instructed to send an email, the assistant opens the compose view and visibly fills in the fields (`To`, `Subject`, `Body`) for the user to see.
  - **Search & Display:** The assistant queries emails and updates the main UI to show the filtered results, rather than just returning a text response in the chat panel.
  - **Navigate & Open:** The assistant navigates the UI to open specific emails in the detail view upon request.
  - **Context Awareness:** The assistant knows which email is currently open, allowing users to issue relative commands like *"Reply to this"* and have the assistant pre-fill a reply.

---

## 3. System Architecture (The Graph Model)

Following the established design principle, the system strictly separates model reasoning from business operations. The model makes decisions and outputs structured data; typed graph state, tools, and services control what actually happens.

### 3.1 Flow & Orchestration

The application relies on a Python, LangChain, and LangGraph backend:

- **Parent Router:** Serves as the public integration point. It reads the latest user message and routes it to specialized workflows.
- **Child Graphs:** The router maps to domain-specific mail graphs:
  - **Mail Retrieval Graph:** Handles searching, filtering, and yielding UI update commands.
  - **Compose Graph:** Extracts entities (`To`, `Subject`, `Body`) to pre-fill the Compose UI state.
  - **Navigation Graph:** Handles routing the frontend to specific email detail views.

### 3.2 State Management

- The graphs share a contract defined by Pydantic models.
- State schemas include an `Annotated[list, add]` message reducer to append new messages instead of replacing them, preserving conversation history and tool outputs.
- The router utilizes restricted structured outputs (e.g., `Literal["compose", "navigate", "search"]`) to make definitive routing decisions.

### 3.3 Model Factory & Selection (Cloud-First & Free Tiers)

Model selection is centralized in a factory module to assign the right cognitive load and execution speed to the right model without breaking graph interfaces:

- **Groq API (`Llama 3.3 70B` / `Llama 4 Scout`):** Used for the Parent Router to quickly classify the request, make routing decisions, and execute multi-step UI tool calls with sub-second latency.
- **Groq API (`Llama 3.1 8B`):** Used within child graphs for lightning-fast entity extraction (e.g., instantly grabbing `To` and `Subject` to fill the UI).
- **Google Gemini (`Gemini 1.5 Flash` / `Gemini 2.5 Flash`):** Swapped in when the assistant needs to read massive email threads, relying on its large context window and multimodal caching capabilities.

---

## 4. UI/UX & Frontend Integration

- **CopilotKit Integration:** The frontend uses React/Next.js paired with CopilotKit to bridge frontend UI state with backend LangGraph agents.
- **State Hydration:** The Python LangGraph backend returns structured JSON states via an API route (e.g., FastAPI). CopilotKit ingests these payloads and physically manipulates the React DOM (e.g., opening modals, populating forms).
- **Human-in-the-Loop:** For safety, the assistant can optionally pause execution and ask the user for visual confirmation before firing off an email.

---

## 5. Tooling & Technology Stack

- **Backend:** Python, LangGraph, FastAPI, and `uv` for dependency management.
- **Tools:** Actions like fetching mail or drafting payloads are built as typed Python functions exposed to the model with validated arguments and docstrings.
- **Mail Provider:** Google Gmail API or Microsoft Graph API handles real email operations. Real-time sync is handled via provider webhooks.

---

## 6. Security & Limitations

- **Secrets:** API keys (Groq, Gemini) and mail credentials must remain in environment variables or a secrets manager and never be committed to Git.
- **Validation:** The LLM is not a security boundary; all API arguments and tool calls must be validated by standard Python logic before execution.
- **Bounded Results:** Tools fetching inbox data must enforce result limits and timeouts to prevent context-window overflow and API rate limits.

---

## 7. Project Directory Structure

A clean monorepo architecture separating the CopilotKit frontend from the LangGraph backend:

```text
.
├── frontend/                           # React/Next.js UI and client-side AI integration
│   ├── src/
│   │   ├── components/                 # Mail UI (Inbox, Compose, EmailDetail)
│   │   ├── lib/                        # CopilotKit state hooks connecting UI to backend
│   │   └── app/                        # Main application routing
│   ├── package.json                    
│   └── .env.local                      # Frontend environment variables
│
├── backend/                            # Python, LangGraph, and API integration
│   ├── main.py                         # FastAPI server bridging CopilotKit and LangGraph
│   ├── pyproject.toml                  # Python dependencies managed via uv
│   ├── uv.lock                         # Locked dependencies
│   ├── agents/
│   │   ├── parent_agent.py             # Router graph
│   │   ├── mail_retrieval_agent.py     # Graph for fetching and filtering emails
│   │   └── compose_agent.py            # Graph for UI entity extraction
│   ├── models/
│   │   └── schema.py                   # Pydantic state and output schemas
│   ├── utils/
│   │   ├── llm_pick.py                 # Model factory (Groq/Gemini selection)
│   │   └── mail_api_tools.py           # Typed Python tools for Gmail/Microsoft API
│   └── .env                            # Backend secrets
│
├── docs/                               # Architecture decisions and trade-offs
├── .gitignore                          # Exclude .env, __pycache__, node_modules
└── README.md                           # Setup instructions and demo link
```