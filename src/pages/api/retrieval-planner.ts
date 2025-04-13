import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY || '');
const plannerModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

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
  Determine whether the user's question meets the following conditions:
  
  1. If the question is a simple greeting (e.g., "Hello", "Hi") or is asking about your name, identity, what you do, or general introduction (e.g., "What’s your name?", "Who are you?", "What do you do?"), set "relevant" to true.
  
  2. If the question is related to Kangbeen Ko’s profile—including background, education, skills, technologies used, programming languages, experience, research, papers, awards, or career—set "relevant" to true.
  
  3. Only if the question is clearly unrelated or nonsensical (e.g., “What’s the weather in Paris?” or “Can pigs fly?”), set "relevant" to false.
  
  4. Set "retrievalRequired" to false if the answer can be generated directly from profile or static information.  
     If more detailed search is needed (e.g., from documents or long context), set it to true.
  
  Respond only in the following strict JSON format. Do **not** include explanations, markdown, or code blocks.
  
  Example:
  {
    "relevant": true,
    "retrievalRequired": false
  }
  
  Question: "${userQuestion}"
  `;
  

  const result = await plannerModel.generateContent(prompt);
  let raw = result.response.text().trim();
  raw = raw
  .replace(/^```json\s*/i, '') // 앞부분 제거
  .replace(/```$/, '')         // 끝부분 제거
  .trim();
  console.log(raw);
  try {
    const parsed = JSON.parse(raw);
    return {
      relevant: Boolean(parsed.relevant),
      retrievalRequired: Boolean(parsed.retrievalRequired),
    };
  } catch (err) {
    console.warn('retrieval-planner: JSON 파싱 실패. fallback 사용');
    return {
      relevant: true,
      retrievalRequired: true,
    };
  }
}
