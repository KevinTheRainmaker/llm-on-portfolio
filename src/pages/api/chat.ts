import type { APIRoute } from 'astro';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Langfuse } from 'langfuse';

// prerender 비활성화
export const prerender = false;

// 환경 변수 설정
const PINECONE_API_KEY = import.meta.env.PINECONE_API_KEY || '';
const PINECONE_INDEX_NAME = import.meta.env.PINECONE_INDEX_NAME || 'kb-profile-data';
const GEMINI_API_KEY = import.meta.env.GEMINI_API_KEY || '';

// Pinecone 클라이언트 초기화
const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

// Gemini AI 초기화 
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const generativeModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
const embedModel = genAI.getGenerativeModel({ model: "embedding-001" });

// Langfuse 클라이언트 초기화
const langfuse = new Langfuse({
  publicKey: import.meta.env.LANGFUSE_PUBLIC_KEY || '',
  secretKey: import.meta.env.LANGFUSE_SECRET_KEY || '',
  baseUrl: import.meta.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
});

// 텍스트를 임베딩으로 변환하는 함수
async function embedText(text: string): Promise<number[]> {
  try {
    const result = await embedModel.embedContent(text);
    const embedding = result.embedding.values;
    return embedding;
  } catch (error) {
    console.error('임베딩 생성 오류:', error);
    throw error;
  }
}

// 벡터 DB에서 관련 정보 검색
async function searchVectorDB(query: string, trace: any) {
  const searchSpan = trace.span({ name: 'vector-search' });
  try {
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    // 쿼리 임베딩 생성
    const queryEmbedding = await embedText(query);
    
    // Pinecone에서 유사한 벡터 검색
    const results = await index.query({
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
      includeValues: false,
    });
    
    // 검색 결과에서 텍스트 추출
    const contexts = results.matches.map(match => ({
      text: match.metadata?.pageContent || "No content available",
      contentType: match.metadata?.contentType || "unknown",
      source: match.metadata?.source || "unknown",
      score: match.score,
    }));
    
    // 검색 결과 로깅
    // trace.event({
    //   name: 'vector-search-results',
    //   input: { query },
    //   output: { 
    //     resultCount: contexts.length,
    //     topResults: contexts.slice(0, 3).map(context => ({
    //       contentType: context.contentType,
    //       source: context.source,
    //       score: context.score,
    //       previewText: typeof context.text === 'string' ? context.text.substring(0, 100) + '...' : 'No preview available'
    //     }))
    //   }
    // });
    
    // searchSpan.end();
    searchSpan.end({
      input: { query },
      output: {
        resultCount: contexts.length,
        topResults: contexts.slice(0, 3).map(context => ({
          contentType: context.contentType,
          source: context.source,
          score: context.score,
          previewText:
            typeof context.text === "string"
              ? context.text.substring(0, 100) + "..."
              : "No preview available",
        })),
      },
    });
    return contexts;
  } catch (error) {
    console.error('벡터 DB 검색 오류:', error);
    searchSpan.end({ status: 'error', error: String(error) });
    return [];
  }
}

// 답변 생성 함수
async function generateResponse(query: string, contexts: any[], chatHistory: any[], trace: any) {
  // const llmSpan = trace.span({ name: 'llm-generation' });
  try {
    // 컨텍스트 정보 텍스트로 변환 (PDF 문서 특별 처리 추가)
    const contextText = contexts.map(context => {
      // PDF 문서인 경우 특별 표시
      if (context.contentType === 'pdf') {
        return `[PDF 문서: ${context.source.split('/').pop()}] ${context.text}`;
      }
      return `[${context.contentType}] ${context.text}`;
    }).join('\n\n');
    
    // 대화 기록 텍스트로 변환
    const historyText = chatHistory.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.parts[0].text}`;
    }).join('\n');
    
    // 프롬프트 구성
    const prompt = `
      You are Kangbeen Ko(고강빈), responding based on the information provided on your personal profile page. Use the following context to answer the user's question.  
      Your responses should be **friendly and professional**, and provided in **the same language the user used**.

      ### Context Information:
      current time: ${new Date().toISOString()}
      ${contextText}

      ### Conversation History:  
      ${historyText}

      ### Instructions:  
      1. If the requested information exists in the provided context, answer based on that information.
      2. If the question is about a PDF document, reference the content of the PDF when responding.
      3. If the question is not related to either the profile page or the PDF, do not provide an answer.
      4. Respond in a friendly and professional tone, using the same language as the user.
      5. If more information or clarification is needed, guide the user to the relevant section or document.
      6. Keep your answer concise—no more than 500 characters.

      ### User Question:
      ${query}

      ### Response:
      `;

    // Gemini 모델로 응답 생성
    const result = await generativeModel.generateContent(prompt);
    const responseText = result.response.text();

    // LLM 생성 로깅
    trace.generation({
      name: 'chat-response',
      type: 'chat',
      model: 'gemini-1.5-pro',
      modelParameters: {
        temperature: 0.7,
        maxTokens: 1024,
      },
      input: query,
      prompt: [chatHistory.map(msg => ({ role: msg.role, content: msg.parts[0].text })),{ role: 'user', content: prompt }],
      output: responseText,
      metadata: {
        contextCount: contexts.length,
        historyLength: chatHistory.length,
        sources: contexts.map(c => c.source).filter((s, i, a) => a.indexOf(s) === i) // 중복 제거
      }
    });
    
    // llmSpan.end({ output: responseText });
    return responseText;
  } catch (error) {
    console.error('응답 생성 오류:', error);
    // llmSpan.end({ status: 'error', error: String(error) });
    return '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

export const POST: APIRoute = async ({ request }) => {
  // 세션 ID 생성 또는 가져오기
  const sessionId = crypto.randomUUID();
  const userId = `user-${Math.floor(Math.random() * 10000)}`;
  
  // Langfuse 트레이스 생성
  const trace = langfuse.trace({
    name: 'chat-session',
    userId,
    metadata: {
      sessionId,
      timestamp: new Date().toISOString(),
      source: 'web-app',
    },
  });
  
  try {
    const body = await request.json();
    const { message, history = [], sessionId: clientSessionId } = body;
    
    // 요청 정보 로깅
    // trace.event({
    //   name: 'chat-request', 
    //   input: { 
    //     message, 
    //     historyLength: history.length,
    //     sessionId: clientSessionId || sessionId,
    //     timestamp: new Date().toISOString()
    //   }
    // });
    
    if (!message) {
      const errorResponse = { error: '메시지가 없습니다.' };
      trace.event({
        name: 'error',
        input: { type: 'validation-error' },
        output: errorResponse
      });
      
      return new Response(
        JSON.stringify(errorResponse),
        { status: 400 }
      );
    }
    
    // 벡터 DB에서 관련 정보 검색
    const contexts = await searchVectorDB(message, trace);
    
    // 응답 생성
    const response = await generateResponse(message, contexts, history, trace);
    
    await trace.update({
      input: message,
      output: response,
    });

    return new Response(
      JSON.stringify({ response }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('API 오류:', error);
    
    // 오류 로깅
    trace.event({
      name: 'error',
      input: { type: 'api-error', message: String(error) }
    });
    
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      { status: 500 }
    );
  }
}; 