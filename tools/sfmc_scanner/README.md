SFMC Scanner

This small Python tool connects to Salesforce Marketing Cloud (SFMC) to list Data Extensions (DEs), QueryDefinitions, Automations, Journeys and CloudPages, parses SQL to infer lineage, detects likely PII fields, and exports a graph JSON and CSV for Neo4j import.

Prerequisites
- Python 3.10+
- Create a virtualenv and install dependencies:

```bash
python -m venv .envs
source .envs/bin/activate
pip install -r requirements.txt
```

Configuration
Create a `.env` file in this folder (or set environment variables). Example keys:

```
SFMC_CLIENT_ID=your_client_id
SFMC_CLIENT_SECRET=your_client_secret
SFMC_AUTH_BASE_URL=https://YOUR_SUBDOMAIN.auth.marketingcloudapis.com
SFMC_REST_BASE_URL=https://YOUR_SUBDOMAIN.rest.marketingcloudapis.com
SFMC_SOAP_BASE_URL=https://YOUR_SUBDOMAIN.soap.marketingcloudapis.com
ACCOUNT_ID=123456
```

Usage

```bash
python sfmc_scanner.py --out ./output
```

This produces `graph.json` and `nodes.csv`/`edges.csv` in the output folder.

Notes
- This is a best-effort tool that relies on available SOAP/REST endpoints. Some accounts need additional permissions to fetch automation run history or journeys.
- The SQL parser is heuristic-based and may need tuning for complex queries or dynamic AMPscript-built table names.
