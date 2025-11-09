"""
Response Generator module
Generates chat responses using Google Generative AI with context from vector search
"""

import re
from typing import List, Dict, Any, Optional
from datetime import datetime
import google.generativeai as genai
from .config import config


# Site map data structure
SITE_MAP_LINKS = [
    {"label": "Home", "href": "/"},
    {"label": "Papers", "href": "/papers"},
    {"label": "Featured Publications", "href": "/papers#featured"},
    {"label": "Other Publications", "href": "/papers#all-publications"},
    {"label": "Research", "href": "/research"},
    {"label": "CV/Education", "href": "/cv#education"},
    {"label": "CV/Experiences", "href": "/cv#experiences"},
    {"label": "CV/Projects", "href": "/cv#projects"},
    {"label": "CV/Awards & Honors", "href": "/cv#awards"},
    {"label": "CV/Other Experiences", "href": "/cv#other-experiences"},
    {"label": "CV/Skills", "href": "/cv#skills"},
]


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
    contexts: List[Dict[str, Any]],
    chat_history: List[Dict[str, Any]],
    trace: Optional[Any] = None
) -> str:
    """
    Generate chat response using Gemini with provided contexts

    Args:
        query: User's query
        contexts: List of context objects from vector search
        chat_history: Chat conversation history
        trace: Langfuse trace object for logging

    Returns:
        Generated response text with HTML links
    """
    try:
        # Convert contexts to text
        context_parts = []
        for ctx in contexts:
            base = f"[{ctx['docType']}] {ctx['text']}"
            if ctx.get('summary'):
                meta = f"요약: {ctx['summary']}\n키워드: {', '.join(ctx.get('keywords', []))}"
                context_parts.append(f"{base}\n{meta}")
            else:
                context_parts.append(base)

        context_text = "\n\n".join(context_parts)

        # Convert chat history to text
        history_parts = []
        for msg in chat_history:
            role = "User" if msg.get("role") == "user" else "Assistant"
            text = msg.get("parts", [{}])[0].get("text", "")
            history_parts.append(f"{role}: {text}")

        history_text = "\n".join(history_parts)
        print(f"History text: {history_text}")

        # Generate site map
        site_map = SITE_MAP_LINKS.copy()

        # Filter site map (exclude publication/project titles for now)
        filtered_site_map_links = site_map.copy()

        # Create labels list
        label_list = "\n".join([f"- {link['label']}" for link in filtered_site_map_links])

        # Create full site map text
        site_map_text = "\n".join([f"- {link['label']} ({link['href']})" for link in site_map])

        # Current time
        current_time = datetime.utcnow().isoformat()

        # Construct prompt
        prompt = f"""
You are Kangbeen Ko(고강빈)'s digital twin.
You help visitors learn more about his academic and professional background using information from his personal website.

## Objective:
Answer the user's question using only the provided context and profile data. If helpful, guide the user to relevant sections of the site.

## Context Information:
current time: {current_time}
{context_text}

## Conversation History:
{history_text}

## Instructions:
1. Use the context and conversation to provide an informative, concise answer.
2. Respond in the same language as the user (Korean or English).
3. Limit your response to 500 characters unless the context truly demands more.
4. Do not answer questions unrelated to Kangbeen Ko's profile.
5. Reference specific sections of the site *only if* it helps the user find more information.
6. Use only the exact labels from the allowed labels list below. Do not invent titles or paraphrase them.
7. Do not repeat previously mentioned references unless they are essential for clarity.

## Site Map:
{site_map_text}

## Allowed Labels (Use exactly as written):
{label_list}

## User Question:
{query}

## Response:
"""

        # Generate response using Gemini
        model = genai.GenerativeModel(config.chat_model_name)
        result = model.generate_content(prompt)
        response_text = result.text

        # Add links to response
        linked_response = linkify_response(response_text, site_map)

        # Log to Langfuse
        if trace:
            # Prepare prompt for logging
            prompt_messages = [
                {"role": msg.get("role"), "content": msg.get("parts", [{}])[0].get("text", "")}
                for msg in chat_history
            ]
            prompt_messages.append({"role": "user", "content": prompt})

            trace.generation(
                name='chat-response',
                model='gemini-1.5-pro',
                model_parameters={
                    "temperature": 0.7,
                    "maxTokens": 1024
                },
                input=query,
                prompt=prompt_messages,
                output=response_text,
                metadata={
                    "contextCount": len(contexts),
                    "historyLength": len(chat_history),
                    "sources": list(set([c.get("source", "unknown") for c in contexts]))
                }
            )

        return linked_response

    except Exception as error:
        print(f"Error generating response: {error}")
        return "죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요."
