import type { APIRoute } from 'astro';

// prerender 비활성화
export const prerender = false;

// Python API URL (Vercel serverless function)
const PYTHON_API_URL = import.meta.env.PYTHON_API_URL || '/api/chat';

/**
 * Chat API endpoint - Proxies to Python Vercel serverless function
 *
 * Forwards requests to Python API which handles:
 * - Long-term memory (profile data)
 * - Short-term memory (session history)
 * - Response generation with Gemini
 * - Automatic link generation
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { message, history = [], sessionId } = body;

    // Validate message
    if (!message) {
      return new Response(
        JSON.stringify({ error: '메시지가 없습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Forward to Python API
    const pythonResponse = await fetch(`${PYTHON_API_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
        sessionId: sessionId || crypto.randomUUID(),
      }),
    });

    if (!pythonResponse.ok) {
      const errorText = await pythonResponse.text();
      console.error('Python API error:', errorText);

      return new Response(
        JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await pythonResponse.json();

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('API 오류:', error);

    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
