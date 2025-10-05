"""
Production-ready Neo4j loader for Space Biology Knowledge Graph.

This module loads findings from findings.jsonl into Neo4j, creating:
- Nodes: Paper, Experiment, Finding, Organism, Tissue, CellType, Phenotype, Exposure, Platform, Assay, Duration
- Relationships: DESCRIBES, REPORTS, INVOLVES, APPLIES, MEASURES, AFFECTS, OBSERVED_IN, TIMED_AT, EVIDENCE

Features:
- Batch processing with configurable batch size
- Strict deduplication on ontology identifiers
- Automatic timestamp management (first_seen, last_seen)
- Synonym and label management
- Dry-run mode for testing
- Comprehensive metrics logging
"""

import os
import json
import logging
import argparse
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict
import sys

try:
    from neo4j import GraphDatabase, Transaction
    from neo4j.exceptions import ServiceUnavailable, AuthError
except ImportError:
    print("neo4j package not installed. Install with: pip install neo4j")
    sys.exit(1)

logger = logging.getLogger(__name__)


class Neo4jLoader:
    """Load findings into Neo4j knowledge graph."""

    def __init__(
        self,
        uri: str,
        user: str,
        password: str,
        database: str = "neo4j",
        batch_size: int = 100,
        dry_run: bool = False
    ):
        """
        Initialize Neo4j loader.

        Args:
            uri: Neo4j connection URI (e.g., bolt://localhost:7687)
            user: Neo4j username
            password: Neo4j password
            database: Database name (default: neo4j)
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

    def close(self):
        """Close Neo4j connection."""
        if self.driver:
            self.driver.close()

    def initialize_schema(self):
        """Initialize Neo4j schema (constraints and indexes)."""
        if self.dry_run:
            logger.info("Dry-run: would initialize schema")
            return

        schema_file = Path(__file__).parent / "neo4j_schema.cypher"

        if not schema_file.exists():
            logger.warning(f"Schema file not found: {schema_file}")
            return

        with open(schema_file, 'r') as f:
            schema_statements = f.read()

        # Split by semicolon and filter comments
        statements = [
            stmt.strip()
            for stmt in schema_statements.split(';')
            if stmt.strip() and not stmt.strip().startswith('//')
        ]

        with self.driver.session(database=self.database) as session:
            for stmt in statements:
                try:
                    session.run(stmt)
                    logger.debug(f"Executed: {stmt[:50]}...")
                except Exception as e:
                    # Some constraints may already exist
                    if "already exists" in str(e).lower():
                        logger.debug(f"Constraint already exists, skipping")
                    else:
                        logger.warning(f"Error executing statement: {e}")

        logger.info("Schema initialized")

    def _get_current_timestamp(self) -> str:
        """Get current ISO timestamp."""
        return datetime.utcnow().isoformat()

    def _ensure_ontology_node(
        self,
        tx: Transaction,
        label: str,
        ontology_data: Dict[str, Any],
        extra_props: Dict[str, Any] = None
    ) -> str:
        """
        Ensure an ontology-based node exists (MERGE with deduplication).

        Args:
            tx: Neo4j transaction
            label: Node label (Organism, Tissue, CellType, Phenotype)
            ontology_data: Dict with {id, label, source_obo, synonyms, confidence}
            extra_props: Additional properties to set

        Returns:
            The obo_id of the node
        """
        obo_id = ontology_data.get('id')
        node_label = ontology_data.get('label')
        source_obo = ontology_data.get('source_obo')
        synonyms = ontology_data.get('synonyms', [])

        props = {
            'obo_id': obo_id,
            'label': node_label,
            'source_obo': source_obo,
            'synonyms': synonyms,
            'last_seen': self._get_current_timestamp()
        }

        if extra_props:
            props.update(extra_props)

        # MERGE node (deduplicate by obo_id)
        query = f"""
        MERGE (n:{label} {{obo_id: $obo_id}})
        ON CREATE SET
            n.label = $node_label,
            n.source_obo = $source_obo,
            n.synonyms = $synonyms,
            n.first_seen = $timestamp,
            n.last_seen = $timestamp,
            n.source_count = 1
        ON MATCH SET
            n.last_seen = $timestamp,
            n.source_count = COALESCE(n.source_count, 0) + 1
        RETURN n.obo_id as id
        """

        params = {
            'obo_id': obo_id,
            'node_label': node_label,
            'source_obo': source_obo,
            'synonyms': synonyms,
            'timestamp': self._get_current_timestamp()
        }

        # Add extra props if provided
        if extra_props:
            for key, value in extra_props.items():
                if key not in params:
                    params[key] = value

        result = tx.run(query, **params)
        record = result.single()
        self.metrics[f'node_{label}'] += 1
        return record['id'] if record else obo_id

    def _ensure_paper_node(self, tx: Transaction, pmcid: str, paper_data: Dict = None) -> str:
        """Ensure Paper node exists."""
        props = {
            'pmcid': pmcid,
            'title': None,
            'doi': None,
            'year': None,
            'journal': None,
            'authors': [],
            'last_seen': self._get_current_timestamp()
        }

        if paper_data:
            props.update({
                'title': paper_data.get('title'),
                'doi': paper_data.get('doi'),
                'year': paper_data.get('year'),
                'journal': paper_data.get('journal'),
                'authors': paper_data.get('authors', [])
            })

        query = """
        MERGE (p:Paper {pmcid: $pmcid})
        ON CREATE SET
            p.title = $title,
            p.doi = $doi,
            p.year = $year,
            p.journal = $journal,
            p.authors = $authors,
            p.first_seen = $timestamp,
            p.last_seen = $timestamp
        ON MATCH SET
            p.last_seen = $timestamp
        RETURN p.pmcid as id
        """

        result = tx.run(query, **props, timestamp=self._get_current_timestamp())
        record = result.single()
        self.metrics['node_Paper'] += 1
        return record['id'] if record else pmcid

    def _ensure_finding_node(self, tx: Transaction, finding: Dict) -> str:
        """Ensure Finding node exists."""
        finding_uuid = finding.get('uuid', str(uuid.uuid4()))
        pmcid = finding.get('pmcid')
        direction = finding.get('direction')
        p_value = finding.get('p_value')
        evidence_strength = finding.get('evidence_strength', {}).get('score', 0.0)

        props = {
            'uuid': finding_uuid,
            'pmcid': pmcid,
            'direction': direction,
            'p_value': p_value,
            'evidence_strength': evidence_strength,
            'sample_size': finding.get('sample_size'),
            'timepoint': finding.get('timepoint'),
            'qualifiers': finding.get('qualifiers', []),
            'quotes': finding.get('quotes', []),
            'magnitude_value': None,
            'magnitude_unit': None,
            'magnitude_method': None,
            'provenance_section': None,
            'provenance_source_type': None,
            'last_seen': self._get_current_timestamp()
        }

        # Add magnitude if present
        if finding.get('magnitude'):
            mag = finding['magnitude']
            props.update({
                'magnitude_value': mag.get('value'),
                'magnitude_unit': mag.get('unit'),
                'magnitude_method': mag.get('method')
            })

        # Add provenance
        if finding.get('provenance'):
            prov = finding['provenance']
            props.update({
                'provenance_section': prov.get('section'),
                'provenance_source_type': prov.get('source_type')
            })

        query = """
        MERGE (f:Finding {uuid: $uuid})
        ON CREATE SET
            f.pmcid = $pmcid,
            f.direction = $direction,
            f.p_value = $p_value,
            f.evidence_strength = $evidence_strength,
            f.sample_size = $sample_size,
            f.timepoint = $timepoint,
            f.qualifiers = $qualifiers,
            f.quotes = $quotes,
            f.magnitude_value = $magnitude_value,
            f.magnitude_unit = $magnitude_unit,
            f.magnitude_method = $magnitude_method,
            f.provenance_section = $provenance_section,
            f.provenance_source_type = $provenance_source_type,
            f.first_seen = $timestamp,
            f.last_seen = $timestamp
        ON MATCH SET
            f.last_seen = $timestamp
        RETURN f.uuid as id
        """

        result = tx.run(query, **props, timestamp=self._get_current_timestamp())
        record = result.single()
        self.metrics['node_Finding'] += 1
        return record['id'] if record else finding_uuid

    def _create_relationship(
        self,
        tx: Transaction,
        from_label: str,
        from_id_prop: str,
        from_id: str,
        rel_type: str,
        to_label: str,
        to_id_prop: str,
        to_id: str,
        props: Dict = None
    ):
        """Create a relationship between two nodes."""
        rel_props = props or {}
        rel_props['created_at'] = self._get_current_timestamp()

        # Build SET clause for properties
        set_clauses = [f'r.{k} = ${k}' for k in rel_props.keys()]
        set_clause = ', '.join(set_clauses) if set_clauses else 'r.created_at = $created_at'

        query = f"""
        MATCH (a:{from_label} {{{from_id_prop}: $from_id}})
        MATCH (b:{to_label} {{{to_id_prop}: $to_id}})
        MERGE (a)-[r:{rel_type}]->(b)
        ON CREATE SET {set_clause}
        RETURN count(r) as created
        """

        params = {
            'from_id': from_id,
            'to_id': to_id
        }
        params.update(rel_props)

        tx.run(query, **params)
        self.metrics[f'rel_{rel_type}'] += 1

    def load_finding(self, tx: Transaction, finding: Dict):
        """
        Load a single finding into Neo4j with all relationships.

        Creates nodes and relationships:
        - Paper -[:REPORTS]-> Finding
        - Finding -[:AFFECTS]-> Phenotype
        - Finding -[:OBSERVED_IN]-> Tissue (if present)
        - Finding -[:OBSERVED_IN]-> CellType (if present)
        - Finding -[:IN_ORGANISM]-> Organism (if present)
        """
        pmcid = finding.get('pmcid')

        # Ensure Paper node
        self._ensure_paper_node(tx, pmcid)

        # Ensure Finding node
        finding_uuid = self._ensure_finding_node(tx, finding)

        # Paper -[:REPORTS]-> Finding
        prov = finding.get('provenance') or {}
        evidence = finding.get('evidence_strength') or {}

        self._create_relationship(
            tx,
            'Paper', 'pmcid', pmcid,
            'REPORTS',
            'Finding', 'uuid', finding_uuid,
            {
                'provenance': prov.get('section', '') if prov else '',
                'extraction_confidence': evidence.get('score', 0.0) if evidence else 0.0
            }
        )

        # Phenotype
        if finding.get('phenotype'):
            pheno = finding['phenotype'].get('ontology_term')
            if pheno:
                pheno_id = self._ensure_ontology_node(tx, 'Phenotype', pheno)

                mag = finding.get('magnitude') or {}
                self._create_relationship(
                    tx,
                    'Finding', 'uuid', finding_uuid,
                    'AFFECTS',
                    'Phenotype', 'obo_id', pheno_id,
                    {
                        'direction': finding.get('direction'),
                        'magnitude': mag.get('value') if mag else None,
                        'p_value': finding.get('p_value')
                    }
                )

        # Tissue
        if finding.get('tissue'):
            tissue = finding['tissue'].get('ontology_term')
            if tissue:
                tissue_id = self._ensure_ontology_node(tx, 'Tissue', tissue)

                self._create_relationship(
                    tx,
                    'Finding', 'uuid', finding_uuid,
                    'OBSERVED_IN',
                    'Tissue', 'obo_id', tissue_id
                )

        # CellType
        if finding.get('cell_type'):
            cell = finding['cell_type'].get('ontology_term')
            if cell:
                cell_id = self._ensure_ontology_node(tx, 'CellType', cell)

                self._create_relationship(
                    tx,
                    'Finding', 'uuid', finding_uuid,
                    'OBSERVED_IN',
                    'CellType', 'obo_id', cell_id
                )

        # Organism
        if finding.get('organism'):
            org = finding['organism'].get('ontology_term')
            if org:
                org_id = self._ensure_ontology_node(tx, 'Organism', org, {
                    'strain': finding['organism'].get('strain'),
                    'sex': finding['organism'].get('sex')
                })

                self._create_relationship(
                    tx,
                    'Finding', 'uuid', finding_uuid,
                    'IN_ORGANISM',
                    'Organism', 'obo_id', org_id
                )

    def load_findings_batch(self, findings: List[Dict]):
        """Load a batch of findings."""
        if self.dry_run:
            logger.info(f"Dry-run: would load batch of {len(findings)} findings")
            return

        with self.driver.session(database=self.database) as session:
            for finding in findings:
                try:
                    session.execute_write(self.load_finding, finding)
                except Exception as e:
                    logger.error(f"Error loading finding {finding.get('uuid')}: {e}")
                    self.metrics['errors'] += 1

    def load_from_jsonl(self, input_path: Path) -> Dict[str, int]:
        """
        Load findings from JSONL file.

        Args:
            input_path: Path to findings.jsonl

        Returns:
            Metrics dictionary
        """
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")

        findings = []
        total_loaded = 0

        logger.info(f"Loading findings from {input_path}")

        with open(input_path, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                if not line.strip():
                    continue

                try:
                    finding = json.loads(line)
                    findings.append(finding)

                    # Load in batches
                    if len(findings) >= self.batch_size:
                        self.load_findings_batch(findings)
                        total_loaded += len(findings)
                        logger.info(f"Loaded {total_loaded} findings...")
                        findings = []

                except json.JSONDecodeError as e:
                    logger.error(f"JSON decode error at line {line_num}: {e}")
                    self.metrics['parse_errors'] += 1

        # Load remaining findings
        if findings:
            self.load_findings_batch(findings)
            total_loaded += len(findings)

        self.metrics['total_loaded'] = total_loaded
        logger.info(f"Completed loading {total_loaded} findings")

        return dict(self.metrics)

    def get_graph_metrics(self) -> Dict[str, Any]:
        """Get graph statistics."""
        if self.dry_run:
            return {'dry_run': True}

        metrics = {}

        with self.driver.session(database=self.database) as session:
            # Node counts by label
            result = session.run("""
                CALL db.labels() YIELD label
                CALL apoc.cypher.run('MATCH (n:' + label + ') RETURN count(n) as count', {})
                YIELD value
                RETURN label, value.count as count
            """)

            for record in result:
                metrics[f"node_count_{record['label']}"] = record['count']

            # Relationship counts by type
            result = session.run("""
                CALL db.relationshipTypes() YIELD relationshipType
                CALL apoc.cypher.run('MATCH ()-[r:' + relationshipType + ']->() RETURN count(r) as count', {})
                YIELD value
                RETURN relationshipType, value.count as count
            """)

            for record in result:
                metrics[f"rel_count_{record['relationshipType']}"] = record['count']

        return metrics


def main():
    """CLI entrypoint: python -m kg.load_to_neo4j --uri bolt://neo4j:7687 --user neo4j --password pass --input /data/jsonl/findings.jsonl"""
    parser = argparse.ArgumentParser(
        description="Load findings into Neo4j knowledge graph"
    )
    parser.add_argument('--uri', type=str, default='bolt://localhost:7687', help='Neo4j URI')
    parser.add_argument('--user', type=str, default='neo4j', help='Neo4j username')
    parser.add_argument('--password', type=str, required=True, help='Neo4j password')
    parser.add_argument('--database', type=str, default='neo4j', help='Neo4j database name')
    parser.add_argument('--input', type=str, required=True, help='Input findings.jsonl path')
    parser.add_argument('--batch-size', type=int, default=100, help='Batch size for loading')
    parser.add_argument('--dry-run', action='store_true', help='Dry run (no database writes)')
    parser.add_argument('--init-schema', action='store_true', help='Initialize schema first')
    parser.add_argument('--metrics-output', type=str, help='Output metrics to NDJSON file')
    parser.add_argument('--log-level', type=str, default='INFO', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])

    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Initialize loader
    loader = Neo4jLoader(
        uri=args.uri,
        user=args.user,
        password=args.password,
        database=args.database,
        batch_size=args.batch_size,
        dry_run=args.dry_run
    )

    try:
        # Initialize schema if requested
        if args.init_schema:
            logger.info("Initializing Neo4j schema...")
            loader.initialize_schema()

        # Load findings
        input_path = Path(args.input)
        metrics = loader.load_from_jsonl(input_path)

        # Get graph metrics
        if not args.dry_run:
            graph_metrics = loader.get_graph_metrics()
            metrics.update(graph_metrics)

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
