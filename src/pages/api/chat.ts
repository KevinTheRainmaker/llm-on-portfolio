import type { APIRoute } from 'astro';
import { generateResponse } from '../../lib/response-generator';
import { getSessionManager } from '../../lib/short-term-memory';
import { getLongTermMemory } from '../../lib/long-term-memory';
import { checkRelevance, generateRejectionMessage } from '../../lib/relevance-filter';
import { detectLanguage } from '../../lib/language-detector';

// prerender 비활성화
export const prerender = false;

// Check if running on Vercel (production)
const IS_VERCEL = import.meta.env.VERCEL === '1';

// Option to use Python server in development (set USE_PYTHON_SERVER=true in .env)
// This allows using LangChain memory features in development
const USE_PYTHON_SERVER = import.meta.env.USE_PYTHON_SERVER === 'true' || import.meta.env.USE_PYTHON_SERVER === '1';
const PYTHON_SERVER_URL = import.meta.env.PYTHON_SERVER_URL || 'http://localhost:8000';

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

    // Get session manager for language detection
    const sessionManager = getSessionManager();
    const stm = sessionManager.getSession(currentSessionId);

    // Detect language from user message
    const detectedLanguage = detectLanguage(message);
    
    // Update preferred language in short-term memory if not set or if detected language is different
    if (!stm.preferredLanguage || detectedLanguage !== stm.preferredLanguage) {
      stm.setPreferredLanguage(detectedLanguage);
    }
    
    // Get preferred language from short-term memory
    const preferredLanguage = stm.getPreferredLanguage();

    // Check if question is relevant to profile
    const relevanceCheck = await checkRelevance(message);
    if (!relevanceCheck.relevant) {
      // Generate rejection message using Gemini 2.5 Flash with preferred language
      const rejectionMessage = await generateRejectionMessage(message, preferredLanguage);
      return new Response(
        JSON.stringify({
          response: rejectionMessage,
          sessionId: currentSessionId,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Production or Development with Python server: Forward to Python server
    if (IS_VERCEL || USE_PYTHON_SERVER) {
      try {
        // In development with Python server, use the configured URL
        // In production (Vercel), use the Python serverless function directly
        const pythonUrl = IS_VERCEL 
          ? new URL('/api/chat.py', request.url).toString()
          : `${PYTHON_SERVER_URL}/api/chat`;
        
        console.log('[CHAT API] Forwarding to Python server:', pythonUrl);
        
        const pythonResponse = await fetch(pythonUrl, {
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
    // Note: stm is already created above for language detection
    const ltm = getLongTermMemory();

    // Add user message to short-term memory FIRST
    // This ensures the message is included in the context
    stm.addMessage('user', message);

    // Debug: Log memory state before processing
    const memoryBefore = stm.getContextForLLM(20);
    console.log('[MEMORY DEBUG] Session ID:', currentSessionId);
    console.log('[MEMORY DEBUG] Total messages in session:', stm.getMessageCount());
    console.log('[MEMORY DEBUG] Memory before response generation:');
    console.log('[MEMORY DEBUG]', memoryBefore);
    console.log('[MEMORY DEBUG] Current user message:', message.substring(0, 100));

    // Get conversation context (increased limit for better context retention)
    // This should now include the current user message
    const sessionContext = stm.getContextForLLM(20);

    // Get profile context and site links from long-term memory
    const profileContext = ltm.getContextForLLM();
    const siteLinks = ltm.getSiteLinks();

    // Generate response
    const response = await generateResponse(message, profileContext, sessionContext, siteLinks);

    // Debug: Log memory state after processing
    const memoryAfter = stm.getContextForLLM(20);
    console.log('[MEMORY DEBUG] Memory after response generation:');
    console.log('[MEMORY DEBUG]', memoryAfter);
    console.log('[MEMORY DEBUG] Generated response:', response.substring(0, 100));

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
