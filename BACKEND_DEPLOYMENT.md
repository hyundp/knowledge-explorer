# Backend & Database Deployment Guide

Complete guide for deploying FastAPI backend and Neo4j database.

## Architecture Overview

```
┌─────────────────────┐
│   Vercel            │ ← Frontend (Next.js)
│   (Frontend)        │
└──────────┬──────────┘
           │
           │ HTTPS
           ↓
┌─────────────────────┐
│   Railway           │ ← Backend (FastAPI)
│   (Backend API)     │
└──────────┬──────────┘
           │
           │ Bolt Protocol
           ↓
┌─────────────────────┐
│   Neo4j Aura        │ ← Database (Knowledge Graph)
│   (Database)        │
└─────────────────────┘
```

---

## Part 1: Neo4j Database 배포 (먼저 해야 함)

### Option A: Neo4j Aura (추천 - 무료)

#### 1. 계정 생성
1. [https://neo4j.com/cloud/aura/](https://neo4j.com/cloud/aura/) 접속
2. "Start Free" 클릭
3. Google/GitHub 계정으로 가입

#### 2. 데이터베이스 생성
1. "Create a database" 클릭
2. **Free tier** 선택
3. 설정:
   - Name: `space-bio-kg`
   - Region: 가장 가까운 지역 선택 (Asia Pacific - Singapore 추천)
4. "Create database" 클릭

#### 3. 인증 정보 저장
데이터베이스 생성 후 **중요한 정보가 1회만 표시**됩니다:
```
Connection URI: neo4j+s://xxxxx.databases.neo4j.io
Username: neo4j
Password: [자동생성된 비밀번호]
```

⚠️ **반드시 메모장에 저장하세요!** 다시 볼 수 없습니다.

#### 4. 데이터 마이그레이션

로컬 Neo4j에서 Aura로 데이터를 옮기는 방법:

**방법 1: CSV 내보내기/가져오기**

```bash
# 로컬에서 데이터 내보내기
cypher-shell -u neo4j -p spacebio123 "
CALL apoc.export.csv.all('export.csv', {})
"

# Aura에서 가져오기 (Neo4j Browser에서)
# https://xxxxx.databases.neo4j.io/browser 접속
LOAD CSV WITH HEADERS FROM 'file:///export.csv' AS row
CREATE (n)
SET n = row
```

**방법 2: Neo4j Desktop Dump/Restore (추천)**

```bash
# 1. 로컬에서 덤프 생성
neo4j-admin dump --database=neo4j --to=/tmp/space-bio-kg.dump

# 2. Aura 콘솔에서 "Import" 기능 사용
# Database 페이지 → Actions → Import Database
# dump 파일 업로드
```

**방법 3: Python 스크립트로 복사**

```bash
cd /home/dk/intern/1231/space-bio-kg/web_dev
python3 scripts/migrate_neo4j.py
```

---

## Part 2: FastAPI Backend 배포 (Railway)

### 1. Railway 계정 생성

1. [https://railway.app/](https://railway.app/) 접속
2. GitHub 계정으로 로그인
3. 무료 크레딧 $5 받기

### 2. 새 프로젝트 생성

#### 옵션 A: GitHub 연동 (추천)

```bash
# web_dev를 GitHub에 푸시
cd /home/dk/intern/1231/space-bio-kg/web_dev
git init
git add .
git commit -m "Backend deployment ready"
git remote add origin https://github.com/YOUR_USERNAME/space-bio-kg-backend.git
git push -u origin main
```

Railway에서:
1. "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. `space-bio-kg-backend` 저장소 선택
4. Railway가 자동으로 Dockerfile 감지

#### 옵션 B: CLI 사용

```bash
# Railway CLI 설치
npm i -g @railway/cli

# 로그인
railway login

# 프로젝트 생성 및 배포
cd /home/dk/intern/1231/space-bio-kg/web_dev
railway init
railway up
```

### 3. 환경 변수 설정

Railway 프로젝트 대시보드에서 **Variables** 탭:

```bash
# Neo4j 연결 (Aura에서 받은 정보)
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-aura-password

# API 설정
API_HOST=0.0.0.0
API_PORT=$PORT
CORS_ORIGINS=https://your-vercel-app.vercel.app

# 임베딩 모델
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
FAISS_INDEX_PATH=./data/faiss_index
VECTOR_DIM=384

# 데이터 경로
DATA_DIR=./data
CACHE_DIR=./cache

# 로깅
LOG_LEVEL=INFO
```

### 4. 배포 및 확인

1. Railway가 자동으로 빌드 시작
2. 빌드 완료 후 URL 생성: `https://your-app.up.railway.app`
3. Health check: `https://your-app.up.railway.app/health`

예상 응답:
```json
{
  "status": "healthy",
  "neo4j_connected": true,
  "rag_available": true
}
```

### 5. 문제 해결

**Neo4j 연결 실패:**
```bash
# Railway Logs에서 확인
# "Neo4j connection failed" 메시지 찾기

# 해결방법:
# 1. NEO4J_URI가 neo4j+s:// 형식인지 확인 (bolt:// 아님)
# 2. Aura 방화벽 설정 확인
# 3. 비밀번호에 특수문자 있으면 URL 인코딩
```

**메모리 부족:**
```bash
# data/ 폴더가 너무 큰 경우
# Railway 설정에서 더 큰 플랜 선택
# 또는 FAISS 인덱스를 S3/GCS에 저장
```

---

## Part 3: 전체 연동

### 1. Vercel 환경변수 업데이트

Vercel 프로젝트 → Settings → Environment Variables:

```bash
FASTAPI_URL=https://your-app.up.railway.app
```

재배포:
```bash
# Vercel에서 자동 재배포되거나
git push origin main
```

### 2. 연동 테스트

```bash
# 1. Backend health check
curl https://your-app.up.railway.app/health

# 2. Neo4j 데이터 확인
curl https://your-app.up.railway.app/kg/graph?limit=10

# 3. Frontend에서 테스트
# https://your-vercel-app.vercel.app/kg-explorer 접속
# 그래프가 로드되는지 확인
```

---

## 대안: 다른 배포 옵션

### Option 2: Render.com

1. [render.com](https://render.com) 가입
2. New Web Service
3. GitHub 연동
4. 설정:
   ```
   Name: space-bio-kg-api
   Environment: Docker
   Instance Type: Free
   ```
5. 환경변수 동일하게 설정
6. Deploy

### Option 3: Google Cloud Run

```bash
# 1. Google Cloud SDK 설치
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 2. Docker 이미지 빌드
cd /home/dk/intern/1231/space-bio-kg/web_dev
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/space-bio-api

# 3. Cloud Run 배포
gcloud run deploy space-bio-api \
  --image gcr.io/YOUR_PROJECT_ID/space-bio-api \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars NEO4J_URI=neo4j+s://...,NEO4J_USER=neo4j,NEO4J_PASSWORD=...
```

### Option 4: AWS Elastic Beanstalk

```bash
# 1. EB CLI 설치
pip install awsebcli

# 2. 초기화
cd /home/dk/intern/1231/space-bio-kg/web_dev
eb init -p docker space-bio-api

# 3. 환경 생성
eb create space-bio-api-env

# 4. 환경변수 설정
eb setenv NEO4J_URI=neo4j+s://... NEO4J_USER=neo4j NEO4J_PASSWORD=...

# 5. 배포
eb deploy
```

---

## 비용 예상

### 무료 티어로 시작:
- **Neo4j Aura Free**: $0 (50k nodes, 175k relationships)
- **Railway**: $0 (500시간/월, $5 크레딧)
- **Vercel**: $0 (100GB 대역폭/월)

**총: $0/월**

### 프로덕션 환경:
- **Neo4j Aura Professional**: $65/월
- **Railway Pro**: $20/월
- **Vercel Pro**: $20/월

**총: $105/월**

---

## 모니터링 및 유지보수

### Railway 로그 확인
```bash
railway logs
```

### Neo4j Aura 모니터링
- Aura 콘솔에서 쿼리 성능, 메모리 사용량 확인

### Vercel 분석
- Vercel 대시보드에서 트래픽, 빌드 상태 확인

---

## 문제 해결 체크리스트

- [ ] Neo4j Aura 데이터베이스 생성 완료
- [ ] 로컬 Neo4j 데이터를 Aura로 마이그레이션
- [ ] Railway 프로젝트 생성 및 배포
- [ ] Railway 환경변수 설정 (NEO4J_URI, NEO4J_PASSWORD 등)
- [ ] Backend health check 성공: `/health`
- [ ] Backend 데이터 확인: `/kg/graph`
- [ ] Vercel에 FASTAPI_URL 환경변수 추가
- [ ] Frontend에서 KG Explorer 테스트
- [ ] 모든 API 엔드포인트 작동 확인

---

## 다음 단계

배포가 완료되면:

1. **커스텀 도메인 연결** (선택사항)
   - Vercel: your-app.com
   - Railway: api.your-app.com

2. **HTTPS 인증서**
   - Vercel/Railway 모두 자동 제공

3. **CI/CD 파이프라인**
   - GitHub Actions로 자동 배포 설정

4. **성능 최적화**
   - FAISS 인덱스 캐싱
   - Neo4j 쿼리 최적화
