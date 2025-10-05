"""
Export Neo4j data to static JSON files for Vercel deployment

This script exports all data from Neo4j to JSON files that can be
used by the frontend without needing a backend server.
"""

import os
import json
from neo4j import GraphDatabase
from dotenv import load_dotenv
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv('.env.backend')

# Neo4j connection
NEO4J_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
NEO4J_USER = os.getenv('NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.getenv('NEO4J_PASSWORD', 'spacebio123')

# Output directory
OUTPUT_DIR = Path('public/data/neo4j')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def export_graph_overview(driver):
    """Export full knowledge graph (nodes and edges)."""
    logger.info("Exporting graph overview...")

    with driver.session() as session:
        # Get all nodes and relationships
        query = """
        MATCH (p:Paper)-[r1:REPORTS]->(f:Finding)-[r2:AFFECTS]->(ph:Phenotype)
        WITH p, f, ph, r1, r2
        RETURN
            collect(DISTINCT {
                id: p.pmcid,
                label: CASE
                    WHEN size(coalesce(p.pmcid, 'Paper')) > 20
                    THEN substring(coalesce(p.pmcid, 'Paper'), 0, 17) + '...'
                    ELSE coalesce(p.pmcid, 'Paper')
                END,
                fullLabel: p.pmcid,
                type: 'Paper',
                properties: {pmcid: p.pmcid}
            }) + collect(DISTINCT {
                id: ph.obo_id,
                label: CASE
                    WHEN size(coalesce(ph.label, 'Phenotype')) > 20
                    THEN substring(coalesce(ph.label, 'Phenotype'), 0, 17) + '...'
                    ELSE coalesce(ph.label, 'Phenotype')
                END,
                fullLabel: ph.label,
                type: 'Phenotype',
                properties: {obo_id: ph.obo_id, label: ph.label}
            }) AS nodes,
            collect(DISTINCT {
                id: toString(id(r1)),
                source: p.pmcid,
                target: ph.obo_id,
                type: 'REPORTS',
                properties: {}
            }) AS edges
        """

        result = session.run(query)
        record = result.single()

        graph_data = {
            'nodes': record['nodes'],
            'edges': record['edges'],
            'num_nodes': len(record['nodes']),
            'num_edges': len(record['edges'])
        }

        output_file = OUTPUT_DIR / 'graph_overview.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(graph_data, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ Exported {graph_data['num_nodes']} nodes, {graph_data['num_edges']} edges")
        logger.info(f"  → {output_file}")


def export_papers(driver):
    """Export all papers with metadata."""
    logger.info("Exporting papers...")

    with driver.session() as session:
        query = """
        MATCH (p:Paper)
        RETURN p.pmcid as pmcid, properties(p) as properties
        """

        result = session.run(query)
        papers = {}

        for record in result:
            pmcid = record['pmcid']
            papers[pmcid] = record['properties']

        output_file = OUTPUT_DIR / 'papers.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(papers, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ Exported {len(papers)} papers")
        logger.info(f"  → {output_file}")


def export_paper_subgraphs(driver):
    """Export individual subgraphs for each paper."""
    logger.info("Exporting paper subgraphs...")

    subgraph_dir = OUTPUT_DIR / 'subgraphs'
    subgraph_dir.mkdir(exist_ok=True)

    with driver.session() as session:
        # Get all paper PMCIDs
        result = session.run("MATCH (p:Paper) RETURN p.pmcid as pmcid")
        pmcids = [record['pmcid'] for record in result]

        logger.info(f"  Found {len(pmcids)} papers")

        for i, pmcid in enumerate(pmcids):
            # Get subgraph for this paper
            query = """
            MATCH (p:Paper {pmcid: $pmcid})-[r1:REPORTS]->(f:Finding)-[r2:AFFECTS]->(ph:Phenotype)
            RETURN
                collect(DISTINCT {
                    id: p.pmcid,
                    label: CASE
                        WHEN size(coalesce(p.pmcid, 'Paper')) > 20
                        THEN substring(coalesce(p.pmcid, 'Paper'), 0, 17) + '...'
                        ELSE coalesce(p.pmcid, 'Paper')
                    END,
                    fullLabel: p.pmcid,
                    type: 'Paper',
                    properties: properties(p)
                }) + collect(DISTINCT {
                    id: ph.obo_id,
                    label: CASE
                        WHEN size(coalesce(ph.label, 'Phenotype')) > 20
                        THEN substring(coalesce(ph.label, 'Phenotype'), 0, 17) + '...'
                        ELSE coalesce(ph.label, 'Phenotype')
                    END,
                    fullLabel: ph.label,
                    type: 'Phenotype',
                    properties: properties(ph)
                }) AS nodes,
                collect(DISTINCT {
                    id: toString(id(r1)),
                    source: p.pmcid,
                    target: ph.obo_id,
                    type: 'REPORTS',
                    properties: {}
                }) AS edges
            """

            result = session.run(query, pmcid=pmcid)
            record = result.single()

            if record and record['nodes']:
                subgraph_data = {
                    'pmcid': pmcid,
                    'nodes': record['nodes'],
                    'edges': record['edges'],
                    'num_nodes': len(record['nodes']),
                    'num_edges': len(record['edges'])
                }

                output_file = subgraph_dir / f'{pmcid}.json'
                with open(output_file, 'w', encoding='utf-8') as f:
                    json.dump(subgraph_data, f, ensure_ascii=False, indent=2)

            if (i + 1) % 100 == 0:
                logger.info(f"  Exported {i + 1}/{len(pmcids)} subgraphs...")

        logger.info(f"✓ Exported {len(pmcids)} subgraphs")
        logger.info(f"  → {subgraph_dir}")


def export_consensus(driver):
    """Export consensus phenotype data."""
    logger.info("Exporting consensus data...")

    with driver.session() as session:
        # Aggregate findings by phenotype
        query = """
        MATCH (p:Paper)-[:REPORTS]->(f:Finding)-[:AFFECTS]->(ph:Phenotype)
        WITH ph,
             collect(f.direction) as directions,
             count(f) as num_findings,
             collect(p.pmcid) as papers
        WHERE num_findings > 1
        RETURN
            ph.obo_id as phenotype_id,
            ph.label as phenotype_label,
            directions,
            num_findings,
            papers,
            size([d IN directions WHERE d = 'increased']) as increased_count,
            size([d IN directions WHERE d = 'decreased']) as decreased_count,
            size([d IN directions WHERE d = 'no_change']) as no_change_count
        ORDER BY num_findings DESC
        """

        result = session.run(query)
        consensus_data = []

        for record in result:
            total = record['num_findings']
            increased = record['increased_count']
            decreased = record['decreased_count']
            no_change = record['no_change_count']

            # Calculate consensus direction
            if increased > total * 0.6:
                consensus = 'increased'
                confidence = increased / total
            elif decreased > total * 0.6:
                consensus = 'decreased'
                confidence = decreased / total
            else:
                consensus = 'mixed'
                confidence = max(increased, decreased, no_change) / total

            consensus_data.append({
                'phenotype_id': record['phenotype_id'],
                'phenotype_label': record['phenotype_label'],
                'consensus_direction': consensus,
                'confidence': round(confidence, 2),
                'num_studies': total,
                'increased_count': increased,
                'decreased_count': decreased,
                'no_change_count': no_change,
                'papers': record['papers']
            })

        output_file = OUTPUT_DIR / 'consensus.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(consensus_data, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ Exported {len(consensus_data)} consensus phenotypes")
        logger.info(f"  → {output_file}")


def export_statistics(driver):
    """Export database statistics."""
    logger.info("Exporting statistics...")

    with driver.session() as session:
        stats = {}

        # Node counts by type
        result = session.run("""
            MATCH (n)
            RETURN labels(n)[0] as label, count(n) as count
            ORDER BY count DESC
        """)
        stats['node_counts'] = {record['label']: record['count'] for record in result}

        # Relationship counts by type
        result = session.run("""
            MATCH ()-[r]->()
            RETURN type(r) as type, count(r) as count
            ORDER BY count DESC
        """)
        stats['relationship_counts'] = {record['type']: record['count'] for record in result}

        # Total counts
        stats['total_nodes'] = sum(stats['node_counts'].values())
        stats['total_relationships'] = sum(stats['relationship_counts'].values())

        output_file = OUTPUT_DIR / 'statistics.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)

        logger.info(f"✓ Exported statistics")
        logger.info(f"  Total nodes: {stats['total_nodes']:,}")
        logger.info(f"  Total relationships: {stats['total_relationships']:,}")
        logger.info(f"  → {output_file}")


def create_index_file():
    """Create an index file listing all exported data."""
    logger.info("Creating index file...")

    index = {
        'exported_at': None,  # Will be set when running
        'files': {
            'graph_overview': 'graph_overview.json',
            'papers': 'papers.json',
            'consensus': 'consensus.json',
            'statistics': 'statistics.json',
            'subgraphs': 'subgraphs/'
        },
        'description': 'Static Neo4j data export for Vercel deployment'
    }

    import datetime
    index['exported_at'] = datetime.datetime.now().isoformat()

    output_file = OUTPUT_DIR / 'index.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    logger.info(f"✓ Created index file")
    logger.info(f"  → {output_file}")


def main():
    logger.info("=" * 60)
    logger.info("Neo4j to JSON Export Tool")
    logger.info("=" * 60)
    logger.info(f"\nConnecting to Neo4j: {NEO4J_URI}")

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    try:
        driver.verify_connectivity()
        logger.info("✓ Connected\n")
    except Exception as e:
        logger.error(f"✗ Connection failed: {e}")
        return

    try:
        # Export all data
        export_statistics(driver)
        export_papers(driver)
        export_graph_overview(driver)
        export_consensus(driver)
        export_paper_subgraphs(driver)
        create_index_file()

        logger.info("\n" + "=" * 60)
        logger.info("✓ Export completed successfully!")
        logger.info("=" * 60)
        logger.info(f"\nOutput directory: {OUTPUT_DIR}")
        logger.info("\nFiles created:")
        for file in sorted(OUTPUT_DIR.glob('*.json')):
            size = file.stat().st_size / 1024  # KB
            logger.info(f"  - {file.name} ({size:.1f} KB)")

        subgraph_dir = OUTPUT_DIR / 'subgraphs'
        if subgraph_dir.exists():
            subgraph_count = len(list(subgraph_dir.glob('*.json')))
            total_size = sum(f.stat().st_size for f in subgraph_dir.glob('*.json')) / 1024 / 1024  # MB
            logger.info(f"  - subgraphs/ ({subgraph_count} files, {total_size:.1f} MB)")

        logger.info("\nNext steps:")
        logger.info("1. Commit the exported data: git add public/data/neo4j")
        logger.info("2. Deploy to Vercel (data will be included)")
        logger.info("3. Update frontend to use static data instead of API calls")

    except Exception as e:
        logger.error(f"\n✗ Export failed: {e}")
        import traceback
        traceback.print_exc()

    finally:
        driver.close()
        logger.info("\nConnection closed")


if __name__ == "__main__":
    main()
