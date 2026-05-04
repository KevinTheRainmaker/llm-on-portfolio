# core/

포트폴리오 재제작 시 재사용할 핵심 기능과 데이터 모음.

## 구조

```
core/
├── data/
│   ├── profile-data.json       # 전체 프로필 데이터 (학력/경력/논문/프로젝트/수상/스킬)
│   └── cv/                     # CV 섹션별 마크다운
│       ├── education.md
│       ├── experience.md
│       ├── projects.md
│       ├── papers.md
│       ├── skills.md
│       ├── awards.md
│       ├── other-experiences.md
│       └── full-cv.md
├── settings.ts                 # 사이트 설정 (이름, SNS 링크, SEO 등)
├── types/
│   └── cv.ts                   # CV 데이터 TypeScript 타입 정의
├── lib/                        # TypeScript LLM 챗봇 로직
│   ├── long-term-memory.ts     # 프로필 데이터 로딩 & LLM 컨텍스트 생성
│   ├── short-term-memory.ts    # 세션별 대화 이력 관리
│   ├── response-generator.ts   # Gemini API 응답 생성 + 링크 삽입
│   ├── relevance-filter.ts     # 관련 없는 질문 필터링
│   ├── language-detector.ts    # 한국어/영어 감지
│   └── utils.ts                # 유틸리티 함수
├── python/                     # Python FastAPI LLM 서버
│   ├── llm_chat/               # 핵심 Python 모듈
│   │   ├── __init__.py
│   │   ├── config.py           # Gemini & Langfuse 초기화
│   │   ├── chat_handler.py     # 요청 오케스트레이션
│   │   ├── response_generator.py
│   │   ├── long_term_memory.py
│   │   ├── short_term_memory.py
│   │   ├── langchain_memory.py
│   │   ├── relevance_filter.py
│   │   └── language_detector.py
│   ├── main.py                 # FastAPI 서버 진입점
│   ├── requirements.txt
│   └── .env.example
└── assets/
    ├── profile_pictures.jpg    # 프로필 사진 1
    ├── profile_casual.png      # 프로필 사진 2
    ├── favicon.svg
    └── images/
        ├── projects/           # 프로젝트 스크린샷
        └── publications/       # 논문 이미지/GIF

## 환경변수 (필수)

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## 챗봇 아키텍처

- **장기 기억 (Long-term Memory)**: `data/profile-data.json` 에서 로드, 시작 시 1회 적재
- **단기 기억 (Short-term Memory)**: 세션별 대화 이력, 자동 관리
- **언어 감지**: 한국어/영어 자동 인식 후 동일 언어로 응답
- **관련성 필터**: 포트폴리오 무관 질문 차단
- **링크 삽입**: 응답에 관련 페이지 HTML 링크 자동 추가
