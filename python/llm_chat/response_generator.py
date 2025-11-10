"""
Response Generator module
Generates chat responses using Google Generative AI with long-term memory context
"""

import re
from typing import List, Dict, Any, Optional
from datetime import datetime
import google.generativeai as genai
from .config import config
from .long_term_memory import get_long_term_memory


def linkify_response(response_text: str, links: List[Dict[str, str]]) -> str:
    """
    Add HTML links to internal page references in response text

    Args:
        response_text: Original response text
        links: List of site map links with 'label' and 'href'

    Returns:
        Response text with HTML links added
    """
    result = response_text

    for link in links:
        label = link["label"]
        href = link["href"]

        # Create regex pattern for exact label matching
        pattern = re.compile(rf'\b({re.escape(label)})\b')

        # Determine if external link
        is_external = href.startswith('http')

        # Create anchor tag
        if is_external:
            anchor = f'<a href="{href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-bold hover:text-blue-800">\\1</a>'
        else:
            anchor = f'<a href="{href}" class="text-blue-600 underline font-bold hover:text-blue-800">\\1</a>'

        result = pattern.sub(anchor, result)

    return result


async def generate_response(
    query: str,
    session_history: str,
    trace: Optional[Any] = None
) -> str:
    """
    Generate chat response using Gemini with long-term memory

    Args:
        query: User's query
        session_history: Formatted session conversation history
        trace: Langfuse trace object for logging

    Returns:
        Generated response text with HTML links
    """
    try:
        # Get long-term memory
        ltm = get_long_term_memory()

        # Get profile context from long-term memory
        profile_context = ltm.get_context_for_llm()

        # Get site links
        site_links = ltm.get_site_links()

        # Current time
        current_time = datetime.utcnow().isoformat()

        # Construct prompt
        prompt = f"""
You are Kangbeen Ko(고강빈)'s digital twin assistant.
You help visitors learn more about his academic and professional background using information from his personal website.

## Objective:
Answer the user's question using the provided profile information. Always include relevant site links to help users navigate to more detailed information.

## Long-term Memory (Profile Information):
{profile_context}

## Short-term Memory (Conversation History):
{session_history}

## Available Site Links:
{chr(10).join([f"- {link['label']}: {link['href']}" for link in site_links])}

## Instructions:
1. Use the profile information to provide an accurate, informative answer.
2. Respond in the same language as the user (Korean or English).
3. Keep your response concise (300-500 characters) but comprehensive.
4. **ALWAYS include relevant site links** in your response using exact labels from the available links.
5. Format important terms naturally so they can be linked (e.g., mention "LEGOLAS" when discussing the golf research).
6. If the question is not related to Kangbeen Ko's profile, politely decline and redirect to relevant topics.
7. When mentioning publications, projects, or specific sections, use their exact names from the available links.

## Example Response Format:
"Kangbeen Ko's latest research is LEGOLAS, published at CHI 2025. You can find more details in the Papers section or visit the Research page."

## Current Time:
{current_time}

## User Question:
{query}

## Response:
"""

        # Generate response using Gemini
        model = genai.GenerativeModel('gemini-pro')
        result = model.generate_content(prompt)
        response_text = result.text

        # Add links to response
        linked_response = linkify_response(response_text, site_links)

        # Log to Langfuse
        if trace:
            trace.generation(
                name='chat-response',
                model='gemini-1.5-pro',
                model_parameters={
                    "temperature": 0.7,
                    "maxTokens": 1024
                },
                input=query,
                prompt=[{"role": "user", "content": prompt}],
                output=response_text,
                metadata={
                    "memoryType": "long-term + short-term",
                    "profileDataCategories": list(ltm.get_all().keys()),
                }
            )

        return linked_response

    except Exception as error:
        print(f"Error generating response: {error}")
        return "죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요."
