# Vercel 정적 데이터 배포 가이드

Neo4j 데이터를 정적 JSON 파일로 추출하여 Vercel에 **프론트엔드만** 배포하는 방법입니다.

## 🎯 이 방법의 장점

✅ **백엔드 서버 불필요** - Railway, Neo4j Aura 등 불필요
✅ **완전 무료** - Vercel 무료 티어만 사용
✅ **빠른 배포** - 5분이면 완료
✅ **간단한 관리** - Git push만 하면 자동 배포

## ⚠️ 제약사항

❌ **실시간 데이터 불가** - 데이터 업데이트 시 재배포 필요
❌ **RAG/검색 기능 없음** - FAISS, LLM 기능 제거됨
❌ **제한된 API** - KG Explorer, Paper 조회만 가능

---

## 📋 배포 순서

### 1단계: Neo4j 데이터 추출 (최초 1회)

```bash
cd /home/dk/intern/1231/space-bio-kg/web_dev

# Python 환경 활성화
source venv/bin/activate

# Neo4j 데이터를 JSON으로 추출
python scripts/export_neo4j_to_json.py
```

**출력:**
```
✓ Exported 4,897 nodes, 4,630 relationships
✓ Exported 267 papers
✓ Exported 267 subgraphs

Output directory: public/data/neo4j
Files created:
  - graph_overview.json (1.2 MB)
  - papers.json (43 KB)
  - consensus.json (2 bytes)
  - statistics.json (214 bytes)
  - subgraphs/ (267 files, 2.2 MB)

Total: ~3.4 MB
```

### 2단계: 정적 데이터 확인

```bash
# 추출된 파일 확인
ls -lh public/data/neo4j/

# 브라우저에서 테스트
npm run dev
# http://localhost:3000/kg-explorer 접속하여 그래프 로드 확인
```

### 3단계: GitHub에 푸시

```bash
# 정적 데이터 포함하여 커밋
git add public/data/neo4j
git add lib/api/static.ts
git add app/kg-explorer/page.tsx
git commit -m "Add static Neo4j data for Vercel deployment"

# GitHub에 푸시
git remote add origin https://github.com/YOUR_USERNAME/space-bio-kg.git
git push -u origin main
```

### 4단계: Vercel 배포

1. [vercel.com](https://vercel.com) 로그인
2. "New Project" 클릭
3. GitHub 저장소 선택
4. 프로젝트 설정:
   - **Framework**: Next.js (자동 감지)
   - **Root Directory**: `./` (web_dev가 root인 경우)
   - **환경 변수**: 불필요!

5. "Deploy" 클릭

6. 배포 완료! (2-5분 소요)

**배포 URL**: `https://your-project.vercel.app`

---

## 🔧 사용 가능한 기능

### ✅ 작동하는 기능

- **KG Explorer** (`/kg-explorer`)
  - 전체 그래프 시각화
  - PMCID 검색 (예: PMC5132293)
  - 노드 클릭 상세 정보
  - 그래프 줌/팬

- **Paper 조회**
  - Paper 메타데이터 조회
  - 267개 논문 정보

- **통계**
  - 노드/엣지 카운트
  - 데이터베이스 통계

### ❌ 사용 불가능한 기능

- RAG 검색 (`/` 메인 페이지 검색)
- Question Answering
- Gap Finder (집계 필요)
- Consensus Analysis (복잡한 계산)

---

## 📊 파일 구조

```
web_dev/
├── public/
│   └── data/
│       └── neo4j/           # 정적 Neo4j 데이터
│           ├── graph_overview.json    # 전체 그래프 (1.2MB)
│           ├── papers.json             # 모든 논문 (43KB)
│           ├── consensus.json          # Consensus 데이터
│           ├── statistics.json         # 통계
│           └── subgraphs/              # 각 논문별 서브그래프
│               ├── PMC5132293.json
│               ├── PMC5026643.json
│               └── ... (267 files)
├── lib/
│   └── api/
│       ├── client.ts        # 기존 API 클라이언트 (백엔드용)
│       └── static.ts        # 새 정적 데이터 클라이언트 ✨
└── app/
    └── kg-explorer/
        └── page.tsx         # 정적 API 사용하도록 수정됨 ✨
```

---

## 🔄 데이터 업데이트 방법

Neo4j 데이터가 변경되었을 때:

```bash
# 1. 최신 데이터 추출
python scripts/export_neo4j_to_json.py

# 2. Git 커밋
git add public/data/neo4j
git commit -m "Update Neo4j data"

# 3. Push (자동으로 Vercel 재배포)
git push origin main
```

Vercel이 자동으로 감지하고 재배포합니다 (2-5분).

---

## 🚀 성능 최적화

### Vercel Edge Network

정적 파일은 Vercel의 CDN을 통해 전 세계에 분산되어:
- **빠른 로딩**: 사용자와 가까운 서버에서 제공
- **무제한 대역폭**: 무료 티어 100GB/월
- **자동 압축**: Gzip/Brotli 압축

### 캐싱

```typescript
// 브라우저 캐싱 설정 (vercel.json)
{
  "headers": [
    {
      "source": "/data/neo4j/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=3600, s-maxage=3600"
        }
      ]
    }
  ]
}
```

---

## 🐛 문제 해결

### 문제 1: 그래프가 로드되지 않음

**확인:**
```bash
# 1. 정적 파일이 존재하는지 확인
ls public/data/neo4j/graph_overview.json

# 2. 브라우저 콘솔에서 에러 확인
# F12 → Console 탭

# 3. Network 탭에서 파일 로드 확인
# /data/neo4j/graph_overview.json 응답 확인
```

**해결:**
- 파일이 없으면 `python scripts/export_neo4j_to_json.py` 실행
- Git에 커밋 안 했으면 `git add public/data/neo4j && git commit && git push`

### 문제 2: 빌드 실패

**에러:** "Module not found: Can't resolve '@/lib/api/static'"

**해결:**
```bash
# TypeScript 컴파일 확인
npm run build

# 에러 로그 확인
# lib/api/static.ts 파일 존재 여부 확인
```

### 문제 3: 데이터가 비어있음

**증상:** 그래프에 노드가 없음

**해결:**
```bash
# 1. JSON 파일 내용 확인
cat public/data/neo4j/graph_overview.json | jq '.nodes | length'

# 2. Neo4j 연결 확인
cypher-shell -u neo4j -p spacebio123 "MATCH (n) RETURN count(n)"

# 3. 데이터 재추출
python scripts/export_neo4j_to_json.py
```

---

## 💰 비용

### 무료 티어 한도

- **Vercel**: 100GB 대역폭/월
- **정적 파일 크기**: 3.4MB
- **예상 트래픽**: 100GB / 3.4MB = **29,000 페이지 뷰/월**

### 한도 초과 시

- Vercel Pro: $20/월 (1TB 대역폭)
- 또는 백엔드 분리 (Railway + Neo4j Aura)

---

## 🔀 백엔드로 전환하기

나중에 실시간 데이터가 필요하면:

### 1. Railway에 백엔드 배포

[BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md) 참고

### 2. API 클라이언트 전환

```typescript
// app/kg-explorer/page.tsx

// Before (static)
import staticAPI from "@/lib/api/static";
const apiClient = staticAPI;

// After (dynamic)
import apiClient from "@/lib/api/client";
```

### 3. 환경 변수 추가

Vercel → Settings → Environment Variables:
```bash
FASTAPI_URL=https://your-app.up.railway.app
```

### 4. 재배포

```bash
git add app/kg-explorer/page.tsx
git commit -m "Switch to dynamic API"
git push origin main
```

---

## ✅ 배포 체크리스트

- [ ] Neo4j 로컬 데이터베이스 실행 중
- [ ] `python scripts/export_neo4j_to_json.py` 성공
- [ ] `public/data/neo4j/` 폴더 생성 확인
- [ ] `npm run dev`로 로컬 테스트 완료
- [ ] GitHub에 푸시 완료
- [ ] Vercel 프로젝트 생성
- [ ] 배포 성공
- [ ] `https://your-project.vercel.app/kg-explorer` 접속 확인
- [ ] PMCID 검색 테스트 (예: PMC5132293)

---

## 📚 다음 단계

배포 완료 후:

1. **커스텀 도메인** 연결 (선택)
   - Vercel → Settings → Domains
   - your-app.com 추가

2. **Analytics** 확인
   - Vercel 대시보드에서 트래픽 모니터링

3. **데이터 정기 업데이트**
   - Cron job 설정하여 자동 업데이트
   - GitHub Actions로 자동화 가능

---

## 📞 지원

- Vercel 문서: https://vercel.com/docs
- Next.js 문서: https://nextjs.org/docs
- GitHub Issues: 문제 발생 시 이슈 등록

---

## 🎉 완료!

축하합니다! Space Bio KG가 Vercel에 배포되었습니다.

**배포 URL**: https://your-project.vercel.app
**KG Explorer**: https://your-project.vercel.app/kg-explorer

Git push만 하면 자동으로 업데이트됩니다! 🚀
