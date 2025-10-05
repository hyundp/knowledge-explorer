# Space Biology Knowledge Graph API

FastAPI service providing endpoints for searching and querying the space biology knowledge graph.

## Features

- **Health Check**: Service status and connectivity monitoring
- **Semantic Search**: RAG-powered search over paper paragraphs
- **Question Answering**: LLM-powered answers with citations
- **Paper Details**: Get paper metadata and findings by PMCID
- **Gap Analysis**: Knowledge gap discovery across organism × tissue × exposure × duration
- **Consensus Analysis**: Agreement/disagreement analysis for phenotypes
- **Knowledge Graph**: Interactive graph data for visualization

## Quick Start

### 1. Start the API

Using Docker:
```bash
cd ops
docker-compose up api
```

Or locally:
```bash
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Access Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

### 3. Test Endpoints

```bash
python -m api.test_api
```

## Endpoints

### GET /health

Health check and service status.

**Response:**
```json
{
  "status": "healthy",
  "rag_index_loaded": true,
  "num_chunks": 15234,
  "neo4j_status": "connected",
  "neo4j_node_count": 45678
}
```

### POST /search

Semantic search over paper paragraphs.

**Request:**
```json
{
  "q": "microgravity bone loss rodents",
  "top_k": 5
}
```

**Response:**
```json
{
  "query": "microgravity bone loss rodents",
  "results": [
    {
      "text": "Results showed significant bone density loss...",
      "pmcid": "PMC1234567",
      "section": "results",
      "score": 0.89
    }
  ],
  "num_results": 5
}
```

### POST /answer

Question answering with RAG.

**Request:**
```json
{
  "q": "What are the effects of microgravity on bone density?",
  "top_k": 5,
  "model": "gpt-4"
}
```

**Response:**
```json
{
  "question": "What are the effects of microgravity on bone density?",
  "answer": "Based on 12 studies, microgravity exposure leads to...",
  "sources": [...],
  "num_sources": 5
}
```

### GET /papers/{pmcid}

Get paper details by PMCID.

**Example:** `GET /papers/PMC1234567`

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

### GET /kg/gap

Knowledge gap analysis.

**Parameters:**
- `organism` (optional): Filter by organism label
- `tissue` (optional): Filter by tissue label
- `exposure` (optional): Filter by exposure type
- `duration` (optional): Filter by duration

**Example:** `GET /kg/gap?organism=mouse&exposure=microgravity`

**Response:**
```json
{
  "filters": {
    "organism": "mouse",
    "tissue": null,
    "exposure": "microgravity",
    "duration": null
  },
  "gaps": [
    {
      "organism": "mouse",
      "tissue": "bone",
      "exposure": "microgravity",
      "duration": "30 days",
      "study_count": 45,
      "avg_year": 2018
    }
  ],
  "num_combinations": 156
}
```

### GET /kg/consensus

Consensus/disagreement analysis for a phenotype.

**Parameters:**
- `phenotype` (required): Phenotype label to analyze

**Example:** `GET /kg/consensus?phenotype=bone%20loss`

**Response:**
```json
{
  "phenotype": "bone loss",
  "total_findings": 89,
  "unique_papers": 34,
  "consensus_score": 0.876,
  "dominant_direction": "increased",
  "findings_by_direction": {
    "increased": {
      "count": 78,
      "avg_evidence": 0.82,
      "avg_magnitude": 23.5,
      "papers": ["PMC123", "PMC456"],
      "organisms": ["mouse", "rat"],
      "tissues": ["bone", "femur"]
    },
    "decreased": {
      "count": 11,
      "avg_evidence": 0.65,
      "papers": ["PMC789"]
    }
  },
  "interpretation": "Strong consensus"
}
```

### GET /kg/graph

Get knowledge graph data for visualization.

**Parameters:**
- `center_node` (optional): Center node ID (PMCID, OBO ID, or label)
- `depth` (optional, default=2): Graph traversal depth (1-3)
- `limit` (optional, default=100): Maximum nodes (1-500)

**Example:** `GET /kg/graph?center_node=PMC1234567&depth=2&limit=50`

**Response:**
```json
{
  "nodes": [
    {
      "id": "PMC1234567",
      "label": "Effects of Microgravity",
      "type": "Paper",
      "properties": {...}
    },
    {
      "id": "NCBITaxon:10090",
      "label": "Mus musculus",
      "type": "Organism",
      "properties": {...}
    }
  ],
  "edges": [
    {
      "source": "PMC1234567",
      "target": "exp_123",
      "type": "DESCRIBES",
      "properties": {...}
    }
  ],
  "num_nodes": 23,
  "num_edges": 34
}
```

## Environment Variables

Create a `.env` file with:

```bash
# Neo4j connection
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=spacebio123

# RAG index path
RAG_INDEX_PATH=data/rag/index.faiss

# OpenAI (for RAG answers)
OPENAI_API_KEY=your-key-here
```

## Development

### Run with auto-reload:
```bash
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

### Run tests:
```bash
pytest api/tests/
```

### Check API health:
```bash
curl http://localhost:8000/health
```

## Architecture

```
api/
├── main.py           # FastAPI app with all endpoints
├── rag_index.py      # RAG indexing and search
├── test_api.py       # API testing script
└── README.md         # This file
```

## Dependencies

- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `neo4j` - Graph database driver
- `faiss-cpu` - Vector similarity search
- `sentence-transformers` - Embeddings
- `openai` or `anthropic` - LLM for RAG answers

## Error Handling

All endpoints return standard HTTP status codes:
- `200` - Success
- `404` - Resource not found
- `503` - Service unavailable (Neo4j/RAG not connected)
- `500` - Internal server error

## CORS

CORS is enabled for all origins in development. Configure appropriately for production:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Performance

- Neo4j queries are optimized with indexes and constraints
- FAISS provides sub-second similarity search
- Graph queries use LIMIT clauses to prevent large result sets
- Connection pooling for Neo4j driver

## Future Enhancements

- [ ] API key authentication
- [ ] Rate limiting
- [ ] Caching with Redis
- [ ] Async Neo4j operations
- [ ] GraphQL endpoint
- [ ] WebSocket support for real-time updates
- [ ] Export endpoints (CSV, JSON-LD, TTL)
