"""
Relevance Filter Module
Filters out questions that are not related to Kangbeen Ko's profile
"""

import json
import re
from typing import Dict, Any, Optional
import google.generativeai as genai
from .config import config


def quick_relevance_check(query: str) -> Optional[bool]:
    """
    Fast heuristic check for obviously irrelevant questions
    Returns None if uncertain (needs LLM check), True/False if certain
    
    Args:
        query: User's question
        
    Returns:
        None if uncertain, True if likely relevant, False if obviously irrelevant
    """
    if not query:
        return None
    
    query_lower = query.lower().strip()
    
    # Obviously irrelevant patterns (fast rejection)
    irrelevant_patterns = [
        r'\b(weather|날씨|기온|온도)\b',
        r'\b(cooking|요리|레시피|음식)\b',
        r'\b(sports|스포츠|축구|야구|농구)\b',
        r'\b(movie|영화|드라마|배우)\b',
        r'\b(music|음악|가수|노래)\b',
        r'\b(game|게임|플레이)\b',
        r'\b(stock|주식|투자|증권)\b',
        r'\b(politics|정치|선거)\b',
        r'\b(recipe|요리법)\b',
        r'\b(how to cook|요리하는 방법)\b',
        r'\b(what is the weather|날씨가 어때)\b',
    ]
    
    for pattern in irrelevant_patterns:
        if re.search(pattern, query_lower):
            return False
    
    # Obviously relevant patterns (fast acceptance)
    relevant_patterns = [
        r'\b(kangbeen|고강빈|강빈)\b',
        r'\b(research|연구|논문|paper|publication)\b',
        r'\b(education|교육|학력|degree|학교)\b',
        r'\b(experience|경력|work|직장|회사)\b',
        r'\b(project|프로젝트)\b',
        r'\b(skill|기술|능력|programming|개발)\b',
        r'\b(award|수상|상|prize)\b',
        r'\b(cv|이력서|resume)\b',
        r'\b(background|배경|소개|introduction|about)\b',
        r'\b(what do you|당신은|너는|you are|your)\b',
        r'\b(hello|hi|안녕|인사)\b',
    ]
    
    for pattern in relevant_patterns:
        if re.search(pattern, query_lower):
            return True
    
    # Uncertain - needs LLM check
    return None


async def check_relevance(query: str) -> Dict[str, Any]:
    """
    Check if the user's question is relevant to Kangbeen Ko's profile
    
    Args:
        query: User's question
        
    Returns:
        Dictionary with:
            - relevant (bool): Whether the question is relevant
            - reason (str, optional): Reason for rejection if not relevant
    """
    # Fast heuristic check first
    quick_result = quick_relevance_check(query)
    if quick_result is False:
        return {
            "relevant": False,
            "reason": "Question is clearly unrelated to the profile."
        }
    if quick_result is True:
        return {
            "relevant": True,
            "reason": None
        }
    
    # If uncertain, use LLM
    try:
        # Use Gemini to determine relevance
        model = genai.GenerativeModel('gemini-2.0-flash-lite')
        
        prompt = f"""
Determine whether the user's question meets the following conditions:

1. If the question is a simple greeting (e.g., "Hello", "Hi") or is asking about your name, identity, or general introduction, set "relevant" to true.

2. If the question is related to Kangbeen Ko's profile—including background, education, skills, technologies used, programming languages, experience, research, papers, awards, or career—set "relevant" to true.

3. Only if the question is clearly unrelated or nonsensical (e.g., "What's the weather in Paris?" or "Can pigs fly?"), set "relevant" to false.

Respond only in the following strict JSON format. Do **not** include explanations, markdown, or code blocks.

Example:
{{
  "relevant": true
}}

Question: "{query}"
"""

        result = model.generate_content(prompt)
        response_text = result.text.strip()
        
        # Clean up JSON response
        response_text = re.sub(r'^```json\s*', '', response_text, flags=re.IGNORECASE)
        response_text = re.sub(r'```$', '', response_text)
        response_text = response_text.strip()
        
        try:
            parsed = json.loads(response_text)
            relevant = bool(parsed.get('relevant', True))
            
            if not relevant:
                reason = parsed.get('reason', 'This question is not related to Kangbeen Ko\'s profile.')
            else:
                reason = None
                
            return {
                "relevant": relevant,
                "reason": reason
            }
        except json.JSONDecodeError:
            # Fallback: if JSON parsing fails, assume relevant (safer default)
            print(f"Warning: Failed to parse relevance check response. Assuming relevant.")
            return {
                "relevant": True,
                "reason": None
            }
            
    except Exception as error:
        print(f"Error checking relevance: {error}")
        # On error, assume relevant (safer default)
        return {
            "relevant": True,
            "reason": None
        }


async def generate_rejection_message(query: str, language: str = "en") -> str:
    """
    Generate a rejection message for irrelevant questions using Gemini
    
    Args:
        query: User's question that was rejected
        language: Language code ("en" or "ko")
        
    Returns:
        Generated rejection message string
    """
    try:
        # Use Gemini 2.5 Flash to generate a simple, polite rejection message
        model = genai.GenerativeModel('gemini-3-flash')
        
        prompt = f"""
You are Kangbeen Ko(고강빈)'s digital twin assistant. A user asked a question that is not related to Kangbeen Ko's profile.

Generate a brief, polite rejection message that:
1. Politely declines to answer the unrelated question
2. Keeps it concise (1-2 sentences)
3. Responds in {"Korean" if language == "ko" else "English"}
4. **IMPORTANT**: Do NOT use titles or any honorifics. Simply refer to "Kangbeen Ko" or "고강빈" without titles.
    
User's question: "{query}"

Rejection message:
"""
        
        result = model.generate_content(prompt)
        rejection_message = result.text.strip()
        
        # Clean up any markdown or extra formatting
        rejection_message = re.sub(r'^["\']|["\']$', '', rejection_message)  # Remove quotes
        rejection_message = rejection_message.strip()
        
        return rejection_message
        
    except Exception as error:
        print(f"Error generating rejection message: {error}")
        # Fallback to default message
        messages = {
            "en": "Sorry, your question is not related to Kangbeen Ko's profile. Please ask about his background, education, research, publications, projects, or career.",
            "ko": "죄송합니다. 질문이 고강빈의 프로필과 관련이 없습니다. 배경, 교육, 연구, 논문, 프로젝트, 경력에 대해 물어보세요."
        }
        return messages.get(language, messages["en"])

