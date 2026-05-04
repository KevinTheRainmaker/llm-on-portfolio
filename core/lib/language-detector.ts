/**
 * Language Detection Module
 * Detects the language of user messages
 */

/**
 * Detect the language of a text message
 */
export function detectLanguage(text: string): string {
  if (!text) {
    return 'en';
  }

  // Remove whitespace and convert to lowercase for analysis
  const textLower = text.toLowerCase().trim();

  // Korean character range: \uAC00-\uD7A3 (Hangul syllables)
  // Korean punctuation and symbols: \u3131-\u318E, \u1100-\u11FF
  const koreanPattern = /[\uAC00-\uD7A3\u3131-\u318E\u1100-\u11FF]/g;

  // Count Korean characters
  const koreanChars = (textLower.match(koreanPattern) || []).length;
  const totalChars = textLower.split('').filter((c) => c.match(/[a-z0-9가-힣]/)).length;

  // If more than 30% of characters are Korean, consider it Korean
  if (totalChars > 0 && koreanChars / totalChars > 0.3) {
    return 'ko';
  }

  // Check for common Korean words/phrases
  const koreanIndicators = [
    '안녕',
    '하세요',
    '입니다',
    '있습니다',
    '없습니다',
    '어떻게',
    '무엇',
    '누구',
    '언제',
    '어디',
    '왜',
    '네',
    '예',
    '아니요',
    '감사',
    '죄송',
    '실례',
    '질문',
    '답변',
    '알려',
    '말해',
    '설명',
    '이해',
  ];

  for (const indicator of koreanIndicators) {
    if (textLower.includes(indicator)) {
      return 'ko';
    }
  }

  // Default to English
  return 'en';
}

