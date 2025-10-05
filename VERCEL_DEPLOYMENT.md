# Vercel Deployment Guide

This guide explains how to deploy the Space Bio KG web application to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your `web_dev` folder to a GitHub repository
3. **FastAPI Backend**: Deploy your FastAPI backend separately (see Backend Deployment section)

## Frontend Deployment (Vercel)

### Step 1: Prepare Repository

```bash
# In your web_dev directory
git init
git add .
git commit -m "Initial commit for Vercel deployment"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Import Project to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your GitHub repository
4. Configure project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (if web_dev is the repository root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### Step 3: Configure Environment Variables

In Vercel project settings, add:

```
FASTAPI_URL=https://your-fastapi-backend.com
```

Replace with your actual FastAPI backend URL (see Backend Deployment section).

### Step 4: Deploy

Click "Deploy" and wait for the build to complete.

Your frontend will be available at: `https://your-project.vercel.app`

## Backend Deployment Options

Since Vercel primarily supports serverless functions and Next.js, you need to deploy the FastAPI backend separately. Here are recommended options:

### Option 1: Railway.app (Recommended - Easy)

1. Sign up at [railway.app](https://railway.app)
2. Create new project
3. Deploy from GitHub:
   - Connect your repository
   - Set root directory to `web_dev/`
   - Railway will detect Python and use `requirements.txt`
4. Add environment variables from `.env.backend`
5. Add start command:
   ```
   python -m uvicorn api.main:app --host 0.0.0.0 --port $PORT
   ```
6. Railway will provide a URL like: `https://your-app.up.railway.app`

### Option 2: Render.com

1. Sign up at [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repository
4. Configure:
   - **Root Directory**: `web_dev/`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables from `.env.backend`
6. Deploy

### Option 3: DigitalOcean App Platform

1. Sign up at [digitalocean.com](https://www.digitalocean.com)
2. Create App from GitHub
3. Configure Python app:
   - **Source Directory**: `web_dev/`
   - **Build Command**: `pip install -r requirements.txt`
   - **Run Command**: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables
5. Deploy

### Option 4: Google Cloud Run

1. Install Google Cloud SDK
2. Build Docker image:
   ```dockerfile
   FROM python:3.10-slim
   WORKDIR /app
   COPY web_dev/requirements.txt .
   RUN pip install -r requirements.txt
   COPY web_dev/ .
   CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8080"]
   ```
3. Deploy to Cloud Run:
   ```bash
   gcloud run deploy space-bio-api --source .
   ```

## Database Deployment (Neo4j)

Your backend requires Neo4j. Options:

### Option 1: Neo4j Aura (Recommended)

1. Sign up at [neo4j.com/aura](https://neo4j.com/aura)
2. Create free database
3. Note connection URI, username, password
4. Update backend environment variables:
   ```
   NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your-password
   ```

### Option 2: Self-hosted Neo4j

Deploy Neo4j on the same platform as your backend (Railway, Render, etc.)

## Full Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Vercel (Frontend)                                  │
│  - Next.js app                                      │
│  - https://your-project.vercel.app                  │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ FASTAPI_URL
                   ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Railway/Render (Backend)                           │
│  - FastAPI app                                      │
│  - https://your-backend.railway.app                 │
│                                                     │
└──────────────────┬──────────────────────────────────┘
                   │
                   │ NEO4J_URI
                   ↓
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Neo4j Aura (Database)                              │
│  - Knowledge graph data                             │
│  - neo4j+s://xxxxx.databases.neo4j.io               │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Environment Variables Summary

### Frontend (Vercel)
```
FASTAPI_URL=https://your-backend-url.com
```

### Backend (Railway/Render/etc)
```
NEO4J_URI=neo4j+s://xxxxx.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
API_HOST=0.0.0.0
API_PORT=$PORT
CORS_ORIGINS=https://your-project.vercel.app,https://your-backend-url.com
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
FAISS_INDEX_PATH=./data/faiss_index
```

## Post-Deployment Checklist

- [ ] Frontend deployed to Vercel
- [ ] Backend deployed to Railway/Render/etc
- [ ] Neo4j database created and populated
- [ ] Environment variables configured
- [ ] CORS origins updated
- [ ] Test health endpoint: `https://your-backend.com/health`
- [ ] Test frontend: `https://your-project.vercel.app`
- [ ] Test KG Explorer with search
- [ ] Verify all API endpoints work

## Troubleshooting

### Frontend can't connect to backend

1. Check `FASTAPI_URL` environment variable in Vercel
2. Verify backend is running: `curl https://your-backend.com/health`
3. Check CORS settings in backend `.env`

### Backend database connection fails

1. Verify Neo4j Aura credentials
2. Check `NEO4J_URI` format: `neo4j+s://` (not `bolt://`)
3. Test connection manually

### Build fails on Vercel

1. Check build logs
2. Verify `package.json` scripts are correct
3. Ensure `next.config.ts` has `ignoreBuildErrors: true` (for now)

## Local Development

To test locally before deploying:

```bash
# Terminal 1 - Backend
source venv/bin/activate
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000

# Terminal 2 - Frontend
npm run dev
```

## Continuous Deployment

Vercel automatically redeploys when you push to your main branch:

```bash
git add .
git commit -m "Update feature"
git push origin main
```

Your site will rebuild and deploy automatically.

## Cost Estimate

- **Vercel**: Free tier (100GB bandwidth/month)
- **Railway**: Free tier ($5 credit/month) or $5/month
- **Neo4j Aura**: Free tier (50k nodes, 175k relationships)

Total: **$0-5/month** for small projects

## Support

- Vercel Docs: https://vercel.com/docs
- Railway Docs: https://docs.railway.app
- Neo4j Aura: https://neo4j.com/docs/aura
