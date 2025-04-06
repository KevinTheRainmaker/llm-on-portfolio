# Astro Academia - 프로필 벡터 DB 구축

이 프로젝트는 Astro로 만든 아카데믹 프로필 웹사이트와 Pinecone 벡터 DB를 연동하여 지능형 챗봇을 구현합니다.

## 주요 기능

- 개인 프로필 정보를 Pinecone 벡터 DB로 변환
- Gemini API를 활용한 RAG 기반 대화형 챗봇
- 사용자 질문에 프로필 데이터 기반으로 응답

## 설치 방법

1. 필요한 패키지 설치:

```bash
npm install @pinecone-database/pinecone @google/generative-ai cheerio dotenv
```

2. 환경 변수 설정:

`.env.example` 파일을 복사하여 `.env` 파일을 생성하고 API 키를 설정합니다.

```
# Pinecone 설정
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=kb-profile-data

# Google AI 설정 (Gemini API)
PUBLIC_GEMINI_API_KEY=your-gemini-api-key
```

## 벡터 DB 생성 방법

1. 웹사이트 빌드:

```bash
npm run build
```

2. 벡터 DB 생성 스크립트 실행:

```bash
node src/scripts/create-vector-db.js
```

이 스크립트는 다음과 같은 작업을 수행합니다:

- 빌드된 HTML 파일과 데이터 파일에서 프로필 정보 추출
- 추출된 데이터를 적절한 크기로 분할
- Gemini API의 임베딩 모델로 벡터화
- Pinecone에 벡터 데이터 저장

## 사용 방법

1. 서버 실행:

```bash
npm run dev
```

2. 웹사이트 방문:
   브라우저에서 `http://localhost:4321`에 접속하면 채팅 UI가 표시됩니다.

3. 대화 방식:
   채팅창에 질문을 입력하면 벡터 DB에서 관련 정보를 검색하여 답변을 제공합니다.

## 작동 원리

1. **데이터 추출**: HTML 파일과 데이터 파일(cv.ts, settings.ts)에서 프로필 정보 추출
2. **벡터화**: Gemini의 임베딩 모델(embedding-001)을 사용하여 텍스트를 벡터로 변환
3. **검색**: 사용자 질문이 들어오면 벡터 유사도 검색으로 관련 정보 검색
4. **응답 생성**: 검색된 정보와 대화 기록을 바탕으로 Gemini 모델이 응답 생성

## 주의사항

- Pinecone과 Google AI API 키가 필요합니다.
- 초기 벡터 DB 생성에는 수분이 소요될 수 있습니다.
- Gemini API는 요청 속도 제한이 있으므로, 대량의 데이터 처리 시 지연이 추가됩니다.
- 대규모 사이트의 경우 청크 크기와 오버랩 설정을 조정해야 할 수 있습니다.

## 커스터마이징

- `src/scripts/create-vector-db.js`: 벡터 DB 생성 로직 커스터마이징
- `src/pages/api/chat.ts`: 응답 생성 로직 커스터마이징

## PDF 문서 처리 추가

프로젝트에 PDF 문서 처리 기능이 추가되었습니다. 이제 RAG 챗봇이 PDF 파일의 내용을 기반으로 질문에 답변할 수 있습니다.

### PDF 문서 추가 방법

1. `public/pdfs` 디렉토리에 PDF 파일을 추가합니다:
   ```bash
   cp 논문.pdf 이력서.pdf public/pdfs/
   ```

2. 벡터 데이터베이스를 다시 생성합니다:
   ```bash
   node src/scripts/create-vector-db.js
   ```

3. 서버를 시작합니다:
   ```bash
   npm run dev
   ```

4. 이제 챗봇에 PDF 문서 내용에 관한 질문을 할 수 있습니다.

### 필요한 패키지

PDF 처리를 위해 다음 패키지를 설치해야 합니다:
```bash
npm install pdf-parse
```

## Langfuse 로깅 기능 추가

RAG 챗봇의 모든 인터랙션과 성능을 추적하기 위한 Langfuse 로깅 기능이 추가되었습니다.

### 설정 방법

1. [Langfuse](https://langfuse.com) 계정을 생성하고 API 키를 발급받습니다.
   
2. `.env` 파일에 Langfuse API 키를 추가합니다:
   ```
   LANGFUSE_PUBLIC_KEY=your-langfuse-public-key
   LANGFUSE_SECRET_KEY=your-langfuse-secret-key
   LANGFUSE_HOST=https://cloud.langfuse.com
   ```

3. 서버를 시작하면 자동으로 다음과 같은 데이터가 Langfuse에 로깅됩니다:
   - 사용자 질문 및 세션 정보
   - 벡터 검색 쿼리 및 결과
   - 참조된 데이터 소스 정보
   - LLM 생성 내용 (프롬프트 및 응답)
   - 오류 및 예외 상황

4. Langfuse 대시보드에서 로깅된 데이터를 확인하고 분석할 수 있습니다.

자세한 내용은 [Langfuse 문서](https://langfuse.com/docs)를 참조하세요.

## Vercel 배포 방법

이 프로젝트는 Vercel에 배포할 수 있도록 구성되어 있습니다.

### 배포 준비

1. [Vercel](https://vercel.com/) 계정을 생성하고 GitHub 저장소와 연결합니다.

2. 다음 환경 변수를 Vercel 프로젝트 설정에 추가합니다:
   - `PINECONE_API_KEY`: Pinecone API 키
   - `PINECONE_INDEX_NAME`: Pinecone 인덱스 이름 (기본값: `kb-profile-data`)
   - `GEMINI_API_KEY`: Google Gemini API 키
   - `LANGFUSE_PUBLIC_KEY` (선택): Langfuse 공개 키
   - `LANGFUSE_SECRET_KEY` (선택): Langfuse 비밀 키
   - `LANGFUSE_HOST` (선택): Langfuse 호스트 URL

3. 다음 명령어로 로컬에서 빌드를 테스트합니다:
   ```bash
   npm run build
   ```

### 배포 방법

1. GitHub 저장소에 변경사항을 커밋하고 푸시합니다.
   ```bash
   git add .
   git commit -m "Deploy to Vercel"
   git push
   ```

2. Vercel 대시보드에서 자동으로 배포가 시작되는지 확인합니다.

3. 또는 Vercel CLI를 사용하여 배포합니다:
   ```bash
   npx vercel
   ```

### 배포 후 설정

1. 웹사이트가 정상적으로 작동하는지 확인합니다.

2. PDF 파일이 필요한 경우 Vercel 배포 후 `public/pdfs` 디렉토리에 파일을 업로드합니다.

3. 벡터 데이터베이스를 구축하려면 로컬에서 다음 명령어를 실행한 후 다시 배포합니다:
   ```bash
   node src/scripts/create-vector-db.js
   ```
