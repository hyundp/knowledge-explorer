"""
Test script for FastAPI endpoints.

Usage:
    python -m api.test_api
"""

import requests
import json
import sys


def test_api():
    """Test all API endpoints."""
    base_url = "http://localhost:8000"

    print("=" * 80)
    print("Testing Space Biology Knowledge Graph API")
    print("=" * 80)

    # Test 1: Health check
    print("\n1. Testing /health endpoint...")
    try:
        response = requests.get(f"{base_url}/health")
        response.raise_for_status()
        data = response.json()
        print(f"   Status: {data['status']}")
        print(f"   RAG Index Loaded: {data['rag_index_loaded']}")
        print(f"   Neo4j Status: {data['neo4j_status']}")
        print(f"   Neo4j Node Count: {data['neo4j_node_count']}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # Test 2: Root endpoint
    print("\n2. Testing / endpoint...")
    try:
        response = requests.get(f"{base_url}/")
        response.raise_for_status()
        data = response.json()
        print(f"   Version: {data['version']}")
        print(f"   Available endpoints: {len(data['endpoints'])}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # Test 3: Search (if RAG index available)
    print("\n3. Testing /search endpoint...")
    try:
        response = requests.post(
            f"{base_url}/search",
            json={"q": "microgravity bone loss", "top_k": 3}
        )
        if response.status_code == 503:
            print("   ⚠️  RAG index not available")
        else:
            response.raise_for_status()
            data = response.json()
            print(f"   Found {data['num_results']} results")
            if data['results']:
                print(f"   Top result: {data['results'][0].get('text', '')[:100]}...")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # Test 4: Gap analysis
    print("\n4. Testing /kg/gap endpoint...")
    try:
        response = requests.get(f"{base_url}/kg/gap")
        if response.status_code == 503:
            print("   ⚠️  Neo4j not connected")
        else:
            response.raise_for_status()
            data = response.json()
            print(f"   Found {data['num_combinations']} combinations")
            if data['gaps']:
                print(f"   Top gap: {data['gaps'][0]}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # Test 5: Graph endpoint
    print("\n5. Testing /kg/graph endpoint...")
    try:
        response = requests.get(f"{base_url}/kg/graph?limit=10")
        if response.status_code == 503:
            print("   ⚠️  Neo4j not connected")
        else:
            response.raise_for_status()
            data = response.json()
            print(f"   Nodes: {data['num_nodes']}")
            print(f"   Edges: {data['num_edges']}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    print("\n" + "=" * 80)
    print("Testing complete!")
    print("=" * 80)


if __name__ == "__main__":
    test_api()
