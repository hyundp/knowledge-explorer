"""
Neo4j Data Migration Script

Copies data from local Neo4j to Neo4j Aura (or any remote Neo4j instance).
"""

import os
from neo4j import GraphDatabase
from dotenv import load_dotenv
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv('.env.backend')

# Source (local) Neo4j
SOURCE_URI = os.getenv('NEO4J_URI', 'bolt://localhost:7687')
SOURCE_USER = os.getenv('NEO4J_USER', 'neo4j')
SOURCE_PASSWORD = os.getenv('NEO4J_PASSWORD', 'spacebio123')

# Target (Aura) Neo4j - get from user input
print("=" * 60)
print("Neo4j Data Migration Tool")
print("=" * 60)
print("\nSource Database (Local):")
print(f"  URI: {SOURCE_URI}")
print(f"  User: {SOURCE_USER}")
print("\nTarget Database (Neo4j Aura):")
TARGET_URI = input("  Enter Aura URI (e.g., neo4j+s://xxxxx.databases.neo4j.io): ").strip()
TARGET_USER = input("  Enter username (default: neo4j): ").strip() or "neo4j"
TARGET_PASSWORD = input("  Enter password: ").strip()

print("\n" + "=" * 60)
print("Starting migration...")
print("=" * 60)


def get_stats(driver, label="Database"):
    """Get database statistics."""
    with driver.session() as session:
        # Count nodes
        node_count = session.run("MATCH (n) RETURN count(n) as count").single()['count']

        # Count relationships
        rel_count = session.run("MATCH ()-[r]->() RETURN count(r) as count").single()['count']

        # Get node labels
        labels_result = session.run("CALL db.labels()").values()
        labels = [label[0] for label in labels_result]

        # Get relationship types
        rels_result = session.run("CALL db.relationshipTypes()").values()
        rel_types = [rel[0] for rel in rels_result]

        logger.info(f"\n{label} Statistics:")
        logger.info(f"  Nodes: {node_count:,}")
        logger.info(f"  Relationships: {rel_count:,}")
        logger.info(f"  Node Labels: {', '.join(labels)}")
        logger.info(f"  Relationship Types: {', '.join(rel_types)}")

        return {
            'nodes': node_count,
            'relationships': rel_count,
            'labels': labels,
            'rel_types': rel_types
        }


def clear_target_database(target_driver):
    """Clear all data from target database."""
    logger.info("\nClearing target database...")
    with target_driver.session() as session:
        # Delete all relationships first
        session.run("MATCH ()-[r]->() DELETE r")
        # Then delete all nodes
        session.run("MATCH (n) DELETE n")
    logger.info("✓ Target database cleared")


def migrate_nodes(source_driver, target_driver, label):
    """Migrate nodes of a specific label."""
    logger.info(f"\nMigrating {label} nodes...")

    with source_driver.session() as source_session:
        # Get all nodes of this label
        query = f"MATCH (n:{label}) RETURN n"
        result = source_session.run(query)
        nodes = [record['n'] for record in result]

        logger.info(f"  Found {len(nodes)} {label} nodes")

        # Batch insert into target
        with target_driver.session() as target_session:
            batch_size = 1000
            for i in range(0, len(nodes), batch_size):
                batch = nodes[i:i+batch_size]

                # Create nodes with properties
                for node in batch:
                    props = dict(node)
                    labels_str = ':'.join(node.labels)

                    # Build CREATE query
                    prop_str = ', '.join([f"{k}: ${k}" for k in props.keys()])
                    query = f"CREATE (n:{labels_str} {{{prop_str}}})"
                    target_session.run(query, **props)

                logger.info(f"  Migrated {min(i+batch_size, len(nodes))}/{len(nodes)} nodes")

    logger.info(f"✓ Completed {label} nodes")


def migrate_relationships(source_driver, target_driver, rel_type):
    """Migrate relationships of a specific type."""
    logger.info(f"\nMigrating {rel_type} relationships...")

    with source_driver.session() as source_session:
        # Get all relationships with node identifiers
        query = f"""
        MATCH (a)-[r:{rel_type}]->(b)
        RETURN
            labels(a) as source_labels,
            properties(a) as source_props,
            type(r) as rel_type,
            properties(r) as rel_props,
            labels(b) as target_labels,
            properties(b) as target_props
        """
        result = source_session.run(query)
        rels = list(result)

        logger.info(f"  Found {len(rels)} {rel_type} relationships")

        # Create relationships in target
        with target_driver.session() as target_session:
            for i, rel in enumerate(rels):
                # Match source node
                source_label = rel['source_labels'][0]
                source_id_prop = _get_id_property(source_label, rel['source_props'])

                # Match target node
                target_label = rel['target_labels'][0]
                target_id_prop = _get_id_property(target_label, rel['target_props'])

                if not source_id_prop or not target_id_prop:
                    logger.warning(f"  Skipping relationship {i}: missing ID property")
                    continue

                # Create relationship
                query = f"""
                MATCH (a:{source_label} {{{source_id_prop[0]}: $source_id}})
                MATCH (b:{target_label} {{{target_id_prop[0]}: $target_id}})
                CREATE (a)-[r:{rel_type}]->(b)
                SET r = $rel_props
                """

                target_session.run(
                    query,
                    source_id=source_id_prop[1],
                    target_id=target_id_prop[1],
                    rel_props=rel['rel_props'] or {}
                )

                if (i + 1) % 1000 == 0:
                    logger.info(f"  Migrated {i+1}/{len(rels)} relationships")

        logger.info(f"✓ Completed {rel_type} relationships")


def _get_id_property(label, props):
    """Get the best identifier property for a node."""
    # Priority: uuid > obo_id > pmcid > label
    id_priority = ['uuid', 'obo_id', 'pmcid', 'label']

    for id_prop in id_priority:
        if id_prop in props:
            return (id_prop, props[id_prop])

    return None


def main():
    # Connect to source
    logger.info("\nConnecting to source database...")
    source_driver = GraphDatabase.driver(SOURCE_URI, auth=(SOURCE_USER, SOURCE_PASSWORD))

    try:
        source_driver.verify_connectivity()
        logger.info("✓ Connected to source")
    except Exception as e:
        logger.error(f"✗ Failed to connect to source: {e}")
        return

    # Connect to target
    logger.info("\nConnecting to target database...")
    target_driver = GraphDatabase.driver(TARGET_URI, auth=(TARGET_USER, TARGET_PASSWORD))

    try:
        target_driver.verify_connectivity()
        logger.info("✓ Connected to target")
    except Exception as e:
        logger.error(f"✗ Failed to connect to target: {e}")
        source_driver.close()
        return

    # Get statistics
    source_stats = get_stats(source_driver, "Source")

    # Confirm migration
    print("\n" + "=" * 60)
    print("WARNING: This will DELETE all data in the target database!")
    confirm = input("Type 'yes' to continue: ").strip().lower()

    if confirm != 'yes':
        logger.info("Migration cancelled")
        source_driver.close()
        target_driver.close()
        return

    try:
        # Clear target
        clear_target_database(target_driver)

        # Migrate nodes by label
        for label in source_stats['labels']:
            migrate_nodes(source_driver, target_driver, label)

        # Migrate relationships by type
        for rel_type in source_stats['rel_types']:
            migrate_relationships(source_driver, target_driver, rel_type)

        # Verify migration
        logger.info("\n" + "=" * 60)
        logger.info("Verifying migration...")
        target_stats = get_stats(target_driver, "Target")

        # Compare
        logger.info("\n" + "=" * 60)
        logger.info("Migration Summary:")
        logger.info(f"  Nodes: {source_stats['nodes']:,} → {target_stats['nodes']:,}")
        logger.info(f"  Relationships: {source_stats['relationships']:,} → {target_stats['relationships']:,}")

        if source_stats['nodes'] == target_stats['nodes'] and \
           source_stats['relationships'] == target_stats['relationships']:
            logger.info("\n✓ Migration completed successfully!")
        else:
            logger.warning("\n⚠ Migration completed with differences - please verify data")

    except Exception as e:
        logger.error(f"\n✗ Migration failed: {e}")
        import traceback
        traceback.print_exc()

    finally:
        source_driver.close()
        target_driver.close()
        logger.info("\nConnections closed")


if __name__ == "__main__":
    main()
