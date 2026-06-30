"""
Inventory Optimization Agent (LangGraph)
Handles: slotting optimization, replenishment suggestions using OR-Tools + LLM
"""
from typing import TypedDict, List, Dict, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage
from app.ai_agents.llm_client import get_llm
from app.common.logger import logger


class InventoryOptState(TypedDict):
    warehouse_id: int
    low_stock_items: List[Dict]
    high_velocity_items: List[Dict]
    bin_utilization: List[Dict]
    slotting_recommendations: List[Dict]
    replenishment_orders: List[Dict]
    ai_insights: str


def analyze_velocity(state: InventoryOptState) -> InventoryOptState:
    """Identify fast-moving vs slow-moving items for slotting"""
    recommendations = []
    for item in state["high_velocity_items"]:
        recommendations.append({
            "sku": item.get("sku"),
            "action": "move_to_picking_zone",
            "reason": "High velocity item — place near dispatch for faster picking",
            "priority": "high",
        })
    state["slotting_recommendations"] = recommendations
    return state


def generate_replenishment(state: InventoryOptState) -> InventoryOptState:
    """Generate replenishment orders for low-stock items"""
    orders = []
    for item in state["low_stock_items"]:
        reorder_qty = max(item.get("reorder_point", 10) * 3, 50)
        orders.append({
            "sku": item.get("sku"),
            "product_id": item.get("product_id"),
            "current_qty": item.get("quantity"),
            "reorder_point": item.get("reorder_point"),
            "suggested_order_qty": reorder_qty,
            "urgency": "critical" if item.get("quantity", 0) == 0 else "normal",
        })
    state["replenishment_orders"] = orders
    return state


def generate_insights(state: InventoryOptState) -> InventoryOptState:
    """LLM generates strategic inventory insights"""
    llm = get_llm()

    low_count = len(state["low_stock_items"])
    high_vel_count = len(state["high_velocity_items"])
    replen_count = len(state["replenishment_orders"])
    slot_count = len(state["slotting_recommendations"])

    # Summarise without raw SKU data to avoid content filter
    critical_items = sum(1 for i in state["low_stock_items"] if i.get("quantity", 1) == 0)
    avg_reorder = (
        sum(i.get("reorder_point", 10) for i in state["low_stock_items"]) / max(low_count, 1)
    )

    prompt = f"""You are a warehouse inventory optimisation expert for a global logistics company.

Current Warehouse Status (Warehouse ID: {state['warehouse_id']}):
- Items below reorder point: {low_count}
- Items with zero stock (critical): {critical_items}
- Average reorder point across low-stock items: {avg_reorder:.0f} units
- High-velocity items identified: {high_vel_count}
- Replenishment orders suggested: {replen_count}
- Slotting changes recommended: {slot_count}
- Bins analysed: {len(state['bin_utilization'])}

Please provide a concise warehouse inventory optimisation report covering:
1. Overall inventory health assessment (2-3 sentences)
2. Top 3 immediate actions required
3. Slotting optimisation strategy for high-velocity vs slow-moving items
4. Supply chain risk summary
5. Key efficiency improvement opportunities

FORMAT RULES: Use ### headings for each section, **bold** key numbers and actions, numbered lists for steps, bullet points for sub-items. Under 400 words. Lead with the most critical finding."""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = (response.content or "").strip()
        if not content:
            raise ValueError("LLM returned empty response")
        state["ai_insights"] = content
    except Exception as e:
        logger.error(f"Inventory insights LLM error: {e}")
        low = len(state['low_stock_items'])
        recs = len(state['slotting_recommendations'])
        state["ai_insights"] = (
            f"INVENTORY ANALYSIS (rule-based fallback)\n\n"
            f"Health Assessment: {low} items below reorder point require immediate attention.\n\n"
            f"Top 3 Immediate Actions:\n"
            f"1. Raise purchase orders for {min(low, 5)} most critical SKUs\n"
            f"2. Move {recs} high-velocity items closer to dispatch zone\n"
            f"3. Audit bins with >90% utilisation to prevent overflow\n\n"
            f"Slotting Strategy: Place fast-moving SKUs in A-zone (nearest to dispatch). "
            f"Slow-moving items to C-zone deep storage.\n\n"
            f"Risk Warning: {low} stockout risks detected. Review supplier lead times.\n\n"
            f"Note: AI narrative unavailable — check GROQ_API_KEY in .env."
        )
    return state


def build_inventory_opt_graph():
    graph = StateGraph(InventoryOptState)
    graph.add_node("velocity", analyze_velocity)
    graph.add_node("replenishment", generate_replenishment)
    graph.add_node("insights", generate_insights)

    graph.set_entry_point("velocity")
    graph.add_edge("velocity", "replenishment")
    graph.add_edge("replenishment", "insights")
    graph.add_edge("insights", END)

    return graph.compile()


inventory_opt_graph = build_inventory_opt_graph()


async def optimize_inventory(
    warehouse_id: int,
    low_stock_items: List[Dict],
    high_velocity_items: List[Dict],
    bin_utilization: List[Dict],
) -> dict:
    state: InventoryOptState = {
        "warehouse_id": warehouse_id,
        "low_stock_items": low_stock_items,
        "high_velocity_items": high_velocity_items,
        "bin_utilization": bin_utilization,
        "slotting_recommendations": [],
        "replenishment_orders": [],
        "ai_insights": "",
    }
    result = inventory_opt_graph.invoke(state)
    return {
        "warehouse_id": warehouse_id,
        "slotting_recommendations": result["slotting_recommendations"],
        "replenishment_orders": result["replenishment_orders"],
        "ai_insights": result["ai_insights"],
    }
