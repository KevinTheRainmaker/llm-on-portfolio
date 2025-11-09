"""
Vector Search module
Handles searching the Pinecone vector database for relevant contexts
"""

from typing import List, Dict, Any, Optional
from .config import config
from .embeddings import embed_text
from .query_rewriter import rewrite_query, is_likely_question
from .retrieval_planner import get_retrieval_plan


async def search_vector_db(
    query: str,
    history: List[Dict[str, Any]],
    trace: Optional[Any] = None
) -> Dict[str, Any]:
    """
    Search vector database for relevant contexts

    Args:
        query: User's query
        history: Chat history
        trace: Langfuse trace object for logging

    Returns:
        Dictionary containing:
            - relevant (bool): Whether query is relevant
            - retrievalRequired (bool): Whether retrieval was performed
            - contexts (list): List of relevant context objects
            - rewrittenQuery (str, optional): Rewritten query if applicable
    """
    # Start planning span
    plan_span = None
    if trace:
        plan_span = trace.span(name='plan-decision')

    try:
        # Rewrite query for better retrieval
        rewritten_query = await rewrite_query(query, history, trace)

        # Check if rewritten query is a question
        if is_likely_question(rewritten_query):
            if plan_span:
                plan_span.end(
                    input={"query": query, "rewrittenQuery": rewritten_query},
                    output='rewritten query is a question, skipping retrieval'
                )

            return {
                "relevant": True,
                "retrievalRequired": False,
                "contexts": [],
                "rewrittenQuery": rewritten_query
            }

        # Get retrieval plan
        planner = await get_retrieval_plan(rewritten_query)

        if plan_span:
            latest_user = None
            latest_bot = None
            for msg in reversed(history):
                if msg.get('role') == 'user' and not latest_user:
                    latest_user = msg.get('parts', [{}])[0].get('text')
                elif msg.get('role') == 'model' and not latest_bot:
                    latest_bot = msg.get('parts', [{}])[0].get('text')
                if latest_user and latest_bot:
                    break

            plan_span.end(
                input={
                    "query": query,
                    "latestUser": latest_user,
                    "latestBot": latest_bot,
                    "rewrittenQuery": rewritten_query
                },
                output=planner
            )

        print(f"Rewritten query: {rewritten_query}")

        # Check if not relevant
        if not planner["relevant"]:
            return {
                "relevant": False,
                "retrievalRequired": False,
                "contexts": []
            }

        # Check if retrieval not required
        if not planner["retrievalRequired"]:
            return {
                "relevant": True,
                "retrievalRequired": False,
                "contexts": []
            }

        # Perform vector search
        query_embedding = await embed_text(rewritten_query)
        index = config.get_pinecone_index()

        pinecone_query = {
            "vector": query_embedding,
            "top_k": 5,
            "include_metadata": True,
            "include_values": False
        }

        results = index.query(**pinecone_query)

        # Extract contexts from results
        contexts = []
        for match in results.get('matches', []):
            metadata = match.get('metadata', {})
            contexts.append({
                "text": metadata.get('text') or metadata.get('pageContent') or "No content available",
                "docType": metadata.get('doc_type', 'unknown'),
                "summary": metadata.get('summary', ''),
                "keywords": metadata.get('keywords', []),
                "source": metadata.get('source', 'unknown'),
                "score": match.get('score', 0.0)
            })

        # Log search results
        if trace:
            search_span = trace.span(name='vector-search')
            search_span.end(
                input={"rewrittenQuery": rewritten_query},
                output={
                    "resultCount": len(contexts),
                    "topMatches": [
                        {
                            "docType": c["docType"],
                            "previewText": c["text"][:100] + "..." if isinstance(c["text"], str) else "No preview available"
                        }
                        for c in contexts[:3]
                    ]
                }
            )

        return {
            "relevant": True,
            "retrievalRequired": True,
            "contexts": contexts
        }

    except Exception as error:
        print(f"Vector DB search error: {error}")
        return {
            "relevant": False,
            "retrievalRequired": False,
            "contexts": []
        }
