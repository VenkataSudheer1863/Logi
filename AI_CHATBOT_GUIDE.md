# LogiFlow WMS — AI Chat Assistant Guide

---

## How It Works

The WMS AI Assistant is powered by **Azure OpenAI (GPT-4o / o-series)** orchestrated through **LangChain** and exposed via a FastAPI endpoint at `POST /api/v1/ai/chat`.

### Architecture

```
User types question
       ↓
React frontend (AIInsightsPage)
       ↓
POST /api/v1/ai/chat  { message, context? }
       ↓
FastAPI router → LangChain message chain
       ↓
Azure OpenAI (your deployment: gpt-5-mini)
       ↓
Response streamed back to UI
```

### System Prompt Context

Every conversation is prefixed with a system prompt that tells the model it is:

> *"An expert AI assistant for Maersk's Warehouse Management System helping warehouse managers, workers, and logistics coordinators with inventory decisions, order processing, incident response, supply chain optimisation, and operational best practices."*

This means the model stays focused on logistics and warehouse topics and gives practical, data-driven answers rather than generic responses.

### What It Can and Cannot Do

| Can Do | Cannot Do |
|--------|-----------|
| Answer logistics & WMS questions | Access real-time DB data directly |
| Explain warehouse best practices | Execute actions (create orders, etc.) |
| Analyse scenarios you describe | Browse the internet |
| Suggest optimisation strategies | Remember previous sessions |
| Interpret KPIs and metrics | Access files or images via chat |

> **Tip:** For real data-driven actions, use the dedicated AI Agents (Inbound Plan, Optimise Slotting, Disruption Analysis) — those agents query the live database.

---

## Sample Questions to Ask

### Inventory Management

```
What is the ABC classification method for warehouse inventory?
```
```
How do I calculate the optimal reorder point for a product with variable demand?
```
```
We have 2,944 SKUs below reorder point. What should be our prioritisation strategy?
```
```
What is the difference between FIFO, LIFO, and FEFO in warehouse operations?
```
```
How should I handle slow-moving inventory that is tying up bin space?
```
```
What KPIs should I track to measure inventory accuracy?
```
```
Explain cycle counting and how it differs from a full physical inventory count.
```

---

### Order Fulfilment & Picking

```
What is the most efficient picking strategy for a warehouse with 10,000 daily orders?
```
```
How do I reduce order picking errors to below 0.1%?
```
```
Explain wave picking vs batch picking vs zone picking — which suits a high-volume port warehouse?
```
```
An order has been in "picking" status for 6 hours. What should I investigate?
```
```
How do I prioritise critical priority orders (priority 1) over normal ones in the pick queue?
```
```
What is the ideal pick path optimisation algorithm for a rectangular warehouse layout?
```

---

### Inbound Logistics & Containers

```
A container from Shanghai is delayed by 48 hours due to port congestion. What steps should I take?
```
```
How should I plan dock assignments when 3 containers arrive simultaneously?
```
```
What is the standard process for receiving and inspecting a 25,000 kg container?
```
```
How many workers do I need to unload a 20-foot container in under 2 hours?
```
```
What documents should be verified when a container arrives at the warehouse?
```
```
Explain the difference between FCL and LCL shipments and how they affect warehouse operations.
```

---

### Supply Chain Disruptions

```
A typhoon is affecting Singapore port. We have 15 containers in transit. What should we do?
```
```
Port of Hamburg is on strike for 3 days. How do I reroute containers to Rotterdam or Antwerp?
```
```
How do I calculate the cost impact of a 72-hour port delay on 20 containers?
```
```
What is a contingency plan for a warehouse that loses 30% of its storage capacity suddenly?
```
```
How should I communicate supply chain disruptions to customers proactively?
```

---

### Incidents & Safety

```
A forklift has damaged a rack in Zone B. What is the immediate response protocol?
```
```
We detected a stock discrepancy of 200 units on SKU MSK-000123. How do I investigate?
```
```
What are the OSHA requirements for warehouse safety inspections?
```
```
How do I set up an incident severity classification system for a port warehouse?
```
```
A chemical spill has occurred in the receiving zone. What are the steps?
```

---

### Analytics & KPIs

```
Our label accuracy is at 87%. What is the industry benchmark and how do I improve it?
```
```
How do I calculate warehouse throughput and what is a good target for a port facility?
```
```
Explain the difference between order fill rate and line fill rate.
```
```
What does a turnaround time of 4.2 hours mean for container unloading — is that good?
```
```
How do I build a warehouse efficiency scorecard for a weekly management review?
```
```
What is the ideal inventory turnover ratio for a logistics hub like Rotterdam?
```

---

### AI & Automation

```
How does OCR-based label validation work and what accuracy can I expect?
```
```
What is LangGraph and how is it used for warehouse agent orchestration?
```
```
Explain how a replenishment agent decides when and how much stock to reorder.
```
```
What machine learning models are best suited for demand forecasting in logistics?
```
```
How does slotting optimisation work and what is the ROI of implementing it?
```
```
What is the difference between rule-based automation and AI-driven decision making in a WMS?
```

---

### Maersk / Global Logistics Context

```
What are the busiest container ports in the world and how does that affect WMS planning?
```
```
How does Maersk's global network affect warehouse inventory positioning strategy?
```
```
What is the significance of the Rotterdam-Singapore-Shanghai shipping corridor?
```
```
How do seasonal demand patterns affect warehouse capacity planning for a global shipper?
```
```
What is a bonded warehouse and when would Maersk use one?
```

---

## Pro Tips for Better Answers

1. **Add context** — Instead of *"how do I fix this?"*, say *"We have 500 containers arriving this week and only 3 docks available — how do I prioritise?"*

2. **Be specific about numbers** — The model gives better answers when you include quantities, timeframes, and constraints.

3. **Ask for step-by-step plans** — Prefix with *"Give me a step-by-step plan for..."* to get structured, actionable output.

4. **Ask follow-up questions** — The chat maintains conversation context within a session, so you can say *"Now explain step 3 in more detail"*.

5. **Request formats** — Ask for *"a table comparing..."* or *"a checklist for..."* to get structured output.

---

## Example Conversation Flow

```
You:  We have 2,944 SKUs below reorder point across Warehouse 1 (Hamburg).
      What should be our prioritisation strategy?

AI:   [Explains ABC prioritisation, critical vs normal urgency, 
       supplier lead time considerations, batch PO strategy...]

You:  Which of those SKUs should we air freight vs sea freight?

AI:   [Explains decision criteria: unit value, weight, urgency, 
       cost-benefit of air vs sea for different product categories...]

You:  Give me a checklist for the procurement team to action today.

AI:   [Returns a numbered checklist with specific actions...]
```

---

*LogiFlow WMS AI Assistant — Powered by Azure OpenAI · Orchestrated by LangChain*
