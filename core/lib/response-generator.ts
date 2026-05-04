/**
 * Response Generator Module
 * Generates chat responses using Google Generative AI with memory context
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { SiteLink } from './long-term-memory';

const genAI = new GoogleGenerativeAI(import.meta.env.GEMINI_API_KEY || '');

/**
 * Parse <link> tags from LLM response and convert them to HTML links
 */
export function linkifyResponse(responseText: string, links: SiteLink[]): string {
  let result = responseText;
  
  // Create a mapping of labels to hrefs for quick lookup
  const linkMap = new Map<string, string>();
  links.forEach(({ label, href }) => {
    linkMap.set(label.toLowerCase(), href);
  });
  
  // Pattern to match <link>label</link> tags
  const linkPattern = /<link>([^<]+)<\/link>/g;
  
  result = result.replace(linkPattern, (match, label) => {
    const trimmedLabel = label.trim();
    
    // Find matching link (case-insensitive, exact match preferred)
    let href: string | undefined;
    for (const [linkLabel, linkHref] of linkMap.entries()) {
      if (linkLabel === trimmedLabel.toLowerCase()) {
        href = linkHref;
        break;
      }
    }
    
    // If no exact match found, return the original text without link tag
    if (!href) {
      return trimmedLabel;
    }
    
    // Determine if external link
    const isExternal = href.startsWith('http');
    
    // Create anchor tag
    if (isExternal) {
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-bold hover:text-blue-800">${trimmedLabel}</a>`;
    } else {
      return `<a href="${href}" class="text-blue-600 underline font-bold hover:text-blue-800">${trimmedLabel}</a>`;
    }
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
    console.log('[RESPONSE GEN] Generating response for query:', query.substring(0, 50));
    console.log('[RESPONSE GEN] Session history length:', sessionHistory.length);
    console.log('[RESPONSE GEN] Session history preview:', sessionHistory.substring(0, 200));
    
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
1. **CRITICAL - Context Resolution**: When the user uses references like "this paper", "that project", "it", "that research", "the latest one", "the paper I just asked about", etc., you MUST check the conversation history above to identify what they are referring to. Use the EXACT names from the conversation history.
2. Use the profile information to provide an accurate, informative answer.
3. Respond in the same language as the user (Korean or English).
4. Keep your response concise (300-500 characters) but comprehensive.
5. **IMPORTANT - Link Formatting**: When you want to add a link, wrap the link label with <link> tags. For example:
   - Use <link>Papers</link> instead of just "Papers"
   - Use <link>LEGOLAS</link> instead of just "LEGOLAS"
   - Use <link>Research</link> instead of just "Research"
6. **ONLY wrap labels that exist in the Available Site Links list above**. Do NOT wrap words that are not in the list.
7. Format important terms naturally so they can be linked (e.g., mention "LEGOLAS" when discussing the golf research).
8. If the question is not related to Kangbeen Ko's profile, politely decline and redirect to relevant topics.
9. When mentioning publications, projects, or specific sections, use their exact names from the available links and wrap them with <link> tags.

## Example Response Format:
"Kangbeen Ko's latest research is <link>LEGOLAS</link>, published at CHI 2025. You can find more details in the <link>Papers</link> section or visit the <link>Research</link> page."

## Current Time:
${currentTime}

## User Question:
${query}

## Response:
`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = result.response;
    const responseText = response.text();

    console.log('[RESPONSE GEN] Generated response text:', responseText.substring(0, 100));

    // Add links to response
    const linkedResponse = linkifyResponse(responseText, siteLinks);

    return linkedResponse;
  } catch (error) {
    console.error('Error generating response:', error);
    return '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요.';
  }
}
