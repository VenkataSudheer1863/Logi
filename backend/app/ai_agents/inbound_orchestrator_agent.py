"""
Inbound Orchestrator Agent (LangGraph)
Handles: dock assignment, labor allocation, truck scheduling for arriving containers
"""
from typing import TypedDict, List, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage
from app.ai_agents.llm_client import get_llm
from app.common.logger import logger
import json
import re


class InboundState(TypedDict):
    container_no: str
    origin_port: str
    destination_port: str
    eta: str
    cargo_weight: float
    available_docks: List[str]
    available_trucks: int
    warehouse_capacity_pct: float
    dock_assignment: str
    labor_count: int
    truck_schedule: List[dict]
    ai_plan: str
    risk_flags: List[str]


def assess_arrival(state: InboundState) -> InboundState:
    """Assess container arrival parameters and flag risks"""
    risks = []
    if state["cargo_weight"] > 25000:
        risks.append("HEAVY_CARGO: Requires heavy-lift equipment")
    if state["warehouse_capacity_pct"] > 85:
        risks.append("CAPACITY_WARNING: Warehouse near full capacity")
    if not state["available_docks"]:
        risks.append("NO_DOCKS_AVAILABLE: Delay expected")
    state["risk_flags"] = risks
    return state


def assign_dock(state: InboundState) -> InboundState:
    """Assign optimal dock based on cargo weight and availability"""
    docks = state["available_docks"]
    if not docks:
        state["dock_assignment"] = "QUEUE"
        return state
    # Simple heuristic: heavy cargo → first dock, light → last
    if state["cargo_weight"] > 15000:
        state["dock_assignment"] = docks[0]
    else:
        state["dock_assignment"] = docks[-1]
    return state


def allocate_labor(state: InboundState) -> InboundState:
    """Calculate labor requirements based on cargo weight"""
    weight = state["cargo_weight"]
    if weight < 5000:
        state["labor_count"] = 4
    elif weight < 15000:
        state["labor_count"] = 8
    elif weight < 25000:
        state["labor_count"] = 12
    else:
        state["labor_count"] = 16
    return state


def schedule_trucks(state: InboundState) -> InboundState:
    """Schedule truck dispatches for cargo distribution"""
    trucks_needed = max(1, int(state["cargo_weight"] / 10000))
    trucks_available = min(trucks_needed, state["available_trucks"])
    schedule = []
    for i in range(trucks_available):
        schedule.append({
            "truck_slot": i + 1,
            "estimated_load_kg": state["cargo_weight"] / trucks_available,
            "departure_offset_hours": i * 2,
        })
    state["truck_schedule"] = schedule
    return state


def generate_ai_plan(state: InboundState) -> InboundState:
    """LLM generates comprehensive inbound plan with reasoning"""
    llm = get_llm()
    prompt = f"""You are an expert warehouse operations planner for a global shipping company.

Container Arrival Summary:
- Container ID: {state['container_no']}
- Route: {state['origin_port']} to {state['destination_port']}
- ETA: {state['eta']}
- Cargo Weight: {state['cargo_weight']:,.0f} kg
- Assigned Dock: {state['dock_assignment']}
- Labour Allocated: {state['labor_count']} workers
- Trucks Scheduled: {len(state['truck_schedule'])}
- Warehouse Utilisation: {state['warehouse_capacity_pct']}%
- Risk Flags: {', '.join(state['risk_flags']) if state['risk_flags'] else 'None'}

Write a concise operational inbound plan covering:
1. Unloading sequence and priorities
2. Quality inspection approach
3. Putaway strategy
4. Special handling requirements
5. Estimated total completion time

FORMAT RULES: Use ### headings for each section, bold key numbers and actions, bullet points for steps. Be practical and specific. Under 350 words."""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = (response.content or "").strip()
        if not content:
            raise ValueError("LLM returned empty response")
        state["ai_plan"] = content
    except Exception as e:
        logger.error(f"LLM plan generation error: {e}")
        weight = state['cargo_weight']
        dock = state['dock_assignment']
        workers = state['labor_count']
        trucks = len(state['truck_schedule'])
        state["ai_plan"] = (
            f"STANDARD INBOUND PLAN (rule-based fallback)\n\n"
            f"1. UNLOADING SEQUENCE\n"
            f"   • Assign {workers} workers to {dock}\n"
            f"   • Begin unloading within 30 min of arrival\n"
            f"   • Priority: hazardous/fragile cargo first\n\n"
            f"2. QUALITY INSPECTION\n"
            f"   • Visual inspection of all pallets on arrival\n"
            f"   • Random sample check: 10% of SKUs\n"
            f"   • Flag damaged goods to quality team immediately\n\n"
            f"3. PUTAWAY STRATEGY\n"
            f"   • Route to receiving zone first\n"
            f"   • High-velocity SKUs → picking zone bins\n"
            f"   • Bulk/slow-moving → deep storage\n\n"
            f"4. TRUCK DISPATCH\n"
            f"   • {trucks} truck(s) scheduled for onward distribution\n"
            f"   • Estimated load per truck: {weight/max(trucks,1):,.0f} kg\n\n"
            f"5. ESTIMATED COMPLETION: {max(2, int(weight/5000))} hours\n\n"
            f"Note: AI narrative unavailable — Groq API could not be reached. "
            f"Check that GROQ_API_KEY is set correctly in your .env file."
        )
    return state


def build_inbound_graph():
    graph = StateGraph(InboundState)
    graph.add_node("assess", assess_arrival)
    graph.add_node("dock", assign_dock)
    graph.add_node("labor", allocate_labor)
    graph.add_node("trucks", schedule_trucks)
    graph.add_node("plan", generate_ai_plan)

    graph.set_entry_point("assess")
    graph.add_edge("assess", "dock")
    graph.add_edge("dock", "labor")
    graph.add_edge("labor", "trucks")
    graph.add_edge("trucks", "plan")
    graph.add_edge("plan", END)

    return graph.compile()


inbound_graph = build_inbound_graph()


async def plan_inbound(
    container_no: str,
    origin_port: str,
    destination_port: str,
    eta: str,
    cargo_weight: float,
    available_docks: List[str],
    available_trucks: int,
    warehouse_capacity_pct: float,
) -> dict:
    state: InboundState = {
        "container_no": container_no,
        "origin_port": origin_port,
        "destination_port": destination_port,
        "eta": eta,
        "cargo_weight": cargo_weight,
        "available_docks": available_docks,
        "available_trucks": available_trucks,
        "warehouse_capacity_pct": warehouse_capacity_pct,
        "dock_assignment": "",
        "labor_count": 0,
        "truck_schedule": [],
        "ai_plan": "",
        "risk_flags": [],
    }
    result = inbound_graph.invoke(state)
    return {
        "container_no": result["container_no"],
        "dock_assignment": result["dock_assignment"],
        "labor_count": result["labor_count"],
        "truck_schedule": result["truck_schedule"],
        "risk_flags": result["risk_flags"],
        "ai_plan": result["ai_plan"],
    }
