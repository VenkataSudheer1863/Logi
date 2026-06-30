"""
Incident Detection & Analysis Agent (LangGraph)
Analyzes incidents, determines severity, suggests remediation
"""
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage
from app.ai_agents.llm_client import get_llm
from app.common.logger import logger


class IncidentState(TypedDict):
    incident_id: int
    incident_type: str
    severity: str
    location: str
    description: str
    warehouse_id: Optional[int]
    validated_severity: str
    immediate_actions: List[str]
    escalation_required: bool
    ai_analysis: str
    estimated_resolution_hours: float


def validate_severity(state: IncidentState) -> IncidentState:
    """Rule-based severity validation"""
    desc_lower = state["description"].lower()
    incident_type = state["incident_type"].lower()

    # Auto-escalate certain types
    critical_keywords = ["fire", "explosion", "injury", "chemical", "collapse"]
    if any(kw in desc_lower for kw in critical_keywords) or incident_type == "fire":
        state["validated_severity"] = "critical"
        state["escalation_required"] = True
    elif incident_type in ["theft", "safety_violation"]:
        state["validated_severity"] = "high"
        state["escalation_required"] = True
    else:
        state["validated_severity"] = state["severity"]
        state["escalation_required"] = state["severity"] in ["critical", "high"]

    return state


def determine_immediate_actions(state: IncidentState) -> IncidentState:
    """Rule engine for immediate response actions"""
    actions = []
    incident_type = state["incident_type"].lower()
    severity = state["validated_severity"]

    action_map = {
        "fire": ["Activate fire suppression", "Evacuate zone", "Call emergency services", "Notify safety officer"],
        "damage": ["Quarantine affected goods", "Document with photos", "Notify quality team", "File insurance claim"],
        "theft": ["Secure area", "Review CCTV footage", "Notify security", "File police report"],
        "spill": ["Contain spill", "Deploy hazmat team", "Restrict zone access", "Environmental report"],
        "equipment_failure": ["Tag equipment out-of-service", "Request maintenance", "Reroute operations"],
        "safety_violation": ["Issue stop-work order", "Conduct safety briefing", "Document violation"],
        "stock_discrepancy": ["Freeze affected inventory", "Conduct recount", "Audit movement logs"],
    }

    actions = action_map.get(incident_type, ["Document incident", "Notify supervisor"])
    if severity == "critical":
        actions.insert(0, "IMMEDIATE: Alert warehouse manager and safety officer")

    state["immediate_actions"] = actions
    return state


def analyze_with_llm(state: IncidentState) -> IncidentState:
    """LLM provides deep analysis and resolution strategy"""
    llm = get_llm()

    prompt = f"""You are a Maersk warehouse safety and operations expert.

Incident Report:
- ID: {state['incident_id']}
- Type: {state['incident_type']}
- Severity: {state['validated_severity']} (originally reported as: {state['severity']})
- Location: {state['location']}
- Description: {state['description']}
- Escalation Required: {state['escalation_required']}

Immediate Actions Triggered:
{chr(10).join(f'• {a}' for a in state['immediate_actions'])}

Provide:
1. Root cause analysis
2. Impact assessment on warehouse operations
3. Detailed remediation plan (step-by-step)
4. Preventive measures to avoid recurrence
5. Estimated resolution time in hours
6. Regulatory/compliance considerations

FORMAT RULES: Use ### headings for each section, **bold** critical actions and numbers, numbered lists for steps. Be specific and actionable. Under 400 words.
"""
    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = (response.content or "").strip()
        if not content:
            raise ValueError("LLM returned empty response")
        state["ai_analysis"] = content
        import re
        hours_match = re.search(r'(\d+(?:\.\d+)?)\s*hours?', content, re.IGNORECASE)
        state["estimated_resolution_hours"] = float(hours_match.group(1)) if hours_match else 4.0
    except Exception as e:
        logger.error(f"Incident LLM analysis error: {e}")
        sev = state['validated_severity']
        itype = state['incident_type']
        est_hours = {"low": 2.0, "medium": 4.0, "high": 8.0, "critical": 24.0}.get(sev, 4.0)
        state["estimated_resolution_hours"] = est_hours
        state["ai_analysis"] = (
            f"INCIDENT ANALYSIS (rule-based fallback)\n\n"
            f"Root Cause: {itype.replace('_',' ').title()} incident at {state['location']}. "
            f"Immediate investigation required.\n\n"
            f"Impact Assessment: Severity '{sev}' — "
            f"{'Operations halted in affected zone.' if sev == 'critical' else 'Partial disruption to zone operations.'}\n\n"
            f"Remediation Plan:\n"
            f"{''.join(f'{i+1}. {a}' + chr(10) for i, a in enumerate(state['immediate_actions']))}\n"
            f"Preventive Measures: Review safety protocols, conduct staff briefing, "
            f"update incident log, schedule follow-up inspection in 48h.\n\n"
            f"Estimated Resolution: {est_hours} hours\n\n"
            f"Note: AI narrative unavailable — check GROQ_API_KEY in .env."
        )

    return state


def build_incident_graph():
    graph = StateGraph(IncidentState)
    graph.add_node("validate_severity", validate_severity)
    graph.add_node("actions", determine_immediate_actions)
    graph.add_node("analyze", analyze_with_llm)

    graph.set_entry_point("validate_severity")
    graph.add_edge("validate_severity", "actions")
    graph.add_edge("actions", "analyze")
    graph.add_edge("analyze", END)

    return graph.compile()


incident_graph = build_incident_graph()


async def analyze_incident(
    incident_id: int,
    incident_type: str,
    severity: str,
    location: str,
    description: str,
    warehouse_id: Optional[int] = None,
) -> dict:
    state: IncidentState = {
        "incident_id": incident_id,
        "incident_type": incident_type,
        "severity": severity,
        "location": location,
        "description": description,
        "warehouse_id": warehouse_id,
        "validated_severity": severity,
        "immediate_actions": [],
        "escalation_required": False,
        "ai_analysis": "",
        "estimated_resolution_hours": 4.0,
    }
    result = incident_graph.invoke(state)
    return {
        "incident_id": incident_id,
        "validated_severity": result["validated_severity"],
        "escalation_required": result["escalation_required"],
        "immediate_actions": result["immediate_actions"],
        "ai_analysis": result["ai_analysis"],
        "estimated_resolution_hours": result["estimated_resolution_hours"],
    }
