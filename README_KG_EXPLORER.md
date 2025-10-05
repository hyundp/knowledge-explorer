# KG Explorer - Real Data Integration

KG Explorer 페이지가 mock 데이터에서 실제 Neo4j 데이터를 사용하도록 업데이트되었습니다.

## 변경사항

### 1. 새로운 파일

- **`app/api/kg/graph/route.ts`** - FastAPI의 `/kg/graph` 엔드포인트를 프록시하는 Next.js API route
- **`app/api/papers/[pmcid]/route.ts`** - FastAPI의 `/papers/{pmcid}` 엔드포인트를 프록시
- **`lib/api/client.ts`** - 실제 API를 호출하는 새로운 API 클라이언트
- **`.env.local`** - FastAPI 백엔드 URL 설정

### 2. 수정된 파일

- **`app/kg-explorer/page.tsx`** - mock API 대신 실제 API 클라이언트 사용
  - 로딩 상태 추가
  - 에러 핸들링 추가
  - 새로고침 버튼 추가

## 사용 방법

### 1. FastAPI 백엔드 시작

먼저 FastAPI 서버가 실행되고 있어야 합니다:

```bash
cd /home/dk/intern/1231/space-bio-kg

# FastAPI 서버 시작
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Neo4j 확인

Neo4j가 실행 중이고 데이터가 로드되어 있는지 확인:

```bash
# Neo4j가 실행 중인지 확인
curl http://localhost:7474

# FastAPI health 체크
curl http://localhost:8000/health

# 샘플 응답:
# {
#   "status": "healthy",
#   "rag_index_loaded": true,
#   "num_chunks": 1234,
#   "neo4j_status": "connected",
#   "neo4j_node_count": 5678
# }
```

### 3. 데이터가 없는 경우 로드

Neo4j에 데이터가 없다면 로드:

```bash
# Findings 로드
python -m kg.load_to_neo4j \
  --uri bolt://localhost:7687 \
  --user neo4j \
  --password spacebio123 \
  --input data/jsonl/findings.jsonl

# External entities 로드 (선택사항)
python -m kg.load_external_to_neo4j \
  --uri bolt://localhost:7687 \
  --user neo4j \
  --password spacebio123 \
  --input data/external/entities.ndjson
```

### 4. Next.js 개발 서버 시작

```bash
cd /home/dk/intern/1231/space-bio-kg/web_dev

# 개발 서버 시작
npm run dev
```

### 5. 브라우저에서 확인

http://localhost:3000/kg-explorer 로 접속

## API 플로우

```
Browser (KG Explorer)
    ↓
Next.js API Route (/api/kg/graph)
    ↓
FastAPI Backend (localhost:8000/kg/graph)
    ↓
Neo4j Database (localhost:7687)
```

## 환경 변수

`.env.local` 파일:

```bash
# FastAPI 백엔드 URL
FASTAPI_URL=http://localhost:8000

# Neo4j 연결 정보 (FastAPI에서 사용)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=spacebio123
```

## API 엔드포인트

### GET /api/kg/graph

Knowledge graph 데이터 조회

**Query Parameters:**
- `center_node` (optional) - 중심 노드 ID
- `depth` (optional) - 그래프 탐색 깊이 (기본값: 2)
- `limit` (optional) - 최대 노드 수 (기본값: 100)

**Example:**
```bash
curl "http://localhost:3000/api/kg/graph?limit=50&depth=2"
```

**Response:**
```json
{
  "nodes": [
    {
      "id": "PMC1234567",
      "label": "Effects of Microgravity",
      "type": "Paper",
      "properties": {...}
    }
  ],
  "edges": [
    {
      "source": "PMC1234567",
      "target": "NCBITaxon:10090",
      "type": "DESCRIBES",
      "properties": {...}
    }
  ]
}
```

### GET /api/papers/[pmcid]

특정 논문의 상세 정보 조회

**Example:**
```bash
curl "http://localhost:3000/api/papers/PMC1234567"
```

**Response:**
```json
{
  "pmcid": "PMC1234567",
  "title": "Effects of Microgravity on Bone Density",
  "doi": "10.1234/example",
  "year": 2020,
  "journal": "Space Biology Journal",
  "authors": ["Smith J", "Jones A"],
  "findings": [...],
  "num_findings": 8
}
```

## 트러블슈팅

### 1. "Neo4j not connected" 에러

**원인:** Neo4j가 실행되지 않거나 FastAPI가 Neo4j에 연결할 수 없음

**해결:**
```bash
# Neo4j 상태 확인
docker ps | grep neo4j

# 또는 직접 연결 테스트
cypher-shell -a bolt://localhost:7687 -u neo4j -p spacebio123
```

### 2. "Failed to fetch knowledge graph" 에러

**원인:** FastAPI 서버가 실행되지 않음

**해결:**
```bash
# FastAPI 서버 시작
cd /home/dk/intern/1231/space-bio-kg
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. 빈 그래프가 표시됨

**원인:** Neo4j에 데이터가 없음

**해결:**
```bash
# Neo4j에 데이터 로드
python -m kg.load_to_neo4j \
  --uri bolt://localhost:7687 \
  --user neo4j \
  --password spacebio123 \
  --input data/jsonl/findings.jsonl
```

### 4. CORS 에러

**원인:** FastAPI CORS 설정 문제

**해결:** `api/main.py`에서 CORS 설정 확인:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 개발 모드에서 Mock 데이터 사용

실제 백엔드 없이 개발하려면 원래 mock API 사용:

```typescript
// app/kg-explorer/page.tsx
import api from "@/lib/api/mock";  // mock 데이터 사용
// import apiClient from "@/lib/api/client";  // 실제 API 사용
```

## 성능 최적화

### 1. 그래프 크기 제한

대규모 그래프는 렌더링이 느릴 수 있으므로 `limit` 파라미터 조정:

```typescript
const data = await apiClient.getKnowledgeGraph({
  limit: 50,  // 작게 시작
  depth: 1,   // 깊이 제한
});
```

### 2. 캐싱

자주 조회되는 데이터는 캐싱:

```typescript
// Next.js API route에서
export const revalidate = 60; // 60초 캐싱
```

### 3. 점진적 로딩

초기에는 작은 그래프를 로드하고, 노드 클릭 시 확장:

```typescript
const handleNodeClick = async (node: KGNode) => {
  // 노드 주변 이웃 로드
  const neighbors = await apiClient.getNodeNeighbors(node.id);
  // 기존 그래프에 병합
  mergeGraphs(graphData, neighbors);
};
```

## 다음 단계

- [ ] Gap Finder도 실제 API로 전환
- [ ] Consensus Analysis도 실제 API로 전환
- [ ] Search 기능 RAG와 연동
- [ ] 그래프 필터링 기능 추가
- [ ] 노드 타입별 색상/아이콘 커스터마이징
- [ ] 그래프 레이아웃 알고리즘 개선
