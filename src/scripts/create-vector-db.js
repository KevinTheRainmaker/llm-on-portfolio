import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
// PDF 파싱을 위한 라이브러리 - 설치 필요: npm install pdf-parse
import pdfParse from 'pdf-parse';

dotenv.config();

// 환경 변수 체크
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'kb-profile-data';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!PINECONE_API_KEY || !GEMINI_API_KEY) {
  console.error('환경 변수가 설정되지 않았습니다. .env 파일을 확인해주세요.');
  process.exit(1);
}

// Pinecone 클라이언트 초기화
const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

// Gemini API 초기화
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embedModel = genAI.getGenerativeModel({ model: "embedding-001" });

// 텍스트를 임베딩으로 변환하는 함수
async function embedText(text) {
  try {
    // 텍스트가 너무 길면 잘라내기
    const truncatedText = text.length > 8000 ? text.substring(0, 8000) : text;
    
    // 임베딩 생성
    const result = await embedModel.embedContent(truncatedText);
    
    // 결과 확인
    if (!result || !result.embedding || !result.embedding.values) {
      console.error('임베딩 결과가 예상 형식이 아닙니다:', result);
      return new Array(768).fill(0); // 기본 빈 임베딩 반환
    }
    
    const embedding = result.embedding.values;
    return embedding;
  } catch (error) {
    console.error('임베딩 생성 오류:', error.message);
    // 오류 발생 시 0으로 채워진 임베딩 반환
    return new Array(768).fill(0);
  }
}

// 여러 텍스트를 임베딩으로 변환하는 함수
async function embedDocuments(texts) {
  const embeddings = [];
  console.log(`${texts.length}개 텍스트에 대한 임베딩 생성 시작...`);
  
  for (let i = 0; i < texts.length; i++) {
    try {
      if (!texts[i] || typeof texts[i] !== 'string') {
        console.warn(`건너뜀: 텍스트 #${i+1}이 유효하지 않습니다:`, texts[i]);
        embeddings.push(new Array(768).fill(0));
        continue;
      }
      
      const embedding = await embedText(texts[i]);
      embeddings.push(embedding);
      
      // 레이트 리밋 방지를 위한 작은 지연
      if (i % 5 === 0 && i > 0) {
        console.log(`${i}/${texts.length} 임베딩 생성 완료`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
      }
    } catch (error) {
      console.error(`텍스트 임베딩 실패 (${i + 1}/${texts.length}):`, error.message);
      // 오류가 발생해도 계속 진행 (빈 임베딩 추가)
      embeddings.push(new Array(768).fill(0)); // Gemini embedding-001 차원 수는 768
    }
  }
  console.log(`${texts.length}개 텍스트에 대한 임베딩 생성 완료!`);
  return embeddings;
}

// 컨텐츠 타입별 메타데이터
const contentTypes = {
  profile: { namespace: 'profile', description: 'Personal profile information' },
  education: { namespace: 'education', description: 'Education history' },
  publications: { namespace: 'publications', description: 'Research publications' },
  experience: { namespace: 'experience', description: 'Work experience' },
  skills: { namespace: 'skills', description: 'Skills and research interests' },
  pdf: { namespace: 'pdf', description: 'PDF document content' }, // PDF 콘텐츠용 타입 추가
};

// HTML 파일에서 텍스트 추출
async function extractContentFromHTML(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const $ = cheerio.load(content);
  
  // 스크립트, 스타일, 네비게이션 등 불필요한 요소 제거
  $('script, style, nav, footer, .chat-container').remove();
  
  // 본문 텍스트 추출
  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  
  // 타이틀 추출
  const title = $('title').text().trim();
  
  // 메타데이터 처리
  const pageType = determinePageType(filePath, title);
  
  return {
    text: bodyText,
    metadata: {
      source: filePath,
      title: title,
      contentType: pageType.namespace,
      description: pageType.description,
    }
  };
}

// 페이지 타입 결정
function determinePageType(filePath, title) {
  const filename = path.basename(filePath).toLowerCase();
  
  if (filename.includes('index') || title.includes('Home')) {
    return contentTypes.profile;
  } else if (filename.includes('education') || title.includes('Education')) {
    return contentTypes.education;
  } else if (filename.includes('publications') || filename.includes('papers') || title.includes('Papers')) {
    return contentTypes.publications;
  } else if (filename.includes('experience') || title.includes('Experience')) {
    return contentTypes.experience;
  } else if (filename.includes('skills') || title.includes('Skills')) {
    return contentTypes.skills;
  } else {
    // 기본값
    return contentTypes.profile;
  }
}

// 데이터 파일에서 정보 추출
async function extractInfoFromDataFiles() {
  const dataResults = [];
  
  try {
    // cv.ts 파일 내용 읽기
    const cvPath = path.join(process.cwd(), 'src', 'data', 'cv.ts');
    if (fs.existsSync(cvPath)) {
      const cvContent = fs.readFileSync(cvPath, 'utf-8');
      
      // 정규식으로 중요 정보 추출
      const publicationsMatch = cvContent.match(/export const publications = \[([\s\S]*?)\];/);
      const educationMatch = cvContent.match(/export const education = \[([\s\S]*?)\];/);
      const experiencesMatch = cvContent.match(/export const experiences = \[([\s\S]*?)\];/);
      const skillsMatch = cvContent.match(/export const skills = \[([\s\S]*?)\];/);
      
      if (publicationsMatch) {
        dataResults.push({
          text: publicationsMatch[0],
          metadata: { 
            source: 'cv.ts',
            contentType: contentTypes.publications.namespace,
            description: 'Publications extracted from data file'
          }
        });
      }
      
      if (educationMatch) {
        dataResults.push({
          text: educationMatch[0],
          metadata: { 
            source: 'cv.ts',
            contentType: contentTypes.education.namespace,
            description: 'Education history extracted from data file'
          }
        });
      }
      
      if (experiencesMatch) {
        dataResults.push({
          text: experiencesMatch[0],
          metadata: { 
            source: 'cv.ts',
            contentType: contentTypes.experience.namespace,
            description: 'Work experience extracted from data file'
          }
        });
      }
      
      if (skillsMatch) {
        dataResults.push({
          text: skillsMatch[0],
          metadata: { 
            source: 'cv.ts',
            contentType: contentTypes.skills.namespace,
            description: 'Skills extracted from data file'
          }
        });
      }
    }
    
    // settings.ts 파일 내용 읽기
    const settingsPath = path.join(process.cwd(), 'src', 'settings.ts');
    if (fs.existsSync(settingsPath)) {
      const settingsContent = fs.readFileSync(settingsPath, 'utf-8');
      
      // 프로필 정보 추출
      const profileMatch = settingsContent.match(/export const profile = \{([\s\S]*?)\};/);
      
      if (profileMatch) {
        dataResults.push({
          text: profileMatch[0],
          metadata: { 
            source: 'settings.ts',
            contentType: contentTypes.profile.namespace,
            description: 'Profile information extracted from settings'
          }
        });
      }
    }
  } catch (error) {
    console.error('데이터 파일 파싱 오류:', error);
  }
  
  return dataResults;
}

// 빌드된 HTML 파일 찾기
async function findBuildFiles() {
  const buildDir = path.join(process.cwd(), 'dist');
  const files = [];
  
  // dist 디렉토리가 없는 경우 빌드 필요
  if (!fs.existsSync(buildDir)) {
    console.log('빌드된 파일을 찾을 수 없습니다. 빌드를 먼저 실행해주세요.');
    return files;
  }
  
  function scanDirectory(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(buildDir);
  return files;
}

// 문서 분할하기
async function splitDocuments(docs) {
  const chunkSize = 1000;
  const chunkOverlap = 200;
  
  const splitDocs = [];
  
  for (const doc of docs) {
    const text = doc.text;
    const minSize = Math.min(chunkSize, text.length);
    
    if (text.length <= chunkSize) {
      // 텍스트가 청크 크기보다 작으면 그대로 사용
      splitDocs.push({
        pageContent: text,
        metadata: {
          ...doc.metadata,
          chunk: 0,
        },
      });
    } else {
      // 텍스트를 청크로 분할
      let i = 0;
      let chunkNum = 0;
      
      while (i < text.length) {
        const end = Math.min(i + chunkSize, text.length);
        const chunk = text.slice(i, end);
        
        splitDocs.push({
          pageContent: chunk,
          metadata: {
            ...doc.metadata,
            chunk: chunkNum,
          },
        });
        
        i += chunkSize - chunkOverlap;
        chunkNum++;
        
        // 마지막 조각이 너무 작으면 건너뜀
        if (i >= text.length - minSize / 2) {
          break;
        }
      }
    }
  }
  
  return splitDocs;
}

// 인덱스 존재 여부 확인 및 생성 함수
async function ensurePineconeIndex() {
  console.log('Pinecone 인덱스 확인 중...');
  
  try {
    // Pinecone 인덱스 리스트 가져오기
    const response = await pinecone.listIndexes();
    console.log('Pinecone 응답:', JSON.stringify(response, null, 2));
    
    let indexExists = false;
    let indexesList = [];
    
    // 다양한 형식의 응답 처리
    if (Array.isArray(response)) {
      // 이전 SDK 버전의 응답
      indexesList = response;
      indexExists = response.some(idx => idx.name === PINECONE_INDEX_NAME);
    } 
    else if (response && typeof response === 'object') {
      if (Array.isArray(response.indexes)) {
        // 현재 버전 응답 형식 1
        indexesList = response.indexes;
        indexExists = response.indexes.some(idx => idx.name === PINECONE_INDEX_NAME);
      } 
      else if (response.indexes && typeof response.indexes === 'object') {
        // 현재 버전 응답 형식 2
        indexesList = Object.keys(response.indexes).map(name => ({ name }));
        indexExists = Object.keys(response.indexes).includes(PINECONE_INDEX_NAME);
      }
    }
    
    console.log('사용 가능한 인덱스:', indexesList.map(idx => idx.name).join(', ') || '없음');
    
    if (!indexExists) {
      console.log(`인덱스 '${PINECONE_INDEX_NAME}'를 생성합니다...`);
      try {
        // 최신 Pinecone SDK에서는 spec 객체(serverless 또는 pods)가 필요함
        await pinecone.createIndex({
          name: PINECONE_INDEX_NAME,
          dimension: 768, // Gemini embedding-001의 차원 수
          metric: 'cosine',
          spec: {
            serverless: {
              cloud: 'aws',
              region: 'us-east-1'
            }
          }
        });
        
        // 인덱스 생성 후 초기화까지 시간이 필요
        console.log('인덱스가 초기화될 때까지 대기 중...');
        await new Promise(resolve => setTimeout(resolve, 60000)); // 1분 대기
      } catch (createError) {
        console.error('인덱스 생성 오류:', createError);
        // 이미 존재하거나 생성 중인 경우
        if (createError.message && (
            createError.message.includes('already exists') || 
            createError.message.includes('being created')
        )) {
          console.log('인덱스가 이미 존재하거나 생성 중입니다. 3분 후 계속 진행합니다...');
          await new Promise(resolve => setTimeout(resolve, 180000)); // 3분 대기
        } else {
          throw createError;
        }
      }
    } else {
      console.log(`인덱스 '${PINECONE_INDEX_NAME}'가 이미 존재합니다.`);
    }
    
    // 인덱스 가져오기
    try {
      const index = pinecone.index(PINECONE_INDEX_NAME);
      
      // 인덱스 정보 가져오기 (테스트 용도)
      const indexStats = await index.describeIndexStats();
      console.log('인덱스 통계:', indexStats);
      
      return index;
    } catch (indexError) {
      console.error('인덱스 접근 오류:', indexError);
      throw indexError;
    }
  } catch (error) {
    console.error('Pinecone 인덱스 초기화 오류:', error);
    throw error;
  }
}

// PDF 파일에서 텍스트 추출
async function extractTextFromPDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const result = await pdfParse(dataBuffer);
    
    // PDF 메타데이터 추출
    const info = result.info || {};
    const metadata = {
      source: filePath,
      title: info.Title || path.basename(filePath, '.pdf'),
      author: info.Author || 'Unknown',
      contentType: contentTypes.pdf.namespace,
      description: 'Content extracted from PDF document',
      creationDate: info.CreationDate || null,
      pageCount: result.numpages || 0,
    };
    
    return {
      text: result.text,
      metadata
    };
  } catch (error) {
    console.error(`PDF 파싱 오류 (${filePath}):`, error.message);
    return {
      text: '',
      metadata: {
        source: filePath,
        contentType: contentTypes.pdf.namespace,
        description: 'Failed to extract PDF content',
        error: error.message
      }
    };
  }
}

// PDF 파일 검색 및 처리
async function processPDFFiles(pdfDir) {
  const results = [];
  
  // PDF 디렉토리가 없는 경우
  if (!fs.existsSync(pdfDir)) {
    console.log(`PDF 디렉토리 '${pdfDir}'를 찾을 수 없습니다.`);
    return results;
  }
  
  // PDF 디렉토리 스캔
  function scanDirectory(directory) {
    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        
        if (entry.isDirectory()) {
          // 재귀적으로 하위 디렉토리 스캔
          scanDirectory(fullPath);
        } else if (entry.name.toLowerCase().endsWith('.pdf')) {
          // PDF 파일 처리 예약
          results.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`디렉토리 스캔 오류 (${directory}):`, error.message);
    }
  }
  
  scanDirectory(pdfDir);
  return results;
}

// 메인 함수
async function main() {
  console.log('KB 프로필 벡터 DB 생성을 시작합니다...');
  
  try {
    // 1. 인덱스 존재 여부 확인 및 생성
    const index = await ensurePineconeIndex();
    
    // 2. 빌드된 HTML 파일 찾기
    const htmlFiles = await findBuildFiles();
    console.log(`${htmlFiles.length}개의 HTML 파일을 찾았습니다.`);
    
    if (htmlFiles.length === 0) {
      console.log('처리할 HTML 파일이 없습니다. npm run build를 실행하여 HTML 파일을 생성하세요.');
    }
    
    // 3. HTML 파일에서 텍스트 추출
    const htmlContents = [];
    for (const file of htmlFiles) {
      try {
        const content = await extractContentFromHTML(file);
        htmlContents.push(content);
        console.log(`HTML 파일 처리 완료: ${file}`);
      } catch (error) {
        console.error(`HTML 파일 처리 오류 (${file}):`, error);
      }
    }
    
    // 4. 데이터 파일에서 정보 추출
    const dataContents = await extractInfoFromDataFiles();
    console.log(`${dataContents.length}개의 데이터 파일 정보를 추출했습니다.`);
    
    // 5. PDF 파일 찾기 및 처리
    const pdfDir = path.join(process.cwd(), 'public', 'pdfs');
    const pdfFiles = await processPDFFiles(pdfDir);
    console.log(`${pdfFiles.length}개의 PDF 파일을 찾았습니다.`);
    
    // 6. PDF 파일에서 텍스트 추출
    const pdfContents = [];
    for (const file of pdfFiles) {
      try {
        const content = await extractTextFromPDF(file);
        if (content.text.trim()) {
          pdfContents.push(content);
          console.log(`PDF 파일 처리 완료: ${file}`);
        } else {
          console.warn(`PDF 파일에서 텍스트를 추출할 수 없습니다: ${file}`);
        }
      } catch (error) {
        console.error(`PDF 파일 처리 오류 (${file}):`, error);
      }
    }
    
    // 7. 모든 콘텐츠 합치기
    const allContents = [...htmlContents, ...dataContents, ...pdfContents];
    
    // 8. 문서 분할하기
    const splitDocs = await splitDocuments(allContents);
    console.log(`${splitDocs.length}개의 청크로 분할했습니다.`);
    
    // 9. 임베딩 생성 및 Pinecone에 업로드
    const batchSize = 10; // 더 작은 배치 크기로 조정
    for (let i = 0; i < splitDocs.length; i += batchSize) {
      try {
        const batch = splitDocs.slice(i, i + batchSize);
        
        // 텍스트에서 임베딩 생성
        const batchTexts = batch.map(doc => doc.pageContent);
        console.log(`배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(splitDocs.length/batchSize)} 임베딩 생성 중...`);
        const batchEmbeddings = await embedDocuments(batchTexts);
        
        // 벡터 유효성 검사
        const validVectors = [];
        for (let j = 0; j < batch.length; j++) {
          try {
            if (!Array.isArray(batchEmbeddings[j]) || batchEmbeddings[j].length !== 768) {
              console.warn(`벡터 ${j}가 유효하지 않습니다. 건너뜁니다.`);
              continue;
            }
            
            // Pinecone에 업로드할 벡터 준비
            validVectors.push({
              id: `${batch[j].metadata.contentType}-${batch[j].metadata.source.replace(/[\/\\]/g, '-')}-${batch[j].metadata.chunk || 0}-${Date.now()}-${j}`,
              values: batchEmbeddings[j],
              metadata: {
                pageContent: batch[j].pageContent,
                ...batch[j].metadata,
              },
            });
          } catch (err) {
            console.error(`벡터 ${j} 처리 중 오류:`, err.message);
          }
        }
        
        if (validVectors.length === 0) {
          console.warn('유효한 벡터가 없습니다. 이 배치는 건너뜁니다.');
          continue;
        }
        
        // Pinecone에 업로드
        console.log(`${validVectors.length}개 벡터를 Pinecone에 업로드 중...`);
        await index.upsert(validVectors);
        
        console.log(`${i + batch.length}/${splitDocs.length} 청크 업로드 완료`);
        
        // 레이트 리밋 방지를 위한 지연
        if (i + batchSize < splitDocs.length) {
          console.log('API 레이트 리밋 방지를 위해 잠시 대기 중...');
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3초 대기
        }
      } catch (error) {
        console.error(`배치 처리 중 오류 (${i}-${i+batchSize}):`, error.message);
        // 오류가 발생해도 계속 다음 배치 처리
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5초 대기 후 재시도
      }
    }
    
    console.log('벡터 DB 생성이 완료되었습니다!');
  } catch (error) {
    console.error('벡터 DB 생성 중 오류 발생:', error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('오류 발생:', error);
  process.exit(1);
}); 