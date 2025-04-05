import type { APIRoute } from 'astro';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 서버 렌더링 모드로 설정
export const prerender = false;

// Gemini API 키는 환경 변수에서 가져옵니다
const API_KEY = import.meta.env.PUBLIC_GEMINI_API_KEY || '';

// Gemini API 초기화
const genAI = new GoogleGenerativeAI(API_KEY);

export const POST: APIRoute = async ({ request }) => {
  try {
    // 요청 본문 파싱
    let body;
    try {
      body = await request.json();
    } catch (error) {
      console.error('JSON 파싱 오류:', error);
      return new Response(
        JSON.stringify({ error: '잘못된 요청 형식입니다.' }),
        { status: 400 }
      );
    }
    
    const { message, history } = body;
    
    if (!message) {
      return new Response(
        JSON.stringify({ error: '메시지가 필요합니다.' }),
        { status: 400 }
      );
    }
    
    // Gemini 모델 초기화
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
    
    // 채팅 세션 시작
    const chat = model.startChat({
      history: history || [],
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
    });
    
    // 메시지 전송 및 응답 받기
    const result = await chat.sendMessage(message);
    const response = await result.response;
    const text = response.text();
    
    // 응답 반환
    return new Response(
      JSON.stringify({ response: text }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Gemini API 오류:', error);
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다.' }),
      { status: 500 }
    );
  }
}; 