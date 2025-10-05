# Space Bio KG - Web Development (Standalone)

This is a standalone version of the Space Biology Knowledge Graph web application that includes both frontend and backend components.

## Features

### 1. Main Hub
- AI-powered RAG search across 608 papers
- Browse papers with metadata
- Paper detail drawer with full content

### 2. Gap Finder
- Interactive heatmap showing research coverage
- Filter by organism, tissue, exposure type, and duration
- Identify under-researched areas

### 3. Knowledge Graph Explorer
- Interactive network graph using Cytoscape.js
- Explore relationships between papers, phenotypes, organisms, and tissues
- Click nodes to view details

### 4. Consensus & Conflict Analysis
- Forest plot visualization of effect sizes
- Statistical analysis of phenotype findings
- Identify outlier studies

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components based on Radix UI
- **Visualizations**: Cytoscape.js for knowledge graphs
- **State**: React hooks

## Prerequisites

- Python 3.10+
- Node.js 18+
- Neo4j database (running on localhost:7687)

## Setup

### 1. Install Python Dependencies

```bash
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Install Node.js Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Edit `.env.backend` to configure:
- Neo4j connection settings
- API settings
- Data paths

Edit `.env.local` to configure:
- FastAPI backend URL (default: http://localhost:8000)

## Running the Application

### Option 1: Use the Startup Script (Recommended)

```bash
./start.sh
```

This will start both:
- FastAPI backend on port 8000
- Next.js frontend on available port (check logs/nextjs.log)

Press `Ctrl+C` to stop all services.

### Option 2: Manual Start

**Terminal 1 - FastAPI Backend:**
```bash
source venv/bin/activate
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 - Next.js Frontend:**
```bash
npm run dev
```

## Directory Structure

```
web_dev/
├── api/                    # FastAPI backend
├── kg/                     # Knowledge graph utilities
├── data/                   # Data files (embeddings, FAISS index)
├── cache/                  # Cache files
├── venv/                   # Python virtual environment
├── app/                    # Next.js frontend application
├── components/             # React components
├── lib/                    # Utility libraries
├── logs/                   # Application logs
├── requirements.txt        # Python dependencies
├── .env.backend           # Backend environment variables
├── .env.local             # Frontend environment variables
├── start.sh               # Startup script
└── README.md              # This file
```

## API Endpoints

### FastAPI Backend (http://localhost:8000)

- `GET /health` - Health check
- `GET /search?q=<query>` - Semantic search
- `GET /answer?q=<question>` - Question answering with RAG
- `GET /papers/{pmcid}` - Get paper details
- `GET /kg/graph` - Get knowledge graph (overview)
- `GET /kg/graph?center_node=<pmcid>` - Get subgraph centered on a paper
- `GET /kg/gap` - Find research gaps
- `GET /kg/consensus` - Get consensus findings

### Next.js Frontend

- `/` - Home page
- `/architect` - Mission Planner
- `/kg-explorer` - Knowledge Graph Explorer
- `/api/kg/graph` - Proxy to FastAPI /kg/graph
- `/api/papers/[pmcid]` - Proxy to FastAPI /papers/{pmcid}

## Key Features

### Knowledge Graph Explorer
- Interactive graph visualization using Cytoscape.js
- Search papers by PMCID
- Direct Paper → Phenotype connections (Finding nodes hidden)
- Truncated labels (Phenotype: 20 chars, others: 40 chars)
- Hover tooltips for full labels
- Node size: 120px × 120px

### Mission Planner
- View consensus phenotype findings
- Priority-based display

## Logs

- `logs/fastapi.log` - FastAPI backend logs
- `logs/nextjs.log` - Next.js frontend logs

## Troubleshooting

### FastAPI won't start
- Check Neo4j is running: `docker ps | grep neo4j` or `systemctl status neo4j`
- Check port 8000 is available: `lsof -i :8000`
- Check logs: `cat logs/fastapi.log`

### Next.js won't start
- Check port 3000 is available: `lsof -i :3000`
- Check logs: `cat logs/nextjs.log`
- Try clearing cache: `rm -rf .next`

### Graph not loading
- Verify FastAPI is running: `curl http://localhost:8000/health`
- Check Neo4j connection in `.env.backend`
- Check browser console for errors

## Design System

### Colors
- **Background**: Deep charcoal (#0f172a)
- **Card**: Slate (#1e293b)
- **Primary**: Teal (#14b8a6)
- **Secondary**: Orange (#f97316)
- **Accent**: Cyan (#22d3ee)

### Typography
- **Font**: Geist Sans
- **Monospace**: Geist Mono

### Components
- Rounded corners: 0.75rem
- Card padding: 1.5rem
- Soft shadows with 10% opacity

## Documentation

See `/docs/front/` for detailed documentation:
- `IMPLEMENTATION_PLAN.md` - Complete implementation guide
- `DATA_SCHEMAS.md` - Data structure and API specifications
- `README.md` - Quick reference

## Development Notes

- All views are fully functional with realistic mock data
- Data structures match exact backend schema from task.md
- Dark mode is the default theme
- Responsive design for desktop and tablet
- Accessible with keyboard navigation
