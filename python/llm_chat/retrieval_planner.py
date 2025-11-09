"""
Retrieval Planner module
Determines if a query is relevant and if retrieval is needed
"""

import json
import re
from typing import Dict, Any, Optional
import google.generativeai as genai
from .config import config


async def get_retrieval_plan(user_question: str) -> Dict[str, Any]:
    """
    Determine if the user's question is relevant and if retrieval is needed

    Args:
        user_question: User's question

    Returns:
        Dictionary with:
            - relevant (bool): Whether question is related to profile
            - retrievalRequired (bool): Whether vector DB retrieval is needed
    """
    prompt = f"""
Determine whether the user's question meets the following conditions:

1. If the question is a simple greeting (e.g., "Hello", "Hi") or is asking about your name, identity, or general introduction, set "relevant" to true.

2. If the question is related to Kangbeen Ko's profile—including background, education, skills, technologies used, programming languages, experience, research, papers, awards, or career—set "relevant" to true.

3. Only if the question is clearly unrelated or nonsensical (e.g., "What's the weather in Paris?" or "Can pigs fly?"), set "relevant" to false.

4. Set "retrievalRequired" to false if the answer can be generated directly without retrieving any information.
   If more detailed search is needed (e.g., from documents or long context), set it to true.

Respond only in the following strict JSON format. Do **not** include explanations, markdown, or code blocks.

Example:
{{
  "relevant": true,
  "retrievalRequired": false
}}

Question: "{user_question}"
"""

    try:
        model = genai.GenerativeModel(config.planner_model_name)
        result = model.generate_content(prompt)
        raw = result.text.strip()

        # Remove markdown code blocks if present
        raw = re.sub(r'^```json\s*', '', raw, flags=re.IGNORECASE)
        raw = re.sub(r'```$', '', raw)
        raw = raw.strip()

        print(f"Planner raw response: {raw}")

        # Parse JSON response
        parsed = json.loads(raw)

        return {
            "relevant": bool(parsed.get("relevant", True)),
            "retrievalRequired": bool(parsed.get("retrievalRequired", True))
        }
    except Exception as error:
        print(f"Retrieval planner error (using fallback): {error}")
        # Fallback: assume relevant and retrieval required
        return {
            "relevant": True,
            "retrievalRequired": True
        }
