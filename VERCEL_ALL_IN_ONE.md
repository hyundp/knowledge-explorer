# Vercel에 전체 스택 배포하기

## ⚠️ 중요: Vercel의 제약사항

Vercel에서 FastAPI 백엔드를 직접 실행하는 것은 **다음과 같은 제약**이 있습니다:

### Vercel Serverless 제약
1. **최대 실행 시간**: 60초 (Pro: 300초)
2. **파일 크기**: 50MB 제한
3. **Cold Start**: 첫 요청 시 느린 응답
4. **데이터 파일**: `data/` 폴더 (267MB)가 너무 큼
5. **FAISS 인덱스**: 메모리 제한으로 로드 불가능
6. **Neo4j 연결**: 매 요청마다 새 연결 (비효율)

### ❌ Vercel에 올릴 수 없는 것들
- 대용량 데이터 파일 (267MB `data/` 폴더)
- FAISS 인덱스 (메모리 집약적)
- 장시간 실행 작업
- WebSocket 연결

---

## ✅ 해결책: 하이브리드 아키텍처 (추천)

### Option 1: Next.js API Routes + 외부 스토리지 (가능)

```
Vercel
├── Next.js Frontend (app/)
└── Next.js API Routes (app/api/)
    ├── /api/kg/graph → Neo4j Aura 직접 연결
    ├── /api/papers/[id] → Neo4j Aura 직접 연결
    └── /api/search → 외부 RAG 서비스 또는 제거
```

**장점:**
- 모든 것이 Vercel에 있음
- 배포 간단

**단점:**
- RAG/검색 기능 제한적
- FAISS 사용 불가
- 매 요청마다 Neo4j 연결 (느림)

**구현 방법:**
```typescript
// app/api/kg/graph-direct/route.ts
import neo4j from 'neo4j-driver';

export async function GET(request: Request) {
  const driver = neo4j.driver(
    process.env.NEO4J_URI!,
    neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
  );

  const session = driver.session();
  try {
    const result = await session.run('MATCH (n) RETURN n LIMIT 10');
    return Response.json(result.records);
  } finally {
    await session.close();
    await driver.close();
  }
}
```

---

### Option 2: Vercel Frontend + Railway Backend (권장 🌟)

```
Vercel (프론트엔드만)
  ↓ FASTAPI_URL
Railway (백엔드만)
  ↓ NEO4J_URI
Neo4j Aura
```

**장점:**
- ✅ 제약 없음
- ✅ FAISS, RAG 모두 사용 가능
- ✅ 빠른 응답 (상시 실행)
- ✅ 무료 티어 사용 가능

**비용:**
- Vercel: $0
- Railway: $0 ($5 크레딧/월)
- Neo4j Aura: $0

**배포 시간:** 20-30분

---

### Option 3: Vercel + Vercel Postgres + Simplified (타협안)

FastAPI 없이 Next.js만 사용:

```typescript
// app/api/kg/graph/route.ts
import { sql } from '@vercel/postgres';

export async function GET() {
  // PostgreSQL에 그래프 데이터 저장 (Neo4j 대신)
  const { rows } = await sql`SELECT * FROM nodes LIMIT 10`;
  return Response.json(rows);
}
```

**장점:**
- 모든 것이 Vercel
- 무료 티어

**단점:**
- Neo4j → PostgreSQL 마이그레이션 필요
- 그래프 쿼리 성능 낮음
- RAG 기능 없음

---

## 🎯 최종 추천

### 🥇 추천: Option 2 (Vercel + Railway)

**이유:**
1. 모든 기능 사용 가능 (RAG, FAISS, Neo4j)
2. 무료 티어로 충분
3. 배포 간단
4. 확장 가능

**배포 순서:**
1. Neo4j Aura 생성 (5분)
2. Railway에 백엔드 배포 (10분)
3. Vercel에 프론트엔드 배포 (5분)

→ [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) 참고

---

### 🥈 차선책: Option 1 (Vercel Only - 간단한 기능)

**조건:**
- RAG/검색 기능 불필요
- KG Explorer만 사용
- 간단한 API만 필요

**구현:**
Next.js API Routes에서 Neo4j Aura에 직접 연결

**제약:**
- FAISS 없음 → 검색 기능 제한
- Cold start 느림
- 매 요청마다 DB 연결

---

## 💡 Vercel Only로 구현하려면?

만약 정말 Vercel만 사용하고 싶다면:

### 1. Neo4j 연결 추가

```bash
npm install neo4j-driver
```

### 2. API Routes 작성

```typescript
// app/api/kg/graph-neo4j/route.ts
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  process.env.NEO4J_URI!,
  neo4j.auth.basic(process.env.NEO4J_USER!, process.env.NEO4J_PASSWORD!)
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') || '100';

  const session = driver.session();

  try {
    const result = await session.run(`
      MATCH (p:Paper)-[r1:REPORTS]->(f:Finding)-[r2:AFFECTS]->(ph:Phenotype)
      WITH p, f, ph, r1, r2
      LIMIT $limit
      RETURN collect(DISTINCT {
        id: p.pmcid,
        label: p.pmcid,
        type: 'Paper'
      }) + collect(DISTINCT {
        id: ph.obo_id,
        label: substring(ph.label, 0, 20) + '...',
        type: 'Phenotype'
      }) AS nodes
    `, { limit: parseInt(limit) });

    return Response.json(result.records[0].get('nodes'));
  } finally {
    await session.close();
  }
}
```

### 3. 환경 변수 설정

Vercel 프로젝트 → Settings → Environment Variables:

```bash
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
```

### 4. 프론트엔드 수정

```typescript
// app/kg-explorer/page.tsx
const loadGraph = async () => {
  // 기존: /api/kg/graph (FastAPI proxy)
  // 변경: /api/kg/graph-neo4j (Next.js API Route)
  const response = await fetch('/api/kg/graph-neo4j?limit=100');
  const data = await response.json();
  setGraphData(data);
};
```

### 5. 제거할 기능

- ❌ RAG 검색 (`/api/search`, `/api/answer`)
- ❌ Gap Finder (복잡한 집계)
- ❌ Consensus (통계 계산)

### 6. 유지 가능한 기능

- ✅ KG Explorer (그래프 시각화)
- ✅ Paper 상세 보기
- ✅ 간단한 필터링

---

## 🤔 어떤 방식을 선택할까요?

### A. 모든 기능 + 무료 → **Option 2 (Vercel + Railway)** 👍
- 배포 시간: 20분
- 비용: $0/월
- 기능: 100%

### B. 간단한 기능만 + 한 곳에서만 → **Option 1 (Vercel Only)**
- 배포 시간: 10분
- 비용: $0/월
- 기능: 50% (KG Explorer만)

---

## 🚀 다음 단계

### Option 2 선택 (추천)
→ [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) 따라하기

### Option 1 선택
→ 제가 Next.js API Routes로 변환해드릴까요?

어떤 방식으로 진행하시겠어요?
