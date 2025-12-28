"""
Response Generator module
Generates chat responses using Google Generative AI with long-term memory context
"""

import re
import sys
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import google.generativeai as genai
from .config import config
from .long_term_memory import get_long_term_memory

# Set up logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create console handler if not exists
if not logger.handlers:
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)


def linkify_response(response_text: str, links: List[Dict[str, str]]) -> str:
    """
    Parse <link> tags from LLM response and convert them to HTML links

    Args:
        response_text: Original response text with <link>label</link> tags
        links: List of site map links with 'label' and 'href'

    Returns:
        Response text with HTML links added
    """
    result = response_text
    
    # Create a mapping of labels to hrefs for quick lookup
    link_map = {link["label"]: link["href"] for link in links}
    
    # Pattern to match <link>label</link> tags
    link_pattern = re.compile(r'<link>([^<]+)</link>')
    
    def replace_link(match):
        label = match.group(1).strip()
        
        # Find matching link (case-insensitive, exact match preferred)
        href = None
        for link_label, link_href in link_map.items():
            if link_label.lower() == label.lower():
                href = link_href
                break
        
        # If no exact match found, return the original text without link tag
        if href is None:
            return label
        
        # Determine if external link
        is_external = href.startswith('http')
        
        # Create anchor tag
        if is_external:
            return f'<a href="{href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-bold hover:text-blue-800">{label}</a>'
        else:
            return f'<a href="{href}" class="text-blue-600 underline font-bold hover:text-blue-800">{label}</a>'
    
    # Replace all <link> tags with HTML anchor tags
    result = link_pattern.sub(replace_link, result)
    
    return result


async def generate_response(
    query: str,
    session_history: str,
    trace: Optional[Any] = None,
    langchain_chain: Optional[Any] = None
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

        # Use LangChain chain if provided (better context management)
        if langchain_chain:
            # LangChain chain automatically includes conversation history
            # ConversationChain.predict() automatically adds user message and AI response to memory
            # Try to use apredict() if available (async version), otherwise use executor
            logger.debug(f"[RESPONSE GEN] Using LangChain chain for query: {query[:50]}...")
            import asyncio
            if hasattr(langchain_chain, 'apredict'):
                # Use async version if available
                logger.debug("[RESPONSE GEN] Using apredict() (async)")
                response_text = await langchain_chain.apredict(input=query)
            else:
                # Fallback to sync version in executor
                logger.debug("[RESPONSE GEN] Using predict() in executor (sync)")
                loop = asyncio.get_event_loop()
                response_text = await loop.run_in_executor(
                    None,
                    lambda: langchain_chain.predict(input=query)
                )
            logger.debug(f"[RESPONSE GEN] Generated response: {response_text[:100]}...")
        else:
            # Fallback to direct prompt (for backward compatibility)
            prompt = f"""
You are Kangbeen Ko(고강빈)'s digital twin assistant.
You help visitors learn more about his academic and professional background using information from his personal website.

## Objective:
Answer the user's question using the provided profile information. Always include relevant site links to help users navigate to more detailed information.

## Long-term Memory (Profile Information):
{profile_context}

## Short-term Memory (Conversation History):
{session_history if session_history and session_history.strip() != "No previous conversation." else "No previous conversation. This is the start of the conversation."}

## Available Site Links:
{chr(10).join([f"- {link['label']}: {link['href']}" for link in site_links])}

## Instructions:
1. **CRITICAL - Context Resolution**: When the user uses references like "this paper", "that project", "it", "that research", "the latest one", "the paper I just asked about", etc., you MUST check the conversation history above to identify what they are referring to. Use the EXACT names from the conversation history.
2. Use the profile information to provide an accurate, informative answer.
3. Respond in the same language as the user (Korean or English).
4. Keep your response concise (300-500 characters) but comprehensive.
5. **IMPORTANT - Link Formatting**: When you want to add a link, wrap the link label with <link> tags. For example:
   - Use <link>Papers</link> instead of just "Papers"
   - Use <link>LEGOLAS</link> instead of just "LEGOLAS"
   - Use <link>Research</link> instead of just "Research"
6. **ONLY wrap labels that exist in the Available Site Links list above**. Do NOT wrap words that are not in the list.
7. Format important terms naturally so they can be linked (e.g., mention "LEGOLAS" when discussing the golf research).
8. If the question is not related to Kangbeen Ko's profile, politely decline and redirect to relevant topics.
9. When mentioning publications, projects, or specific sections, use their exact names from the available links and wrap them with <link> tags.

## Example Response Format:
"Kangbeen Ko's latest research is <link>LEGOLAS</link>, published at CHI 2025. You can find more details in the <link>Papers</link> section or visit the <link>Research</link> page."

## Current Time:
{current_time}

## User Question:
{query}

## Response:
"""

            # Generate response using Gemini 2.5 Flash (faster than Pro)
            model = genai.GenerativeModel('gemini-2.5-flash')
            result = model.generate_content(prompt)
            response_text = result.text

        # Add links to response
        linked_response = linkify_response(response_text, site_links)

        # Log to Langfuse
        if trace:
            trace.generation(
                name='chat-response',
                model='gemini-2.5-flash',
                model_parameters={
                    "temperature": 0.7,
                    "maxTokens": 512
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
        logger.error(f"Error generating response: {error}", exc_info=True)
        return "죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요."
