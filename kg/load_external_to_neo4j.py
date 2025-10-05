"""
Load external NASA resources (news, explainers, newsletters, NSLSL) into Neo4j.

This module loads enriched external items from entities.ndjson into the knowledge graph,
creating:
- External nodes: NewsItem, Explainer, NewsletterIssue, LibraryRecord
- MENTIONS edges to biomedical nodes (Organism, Tissue, Phenotype, etc.)
- LINKS_TO edges to Paper, OSDR_Dataset, TaskBook_Grant nodes

Features:
- Batch processing with configurable batch size
- Deduplication by source_url
- Automatic timestamp management
- Comprehensive metrics logging
"""

import os
import json
import logging
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict
import sys

try:
    from neo4j import GraphDatabase, Transaction
    from neo4j.exceptions import ServiceUnavailable, AuthError
except ImportError:
    print("neo4j package not installed. Install with: pip install neo4j")
    sys.exit(1)

logger = logging.getLogger(__name__)


class ExternalLoader:
    """Load external items into Neo4j knowledge graph."""

    def __init__(
        self,
        uri: str,
        user: str,
        password: str,
        database: str = "neo4j",
        batch_size: int = 50,
        dry_run: bool = False
    ):
        """
        Initialize external loader.

        Args:
            uri: Neo4j connection URI
            user: Neo4j username
            password: Neo4j password
            database: Database name
            batch_size: Batch size for bulk operations
            dry_run: If True, don't actually write to database
        """
        self.uri = uri
        self.user = user
        self.database = database
        self.batch_size = batch_size
        self.dry_run = dry_run

        # Initialize driver
        if not dry_run:
            try:
                self.driver = GraphDatabase.driver(uri, auth=(user, password))
                # Test connection
                with self.driver.session(database=database) as session:
                    result = session.run("RETURN 1")
                    result.single()
                logger.info(f"Connected to Neo4j at {uri}")
            except (ServiceUnavailable, AuthError) as e:
                logger.error(f"Failed to connect to Neo4j: {e}")
                raise
        else:
            self.driver = None
            logger.info("Dry-run mode: no database connection")

        # Metrics
        self.metrics = defaultdict(int)

        # Type mapping
        self.type_to_label = {
            'news': 'NewsItem',
            'explainer': 'Explainer',
            'newsletter': 'NewsletterIssue',
            'library_record': 'LibraryRecord'
        }

    def close(self):
        """Close Neo4j connection."""
        if self.driver:
            self.driver.close()

    def _get_current_timestamp(self) -> str:
        """Get current ISO timestamp."""
        return datetime.utcnow().isoformat()

    def _ensure_external_node(
        self,
        tx: Transaction,
        item: Dict[str, Any]
    ) -> str:
        """
        Ensure an external node exists (NewsItem, Explainer, etc.).

        Args:
            tx: Neo4j transaction
            item: External item with normalized_item field

        Returns:
            The source_url of the node
        """
        normalized = item.get('normalized_item', {})

        item_type = normalized.get('type', 'news')
        label = self.type_to_label.get(item_type, 'NewsItem')

        source_url = normalized.get('source_url')
        title = normalized.get('title', '')
        summary = normalized.get('summary', '')
        published_at = normalized.get('published_at', '')
        authors = normalized.get('authors', [])
        tags = normalized.get('tags', [])
        body_text = normalized.get('body_text', '')

        query = f"""
        MERGE (n:{label} {{source_url: $source_url}})
        ON CREATE SET
            n.title = $title,
            n.summary = $summary,
            n.published_at = $published_at,
            n.authors = $authors,
            n.tags = $tags,
            n.body_text = $body_text,
            n.source_type = $source_type,
            n.first_seen = $timestamp,
            n.last_seen = $timestamp
        ON MATCH SET
            n.last_seen = $timestamp
        RETURN n.source_url as url
        """

        params = {
            'source_url': source_url,
            'title': title,
            'summary': summary,
            'published_at': published_at,
            'authors': authors,
            'tags': tags,
            'body_text': body_text[:5000] if body_text else '',  # Limit body text size
            'source_type': item_type,
            'timestamp': self._get_current_timestamp()
        }

        result = tx.run(query, **params)
        record = result.single()
        self.metrics[f'node_{label}'] += 1
        return record['url'] if record else source_url

    def _ensure_biomedical_node(
        self,
        tx: Transaction,
        entity: Dict[str, Any]
    ) -> Optional[str]:
        """
        Ensure a biomedical node exists (Organism, Tissue, Phenotype, etc.).

        Args:
            tx: Neo4j transaction
            entity: Grounded entity dict

        Returns:
            Node identifier (obo_id or id)
        """
        entity_type = entity.get('entity_type')
        entity_id = entity.get('id')
        label_text = entity.get('label')
        source_obo = entity.get('source_obo')

        # Map entity type to Neo4j label
        label_map = {
            'organism': 'Organism',
            'tissue': 'Tissue',
            'cell_type': 'CellType',
            'phenotype': 'Phenotype',
            'exposure': 'Exposure',
            'platform': 'Platform',
            'mission': 'Mission',
            'assay': 'Assay',
            'duration': 'Duration',
            'chemical': 'Chemical',
            'pathway': 'Pathway'
        }

        label = label_map.get(entity_type)
        if not label:
            return None

        # For ontology-based nodes, use obo_id
        if source_obo and source_obo != 'CUSTOM':
            query = f"""
            MERGE (n:{label} {{obo_id: $obo_id}})
            ON CREATE SET
                n.label = $label_text,
                n.source_obo = $source_obo,
                n.first_seen = $timestamp,
                n.last_seen = $timestamp,
                n.source_count = 1
            ON MATCH SET
                n.last_seen = $timestamp,
                n.source_count = COALESCE(n.source_count, 0) + 1
            RETURN n.obo_id as id
            """
            params = {
                'obo_id': entity_id,
                'label_text': label_text,
                'source_obo': source_obo,
                'timestamp': self._get_current_timestamp()
            }
        else:
            # For custom nodes, use id
            query = f"""
            MERGE (n:{label} {{id: $id}})
            ON CREATE SET
                n.label = $label_text,
                n.source_obo = $source_obo,
                n.first_seen = $timestamp,
                n.last_seen = $timestamp,
                n.source_count = 1
            ON MATCH SET
                n.last_seen = $timestamp,
                n.source_count = COALESCE(n.source_count, 0) + 1
            RETURN n.id as id
            """
            params = {
                'id': entity_id,
                'label_text': label_text,
                'source_obo': source_obo or 'CUSTOM',
                'timestamp': self._get_current_timestamp()
            }

        result = tx.run(query, **params)
        record = result.single()
        self.metrics[f'node_{label}'] += 1
        return record['id'] if record else entity_id

    def _create_mentions_edge(
        self,
        tx: Transaction,
        source_url: str,
        source_label: str,
        entity: Dict[str, Any]
    ):
        """Create MENTIONS edge from external node to biomedical node."""
        entity_type = entity.get('entity_type')
        entity_id = entity.get('id')
        confidence = entity.get('confidence', 0.0)

        # Map entity type to Neo4j label and ID property
        label_map = {
            'organism': ('Organism', 'obo_id' if entity.get('source_obo') != 'CUSTOM' else 'id'),
            'tissue': ('Tissue', 'obo_id' if entity.get('source_obo') != 'CUSTOM' else 'id'),
            'cell_type': ('CellType', 'obo_id' if entity.get('source_obo') != 'CUSTOM' else 'id'),
            'phenotype': ('Phenotype', 'obo_id' if entity.get('source_obo') != 'CUSTOM' else 'id'),
            'exposure': ('Exposure', 'id'),
            'platform': ('Platform', 'id'),
            'mission': ('Mission', 'id'),
            'assay': ('Assay', 'id'),
            'duration': ('Duration', 'id'),
            'chemical': ('Chemical', 'obo_id' if entity.get('source_obo') != 'CUSTOM' else 'id'),
            'pathway': ('Pathway', 'obo_id' if entity.get('source_obo') != 'CUSTOM' else 'id')
        }

        if entity_type not in label_map:
            return

        target_label, id_prop = label_map[entity_type]

        query = f"""
        MATCH (a:{source_label} {{source_url: $source_url}})
        MATCH (b:{target_label} {{{id_prop}: $entity_id}})
        MERGE (a)-[r:MENTIONS]->(b)
        ON CREATE SET
            r.source_type = 'external',
            r.extraction_confidence = $confidence,
            r.created_at = $timestamp
        RETURN count(r) as created
        """

        params = {
            'source_url': source_url,
            'entity_id': entity_id,
            'confidence': confidence,
            'timestamp': self._get_current_timestamp()
        }

        tx.run(query, **params)
        self.metrics['rel_MENTIONS'] += 1

    def _create_links_to_edges(
        self,
        tx: Transaction,
        source_url: str,
        source_label: str,
        referenced_ids: Dict[str, List[str]]
    ):
        """Create LINKS_TO edges to Paper, OSDR_Dataset, TaskBook_Grant nodes."""
        # Link to Papers (by PMCID)
        for pmcid in referenced_ids.get('pmcid', []):
            query = f"""
            MATCH (a:{source_label} {{source_url: $source_url}})
            MERGE (p:Paper {{pmcid: $pmcid}})
            ON CREATE SET
                p.first_seen = $timestamp,
                p.last_seen = $timestamp
            MERGE (a)-[r:LINKS_TO]->(p)
            ON CREATE SET
                r.created_at = $timestamp
            RETURN count(r) as created
            """
            tx.run(query, source_url=source_url, pmcid=pmcid, timestamp=self._get_current_timestamp())
            self.metrics['rel_LINKS_TO_Paper'] += 1

        # Link to OSDR_Dataset nodes
        for osdr_id in referenced_ids.get('osdr_id', []):
            query = f"""
            MATCH (a:{source_label} {{source_url: $source_url}})
            MERGE (d:OSDR_Dataset {{dataset_id: $osdr_id}})
            ON CREATE SET
                d.first_seen = $timestamp,
                d.last_seen = $timestamp
            MERGE (a)-[r:LINKS_TO]->(d)
            ON CREATE SET
                r.created_at = $timestamp
            RETURN count(r) as created
            """
            tx.run(query, source_url=source_url, osdr_id=osdr_id, timestamp=self._get_current_timestamp())
            self.metrics['rel_LINKS_TO_OSDR'] += 1

        # Link to TaskBook_Grant nodes
        for taskbook_id in referenced_ids.get('taskbook_id', []):
            query = f"""
            MATCH (a:{source_label} {{source_url: $source_url}})
            MERGE (g:TaskBook_Grant {{grant_id: $taskbook_id}})
            ON CREATE SET
                g.first_seen = $timestamp,
                g.last_seen = $timestamp
            MERGE (a)-[r:LINKS_TO]->(g)
            ON CREATE SET
                r.created_at = $timestamp
            RETURN count(r) as created
            """
            tx.run(query, source_url=source_url, taskbook_id=taskbook_id, timestamp=self._get_current_timestamp())
            self.metrics['rel_LINKS_TO_TaskBook'] += 1

    def load_external_item(self, tx: Transaction, item: Dict[str, Any]):
        """
        Load a single external item into Neo4j with all relationships.

        Creates:
        - External node (NewsItem, Explainer, etc.)
        - Biomedical nodes (Organism, Tissue, Phenotype, etc.)
        - MENTIONS edges to biomedical nodes
        - LINKS_TO edges to Paper, OSDR_Dataset, TaskBook_Grant
        """
        normalized = item.get('normalized_item', {})
        item_type = normalized.get('type', 'news')
        label = self.type_to_label.get(item_type, 'NewsItem')

        # Ensure external node
        source_url = self._ensure_external_node(tx, item)

        # Create biomedical nodes and MENTIONS edges
        grounded_entities = item.get('grounded_entities', [])
        for entity in grounded_entities:
            # Ensure biomedical node exists
            self._ensure_biomedical_node(tx, entity)

            # Create MENTIONS edge
            self._create_mentions_edge(tx, source_url, label, entity)

        # Create LINKS_TO edges
        referenced_ids = item.get('referenced_ids', {})
        if referenced_ids:
            self._create_links_to_edges(tx, source_url, label, referenced_ids)

    def load_external_batch(self, items: List[Dict]):
        """Load a batch of external items."""
        if self.dry_run:
            logger.info(f"Dry-run: would load batch of {len(items)} items")
            return

        with self.driver.session(database=self.database) as session:
            for item in items:
                try:
                    session.execute_write(self.load_external_item, item)
                except Exception as e:
                    source_url = item.get('normalized_item', {}).get('source_url', 'unknown')
                    logger.error(f"Error loading item {source_url}: {e}")
                    self.metrics['errors'] += 1

    def load_from_ndjson(self, input_path: Path) -> Dict[str, int]:
        """
        Load external items from NDJSON file.

        Args:
            input_path: Path to entities.ndjson

        Returns:
            Metrics dictionary
        """
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")

        items = []
        total_loaded = 0

        logger.info(f"Loading external items from {input_path}")

        with open(input_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue

                try:
                    item = json.loads(line)
                    items.append(item)

                    # Load in batches
                    if len(items) >= self.batch_size:
                        self.load_external_batch(items)
                        total_loaded += len(items)
                        logger.info(f"Loaded {total_loaded} external items...")
                        items = []

                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode error at line {line_num}: {e}")
                    self.metrics['parse_errors'] += 1

        # Load remaining items
        if items:
            self.load_external_batch(items)
            total_loaded += len(items)

        self.metrics['total_loaded'] = total_loaded
        logger.info(f"Completed loading {total_loaded} external items")

        return dict(self.metrics)


def main():
    """CLI entrypoint: python -m kg.load_external_to_neo4j --uri bolt://localhost:7687 --user neo4j --password pass --input data/external/entities.ndjson"""
    parser = argparse.ArgumentParser(
        description="Load external NASA resources into Neo4j knowledge graph"
    )
    parser.add_argument('--uri', type=str, default='bolt://localhost:7687', help='Neo4j URI')
    parser.add_argument('--user', type=str, default='neo4j', help='Neo4j username')
    parser.add_argument('--password', type=str, required=True, help='Neo4j password')
    parser.add_argument('--database', type=str, default='neo4j', help='Neo4j database name')
    parser.add_argument('--input', type=str, required=True, help='Input entities.ndjson path')
    parser.add_argument('--batch-size', type=int, default=50, help='Batch size for loading')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (no database writes)')
    parser.add_argument('--metrics-output', type=str, help='Output metrics to NDJSON file')
    parser.add_argument('--log-level', type=str, default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Initialize loader
    loader = ExternalLoader(
        uri=args.uri,
        user=args.user,
        password=args.password,
        database=args.database,
        batch_size=args.batch_size,
        dry_run=args.dry_run
    )

    try:
        # Load external items
        input_path = Path(args.input)
        metrics = loader.load_from_ndjson(input_path)

        # Print metrics
        logger.info("=== Load Metrics ===")
        for key, value in sorted(metrics.items()):
            logger.info(f"{key}: {value}")

        # Save metrics to file if requested
        if args.metrics_output:
            metrics_path = Path(args.metrics_output)
            metrics_path.parent.mkdir(parents=True, exist_ok=True)

            with open(metrics_path, 'a', encoding='utf-8') as f:
                metrics['timestamp'] = datetime.utcnow().isoformat()
                metrics['input_file'] = str(input_path)
                f.write(json.dumps(metrics, ensure_ascii=False) + '\n')

            logger.info(f"Metrics saved to {metrics_path}")

    finally:
        loader.close()


if __name__ == "__main__":
    main()
