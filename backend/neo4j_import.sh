#!/bin/bash

# Neo4j Import Script
# Assumes Neo4j is running locally or via Docker
# Usage: ./neo4j_import.sh

NEO4J_HOME=${NEO4J_HOME:-"/var/lib/neo4j"}
IMPORT_DIR=${IMPORT_DIR:-"import"}

echo "Copying CSVs to Neo4j import directory..."
# Adjust this path if running inside Docker or elsewhere
cp nodes.csv "$NEO4J_HOME/$IMPORT_DIR/nodes.csv"
cp edges.csv "$NEO4J_HOME/$IMPORT_DIR/edges.csv"

echo "Running Cypher import..."

# Using cypher-shell if available
if command -v cypher-shell &> /dev/null; then
    cypher-shell -u neo4j -p password "
    LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row
    MERGE (n:Node {id: row.id})
    SET n.label = row.label, n.type = row.type, n.metadata = row.metadata;

    LOAD CSV WITH HEADERS FROM 'file:///edges.csv' AS row
    MATCH (s:Node {id: row.source})
    MATCH (t:Node {id: row.target})
    MERGE (s)-[r:RELATIONSHIP {type: row.label}]->(t)
    SET r.confidence = row.confidence;
    "
    echo "Import complete."
else
    echo "cypher-shell not found. Please run the following Cypher manually in Neo4j Browser:"
    echo ""
    echo "LOAD CSV WITH HEADERS FROM 'file:///nodes.csv' AS row"
    echo "MERGE (n:Node {id: row.id})"
    echo "SET n.label = row.label, n.type = row.type, n.metadata = row.metadata;"
    echo ""
    echo "LOAD CSV WITH HEADERS FROM 'file:///edges.csv' AS row"
    echo "MATCH (s:Node {id: row.source})"
    echo "MATCH (t:Node {id: row.target})"
    echo "MERGE (s)-[r:RELATIONSHIP {type: row.label}]->(t)"
    echo "SET r.confidence = row.confidence;"
fi
