import type { APIRoute } from 'astro';
import { getLongTermMemory } from '@/lib/long-term-memory';
import { getSessionManager } from '@/lib/short-term-memory';
import { generateResponse } from '@/lib/response-generator';

// prerender 비활성화
export const prerender = false;

/**
 * Chat API endpoint - Memory-based architecture
 *
 * Uses long-term memory (profile data) and short-term memory (session history)
 * to generate contextual responses with automatic link generation.
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
    const finalSessionId = sessionId || crypto.randomUUID();

    // Get memory systems
    const ltm = getLongTermMemory();
    const sessionManager = getSessionManager();
    const stm = sessionManager.getSession(finalSessionId);

    // Add user message to short-term memory
    stm.addMessage('user', message);

    // Get contexts
    const profileContext = ltm.getContextForLLM();
    const sessionContext = stm.getContextForLLM(10);
    const siteLinks = ltm.getSiteLinks();

    // Generate response
    const response = await generateResponse(
      message,
      profileContext,
      sessionContext,
      siteLinks
    );

    // Add assistant response to short-term memory
    stm.addMessage('model', response);

    return new Response(
      JSON.stringify({
        response,
        sessionId: finalSessionId,
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
