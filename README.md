# 자취생 전기요금 박사

한국전력공사(KEPCO)의 주택용 누진세 구간을 기반으로 예상 전기요금을 계산하고, OpenAI API를 활용해 가전제품별 맞춤형 절약 가이드를 제공하는 웹 서비스입니다.

![Project Thumbnail](./public/thumbnail.png)

## 배포 주소

[https://my-electric-bill.vercel.app](https://my-electric-bill.vercel.app)

---

## 프로젝트 개요

### 목표

복잡한 전기요금 계산 과정을 단순화하고, 실질적인 절약 방법을 제공하여 1인 가구의 주거비 부담 완화

### 주요 기능

- 주거 형태(저압/고압)별 실시간 요금 계산
- 가전제품별 사용 시간에 따른 요금 시뮬레이션
- GPT-4o-mini 기반의 AI 요금 분석 및 절약 코칭
- 카카오톡 등 소셜 미디어 공유 최적화 (OG Tag)

---

## 기술 스택 (Tech Stack)

### Frontend

- React, Vite
- Tailwind CSS (Mobile-First Design)
- Pretendard Font

### Backend & Security

- Vercel Serverless Functions (API Proxy)
- OpenAI API (GPT-4o-mini)

---

## 기술적 의사결정 및 트러블슈팅

### 1. API Key 보안 및 프록시 서버 구축

초기 개발 단계에서 클라이언트 환경변수로 API Key를 관리했으나, 네트워크 탭에서 키가 노출되는 취약점을 확인했습니다. 이를 해결하기 위해 Vercel Serverless Functions를 도입하여 별도의 백엔드 엔드포인트를 구축했습니다. 클라이언트는 프록시 서버로 요청을 보내고, 실제 API Key는 서버 내부에서만 호출되도록 아키텍처를 개선하여 보안성을 확보했습니다.

### 2. 모바일 사용자 경험(UX) 개선

PC 환경 위주로 개발된 초기 버전에서 모바일 접속 시 화면 배율이 축소되고 터치 영역이 좁은 문제가 발생했습니다.

- Viewport 설정: HTML meta 태그를 추가하여 모바일 디바이스에서 1:1 비율로 렌더링되도록 수정
- Touch Target 최적화: Tailwind CSS의 Breakpoint를 활용하여 모바일 환경에서는 입력창과 버튼의 높이를 확대하고, 엄지손가락으로 조작하기 쉬운 하단 고정 바 UI 구현

### 3. API 호출 비용 최적화 (Throttling)

비정상적인 API 호출로 인한 비용 발생을 방지하기 위해 클라이언트 사이드 제어 로직을 구현했습니다. 브라우저 저장소(localStorage)를 활용하여 마지막 요청 시간과 일일 횟수를 기록하고, 1일 10회 제한 및 50초 쿨타임(Debouncing) 기능을 적용했습니다.

---

## 폴더 구조

```bash
my-electric-bill
├── api                 # Vercel Serverless Functions
│   └── askAi.js
├── public              # Static Assets
├── src
│   ├── data            # Constants
│   ├── services        # API Logic
│   ├── utils           # Calculation Logic
│   ├── App.jsx         # Main UI
│   └── main.jsx        # Entry Point
└── index.html
```
