"""
Disruption Agent (LangGraph)
Analyzes supply chain disruptions (weather, port delays) and suggests rerouting
"""
from typing import TypedDict, List, Dict, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage
from app.ai_agents.llm_client import get_llm
from app.common.logger import logger


class DisruptionState(TypedDict):
    disruption_type: str  # weather, port_delay, strike, equipment_failure
    affected_port: str
    affected_containers: List[str]
    severity_score: float  # 0-10
    estimated_delay_hours: float
    alternative_routes: List[Dict]
    rerouting_plan: str
    cost_impact_usd: float
    ai_recommendation: str


def assess_disruption(state: DisruptionState) -> DisruptionState:
    """Assess disruption severity and identify alternatives"""
    # Mock alternative routes based on affected port
    port_alternatives = {
        "DEHAM": ["NLRTM", "BEANR", "GBFXT"],  # Hamburg alternatives
        "SGSIN": ["MYPKG", "THBKK", "VNSGN"],  # Singapore alternatives
        "CNSHA": ["CNNGB", "CNTAO", "HKHKG"],  # Shanghai alternatives
        "USLAX": ["USOAK", "USSEA", "USLGB"],  # LA alternatives
    }

    affected = state["affected_port"].upper()
    alternatives = port_alternatives.get(affected, ["ALT_PORT_1", "ALT_PORT_2"])

    state["alternative_routes"] = [
        {
            "port": alt,
            "additional_transit_days": i + 1,
            "cost_premium_pct": (i + 1) * 8,
            "availability": "available" if i < 2 else "limited",
        }
        for i, alt in enumerate(alternatives)
    ]

    # Estimate cost impact
    containers_count = len(state["affected_containers"])
    delay_hours = state["estimated_delay_hours"]
    state["cost_impact_usd"] = containers_count * delay_hours * 150  # $150/container/hour

    return state


def generate_rerouting_plan(state: DisruptionState) -> DisruptionState:
    """Generate optimal rerouting based on severity"""
    if state["severity_score"] >= 8:
        # Critical: reroute all containers immediately
        best_alt = state["alternative_routes"][0] if state["alternative_routes"] else None
        state["rerouting_plan"] = (
            f"CRITICAL REROUTE: Redirect all {len(state['affected_containers'])} containers "
            f"to {best_alt['port'] if best_alt else 'nearest available port'} immediately."
        )
    elif state["severity_score"] >= 5:
        state["rerouting_plan"] = (
            f"PARTIAL REROUTE: Hold priority containers, reroute non-urgent cargo. "
            f"Monitor {state['affected_port']} for 24h before full reroute decision."
        )
    else:
        state["rerouting_plan"] = (
            f"MONITOR: Delay is manageable. Notify customers of {state['estimated_delay_hours']}h delay. "
            f"No rerouting required at this time."
        )
    return state


def generate_ai_recommendation(state: DisruptionState) -> DisruptionState:
    """LLM generates comprehensive disruption response"""
    llm = get_llm()

    prompt = f"""You are a Maersk global supply chain disruption expert.

Disruption Alert:
- Type: {state['disruption_type']}
- Affected Port: {state['affected_port']}
- Containers Affected: {len(state['affected_containers'])} ({', '.join(state['affected_containers'][:5])})
- Severity Score: {state['severity_score']}/10
- Estimated Delay: {state['estimated_delay_hours']} hours
- Estimated Cost Impact: ${state['cost_impact_usd']:,.0f}

Alternative Routes Available:
{chr(10).join(f"• {r['port']}: +{r['additional_transit_days']} days, +{r['cost_premium_pct']}% cost" for r in state['alternative_routes'])}

Current Rerouting Plan: {state['rerouting_plan']}

Provide:
1. Situation assessment
2. Recommended immediate actions (next 2 hours)
3. Customer communication strategy
4. Optimal rerouting recommendation with cost-benefit analysis
5. Risk mitigation for remaining containers
6. Recovery timeline estimate

FORMAT RULES: Use ### headings for each section, **bold** key decisions and numbers, numbered lists for actions. Under 400 words. Start with a one-line severity verdict."""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = (response.content or "").strip()
        if not content:
            raise ValueError("LLM returned empty response")
        state["ai_recommendation"] = content
    except Exception as e:
        logger.error(f"Disruption LLM error: {e}")
        alts = state['alternative_routes']
        best = alts[0]['port'] if alts else 'nearest available port'
        state["ai_recommendation"] = (
            f"DISRUPTION RESPONSE (rule-based fallback)\n\n"
            f"Situation: {state['disruption_type'].replace('_',' ').title()} at {state['affected_port']}. "
            f"Severity {state['severity_score']}/10, estimated delay {state['estimated_delay_hours']}h.\n\n"
            f"Immediate Actions (next 2 hours):\n"
            f"1. Notify all affected customers of delay\n"
            f"2. {'Activate rerouting to ' + best if state['severity_score'] >= 5 else 'Monitor situation closely'}\n"
            f"3. Brief operations team and update ETA in system\n"
            f"4. Escalate to port operations manager\n\n"
            f"Rerouting: {state['rerouting_plan']}\n\n"
            f"Cost Impact: ${state['cost_impact_usd']:,.0f} estimated\n\n"
            f"Recovery Timeline: {max(24, int(state['estimated_delay_hours'] * 1.5))} hours to full recovery.\n\n"
            f"Note: AI narrative unavailable — check GROQ_API_KEY in .env."
        )

    return state


def build_disruption_graph():
    graph = StateGraph(DisruptionState)
    graph.add_node("assess", assess_disruption)
    graph.add_node("reroute", generate_rerouting_plan)
    graph.add_node("recommend", generate_ai_recommendation)

    graph.set_entry_point("assess")
    graph.add_edge("assess", "reroute")
    graph.add_edge("reroute", "recommend")
    graph.add_edge("recommend", END)

    return graph.compile()


disruption_graph = build_disruption_graph()


async def handle_disruption(
    disruption_type: str,
    affected_port: str,
    affected_containers: List[str],
    severity_score: float,
    estimated_delay_hours: float,
) -> dict:
    state: DisruptionState = {
        "disruption_type": disruption_type,
        "affected_port": affected_port,
        "affected_containers": affected_containers,
        "severity_score": severity_score,
        "estimated_delay_hours": estimated_delay_hours,
        "alternative_routes": [],
        "rerouting_plan": "",
        "cost_impact_usd": 0.0,
        "ai_recommendation": "",
    }
    result = disruption_graph.invoke(state)
    return {
        "disruption_type": result["disruption_type"],
        "affected_port": result["affected_port"],
        "containers_affected": len(result["affected_containers"]),
        "severity_score": result["severity_score"],
        "cost_impact_usd": result["cost_impact_usd"],
        "alternative_routes": result["alternative_routes"],
        "rerouting_plan": result["rerouting_plan"],
        "ai_recommendation": result["ai_recommendation"],
    }
