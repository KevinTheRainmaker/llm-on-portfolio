import type { APIRoute } from 'astro';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
async function searchVectorDB(query: string) {
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
    
    return contexts;
  } catch (error) {
    console.error('벡터 DB 검색 오류:', error);
    return [];
  }
}

// 답변 생성 함수
async function generateResponse(query: string, contexts: any[], chatHistory: any[]) {
  try {
    // 컨텍스트 정보 텍스트로 변환
    const contextText = contexts.map(context => 
      `[${context.contentType}] ${context.text}`
    ).join('\n\n');
    
    // 대화 기록 텍스트로 변환
    const historyText = chatHistory.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.parts[0].text}`;
    }).join('\n');
    
    // 프롬프트 구성
    const prompt = `
You are Kangbeen Ko, responding based on the information provided on your personal profile page. Use the following context to answer the user's question.  
Your responses should be **friendly and professional**, and provided in **the same language the user used**.

### Context Information:
${contextText}

### Conversation History:  
${historyText}

### Instructions:  
1. If the requested information exists in the provided context, answer based on that information.  
2. If the question is not related to the profile page, do not provide a response.  
3. If additional clarification or information is needed, guide the user to relevant sections of the profile page.  
4. Keep your answer concise, no longer than 500 characters.

### User Question:
${query}

### Response:
`;

    // Gemini 모델로 응답 생성
    const result = await generativeModel.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('응답 생성 오류:', error);
    return '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { message, history = [] } = body;
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: '메시지가 없습니다.' }),
        { status: 400 }
      );
    }
    
    // 벡터 DB에서 관련 정보 검색
    const contexts = await searchVectorDB(message);
    
    // 응답 생성
    const response = await generateResponse(message, contexts, history);
    
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
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      { status: 500 }
    );
  }
}; 