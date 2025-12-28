/**
 * Relevance Filter Module
 * Filters out questions that are not related to Kangbeen Ko's profile
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY || '');
const filterModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export interface RelevanceResult {
  relevant: boolean;
  reason?: string;
}

/**
 * Fast heuristic check for obviously irrelevant questions
 * Returns null if uncertain (needs LLM check), true/false if certain
 */
function quickRelevanceCheck(query: string): boolean | null {
  if (!query) {
    return null;
  }

  const queryLower = query.toLowerCase().trim();

  // Obviously irrelevant patterns (fast rejection)
  const irrelevantPatterns = [
    /\b(weather|날씨|기온|온도)\b/,
    /\b(cooking|요리|레시피|음식)\b/,
    /\b(sports|스포츠|축구|야구|농구)\b/,
    /\b(movie|영화|드라마|배우)\b/,
    /\b(music|음악|가수|노래)\b/,
    /\b(game|게임|플레이)\b/,
    /\b(stock|주식|투자|증권)\b/,
    /\b(politics|정치|선거)\b/,
    /\b(recipe|요리법)\b/,
    /\b(how to cook|요리하는 방법)\b/,
    /\b(what is the weather|날씨가 어때)\b/,
  ];

  for (const pattern of irrelevantPatterns) {
    if (pattern.test(queryLower)) {
      return false;
    }
  }

  // Obviously relevant patterns (fast acceptance)
  const relevantPatterns = [
    /\b(kangbeen|고강빈|강빈)\b/,
    /\b(research|연구|논문|paper|publication)\b/,
    /\b(education|교육|학력|degree|학교)\b/,
    /\b(experience|경력|work|직장|회사)\b/,
    /\b(project|프로젝트)\b/,
    /\b(skill|기술|능력|programming|개발)\b/,
    /\b(award|수상|상|prize)\b/,
    /\b(cv|이력서|resume)\b/,
    /\b(background|배경|소개|introduction|about)\b/,
    /\b(what do you|당신은|너는|you are|your)\b/,
    /\b(hello|hi|안녕|인사)\b/,
  ];

  for (const pattern of relevantPatterns) {
    if (pattern.test(queryLower)) {
      return true;
    }
  }

  // Uncertain - needs LLM check
  return null;
}

/**
 * Check if the user's question is relevant to Kangbeen Ko's profile
 */
export async function checkRelevance(query: string): Promise<RelevanceResult> {
  // Fast heuristic check first
  const quickResult = quickRelevanceCheck(query);
  if (quickResult === false) {
    return {
      relevant: false,
      reason: 'Question is clearly unrelated to the profile.',
    };
  }
  if (quickResult === true) {
    return {
      relevant: true,
    };
  }

  // If uncertain, use LLM
  try {
    const prompt = `
Determine whether the user's question meets the following conditions:

1. If the question is a simple greeting (e.g., "Hello", "Hi") or is asking about your name, identity, or general introduction, set "relevant" to true.

2. If the question is related to Kangbeen Ko's profile—including background, education, skills, technologies used, programming languages, experience, research, papers, awards, or career—set "relevant" to true.

3. Only if the question is clearly unrelated or nonsensical (e.g., "What's the weather in Paris?" or "Can pigs fly?"), set "relevant" to false.

Respond only in the following strict JSON format. Do **not** include explanations, markdown, or code blocks.

Example:
{
  "relevant": true
}

Question: "${query}"
`;

    const result = await filterModel.generateContent(prompt);
    let raw = result.response.text().trim();
    
    // Clean up JSON response
    raw = raw.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    
    try {
      const parsed = JSON.parse(raw);
      const relevant = Boolean(parsed.relevant);
      
      return {
        relevant,
        reason: relevant ? undefined : parsed.reason || 'This question is not related to Kangbeen Ko\'s profile.',
      };
    } catch (err) {
      // Fallback: if JSON parsing fails, assume relevant (safer default)
      console.warn('Failed to parse relevance check response. Assuming relevant.');
      return {
        relevant: true,
      };
    }
  } catch (error) {
    console.error('Error checking relevance:', error);
    // On error, assume relevant (safer default)
    return {
      relevant: true,
    };
  }
}

/**
 * Generate a rejection message for irrelevant questions using Gemini
 */
export async function generateRejectionMessage(query: string, language: string = 'en'): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `
You are Kangbeen Ko's digital twin assistant. A user asked a question that is not related to Kangbeen Ko's profile.

Generate a brief, polite rejection message that:
1. Politely declines to answer the unrelated question
2. Keeps it concise (1-2 sentences)
3. Responds in ${language === 'ko' ? 'Korean' : 'English'}
4. **IMPORTANT**: Do NOT use titles like "박사님", "Dr.", "Professor" or any honorifics. Simply refer to "Kangbeen Ko" or "고강빈" without titles.
5. Write as if you are the assistant speaking directly to the user, not referring to Kangbeen Ko in third person with titles.

User's question: "${query}"

Rejection message:
`;

    const result = await model.generateContent(prompt);
    let rejectionMessage = result.response.text().trim();
    
    // Clean up any markdown or extra formatting
    rejectionMessage = rejectionMessage.replace(/^["']|["']$/g, '').trim();
    
    return rejectionMessage;
  } catch (error) {
    console.error('Error generating rejection message:', error);
    // Fallback to default message
    const messages: Record<string, string> = {
      en: "Sorry, your question is not related to Kangbeen Ko's profile. Please ask about his background, education, research, publications, projects, or career.",
      ko: "죄송합니다. 질문이 고강빈의 프로필과 관련이 없습니다. 배경, 교육, 연구, 논문, 프로젝트, 경력에 대해 물어보세요.",
    };
    return messages[language] || messages.en;
  }
}

