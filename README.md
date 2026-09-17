# Nebula Mail

Nebula Mail is an AI-assisted Gmail client. The Next.js frontend provides the inbox, email reader, compose view, and chat panel. The FastAPI backend uses LangGraph to route chat requests, Gmail API tools to retrieve/send mail, and Google Pub/Sub to notify the frontend about new messages.

## Prerequisites

- Windows with PowerShell
- Python 3.11 or newer
- Node.js 20 or newer and npm
- [`uv`](https://docs.astral.sh/uv/getting-started/installation/) for Python dependency management
- A Google Cloud project with Gmail API and Pub/Sub API enabled
- A Gemini API key
- Gmail OAuth client credentials for a desktop application
- A Google Cloud service-account key with permission to consume the Pub/Sub subscription

## Project Setup

### 1. Configure Google credentials

Create or select a Google Cloud project and enable:

1. Gmail API
2. Cloud Pub/Sub API

Create an OAuth 2.0 **Desktop app** client and download its JSON file as:

```text
backend/credentials.json
```

Create a service account, grant it access to the Pub/Sub project/subscription, and download its key as:

```text
backend/gcp-key.json
```

Both files are ignored by Git. Do not commit them.

Create a Pub/Sub topic and subscription for Gmail notifications. The topic name and subscription name must match the values in `backend/.env`.

### 2. Configure backend environment variables

Create `backend/.env` with your own values. Do not copy API keys from source control or commit this file.

```dotenv
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_APPLICATION_CREDENTIALS=backend/gcp-key.json
GCP_PROJECT_ID=your_google_cloud_project_id
PUBSUB_TOPIC=gmail-sync-topic
PUBSUB_SUBSCRIPTION=gmail-sync-sub
```

`GROQ_API_KEY` may be present for compatibility, but the current LLM factory uses Gemini.

### 3. Install backend dependencies

From the repository root:

```powershell
cd backend
uv sync
```

### 4. Install frontend dependencies

Open a second PowerShell terminal from the repository root:

```powershell
cd frontend
npm install
```

## Run the Application

Use two terminals. Start the backend first:

**Terminal 1 - FastAPI and LangGraph**

```powershell
cd backend
uv run python main.py
```

The backend listens on `http://localhost:8000`.

On the first Gmail request, a browser window opens for OAuth consent. Complete the consent flow to create `backend/token.json`. This token is ignored by Git and is reused on later runs.

**Terminal 2 - Next.js frontend**

```powershell
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The frontend expects the backend at `http://localhost:8000`. The backend CORS configuration currently allows `localhost:3000` and `127.0.0.1:3000`.

## Common Commands

Run these from their respective directories:

```powershell
# frontend development server
npm run dev

# frontend lint
npm run lint

# frontend production build
npm run build

# frontend production server, after npm run build
npm run start
```

For the backend, `uv run python main.py` starts Uvicorn with reload enabled. The main API endpoints are:

- `POST /api/chat` - process an AI mail request
- `GET /api/stream` - receive real-time inbox refresh events

## Troubleshooting

- **`Could not connect to the LangGraph backend`**: confirm the backend terminal is running on port 8000 before opening or refreshing the frontend.
- **OAuth credential errors**: confirm `backend/credentials.json` is a Desktop OAuth client file and delete `backend/token.json` before authorizing again.
- **Missing Gemini key**: confirm `GEMINI_API_KEY` is set in `backend/.env` and that the backend was started from the `backend` directory.
- **Pub/Sub warnings at startup**: verify the project ID, topic, subscription, service-account key, and IAM permissions. Gmail fetching still depends on Gmail OAuth even when real-time Pub/Sub notifications are unavailable.
- **Port already in use**: stop the existing process using port 8000 or 3000 before starting the corresponding service.

## Project Structure

```text
.
├── ai_mail_web_app_PRD.md
├── README.md
├── backend/
│   ├── main.py                  # FastAPI API and SSE endpoint
│   ├── pyproject.toml           # Python dependencies
│   ├── agents/                  # LangGraph routing and mail agents
│   ├── models/schema.py         # State and structured-output schemas
│   ├── utils/                   # Gmail, LLM, and Pub/Sub helpers
│   └── src/email_agent/
└── frontend/
    ├── package.json             # Next.js scripts and dependencies
    ├── src/app/                 # Application shell
    ├── src/components/          # Inbox, detail, and compose UI
    └── public/                  # Static assets
```