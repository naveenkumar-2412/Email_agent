# AI-Powered Mail Web Application

An agentic email client where an integrated AI assistant controls the frontend interface. The assistant can navigate between views, compose and pre-fill emails, and retrieve messages through structured agent workflows.

## Project Structure

```text
.
├── ai_mail_web_app_PRD.md       # Product requirements
├── backend/
│   ├── main.py                  # FastAPI application and API routes
│   ├── pyproject.toml            # Python dependencies and project config
│   ├── agents/
│   │   ├── parent_agent.py       # Agent orchestration
│   │   ├── mail_retrieval_agent.py
│   │   ├── compose_agent.py
│   │   └── navigation_agent.py
│   ├── models/
│   │   └── schema.py             # Shared request and response models
│   ├── utils/
│   │   ├── llm_pick.py           # LLM provider selection
│   │   └── mail_api_tools.py     # Mail service tools
│   └── src/email_agent/          # Python package metadata
└── frontend/
    ├── package.json              # Next.js scripts and dependencies
    ├── src/app/                  # Application shell and global styles
    ├── src/components/           # Inbox, detail, and compose UI
    ├── src/lib/copilot.ts        # CopilotKit integration
    └── public/                   # Static assets
```