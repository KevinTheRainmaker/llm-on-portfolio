"""
Language Detection Module
Detects the language of user messages
"""

import re
from typing import Optional


def detect_language(text: str) -> str:
    """
    Detect the language of a text message
    
    Args:
        text: Text to detect language for
        
    Returns:
        Language code ("en" or "ko")
    """
    if not text:
        return "en"
    
    # Remove whitespace and convert to lowercase for analysis
    text_lower = text.lower().strip()
    
    # Korean character range: \uAC00-\uD7A3 (Hangul syllables)
    # Korean punctuation and symbols: \u3131-\u318E, \u1100-\u11FF
    korean_pattern = re.compile(r'[\uAC00-\uD7A3\u3131-\u318E\u1100-\u11FF]')
    
    # Count Korean characters
    korean_chars = len(korean_pattern.findall(text))
    total_chars = len([c for c in text if c.isalnum() or c.isspace()])
    
    # If more than 30% of characters are Korean, consider it Korean
    if total_chars > 0 and korean_chars / total_chars > 0.3:
        return "ko"
    
    # Check for common Korean words/phrases
    korean_indicators = [
        '안녕', '하세요', '입니다', '입니다', '있습니다', '없습니다',
        '어떻게', '무엇', '누구', '언제', '어디', '왜',
        '네', '예', '아니요', '감사', '죄송', '실례',
        '질문', '답변', '알려', '말해', '설명', '이해'
    ]
    
    for indicator in korean_indicators:
        if indicator in text_lower:
            return "ko"
    
    # Default to English
    return "en"

