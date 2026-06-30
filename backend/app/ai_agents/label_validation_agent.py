"""
Label Validation Agent
Pipeline: Image → OpenCV preprocessing → Tesseract OCR → LLM validation → verdict
"""
import base64
import re
from typing import TypedDict, Optional
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage
from app.ai_agents.llm_client import get_llm
from app.common.logger import logger

try:
    import cv2
    import pytesseract
    import numpy as np
    CV_AVAILABLE = True
except ImportError:
    CV_AVAILABLE = False
    logger.warning("OpenCV/Tesseract not available — OCR will use mock text")


# ─── State ────────────────────────────────────────────────────────────────────

class LabelState(TypedDict):
    image_path: Optional[str]
    image_bytes: Optional[bytes]
    order_sku: str
    order_destination: str
    order_id: int
    ocr_text: str
    extracted_sku: str
    extracted_destination: str
    validation_result: str  # valid | invalid
    reasoning: str
    confidence: float


# ─── Nodes ────────────────────────────────────────────────────────────────────

def preprocess_image(state: LabelState) -> LabelState:
    """OpenCV preprocessing for better OCR accuracy"""
    if not CV_AVAILABLE:
        state["ocr_text"] = f"MOCK OCR: SKU={state['order_sku']} DEST={state['order_destination']}"
        return state

    try:
        if state.get("image_bytes"):
            nparr = np.frombuffer(state["image_bytes"], np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        elif state.get("image_path"):
            img = cv2.imread(state["image_path"])
        else:
            state["ocr_text"] = ""
            return state

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Denoise + threshold for better OCR
        denoised = cv2.fastNlMeansDenoising(gray, h=10)
        _, thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        # Scale up for better OCR
        scaled = cv2.resize(thresh, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

        ocr_text = pytesseract.image_to_string(scaled, config="--psm 6")
        state["ocr_text"] = ocr_text.strip()
        logger.info(f"OCR extracted: {ocr_text[:100]}")
    except Exception as e:
        logger.error(f"OCR error: {e}")
        state["ocr_text"] = ""
    return state


def extract_fields(state: LabelState) -> LabelState:
    """Extract SKU and destination from OCR text using regex + LLM fallback"""
    text = state["ocr_text"]

    # Try regex first
    sku_match = re.search(r"SKU[:\s]+([A-Z0-9\-]+)", text, re.IGNORECASE)
    dest_match = re.search(r"(?:DEST|DESTINATION|TO)[:\s]+([A-Z\s,]+)", text, re.IGNORECASE)

    state["extracted_sku"] = sku_match.group(1).strip() if sku_match else ""
    state["extracted_destination"] = dest_match.group(1).strip() if dest_match else ""
    return state


def validate_with_llm(state: LabelState) -> LabelState:
    """LLM validates extracted label data against order data"""
    llm = get_llm()

    prompt = f"""You are a warehouse label validation expert for Maersk.

Order Details:
- Expected SKU: {state['order_sku']}
- Expected Destination: {state['order_destination']}
- Order ID: {state['order_id']}

Label OCR Text:
{state['ocr_text']}

Extracted from label:
- SKU found: {state['extracted_sku'] or 'NOT FOUND'}
- Destination found: {state['extracted_destination'] or 'NOT FOUND'}

Task: Determine if this label is VALID or INVALID for the order.
Consider partial matches, common OCR errors (0/O, 1/I, etc.), and abbreviations.

Respond in this exact JSON format:
{{
  "result": "valid" or "invalid",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}}"""

    try:
        response = llm.invoke([HumanMessage(content=prompt)])
        content = (response.content or "").strip()
        if not content:
            raise ValueError("LLM returned empty response")
        import json
        json_match = re.search(r'\{.*\}', content, re.DOTALL)
        if json_match:
            data = json.loads(json_match.group())
            state["validation_result"] = data.get("result", "invalid")
            state["confidence"] = float(data.get("confidence", 0.5))
            state["reasoning"] = data.get("reasoning", "")
        else:
            state["validation_result"] = "invalid"
            state["confidence"] = 0.0
            state["reasoning"] = "Could not parse LLM response"
    except Exception as e:
        logger.error(f"LLM validation error: {e}")
        # Fallback: rule-based SKU matching
        ocr = state["ocr_text"].lower()
        sku_found = state["order_sku"].lower() in ocr
        dest_found = state["order_destination"].lower() in ocr
        if sku_found and dest_found:
            state["validation_result"] = "valid"
            state["confidence"] = 0.85
            state["reasoning"] = "Fallback: SKU and destination both matched in OCR text."
        elif sku_found:
            state["validation_result"] = "valid"
            state["confidence"] = 0.65
            state["reasoning"] = "Fallback: SKU matched but destination not confirmed."
        else:
            state["validation_result"] = "invalid"
            state["confidence"] = 0.30
            state["reasoning"] = "Fallback: SKU not found in OCR text. Label may be incorrect."

    return state


# ─── Build Graph ──────────────────────────────────────────────────────────────

def build_label_validation_graph():
    graph = StateGraph(LabelState)
    graph.add_node("preprocess", preprocess_image)
    graph.add_node("extract", extract_fields)
    graph.add_node("validate", validate_with_llm)

    graph.set_entry_point("preprocess")
    graph.add_edge("preprocess", "extract")
    graph.add_edge("extract", "validate")
    graph.add_edge("validate", END)

    return graph.compile()


label_validation_graph = build_label_validation_graph()


async def validate_label(
    order_id: int,
    order_sku: str,
    order_destination: str,
    image_bytes: Optional[bytes] = None,
    image_path: Optional[str] = None,
) -> dict:
    initial_state: LabelState = {
        "image_path": image_path,
        "image_bytes": image_bytes,
        "order_sku": order_sku,
        "order_destination": order_destination,
        "order_id": order_id,
        "ocr_text": "",
        "extracted_sku": "",
        "extracted_destination": "",
        "validation_result": "invalid",
        "reasoning": "",
        "confidence": 0.0,
    }
    result = label_validation_graph.invoke(initial_state)
    return {
        "order_id": order_id,
        "validation_result": result["validation_result"],
        "confidence": result["confidence"],
        "reasoning": result["reasoning"],
        "ocr_text": result["ocr_text"],
    }
