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
