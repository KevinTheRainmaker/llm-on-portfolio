"""
Query Rewriter module
Rewrites user queries to be more precise and contextual
"""

import re
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from .config import config


def is_likely_question(text: str) -> bool:
    """
    Determine if text is likely a question

    Args:
        text: Text to check

    Returns:
        True if text appears to be a question
    """
    lowered = text.lower().strip()
    return lowered.endswith('?') or bool(re.match(r'^[\s]*(what|which|who|when|why|how)\b', lowered))


async def rewrite_query(
    query: str,
    history: List[Dict[str, Any]],
    trace: Optional[Any] = None
) -> str:
    """
    Rewrite user query to be more precise and contextual

    Args:
        query: User's original query
        history: Chat history
        trace: Langfuse trace object for logging

    Returns:
        Rewritten query string
    """
    # Start tracing span if trace is provided
    rewrite_span = None
    if trace:
        rewrite_span = trace.span(name='rewrite-query')

    prompt = f"""
You are rewriting a user question to make it more precise, assuming the subject is a graduate student researcher.

## Profile Assumption:
The subject is an M.S. student at HCIS Lab, GIST (Gwangju Institute of Science and Technology), focused on AI × HCI research.
They are a product-minded builder passionate about improving human life through responsible and innovative technologies.
Their "work" often refers to academic research, publications, and technically rigorous projects.

## Objective:
- Clarify vague or ambiguous user queries.
- Reflect the most likely intent in an academic and research-driven context.
- If the original question is clear, return it unchanged.

## Guidelines:
1. Interpret general terms like "your recent work", "your contributions", or "your project" as referring to research output (e.g., publications or research projects), unless clearly meant otherwise.
2. Use reasonable assumptions about academic and research communication—but do not invent facts.
3. Preserve the original user intent and tone.
4. Only rewrite if ambiguity exists. Otherwise, return the question unchanged.

## Examples:
- "Tell me more about his latest work." → "Tell me more about Kangbeen Ko's most recent research publication."
- "What is that project you mentioned?" → "What is the project titled 'LLM-Augmented Golf Swing Analysis'?"
- "Can you tell me about your project?" → "Can you tell me about your research project titled 'SickGPT'?"
- "What are you currently working on?" → "What research are you currently working on?"

## Input:
Current user question: {query}

Rewritten question:
"""

    try:
        model = genai.GenerativeModel(config.chat_model_name)
        result = model.generate_content(prompt)
        rewritten = result.text.strip()

        # Remove "Rewritten question:" prefix if present
        rewritten = re.sub(r'^Rewritten question:\s*', '', rewritten, flags=re.IGNORECASE)

        # End tracing span
        if rewrite_span:
            rewrite_span.end(
                input={"query": query},
                output=rewritten
            )

        return rewritten
    except Exception as error:
        print(f"Error rewriting query: {error}")
        if rewrite_span:
            rewrite_span.end(
                input={"query": query},
                output=query
            )
        return query
