import sys
from loguru import logger
from app.common.config import get_settings

settings = get_settings()

logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level=settings.log_level,
)
logger.add(
    "logs/wms_{time:YYYY-MM-DD}.log",
    rotation="1 day",
    retention="30 days",
    level="DEBUG",
    format="{time} | {level} | {name}:{function} - {message}",
)

__all__ = ["logger"]
