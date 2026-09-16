import sys
import os

# Append the project root to the Python path (two levels up from /agents)
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))




from langgraph.graph import StateGraph, START, END
from langchain_core.messages import HumanMessage, SystemMessage
from backend.models.schema import AppState, RouterDecision
from backend.utils.llm_pick import pick_llm
from backend.agents.compose_agent import handle_compose
from backend.agents.mail_retrieval_agent import handle_search_filter
from backend.agents.navigation_agent import handle_navigate

# Initialize the high-level LLM for routing
router_llm = pick_llm("high")

# Bind the LLM to strictly output our Pydantic schema
structured_router = router_llm.with_structured_output(RouterDecision)

# ==========================================
# 1. ROUTER NODE
# ==========================================
def route_intent(state: AppState) -> dict:
    """
    Analyzes the user's input and decides which subsystem should handle it.
    Updates the state with the chosen route.
    """
    print("--- PARENT ROUTER: ANALYZING INTENT ---")
    
    # Extract the conversation history
    messages = state.get("messages", [])
    
    # Provide system instructions for routing
    system_instruction = SystemMessage(content="""
    You are the central router for an AI-powered Mail web application.
    Your job is to analyze the user's latest message and route it to the correct subsystem.
    
    Routes:
    - 'compose': The user wants to write, draft, or send an email.
    - 'search_filter': The user wants to list, find, see, or filter their inbox/sent emails (e.g. "show emails", "filter unread").
    - 'navigate': The user wants to OPEN or READ a specific email, or switch views (e.g. "open the email", "read the project update email", "open the latest email").
    - 'general_chat': Friendly greetings or questions unrelated to mail actions.
    
    CRITICAL: Any request to "open", "read", or "show details of" a specific email MUST route to 'navigate'.
    """)
    
    # Invoke the model to get the structured decision
    decision: RouterDecision = structured_router.invoke([system_instruction] + messages)
    
    print(f"Decision: {decision.route} | Reason: {decision.comments}")
    
    # Update the graph state with the decision
    return {"current_route": decision.route}

# ==========================================
# 2. CONDITIONAL EDGE ROUTING LOGIC
# ==========================================
def decide_next_node(state: AppState) -> str:
    """
    Reads the state and tells LangGraph which node to run next.
    """
    return state.get("current_route", "general_chat")

# ==========================================
# 3. GRAPH CONSTRUCTION
# ==========================================

# Initialize the graph with our state contract
builder = StateGraph(AppState)

# Add the router node
builder.add_node("router", route_intent)

# Mock nodes for the child graphs (we will replace these in the next steps)
builder.add_node("compose", handle_compose)
builder.add_node("search_filter", handle_search_filter)
builder.add_node("navigate", handle_navigate)
builder.add_node("general_chat", lambda state: state) # Do nothing

# Connect the START point to the router
builder.add_edge(START, "router")

# Add conditional edges to map the router's output to the correct node
builder.add_conditional_edges(
    "router",                  # Source node
    decide_next_node,          # Router function deciding the path
    {
        "compose": "compose",
        "search_filter": "search_filter",
        "navigate": "navigate",
        "general_chat": "general_chat"
    }
)

# Connect all child graphs to END
builder.add_edge("compose", END)
builder.add_edge("search_filter", END)
builder.add_edge("navigate", END)
builder.add_edge("general_chat", END)

# Compile the final executable graph
parent_agent = builder.compile()