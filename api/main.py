"""
FastAPI service for Space Biology Knowledge Graph.

Provides endpoints for:
- Health check
- Semantic search over papers
- Question answering with RAG
- Knowledge graph queries
"""

import os
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

try:
    from api.rag_index import RAGIndex
except ImportError:
    RAGIndex = None

try:
    from neo4j import GraphDatabase
except ImportError:
    GraphDatabase = None

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Space Biology Knowledge Graph API",
    description="API for searching and querying space biology research papers",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global RAG index
rag_index: Optional[RAGIndex] = None

# Global Neo4j driver
neo4j_driver = None


# Helper function to get Neo4j session
def get_neo4j_session():
    """Get Neo4j session."""
    if neo4j_driver is None:
        raise HTTPException(status_code=503, detail="Neo4j not connected")
    return neo4j_driver.session()


# Request/Response models
class SearchRequest(BaseModel):
    q: str
    top_k: int = 5


class AnswerRequest(BaseModel):
    q: str
    top_k: int = 5
    model: str = "gpt-4"


class SearchResponse(BaseModel):
    query: str
    results: List[Dict[str, Any]]
    num_results: int


class AnswerResponse(BaseModel):
    question: str
    answer: str
    sources: List[Dict[str, Any]]
    num_sources: int


@app.on_event("startup")
async def startup_event():
    """Initialize RAG index and Neo4j connection on startup."""
    global rag_index, neo4j_driver

    # Initialize RAG index
    index_path = Path(os.getenv("RAG_INDEX_PATH", "data/rag/index.faiss"))

    if RAGIndex is None:
        logger.warning("RAGIndex not available. Search endpoints will not work.")
    else:
        if index_path.exists():
            try:
                logger.info(f"Loading RAG index from {index_path}")
                rag_index = RAGIndex(index_path=index_path)
                logger.info(f"RAG index loaded with {len(rag_index.chunks)} chunks")
            except Exception as e:
                logger.error(f"Failed to load RAG index: {e}")
                rag_index = None
        else:
            logger.warning(f"RAG index not found at {index_path}. Build it first with: python -m api.rag_index")

    # Initialize Neo4j connection
    if GraphDatabase is None:
        logger.warning("Neo4j driver not available. Graph endpoints will not work.")
    else:
        neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        neo4j_password = os.getenv("NEO4J_PASSWORD", "spacebio123")

        try:
            logger.info(f"Connecting to Neo4j at {neo4j_uri}")
            neo4j_driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))
            # Test connection
            with neo4j_driver.session() as session:
                result = session.run("RETURN 1 AS test")
                result.single()
            logger.info("Neo4j connection successful")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            neo4j_driver = None


@app.on_event("shutdown")
async def shutdown_event():
    """Close Neo4j connection on shutdown."""
    global neo4j_driver
    if neo4j_driver is not None:
        try:
            neo4j_driver.close()
            logger.info("Neo4j connection closed")
        except Exception as e:
            logger.error(f"Error closing Neo4j connection: {e}")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Space Biology Knowledge Graph API",
        "version": "1.0.0",
        "endpoints": {
            "health": "GET /health - Health check and status",
            "search": "POST /search - Semantic search over papers",
            "answer": "POST /answer - Question answering with RAG",
            "papers": "GET /papers/{pmcid} - Get paper details",
            "gap": "GET /kg/gap - Knowledge gap analysis",
            "consensus": "GET /kg/consensus?phenotype={name} - Consensus analysis",
            "graph": "GET /kg/graph - Knowledge graph visualization"
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    neo4j_status = "disconnected"
    neo4j_node_count = 0

    if neo4j_driver is not None:
        try:
            with neo4j_driver.session() as session:
                result = session.run("MATCH (n) RETURN count(n) AS count")
                neo4j_node_count = result.single()["count"]
                neo4j_status = "connected"
        except Exception as e:
            neo4j_status = f"error: {str(e)}"

    return {
        "status": "healthy",
        "rag_index_loaded": rag_index is not None,
        "num_chunks": len(rag_index.chunks) if rag_index else 0,
        "neo4j_status": neo4j_status,
        "neo4j_node_count": neo4j_node_count
    }


@app.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """
    Semantic search over paper paragraphs.

    Returns top-k most similar chunks with metadata.
    """
    if rag_index is None:
        raise HTTPException(status_code=503, detail="RAG index not available")

    try:
        results = rag_index.search(request.q, top_k=request.top_k)

        return SearchResponse(
            query=request.q,
            results=[r.to_dict() for r in results],
            num_results=len(results)
        )

    except Exception as e:
        logger.error(f"Search error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/answer", response_model=AnswerResponse)
async def answer(request: AnswerRequest):
    """
    Answer a question using RAG.

    Retrieves relevant chunks and synthesizes an answer with LLM.
    """
    if rag_index is None:
        raise HTTPException(status_code=503, detail="RAG index not available")

    try:
        result = rag_index.answer_question(
            question=request.q,
            top_k=request.top_k,
            model=request.model
        )

        return AnswerResponse(**result)

    except Exception as e:
        logger.error(f"Answer error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/search")
async def search_get(
    q: str = Query(..., description="Search query"),
    top_k: int = Query(5, description="Number of results")
):
    """GET version of search endpoint for convenience."""
    return await search(SearchRequest(q=q, top_k=top_k))


@app.get("/answer")
async def answer_get(
    q: str = Query(..., description="Question to answer"),
    top_k: int = Query(5, description="Number of chunks to retrieve"),
    model: str = Query("gpt-4", description="LLM model to use")
):
    """GET version of answer endpoint for convenience."""
    return await answer(AnswerRequest(q=q, top_k=top_k, model=model))


# Neo4j-powered endpoints
@app.get("/papers/{pmcid}")
async def get_paper(pmcid: str):
    """
    Get paper metadata and findings by PMCID.

    Returns:
        Paper metadata with associated experiments and findings
    """
    if neo4j_driver is None:
        raise HTTPException(status_code=503, detail="Neo4j not connected")

    try:
        with get_neo4j_session() as session:
            # Query paper with findings
            query = """
            MATCH (p:Paper {pmcid: $pmcid})
            OPTIONAL MATCH (p)-[:REPORTS]->(f:Finding)
            OPTIONAL MATCH (f)-[:AFFECTS]->(ph:Phenotype)
            OPTIONAL MATCH (f)-[:OBSERVED_IN]->(t:Tissue)
            OPTIONAL MATCH (f)-[:INVOLVES]->(o:Organism)
            RETURN p,
                   collect(DISTINCT {
                       finding_id: f.uuid,
                       direction: f.direction,
                       magnitude_value: f.magnitude_value,
                       magnitude_unit: f.magnitude_unit,
                       p_value: f.p_value,
                       evidence_strength: f.evidence_strength,
                       phenotype: ph.label,
                       tissue: t.label,
                       organism: o.label
                   }) AS findings
            """

            result = session.run(query, pmcid=pmcid)
            record = result.single()

            if not record:
                raise HTTPException(status_code=404, detail=f"Paper {pmcid} not found")

            paper = dict(record["p"])
            findings = [f for f in record["findings"] if f.get("finding_id")]

            return {
                "pmcid": paper.get("pmcid"),
                "title": paper.get("title"),
                "doi": paper.get("doi"),
                "year": paper.get("year"),
                "journal": paper.get("journal"),
                "authors": paper.get("authors", []),
                "findings": findings,
                "num_findings": len(findings)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching paper {pmcid}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/kg/gap")
async def knowledge_gap(
    organism: Optional[str] = Query(None, description="Filter by organism label"),
    tissue: Optional[str] = Query(None, description="Filter by tissue label"),
    exposure: Optional[str] = Query(None, description="Filter by exposure type"),
    duration: Optional[str] = Query(None, description="Filter by duration")
):
    """
    Query knowledge gaps in the graph.

    Returns a matrix showing combinations of organism × tissue × exposure × duration
    with study counts for gap analysis.
    """
    if neo4j_driver is None:
        raise HTTPException(status_code=503, detail="Neo4j not connected")

    try:
        with get_neo4j_session() as session:
            # Build dynamic query based on filters
            conditions = []
            params = {}

            if organism:
                conditions.append("o.label = $organism")
                params["organism"] = organism
            if tissue:
                conditions.append("t.label = $tissue")
                params["tissue"] = tissue
            if exposure:
                conditions.append("e.type = $exposure")
                params["exposure"] = exposure
            if duration:
                conditions.append("d.label = $duration")
                params["duration"] = duration

            where_clause = "WHERE " + " AND ".join(conditions) if conditions else ""

            query = f"""
            MATCH (p:Paper)-[:DESCRIBES]->(exp:Experiment)
            OPTIONAL MATCH (exp)-[:INVOLVES]->(o:Organism)
            OPTIONAL MATCH (exp)-[:INVOLVES]->(t:Tissue)
            OPTIONAL MATCH (exp)-[:APPLIES]->(e:Exposure)
            OPTIONAL MATCH (exp)-[:HAS_DURATION]->(d:Duration)
            {where_clause}
            WITH o.label AS organism,
                 t.label AS tissue,
                 e.type AS exposure,
                 d.label AS duration,
                 count(DISTINCT p) AS study_count,
                 avg(p.year) AS avg_year
            RETURN organism, tissue, exposure, duration, study_count, avg_year
            ORDER BY study_count DESC
            LIMIT 1000
            """

            result = session.run(query, **params)

            gaps = []
            for record in result:
                gaps.append({
                    "organism": record["organism"],
                    "tissue": record["tissue"],
                    "exposure": record["exposure"],
                    "duration": record["duration"],
                    "study_count": record["study_count"],
                    "avg_year": int(record["avg_year"]) if record["avg_year"] else None
                })

            return {
                "filters": {
                    "organism": organism,
                    "tissue": tissue,
                    "exposure": exposure,
                    "duration": duration
                },
                "gaps": gaps,
                "num_combinations": len(gaps)
            }

    except Exception as e:
        logger.error(f"Error in gap analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/kg/consensus")
async def consensus_analysis(
    phenotype: str = Query(..., description="Phenotype label to analyze")
):
    """
    Analyze consensus/disagreement on a phenotype.

    Returns:
        - Total studies analyzing this phenotype
        - Distribution of findings by direction (increase/decrease/no_change)
        - Agreement score
        - Confidence bands
    """
    if neo4j_driver is None:
        raise HTTPException(status_code=503, detail="Neo4j not connected")

    try:
        with get_neo4j_session() as session:
            query = """
            MATCH (ph:Phenotype {label: $phenotype})<-[:AFFECTS]-(f:Finding)
            OPTIONAL MATCH (f)<-[:REPORTS]-(p:Paper)
            OPTIONAL MATCH (f)-[:INVOLVES]->(o:Organism)
            OPTIONAL MATCH (f)-[:OBSERVED_IN]->(t:Tissue)
            RETURN f.direction AS direction,
                   count(f) AS count,
                   avg(f.evidence_strength) AS avg_evidence,
                   avg(f.magnitude_value) AS avg_magnitude,
                   collect(DISTINCT p.pmcid) AS papers,
                   collect(DISTINCT o.label) AS organisms,
                   collect(DISTINCT t.label) AS tissues
            """

            result = session.run(query, phenotype=phenotype)

            findings_by_direction = {}
            total_studies = 0
            all_papers = set()

            for record in result:
                direction = record["direction"] or "unknown"
                count = record["count"]
                total_studies += count

                findings_by_direction[direction] = {
                    "count": count,
                    "avg_evidence": record["avg_evidence"],
                    "avg_magnitude": record["avg_magnitude"],
                    "papers": [p for p in record["papers"] if p],
                    "organisms": [o for o in record["organisms"] if o],
                    "tissues": [t for t in record["tissues"] if t]
                }

                all_papers.update([p for p in record["papers"] if p])

            # Calculate consensus score
            if total_studies == 0:
                raise HTTPException(status_code=404, detail=f"No findings for phenotype: {phenotype}")

            # Find dominant direction
            dominant_direction = max(findings_by_direction.items(), key=lambda x: x[1]["count"])
            consensus_score = dominant_direction[1]["count"] / total_studies

            return {
                "phenotype": phenotype,
                "total_findings": total_studies,
                "unique_papers": len(all_papers),
                "consensus_score": round(consensus_score, 3),
                "dominant_direction": dominant_direction[0],
                "findings_by_direction": findings_by_direction,
                "interpretation": _interpret_consensus(consensus_score)
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in consensus analysis for {phenotype}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _interpret_consensus(score: float) -> str:
    """Interpret consensus score."""
    if score >= 0.8:
        return "Strong consensus"
    elif score >= 0.6:
        return "Moderate consensus"
    elif score >= 0.4:
        return "Weak consensus"
    else:
        return "No consensus (conflicting evidence)"


@app.get("/kg/graph")
async def get_knowledge_graph(
    center_node: Optional[str] = Query(None, description="Center node ID (e.g., PMC12345)"),
    node_type: Optional[str] = Query(None, description="Node type to start from (Paper, Organism, etc.)"),
    depth: int = Query(2, description="Graph traversal depth", ge=1, le=3),
    limit: int = Query(100, description="Maximum nodes to return", ge=1, le=500)
):
    """
    Get knowledge graph for visualization.

    Returns nodes and edges suitable for graph visualization libraries.
    """
    if neo4j_driver is None:
        raise HTTPException(status_code=503, detail="Neo4j not connected")

    try:
        with get_neo4j_session() as session:
            if center_node:
                # Query from specific node - use uuid for Finding, pmcid for Paper, obo_id for others
                query = f"""
                MATCH path = (center)-[*1..{depth}]-(connected)
                WHERE center.pmcid = $center_node OR center.obo_id = $center_node OR center.label = $center_node
                WITH nodes(path) AS path_nodes, relationships(path) AS path_rels
                UNWIND path_nodes AS n
                UNWIND path_rels AS r
                RETURN collect(DISTINCT {{
                    id: coalesce(n.uuid, n.obo_id, n.pmcid, toString(id(n))),
                    label: CASE labels(n)[0]
                        WHEN 'Finding' THEN coalesce(n.direction, 'Finding')
                        WHEN 'Phenotype' THEN
                            CASE
                                WHEN size(coalesce(n.label, 'Phenotype')) > 20
                                THEN substring(coalesce(n.label, 'Phenotype'), 0, 17) + '...'
                                ELSE coalesce(n.label, 'Phenotype')
                            END
                        WHEN 'Organism' THEN coalesce(n.label, 'Organism')
                        WHEN 'Tissue' THEN coalesce(n.label, 'Tissue')
                        WHEN 'Paper' THEN coalesce(n.pmcid, 'Paper')
                        ELSE coalesce(n.label, n.pmcid, labels(n)[0])
                    END,
                    type: labels(n)[0],
                    properties: properties(n)
                }}) AS nodes,
                collect(DISTINCT {{
                    source: coalesce(startNode(r).uuid, startNode(r).obo_id, startNode(r).pmcid, toString(id(startNode(r)))),
                    target: coalesce(endNode(r).uuid, endNode(r).obo_id, endNode(r).pmcid, toString(id(endNode(r)))),
                    type: type(r),
                    properties: properties(r)
                }}) AS edges
                LIMIT $limit
                """
                params = {"center_node": center_node, "limit": limit}
            else:
                # Get overview graph - simplified query that works with actual data
                query = """
                MATCH (p:Paper)-[r1:REPORTS]->(f:Finding)-[r2:AFFECTS]->(ph:Phenotype)
                WITH p, f, ph, r1, r2
                LIMIT $limit
                RETURN collect(DISTINCT {
                    id: coalesce(p.pmcid, id(p)),
                    label: coalesce(p.pmcid, 'Paper'),
                    type: 'Paper',
                    properties: {pmcid: p.pmcid}
                }) + collect(DISTINCT {
                    id: coalesce(f.uuid, id(f)),
                    label: coalesce(f.direction, 'Finding'),
                    type: 'Finding',
                    properties: {
                        direction: f.direction,
                        evidence_strength: f.evidence_strength
                    }
                }) + collect(DISTINCT {
                    id: coalesce(ph.obo_id, id(ph)),
                    label: CASE
                        WHEN size(coalesce(ph.label, 'Phenotype')) > 20
                        THEN substring(coalesce(ph.label, 'Phenotype'), 0, 17) + '...'
                        ELSE coalesce(ph.label, 'Phenotype')
                    END,
                    type: 'Phenotype',
                    properties: {obo_id: ph.obo_id, label: ph.label}
                }) AS nodes,
                collect(DISTINCT {
                    source: coalesce(p.pmcid, id(p)),
                    target: coalesce(f.uuid, id(f)),
                    type: type(r1),
                    properties: {}
                }) + collect(DISTINCT {
                    source: coalesce(f.uuid, id(f)),
                    target: coalesce(ph.obo_id, id(ph)),
                    type: type(r2),
                    properties: {}
                }) AS edges
                """
                params = {"limit": limit}

            result = session.run(query, **params)
            record = result.single()

            if not record:
                return {"nodes": [], "edges": []}

            return {
                "nodes": record["nodes"],
                "edges": record["edges"],
                "num_nodes": len(record["nodes"]),
                "num_edges": len(record["edges"])
            }

    except Exception as e:
        logger.error(f"Error fetching knowledge graph: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
