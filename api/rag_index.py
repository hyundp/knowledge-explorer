"""
RAG Index for Natural-Language Search over Space Biology Papers.

This module builds a FAISS vector index over paragraph chunks from paper sections
(Results, Discussion, Conclusion) and provides semantic search and question-answering
capabilities with proper citations.

Features:
- FAISS index with cosine similarity
- Local embeddings (MiniLM or E5)
- Paragraph chunking with metadata (pmcid, section, offsets)
- RAG pipeline: retrieve top-k chunks, synthesize answer with LLM
- API endpoints: /search and /answer
"""

import os
import json
import logging
import pickle
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
import numpy as np

try:
    import faiss
except ImportError:
    faiss = None

try:
    from sentence_transformers import SentenceTransformer
except ImportError:
    SentenceTransformer = None

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


@dataclass
class Chunk:
    """A text chunk with metadata."""
    text: str
    pmcid: str
    section: str
    offsets: Optional[Tuple[int, int]] = None
    chunk_id: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SearchResult:
    """Search result with chunk and similarity score."""
    chunk: Chunk
    score: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            'chunk': self.chunk.to_dict(),
            'score': float(self.score)
        }


class RAGIndex:
    """RAG index for semantic search over paper paragraphs."""

    def __init__(
        self,
        embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2",
        index_path: Optional[Path] = None,
        dimension: int = 384
    ):
        """
        Initialize RAG index.

        Args:
            embedding_model: HuggingFace model name for embeddings
            index_path: Path to save/load FAISS index
            dimension: Embedding dimension (384 for MiniLM, 768 for E5-base)
        """
        self.embedding_model_name = embedding_model
        self.dimension = dimension
        self.index_path = index_path or Path("data/rag/index.faiss")
        self.metadata_path = self.index_path.parent / "metadata.pkl"

        # Initialize embedding model
        if SentenceTransformer is None:
            raise ImportError("sentence-transformers not installed. Install with: pip install sentence-transformers")

        logger.info(f"Loading embedding model: {embedding_model}")
        self.encoder = SentenceTransformer(embedding_model)
        self.dimension = self.encoder.get_sentence_embedding_dimension()

        # Initialize FAISS index
        if faiss is None:
            raise ImportError("faiss not installed. Install with: pip install faiss-cpu")

        self.index = None
        self.chunks: List[Chunk] = []

        # Try to load existing index
        if self.index_path.exists():
            self.load()
        else:
            self._init_new_index()

    def _init_new_index(self):
        """Initialize a new FAISS index."""
        # Use IndexFlatIP for cosine similarity (after L2 normalization)
        self.index = faiss.IndexFlatIP(self.dimension)
        self.chunks = []
        logger.info(f"Initialized new FAISS index with dimension {self.dimension}")

    def _normalize_embeddings(self, embeddings: np.ndarray) -> np.ndarray:
        """Normalize embeddings for cosine similarity."""
        norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
        return embeddings / norms

    def chunk_paper_sections(
        self,
        sections: Dict[str, str],
        pmcid: str,
        max_chunk_size: int = 500,
        overlap: int = 50
    ) -> List[Chunk]:
        """
        Chunk paper sections into paragraphs.

        Args:
            sections: Dict with section names as keys and text as values
            pmcid: Paper PMCID
            max_chunk_size: Maximum characters per chunk
            overlap: Character overlap between chunks

        Returns:
            List of Chunk objects
        """
        chunks = []

        # Prioritize Results > Discussion > Conclusion
        section_priority = ['results', 'discussion', 'conclusion', 'abstract']

        for section_name in section_priority:
            section_text = sections.get(section_name, '')
            if not section_text:
                continue

            # Split by paragraphs (double newline or single newline)
            paragraphs = [p.strip() for p in section_text.split('\n\n') if p.strip()]

            for para in paragraphs:
                # Further split if paragraph is too long
                if len(para) <= max_chunk_size:
                    chunks.append(Chunk(
                        text=para,
                        pmcid=pmcid,
                        section=section_name,
                        offsets=None
                    ))
                else:
                    # Split into overlapping chunks
                    start = 0
                    while start < len(para):
                        end = min(start + max_chunk_size, len(para))
                        chunk_text = para[start:end]

                        chunks.append(Chunk(
                            text=chunk_text,
                            pmcid=pmcid,
                            section=section_name,
                            offsets=(start, end)
                        ))

                        start += max_chunk_size - overlap

        return chunks

    def add_chunks(self, chunks: List[Chunk]):
        """Add chunks to the index."""
        if not chunks:
            return

        # Generate embeddings
        texts = [chunk.text for chunk in chunks]
        logger.info(f"Encoding {len(texts)} chunks...")
        embeddings = self.encoder.encode(texts, show_progress_bar=True, convert_to_numpy=True)

        # Normalize for cosine similarity
        embeddings = self._normalize_embeddings(embeddings)

        # Add to index
        start_id = len(self.chunks)
        for i, chunk in enumerate(chunks):
            chunk.chunk_id = start_id + i

        self.chunks.extend(chunks)
        self.index.add(embeddings.astype('float32'))

        logger.info(f"Added {len(chunks)} chunks to index. Total: {len(self.chunks)}")

    def build_from_normalized_papers(self, normalized_dir: Path):
        """
        Build index from normalized paper files.

        Args:
            normalized_dir: Directory containing normalized.json files
        """
        all_chunks = []

        paper_files = list(normalized_dir.glob("*/normalized.json"))
        logger.info(f"Found {len(paper_files)} papers to index")

        for paper_file in paper_files:
            try:
                with open(paper_file, 'r', encoding='utf-8') as f:
                    paper = json.load(f)

                pmcid = paper.get('pmcid', paper_file.parent.name)
                sections = paper.get('sections', {})

                chunks = self.chunk_paper_sections(sections, pmcid)
                all_chunks.extend(chunks)

                if len(all_chunks) >= 1000:  # Process in batches
                    self.add_chunks(all_chunks)
                    all_chunks = []

            except Exception as e:
                logger.error(f"Error processing {paper_file}: {e}")
                continue

        # Add remaining chunks
        if all_chunks:
            self.add_chunks(all_chunks)

        logger.info(f"Index built with {len(self.chunks)} total chunks")

    def search(self, query: str, top_k: int = 5) -> List[SearchResult]:
        """
        Search for similar chunks.

        Args:
            query: Search query
            top_k: Number of results to return

        Returns:
            List of SearchResult objects sorted by similarity
        """
        if not self.chunks:
            logger.warning("Index is empty")
            return []

        # Encode query
        query_embedding = self.encoder.encode([query], convert_to_numpy=True)
        query_embedding = self._normalize_embeddings(query_embedding)

        # Search
        scores, indices = self.index.search(query_embedding.astype('float32'), top_k)

        # Build results
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.chunks):
                results.append(SearchResult(
                    chunk=self.chunks[idx],
                    score=score
                ))

        return results

    def answer_question(
        self,
        question: str,
        top_k: int = 5,
        llm_provider: str = "openai",
        model: str = "gpt-4"
    ) -> Dict[str, Any]:
        """
        Answer a question using RAG.

        Args:
            question: Question to answer
            top_k: Number of chunks to retrieve
            llm_provider: LLM provider (openai, anthropic)
            model: Model name

        Returns:
            Dict with answer, sources, and metadata
        """
        # Retrieve relevant chunks
        results = self.search(question, top_k=top_k)

        if not results:
            return {
                'answer': 'No relevant information found.',
                'sources': [],
                'question': question
            }

        # Build context from chunks
        context_parts = []
        sources = []

        for i, result in enumerate(results, 1):
            chunk = result.chunk
            context_parts.append(
                f"[{i}] From {chunk.pmcid} ({chunk.section}):\n{chunk.text}\n"
            )
            sources.append({
                'pmcid': chunk.pmcid,
                'section': chunk.section,
                'text': chunk.text[:200] + '...' if len(chunk.text) > 200 else chunk.text,
                'score': float(result.score)
            })

        context = '\n'.join(context_parts)

        # Generate answer with LLM
        prompt = f"""Based on the following excerpts from space biology research papers, please answer the question.
Cite sources using [number] notation.

Context:
{context}

Question: {question}

Answer (cite sources):"""

        answer = self._generate_llm_answer(prompt, llm_provider, model)

        return {
            'answer': answer,
            'sources': sources,
            'question': question,
            'num_sources': len(sources)
        }

    def _generate_llm_answer(self, prompt: str, provider: str, model: str) -> str:
        """Generate answer using LLM."""
        if provider == "openai":
            if OpenAI is None:
                return "OpenAI client not available. Install with: pip install openai"

            try:
                client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                response = client.chat.completions.create(
                    model=model,
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that answers questions about space biology research. Always cite sources using [number] notation."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.3,
                    max_tokens=500
                )
                return response.choices[0].message.content
            except Exception as e:
                logger.error(f"OpenAI API error: {e}")
                return f"Error generating answer: {e}"

        return "Unsupported LLM provider"

    def save(self):
        """Save index and metadata to disk."""
        self.index_path.parent.mkdir(parents=True, exist_ok=True)

        # Save FAISS index
        faiss.write_index(self.index, str(self.index_path))

        # Save metadata
        with open(self.metadata_path, 'wb') as f:
            pickle.dump({
                'chunks': self.chunks,
                'embedding_model': self.embedding_model_name,
                'dimension': self.dimension
            }, f)

        logger.info(f"Index saved to {self.index_path}")

    def load(self):
        """Load index and metadata from disk."""
        if not self.index_path.exists():
            raise FileNotFoundError(f"Index not found: {self.index_path}")

        # Load FAISS index
        self.index = faiss.read_index(str(self.index_path))

        # Load metadata
        with open(self.metadata_path, 'rb') as f:
            metadata = pickle.load(f)
            self.chunks = metadata['chunks']
            self.dimension = metadata['dimension']

        logger.info(f"Index loaded with {len(self.chunks)} chunks")


def main():
    """CLI for building RAG index."""
    import argparse

    parser = argparse.ArgumentParser(description="Build RAG index for space biology papers")
    parser.add_argument('--normalized-dir', type=str, required=True, help='Directory with normalized papers')
    parser.add_argument('--index-path', type=str, default='data/rag/index.faiss', help='Output index path')
    parser.add_argument('--embedding-model', type=str, default='sentence-transformers/all-MiniLM-L6-v2', help='Embedding model')
    parser.add_argument('--rebuild', action='store_true', help='Rebuild index from scratch')

    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)

    index_path = Path(args.index_path)

    # Remove existing index if rebuild requested
    if args.rebuild and index_path.exists():
        index_path.unlink()
        (index_path.parent / "metadata.pkl").unlink(missing_ok=True)
        logger.info("Removed existing index")

    # Build index
    rag = RAGIndex(embedding_model=args.embedding_model, index_path=index_path)
    rag.build_from_normalized_papers(Path(args.normalized_dir))
    rag.save()

    logger.info("Index building complete!")

    # Test search
    test_query = "What are the effects of microgravity on bone density?"
    logger.info(f"\nTesting search with query: '{test_query}'")
    results = rag.search(test_query, top_k=3)

    for i, result in enumerate(results, 1):
        print(f"\n[{i}] Score: {result.score:.4f}")
        print(f"PMCID: {result.chunk.pmcid} ({result.chunk.section})")
        print(f"Text: {result.chunk.text[:200]}...")


if __name__ == "__main__":
    main()
