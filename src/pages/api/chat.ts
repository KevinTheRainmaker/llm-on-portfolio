import type { APIRoute } from 'astro';
import { generateResponse } from '../../lib/response-generator';
import { getSessionManager } from '../../lib/short-term-memory';

// prerender 비활성화
export const prerender = false;

// Check if running on Vercel (production)
const IS_VERCEL = import.meta.env.VERCEL === '1';

/**
 * Chat API endpoint
 *
 * - Production (Vercel): Uses Python serverless function
 * - Development: Uses TypeScript implementation
 *
 * Both implementations use memory-based architecture:
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

    // Generate or use session ID
    const currentSessionId = sessionId || crypto.randomUUID();

    // Production: Forward to Python serverless function
    if (IS_VERCEL) {
      try {
        const url = new URL('/api/chat', request.url);
        const pythonResponse = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            history,
            sessionId: currentSessionId,
          }),
        });

        if (!pythonResponse.ok) {
          const errorText = await pythonResponse.text();
          console.error('Python API error:', errorText);
          throw new Error('Python API failed');
        }

        const result = await pythonResponse.json();
        return new Response(
          JSON.stringify(result),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } catch (pythonError) {
        console.error('Python API error, falling back to TypeScript:', pythonError);
        // Fall through to TypeScript implementation
      }
    }

    // Development: Use TypeScript implementation directly
    const sessionManager = getSessionManager();
    const stm = sessionManager.getSession(currentSessionId);

    // Add user message to short-term memory
    stm.addMessage('user', message);

    // Get conversation context
    const sessionContext = stm.getContextForLLM(10);

    // Generate response
    const response = await generateResponse(message, sessionContext);

    // Add assistant response to short-term memory
    stm.addMessage('model', response);

    return new Response(
      JSON.stringify({
        response,
        sessionId: currentSessionId,
      }),
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
