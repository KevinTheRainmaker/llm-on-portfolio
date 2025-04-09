import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY || '');
const plannerModel = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export async function getRetrievalPlan(userQuestion: string): Promise<{
  relevant: boolean;
  retrievalRequired: boolean;
  strategy?: {
    filterBy?: string[];
    sortBy?: string;
    keywords?: string[];
  };
}> {
  const prompt = `
다음 질문에 대해 이력/프로필 관련 질문인지 판단하고, 벡터 검색이 필요한지와 어떤 필드를 기준으로 검색할지 제안하세요. 다음 JSON 형식으로만 응답하세요:

{
  "relevant": true | false,
  "retrievalRequired": true | false,
  "strategy": {
    "filterBy": ["doc_type", "published_date"],
    "sortBy": "published_date",
    "keywords": ["논문", "최근"]
  }
}

질문: "${userQuestion}"
`;

  const result = await plannerModel.generateContent(prompt);
  try {
    return JSON.parse(result.response.text());
  } catch {
    return { relevant: true, retrievalRequired: true };
  }
}
