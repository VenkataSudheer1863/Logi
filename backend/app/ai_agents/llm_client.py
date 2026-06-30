"""
Groq LLM client.
Supports llama-3.3-70b-versatile and other Groq-hosted models.
"""
from langchain_groq import ChatGroq
from app.common.config import get_settings
from app.common.logger import logger


def get_llm() -> ChatGroq:
    settings = get_settings()
    groq_api_key = settings.groq_api_key
    groq_model = settings.groq_model

    if not groq_api_key:
        logger.warning("No Groq API key configured — AI responses will use fallback logic")

    logger.debug(f"Using Groq model: {groq_model}")
    return ChatGroq(
        api_key=groq_api_key,
        model=groq_model,
        temperature=0.2,
        max_tokens=4096,
    )
