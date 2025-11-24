# SFMC Lineage Backend

This directory contains the Python scripts for ingesting SFMC data, analyzing lineage, and generating graph data.

## Setup

1.  **Install Dependencies**:
    ```bash
    pip install requests
    ```

2.  **Environment Variables**:
    Set the following environment variables (or rely on the mock mode if not set):
    - `SFMC_CLIENT_ID`
    - `SFMC_CLIENT_SECRET`
    - `SFMC_AUTH_URL`
    - `SFMC_SOAP_ENDPOINT`

## Usage

### Generate Graph Snapshot

Run the ingest and analyzer script:

```bash
python3 ingest_analyzer.py
```

This will:
1.  Fetch data from SFMC (or generate mock data).
2.  Analyze relationships (SQL parsing, etc.).
3.  Generate `../public/graph_snapshot.json` for the React UI.
4.  Generate `nodes.csv` and `edges.csv` for Neo4j import.

### Import to Neo4j

1.  Ensure Neo4j is running (e.g., via Docker).
2.  Run the import script:

```bash
./neo4j_import.sh
```

*Note: You may need to adjust paths in `neo4j_import.sh` depending on your Neo4j deployment (local vs Docker).*
