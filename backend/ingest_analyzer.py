import os
import json
import re
import datetime
import requests
import xml.etree.ElementTree as ET
from typing import List, Dict, Any, Optional

# --- Configuration ---
SFMC_CLIENT_ID = os.getenv("SFMC_CLIENT_ID")
SFMC_CLIENT_SECRET = os.getenv("SFMC_CLIENT_SECRET")
SFMC_AUTH_URL = os.getenv("SFMC_AUTH_URL", "https://YOUR_SUBDOMAIN.auth.marketingcloudapis.com/v2/token")
SFMC_SOAP_ENDPOINT = os.getenv("SFMC_SOAP_ENDPOINT", "https://webservice.exacttarget.com/Service.asmx")
SFMC_REST_BASE = os.getenv("SFMC_REST_BASE_URL", "")

# --- 1. Ingest Service ---

class SfmcClient:
    def __init__(self):
        self.token = None
        self.token_expiry = 0

    def get_token(self):
        if self.token and datetime.datetime.now().timestamp() < self.token_expiry:
            return self.token
        
        if not SFMC_CLIENT_ID or not SFMC_CLIENT_SECRET:
            print("Warning: SFMC credentials not found. Using mock mode.")
            return "mock_token"

        payload = {
            "grant_type": "client_credentials",
            "client_id": SFMC_CLIENT_ID,
            "client_secret": SFMC_CLIENT_SECRET
        }
        try:
            resp = requests.post(SFMC_AUTH_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()
            self.token = data["access_token"]
            self.token_expiry = datetime.datetime.now().timestamp() + data["expires_in"] - 30
            return self.token
        except Exception as e:
            print(f"Auth failed: {e}")
            return "mock_token"

    def rest_get(self, endpoint):
        token = self.get_token()
        if token == "mock_token":
            return {}
        headers = {"Authorization": f"Bearer {token}"}
        try:
            resp = requests.get(f"{SFMC_REST_BASE}{endpoint}", headers=headers)
            return resp.json() if resp.status_code == 200 else {}
        except:
            return {}

    def soap_retrieve(self, object_type, props):
        # Placeholder for SOAP implementation
        # In a real scenario, this would construct the XML envelope
        return []

# --- Mock Data Generator (for when creds are missing) ---
def generate_mock_data():
    return {
        "data_extensions": [
            {"CustomerKey": "DE_Subscribers", "Name": "MasterSubscribers", "Fields": [
                {"Name": "EmailAddress", "FieldType": "EmailAddress"},
                {"Name": "SubscriberKey", "FieldType": "Text"},
                {"Name": "JoinDate", "FieldType": "Date"}
            ]},
            {"CustomerKey": "DE_Orders", "Name": "Orders_Daily", "Fields": [
                {"Name": "OrderID", "FieldType": "Text"},
                {"Name": "Email", "FieldType": "EmailAddress"},
                {"Name": "Amount", "FieldType": "Decimal"}
            ]},
            {"CustomerKey": "DE_Staging", "Name": "Staging_Import", "Fields": [
                {"Name": "RawData", "FieldType": "Text"}
            ]}
        ],
        "queries": [
            {
                "CustomerKey": "Q_JoinOrders",
                "Name": "Join Orders to Subscribers",
                "QueryText": "SELECT s.SubscriberKey, o.OrderID FROM MasterSubscribers s JOIN Orders_Daily o ON s.EmailAddress = o.Email",
                "TargetUpdateTypeName": "Update",
                "DataExtensionTarget": {"CustomerKey": "DE_Subscribers", "Name": "MasterSubscribers"}
            },
            {
                "CustomerKey": "Q_Staging",
                "Name": "Process Staging",
                "QueryText": "SELECT * FROM Staging_Import",
                "TargetUpdateTypeName": "Overwrite",
                "DataExtensionTarget": {"CustomerKey": "DE_Orders", "Name": "Orders_Daily"}
            }
        ],
        "automations": [
            {
                "CustomerKey": "Auto_Daily_Etl",
                "Name": "Daily ETL",
                "Activities": [
                    {"objectTypeId": 300, "name": "Process Staging", "activityObjectId": "Q_Staging"},
                    {"objectTypeId": 300, "name": "Join Orders to Subscribers", "activityObjectId": "Q_JoinOrders"}
                ]
            }
        ]
    }

# --- 2. Parser / Analyzer ---

class Analyzer:
    def __init__(self, data):
        self.data = data
        self.nodes = []
        self.edges = []
        self.de_map = {de['Name'].lower(): de for de in data['data_extensions']}
        self.de_key_map = {de['CustomerKey'].lower(): de for de in data['data_extensions']}

    def analyze(self):
        # Create nodes for DEs
        for de in self.data['data_extensions']:
            self.add_node(de['CustomerKey'], de['Name'], 'DataExtension', metadata={'fields': de['Fields']})
            # PII Scan
            for field in de['Fields']:
                pii_type = self.detect_pii(field['Name'], field['FieldType'])
                if pii_type:
                    # Attach PII metadata to node (simplified)
                    pass

        # Analyze Queries
        for q in self.data['queries']:
            q_id = q['CustomerKey']
            self.add_node(q_id, q['Name'], 'Query')
            
            # Parse SQL (Simple Regex for demo)
            # Find FROM/JOIN tables
            sql = q['QueryText'].lower()
            # Remove comments
            sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
            sql = re.sub(r'--.*?\n', '', sql)
            
            # Extract table names (simplified)
            # Look for words after FROM or JOIN
            tokens = re.split(r'\s+', sql)
            for i, token in enumerate(tokens):
                if token in ['from', 'join'] and i + 1 < len(tokens):
                    table_ref = tokens[i+1].strip('[]"\'')
                    # Match against DEs
                    matched_de = self.find_de(table_ref)
                    if matched_de:
                        self.add_edge(matched_de['CustomerKey'], q_id, 'READS_FROM', confidence=0.8)
            
            # Target DE
            if q.get('DataExtensionTarget'):
                target_key = q['DataExtensionTarget'].get('CustomerKey')
                if target_key:
                     self.add_edge(q_id, target_key, 'WRITES_TO', confidence=1.0)

        # Analyze Automations
        for auto in self.data['automations']:
            a_id = auto['CustomerKey']
            self.add_node(a_id, auto['Name'], 'Automation')
            for act in auto.get('Activities', []):
                # Link Automation to Activity
                if act.get('activityObjectId'):
                    # Try to find the activity node (e.g. Query)
                    # In this mock, we assume activityObjectId matches Query CustomerKey
                    self.add_edge(a_id, act['activityObjectId'], 'EXECUTES', confidence=1.0)

    def find_de(self, name):
        # Exact match name
        if name.lower() in self.de_map:
            return self.de_map[name.lower()]
        # Exact match key
        if name.lower() in self.de_key_map:
            return self.de_key_map[name.lower()]
        return None

    def detect_pii(self, field_name, field_type):
        name = field_name.lower()
        if 'email' in name: return 'Email'
        if 'phone' in name or 'mobile' in name: return 'Phone'
        if 'ssn' in name or 'social' in name: return 'SSN'
        return None

    def add_node(self, id, label, type, metadata=None):
        if not any(n['data']['id'] == id for n in self.nodes):
            self.nodes.append({
                "data": {
                    "id": id,
                    "label": label,
                    "type": type,
                    "metadata": metadata or {}
                }
            })

    def add_edge(self, source, target, relationship, confidence=1.0):
        edge_id = f"{source}_{relationship}_{target}"
        self.edges.append({
            "data": {
                "id": edge_id,
                "source": source,
                "target": target,
                "label": relationship,
                "confidence": confidence
            }
        })

    def get_graph(self):
        return {
            "elements": {
                "nodes": self.nodes,
                "edges": self.edges
            }
        }

# --- Main Execution ---
if __name__ == "__main__":
    # 1. Ingest
    client = SfmcClient()
    # For this demo, we use mock data if no creds
    raw_data = generate_mock_data()
    
    # 2. Analyze
    analyzer = Analyzer(raw_data)
    analyzer.analyze()
    graph = analyzer.get_graph()
    
    # 3. Output JSON
    # Output directly to public/ for the UI to pick up
    output_path = os.path.join(os.path.dirname(__file__), '../public/graph_snapshot.json')
    with open(output_path, 'w') as f:
        json.dump(graph, f, indent=2)
    
    print(f"Graph snapshot generated at {output_path}")

    # 4. Output CSVs for Neo4j
    import csv
    nodes_path = os.path.join(os.path.dirname(__file__), 'nodes.csv')
    edges_path = os.path.join(os.path.dirname(__file__), 'edges.csv')

    with open(nodes_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['id', 'label', 'type', 'metadata'])
        for n in graph['elements']['nodes']:
            writer.writerow([
                n['data']['id'], 
                n['data']['label'], 
                n['data']['type'], 
                json.dumps(n['data']['metadata'])
            ])

    with open(edges_path, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['source', 'target', 'label', 'confidence'])
        for e in graph['elements']['edges']:
            writer.writerow([
                e['data']['source'], 
                e['data']['target'], 
                e['data']['label'], 
                e['data']['confidence']
            ])

    print(f"Neo4j CSVs generated at {nodes_path} and {edges_path}")
    print(f"Nodes: {len(graph['elements']['nodes'])}")
    print(f"Edges: {len(graph['elements']['edges'])}")
