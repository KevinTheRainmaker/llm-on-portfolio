import type { APIRoute } from 'astro';

// prerender 비활성화
export const prerender = false;

// Python API 서버 URL (환경 변수로 설정 가능)
const PYTHON_API_URL = import.meta.env.PYTHON_API_URL || 'http://localhost:8000';

/**
 * Chat API endpoint - Proxies requests to Python FastAPI server
 *
 * This endpoint forwards chat requests to the Python-based LLM chat module.
 * The Python server handles all the heavy lifting:
 * - Query rewriting
 * - Vector database search
 * - Response generation
 * - Observability/tracing
 *
 * Original TypeScript implementation is backed up in chat.ts.backup
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { message, history = [], sessionId } = body;

    if (!message) {
      return new Response(
        JSON.stringify({ error: '메시지가 없습니다.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Forward request to Python API
    const pythonResponse = await fetch(`${PYTHON_API_URL}/api/chat`, {
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

      // Fallback to error response
      return new Response(
        JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await pythonResponse.json();

    // Return response from Python API
    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('API 오류:', error);

    // Check if Python server is not running
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new Response(
        JSON.stringify({
          error: 'Python API 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.',
          hint: 'cd python && ./start.sh'
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
