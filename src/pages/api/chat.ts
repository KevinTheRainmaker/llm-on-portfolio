import type { APIRoute } from 'astro';
import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Langfuse } from 'langfuse';
import { getRetrievalPlan } from './retrieval-planner';
import { publications, projects } from '@/data/cv';

// prerender 비활성화
export const prerender = false;

// 환경 변수 설정
const PINECONE_API_KEY = import.meta.env.PINECONE_API_KEY || '';
const PINECONE_INDEX_NAME = import.meta.env.PINECONE_INDEX_NAME || 'kangbeen-context-profile-data'; // must be set on vercel env
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
function isLikelyQuestion(text: string): boolean {
  const lowered = text.toLowerCase().trim();
  return lowered.endsWith('?') || /^[\s]*(what|which|who|when|why|how)\b/.test(lowered);
}

// 질문 리라이터
async function rewriteQuery(query: string, history: any[], trace: any): Promise<string> {
  // const latestUser = history.findLast(h => h.role === 'user')?.parts?.[0]?.text;
  // const latestBot = history.findLast(h => h.role === 'model')?.parts?.[0]?.text;
  const rewriteSpan = trace.span({ name: 'rewrite-query' });
  // if (!latestUser || !latestBot) return query;

  // function formatHistory(history: any[]) {
  //   let qCount = 1;
  //   let aCount = 1;
  //   return history
  //     .filter(h => h.role === 'user' || h.role === 'model')
  //     .map(h => {
  //       if (h.role === 'user') {
  //         return `Q${qCount++}: ${h.parts?.[0]?.text ?? ''}`;
  //       } else {
  //         return `A${aCount++}: ${h.parts?.[0]?.text ?? ''}`;
  //       }
  //     })
  //     .join('\n');
  // }

  const prompt = `
  You are rewriting a user question to make it more precise, assuming the subject is a graduate student researcher.
  
  ## Profile Assumption:
  The subject is an M.S. student at HCIS Lab, GIST (Gwangju Institute of Science and Technology), focused on AI × HCI research.  
  They are a product-minded builder passionate about improving human life through responsible and innovative technologies.  
  Their "work" often refers to academic research, publications, and technically rigorous projects.
  
  ## Objective:
  - Clarify vague or ambiguous user queries.
  - Reflect the most likely intent in an academic and research-driven context.
  - If the original question is clear, return it unchanged.
  
  ## Guidelines:
  1. Interpret general terms like "your recent work", "your contributions", or "your project" as referring to research output (e.g., publications or research projects), unless clearly meant otherwise.
  2. Use reasonable assumptions about academic and research communication—but do not invent facts.
  3. Preserve the original user intent and tone.
  4. Only rewrite if ambiguity exists. Otherwise, return the question unchanged.
  
  ## Examples:
  - “Tell me more about his latest work.” → “Tell me more about Kangbeen Ko’s most recent research publication.”
  - “What is that project you mentioned?” → “What is the project titled ‘LLM-Augmented Golf Swing Analysis’?”
  - “Can you tell me about your project?” → “Can you tell me about your research project titled ‘SickGPT’?”
  - “What are you currently working on?” → “What research are you currently working on?”
  
  ## Input:
  Current user question: ${query}
  
  Rewritten question:
  `;

  const result = await generativeModel.generateContent(prompt);
  const rewritten = result.response.text().trim().replace(/^Rewritten question:\s*/i, '');
  rewriteSpan.end({
    input: { query },
    output: rewritten,
  });

  return rewritten;
}

async function FullContextGenerator(query: string, history: any[], trace: any): Promise<string> {
  const latestUser = history.findLast(h => h.role === 'user')?.parts?.[0]?.text;
  const latestBot = history.findLast(h => h.role === 'model')?.parts?.[0]?.text;
  if (!latestUser || !latestBot) return query;

  const full_context = `
  Q1: ${latestUser}
  A1: ${latestBot}
  Q2: ${query}
  `
  return full_context;
}

// 벡터 DB에서 관련 정보 검색
async function searchVectorDB(query: string, history: any[], trace: any): Promise<{
  relevant: boolean;
  retrievalRequired: boolean;
  contexts: any[];
  rewrittenQuery?: string;
}> {
  const planSpan = trace.span({ name: 'plan-decision' });
  try {
    const latestUser = history.findLast(h => h.role === 'user')?.parts?.[0]?.text;
    const latestBot = history.findLast(h => h.role === 'model')?.parts?.[0]?.text;
    const rewrittenQuery = await rewriteQuery(query, history, trace);
    if (isLikelyQuestion(rewrittenQuery)) {
      planSpan.end({
        input: { query, rewrittenQuery },
        output: 'rewritten query is a question, skipping retrieval',
      });
    
      return {
        relevant: true,
        retrievalRequired: false,
        contexts: [],
        rewrittenQuery, // ✅ 이 필드를 반환하여 상위에서 사용 가능
      };
    }
    // const fullContext = await FullContextGenerator(query, history, trace);

    // const plannerPrompt = latestUser && latestBot
    //   ? `${latestUser}\n${latestBot}\n${rewrittenQuery}`
    //   : rewrittenQuery;
    const planner = await getRetrievalPlan(rewrittenQuery);
    planSpan.end({
      input: { query, latestUser, latestBot, rewrittenQuery },
      output: planner,
    });
    console.log(rewrittenQuery);
    if (!planner.relevant) {
      planSpan.end({
        input: { query, latestUser, latestBot, rewrittenQuery },
        output: 'irrelevant',
      });
      return {
        relevant: false,
        retrievalRequired: false,
        contexts: [],
      };
    }

    if (!planner.retrievalRequired) {
      planSpan.end({
        input: { query, latestUser, latestBot, rewrittenQuery },
        output: 'relevant, no retrieval needed',
      });
      return {
        relevant: true,
        retrievalRequired: false,
        contexts: [],
      };
    }


    const queryEmbedding = await embedText(rewrittenQuery);
    const index = pinecone.index(PINECONE_INDEX_NAME);

    const pineconeQuery: any = {
      vector: queryEmbedding,
      topK: 5,
      includeMetadata: true,
      includeValues: false,
    };

    const results = await index.query(pineconeQuery);

    const contexts = results.matches.map(match => ({
      text: match.metadata?.text || match.metadata?.pageContent || "No content available",
      docType: match.metadata?.doc_type || "unknown",
      summary: match.metadata?.summary || "",
      keywords: match.metadata?.keywords || [],
      source: match.metadata?.source || "unknown",
      score: match.score,
    }));
    const searchSpan = trace.span({ name: 'vector-search' });

    searchSpan.end({
      input: { rewrittenQuery },
      output: {
        resultCount: contexts.length,
        topMatches: contexts.slice(0, 3).map(c => ({
          docType: c.docType,
          previewText:
            typeof c.text === "string"
              ? c.text.substring(0, 100) + "..."
              : "No preview available",
        })),
      },
    });

    return {
      relevant: true,
      retrievalRequired: true,
      contexts,
    };
  } catch (error) {
    console.error('벡터 DB 검색 오류:', error);
    return {
      relevant: false,
      retrievalRequired: false,
      contexts: [],
    };
  }
}

// const PAGES_DIR = path.join(process.cwd(), 'src/pages');
// 사이트맵 생성 함수
type SiteMapLink = {
  label: string;
  href: string;
};

function generateSiteMapLinks(): SiteMapLink[] {
  const siteMap: SiteMapLink[] = [];

  siteMap.push({ label: 'Home', href: '/' });

  siteMap.push({ label: 'Papers', href: '/papers' });
  siteMap.push({ label: 'Featured Publications', href: '/papers#featured' });
  siteMap.push({ label: 'Other Publications', href: '/papers#all-publications' });
  publications.forEach(pub => {
    siteMap.push({ label: pub.title, href: pub.link });
  });

  siteMap.push({ label: 'Research', href: '/research' });

  // siteMap.push({ label: 'CV', href: '/cv' });

  siteMap.push({ label: 'CV/Education', href: '/cv#education' });

  siteMap.push({ label: 'CV/Experiences', href: '/cv#experiences' });

  siteMap.push({ label: 'CV/Projects', href: '/cv#projects' });
  projects.forEach(project => {
    siteMap.push({ label: project.title, href: project.link });
  });

  siteMap.push({ label: 'CV/Awards & Honors', href: '/cv#awards' });
  siteMap.push({ label: 'CV/Other Experiences', href: '/cv#other-experiences' });
  siteMap.push({ label: 'CV/Skills', href: '/cv#skills' });

  return siteMap;
}


function linkifyResponse(responseText: string, links: SiteMapLink[]): string {
  let result = responseText;

  links.forEach(({ label, href }) => {
    const escapedLabel = label//.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 정규식 이스케이프
    const regex = new RegExp(`\\b(${escapedLabel})\\b`, 'g');

    const isExternal = href.startsWith('http');
    const anchor = isExternal
      ? `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-bold hover:text-blue-800">$1</a>`
      : `<a href="${href}" class="text-blue-600 underline font-bold hover:text-blue-800">$1</a>`;

    result = result.replace(regex, anchor);
  });

  return result;
}

// 답변 생성 함수
async function generateResponse(query: string, contexts: any[], chatHistory: any[], trace: any) {
  try {
    // 컨텍스트 정보 텍스트로 변환 (PDF 문서 특별 처리 추가)
    const contextText = contexts.map(ctx => {
      const base = `[${ctx.docType}] ${ctx.text}`;
      const meta = ctx.summary ? `요약: ${ctx.summary}\n키워드: ${ctx.keywords.join(', ')}` : '';
      return `${base}\n${meta}`;
    }).join('\n\n');

    // 대화 기록 텍스트로 변환
    const historyText = chatHistory.map(msg => {
      const role = msg.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.parts[0].text}`;
    }).join('\n');
    console.log(historyText);

    const siteMap = generateSiteMapLinks();
    // 동적 사이트맵 생성

    const filteredSiteMapLinks = siteMap.filter(link => {
      const isPaper = publications.some(pub => pub.title === link.label);
      const isProject = projects.some(proj => proj.title === link.label);
      return !isPaper && !isProject;
    });
    
    const labelList = filteredSiteMapLinks.map(link => `- ${link.label}`).join('\n');
    // 프롬프트 구성
    const prompt = `
    You are Kangbeen Ko(고강빈)'s digital twin.
    You help visitors learn more about his academic and professional background using information from his personal website.
    
    ## Objective:
    Answer the user's question using only the provided context and profile data. If helpful, guide the user to relevant sections of the site.
    
    ## Context Information:
    current time: ${new Date().toISOString()}
    ${contextText}
    
    ## Conversation History:
    ${historyText}
    
    ## Instructions:
    1. Use the context and conversation to provide an informative, concise answer.
    2. Respond in the same language as the user (Korean or English).
    3. Limit your response to 500 characters unless the context truly demands more.
    4. Do not answer questions unrelated to Kangbeen Ko's profile.
    5. Reference specific sections of the site *only if* it helps the user find more information.
    6. Use only the exact labels from the allowed labels list below. Do not invent titles or paraphrase them.
    7. Do not repeat previously mentioned references unless they are essential for clarity.
    
    ## Site Map:
    ${siteMap.map(link => `- ${link.label} (${link.href})`).join('\n')}
    
    ## Allowed Labels (Use exactly as written):
    ${filteredSiteMapLinks.map(link => `- ${link.label}`).join('\n')}
    
    ## User Question:
    ${query}
    
    ## Response:
    `;    

    // Gemini 모델로 응답 생성
    const result = await generativeModel.generateContent(prompt);
    const responseText = result.response.text();
    const linkedResponse = linkifyResponse(responseText, siteMap);
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
    
    return linkedResponse;
  } catch (error) {
    console.error('응답 생성 오류:', error);
    return '죄송합니다. 응답을 생성하는 중에 오류가 발생했습니다. 다시 시도해주세요.';
  }
}

export const POST: APIRoute = async ({ request }) => {
  const sessionId = crypto.randomUUID();
  const userId = `user-${Math.floor(Math.random() * 10000)}`;

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

    if (!message) {
      const errorResponse = { error: '메시지가 없습니다.' };
      trace.event({
        name: 'error',
        input: { type: 'validation-error' },
        output: errorResponse
      });
      return new Response(JSON.stringify(errorResponse), { status: 400 });
    }

    // ✅ 전체 결과 받기
    const { relevant, retrievalRequired, contexts, rewrittenQuery } = await searchVectorDB(message, history, trace);

    // 질문 형태라면 → 바로 사용자에게 리턴
    if (rewrittenQuery && rewrittenQuery !== message && rewrittenQuery.endsWith('?')) {
      await trace.update({ input: message, output: rewrittenQuery });
      return new Response(JSON.stringify({ response: rewrittenQuery }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // ✅ 관련성 없음 → 즉시 거절
    if (!relevant) {
      const rejection = 'Sorry. Your questions is not related to me.';
      await trace.update({ input: message, output: rejection });
      return new Response(JSON.stringify({ response: rejection }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ✅ 응답 생성 (retrievalRequired 여부와 무관하게 context 사용)
    const response = await generateResponse(message, contexts, history, trace);

    await trace.update({ input: message, output: response });

    return new Response(JSON.stringify({ response }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('API 오류:', error);

    trace.event({
      name: 'error',
      input: { type: 'api-error', message: String(error) }
    });

    return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
      status: 500,
    });
  }
};
