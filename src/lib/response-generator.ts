/**
 * Response Generator Module
 * Generates chat responses using Google Generative AI with memory context
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SiteLink } from './long-term-memory';

const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY || '');

/**
 * Add HTML links to response text
 */
export function linkifyResponse(responseText: string, links: SiteLink[]): string {
  let result = responseText;

  links.forEach(({ label, href }) => {
    const pattern = new RegExp(`\\b(${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'g');
    const isExternal = href.startsWith('http');

    const anchor = isExternal
      ? `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-bold hover:text-blue-800">$1</a>`
      : `<a href="${href}" class="text-blue-600 underline font-bold hover:text-blue-800">$1</a>`;

    result = result.replace(pattern, anchor);
  });

  return result;
}

/**
 * Generate chat response using Gemini with long-term memory
 */
export async function generateResponse(
  query: string,
  profileContext: string,
  sessionHistory: string,
  siteLinks: SiteLink[]
): Promise<string> {
  try {
    const currentTime = new Date().toISOString();

    const prompt = `
You are Kangbeen Ko(고강빈)'s digital twin assistant.
You help visitors learn more about his academic and professional background using information from his personal website.

## Objective:
Answer the user's question using the provided profile information. Always include relevant site links to help users navigate to more detailed information.

## Long-term Memory (Profile Information):
${profileContext}

## Short-term Memory (Conversation History):
${sessionHistory}

## Available Site Links:
${siteLinks.map((link) => `- ${link.label}: ${link.href}`).join('\n')}

## Instructions:
1. Use the profile information to provide an accurate, informative answer.
2. Respond in the same language as the user (Korean or English).
3. Keep your response concise (300-500 characters) but comprehensive.
4. **ALWAYS include relevant site links** in your response using exact labels from the available links.
5. Format important terms naturally so they can be linked (e.g., mention "LEGOLAS" when discussing the golf research).
6. If the question is not related to Kangbeen Ko's profile, politely decline and redirect to relevant topics.
7. When mentioning publications, projects, or specific sections, use their exact names from the available links.

## Example Response Format:
"Kangbeen Ko's latest research is LEGOLAS, published at CHI 2025. You can find more details in the Papers section or visit the Research page."

## Current Time:
${currentTime}

## User Question:
${query}

## Response:
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro-latest' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    // Add links to response
    const linkedResponse = linkifyResponse(responseText, siteLinks);

    return linkedResponse;
  } catch (error) {
    console.error('Error generating response:', error);
    return '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요.';
  }
}
