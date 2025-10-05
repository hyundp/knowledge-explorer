# 🚀 배포 체크리스트

전체 시스템 배포를 위한 단계별 가이드입니다.

## 📋 준비물

- [ ] GitHub 계정
- [ ] Vercel 계정 (vercel.com)
- [ ] Railway 계정 (railway.app)
- [ ] Neo4j Aura 계정 (neo4j.com/aura)

---

## 1️⃣ 데이터베이스 배포 (Neo4j Aura)

### 시간: 5-10분

1. [ ] [Neo4j Aura](https://neo4j.com/cloud/aura/)에서 무료 데이터베이스 생성
2. [ ] 연결 정보 저장:
   ```
   URI: neo4j+s://xxxxx.databases.neo4j.io
   Username: neo4j
   Password: [생성된 비밀번호]
   ```
3. [ ] 로컬 데이터 마이그레이션:
   ```bash
   cd /home/dk/intern/1231/space-bio-kg/web_dev
   source venv/bin/activate
   python scripts/migrate_neo4j.py
   ```
4. [ ] Neo4j Browser에서 데이터 확인:
   ```cypher
   MATCH (n) RETURN count(n) as nodes
   MATCH ()-[r]->() RETURN count(r) as relationships
   ```

**예상 결과:**
- Nodes: 수천~수만 개
- Relationships: 수만~수십만 개

---

## 2️⃣ 백엔드 배포 (Railway)

### 시간: 10-15분

1. [ ] GitHub에 코드 푸시:
   ```bash
   cd /home/dk/intern/1231/space-bio-kg/web_dev
   git init
   git add .
   git commit -m "Ready for deployment"
   git remote add origin https://github.com/YOUR_USERNAME/space-bio-backend.git
   git push -u origin main
   ```

2. [ ] [Railway](https://railway.app/) 로그인 (GitHub 연동)

3. [ ] 새 프로젝트 생성:
   - "New Project" 클릭
   - "Deploy from GitHub repo" 선택
   - 저장소 선택

4. [ ] 환경 변수 설정 (Variables 탭):
   ```bash
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-aura-password
   API_HOST=0.0.0.0
   API_PORT=$PORT
   CORS_ORIGINS=*
   EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
   FAISS_INDEX_PATH=./data/faiss_index
   VECTOR_DIM=384
   DATA_DIR=./data
   CACHE_DIR=./cache
   LOG_LEVEL=INFO
   ```

5. [ ] 배포 완료 대기 (5-10분)

6. [ ] Railway에서 생성된 URL 복사:
   ```
   https://your-app.up.railway.app
   ```

7. [ ] Health check 테스트:
   ```bash
   curl https://your-app.up.railway.app/health
   ```

   **예상 응답:**
   ```json
   {
     "status": "healthy",
     "neo4j_connected": true,
     "rag_available": true
   }
   ```

8. [ ] API 테스트:
   ```bash
   curl https://your-app.up.railway.app/kg/graph?limit=5
   ```

---

## 3️⃣ 프론트엔드 배포 (Vercel)

### 시간: 5-10분

1. [ ] [Vercel](https://vercel.com/) 로그인 (GitHub 연동)

2. [ ] 새 프로젝트 Import:
   - "Import Project" 클릭
   - GitHub 저장소 선택 (동일 저장소 사용 가능)

3. [ ] 프로젝트 설정:
   - Framework: Next.js
   - Root Directory: `./` (web_dev가 루트인 경우)
   - Build Command: `npm run build`
   - Output Directory: `.next`

4. [ ] 환경 변수 추가:
   ```bash
   FASTAPI_URL=https://your-app.up.railway.app
   ```

5. [ ] Deploy 클릭

6. [ ] 배포 완료 대기 (2-5분)

7. [ ] Vercel에서 생성된 URL 확인:
   ```
   https://your-project.vercel.app
   ```

---

## 4️⃣ 전체 통합 테스트

### 필수 체크

1. [ ] **프론트엔드 접속**:
   - https://your-project.vercel.app 열기
   - 페이지가 정상 로드되는지 확인

2. [ ] **KG Explorer 테스트**:
   - `/kg-explorer` 페이지 접속
   - 그래프가 로드되는지 확인
   - 노드 클릭 시 상세정보 표시 확인

3. [ ] **검색 기능 테스트**:
   - PMCID 검색 (예: PMC5132293)
   - 검색 결과 그래프 표시 확인

4. [ ] **Mission Planner 테스트**:
   - `/architect` 페이지 접속
   - Consensus 데이터 로드 확인

5. [ ] **API 엔드포인트 확인**:
   ```bash
   # Health check
   curl https://your-app.up.railway.app/health

   # Papers
   curl https://your-app.up.railway.app/papers/PMC5132293

   # KG Graph
   curl https://your-app.up.railway.app/kg/graph?limit=10

   # Consensus
   curl https://your-app.up.railway.app/kg/consensus
   ```

---

## 5️⃣ CORS 업데이트 (중요!)

배포 후 CORS 설정을 업데이트해야 합니다.

1. [ ] Railway 환경 변수 수정:
   ```bash
   CORS_ORIGINS=https://your-project.vercel.app,https://your-app.up.railway.app
   ```

2. [ ] Railway 자동 재배포 대기

---

## 6️⃣ 커스텀 도메인 설정 (선택사항)

### Vercel 도메인

1. [ ] Vercel 프로젝트 → Settings → Domains
2. [ ] 도메인 추가 (예: your-app.com)
3. [ ] DNS 레코드 설정
4. [ ] SSL 인증서 자동 발급 확인

### Railway 도메인

1. [ ] Railway 프로젝트 → Settings → Domains
2. [ ] 커스텀 도메인 추가 (예: api.your-app.com)
3. [ ] DNS CNAME 레코드 설정

---

## 📊 배포 후 모니터링

### Railway (백엔드)

- [ ] Logs 탭에서 에러 확인
- [ ] Metrics에서 CPU/메모리 사용량 확인
- [ ] 응답 시간 모니터링

### Vercel (프론트엔드)

- [ ] Analytics에서 트래픽 확인
- [ ] Build logs에서 빌드 상태 확인
- [ ] Runtime logs에서 에러 확인

### Neo4j Aura (데이터베이스)

- [ ] Queries 탭에서 느린 쿼리 확인
- [ ] Metrics에서 메모리/디스크 사용량 확인

---

## 🐛 문제 해결

### 문제 1: Frontend can't connect to backend
**증상**: KG Explorer에 데이터가 로드되지 않음

**해결**:
```bash
# 1. FASTAPI_URL 확인
# Vercel → Settings → Environment Variables → FASTAPI_URL

# 2. CORS 확인
# Railway → Variables → CORS_ORIGINS에 Vercel URL 포함되어 있는지

# 3. Backend health check
curl https://your-app.up.railway.app/health
```

### 문제 2: Backend can't connect to Neo4j
**증상**: `/health` 응답에서 `"neo4j_connected": false`

**해결**:
```bash
# 1. Railway logs 확인
# "Neo4j connection failed" 메시지 찾기

# 2. NEO4J_URI 형식 확인
# neo4j+s://xxxxx (O)
# bolt://localhost:7687 (X - 로컬 주소)

# 3. Neo4j Aura 방화벽 확인
# Aura 콘솔에서 IP 화이트리스트 확인
```

### 문제 3: Build fails on Vercel
**증상**: Vercel 빌드가 실패함

**해결**:
```bash
# 1. 로컬에서 빌드 테스트
npm run build

# 2. next.config.ts 확인
# ignoreBuildErrors: true 설정 확인

# 3. Vercel logs에서 에러 메시지 확인
```

### 문제 4: Railway out of memory
**증상**: Railway pod crashes with OOM

**해결**:
```bash
# 1. data/ 폴더 크기 확인
du -sh data/

# 2. 큰 파일을 S3/GCS로 이동
# 3. Railway에서 더 큰 인스턴스 선택
```

---

## 💰 비용 모니터링

### 무료 티어 한도

- **Vercel**: 100GB 대역폭/월
- **Railway**: $5 크레딧/월 (500시간 또는 ~$20 사용량)
- **Neo4j Aura**: 50k nodes, 175k relationships

### 한도 초과 시

- Railway에서 이메일 알림
- Vercel에서 빌드 제한
- Neo4j Aura에서 쓰기 차단

---

## ✅ 완료!

모든 체크리스트를 완료했다면:

- ✅ **Frontend**: https://your-project.vercel.app
- ✅ **Backend**: https://your-app.up.railway.app
- ✅ **Database**: Neo4j Aura
- ✅ **전체 통합 테스트 완료**

축하합니다! 🎉

---

## 📚 추가 자료

- [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) - Vercel 상세 가이드
- [BACKEND_DEPLOYMENT.md](./BACKEND_DEPLOYMENT.md) - 백엔드 배포 상세 가이드
- [README.md](./README.md) - 프로젝트 전체 문서

---

## 🔄 업데이트 배포

코드 수정 후 배포:

```bash
# 1. 코드 수정
git add .
git commit -m "Update feature"
git push origin main

# 2. 자동 배포
# - Railway: 자동 감지 및 재배포
# - Vercel: 자동 감지 및 재배포

# 3. 배포 확인
# Railway/Vercel 대시보드에서 상태 확인
```
