#!/usr/bin/env python3
"""
SFMC Scanner
- Authenticate (OAuth)
- Retrieve Data Extensions and fields
- Retrieve Query Definitions, Automations, Journeys, CloudPages
- Parse SQL and build graph JSON (nodes/edges)
- Detect PII via heuristics
- Export graph.json and nodes/edges CSV for Neo4j

Configurations via env vars or CLI params. Keep credentials out of source control.
"""

import os
import sys
import json
import re
import argparse
from typing import List, Dict, Any

try:
    import requests
    import sqlparse
    from dotenv import load_dotenv
except Exception:
    print("Missing dependencies. Run: pip install -r requirements.txt")
    raise

# Load .env if present
load_dotenv()

# Config from env
SFMC_CLIENT_ID = os.getenv('SFMC_CLIENT_ID', '')
SFMC_CLIENT_SECRET = os.getenv('SFMC_CLIENT_SECRET', '')
SFMC_AUTH_BASE_URL = os.getenv('SFMC_AUTH_BASE_URL', '')
SFMC_REST_BASE_URL = os.getenv('SFMC_REST_BASE_URL', '')
SFMC_SOAP_BASE_URL = os.getenv('SFMC_SOAP_BASE_URL', '')
ACCOUNT_ID = os.getenv('ACCOUNT_ID', '')

# Simple PII regexes
PII_REGEXES = {
    'email': re.compile(r'^[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}$'),
    'email_inline': re.compile(r'\b[\w\.-]+@[\w\.-]+\.[a-zA-Z]{2,}\b'),
    'phone': re.compile(r'\b\+?\d[\d\-\s()]{5,}\b'),
    'ssn': re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
    'credit_card': re.compile(r'\b(?:\d[ -]*?){13,16}\b'),
}

# SQL FROM/INTO/JOIN regex
FROM_RE = re.compile(r"\b(from|join|into)\s+([\[\]\\w\.\-]+)", re.IGNORECASE)


# -------------------------------
# SFMC API helpers (delegated to sfmc_auth module)
# -------------------------------
from .sfmc_auth import get_cached_oauth_token as get_oauth_token


def rest_get(path: str, token: str, rest_base: str, params: dict = None) -> Any:
    url = rest_base.rstrip('/') + '/' + path.lstrip('/')
    headers = {'Authorization': f'Bearer {token}'}
    r = requests.get(url, headers=headers, params=params)
    try:
        r.raise_for_status()
    except Exception:
        # return raw for debugging
        return {'_http_error': True, 'status_code': r.status_code, 'text': r.text}
    try:
        return r.json()
    except Exception:
        return {'_raw': r.text}


def fetch_automations(token: str, rest_base: str) -> List[Dict[str, Any]]:
    """Fetch automations via REST; return list of automation objects (best-effort)."""
    try:
        resp = rest_get('/automation/v1/automations', token, rest_base)
        if isinstance(resp, dict):
            return resp.get('items') or resp.get('automations') or []
        return resp
    except Exception:
        return []


def fetch_journeys(token: str, rest_base: str) -> List[Dict[str, Any]]:
    """Fetch Journey Builder interactions (best-effort)."""
    try:
        resp = rest_get('/interaction/v1/interactions', token, rest_base)
        if isinstance(resp, dict):
            return resp.get('items') or resp.get('interactions') or []
        return resp
    except Exception:
        return []


def fetch_cloudpages(token: str, rest_base: str) -> List[Dict[str, Any]]:
    """Fetch CloudPage assets (assets endpoint) and return published HTML assets.
    This is a best-effort: it returns assets and their content when available.
    """
    out = []
    try:
        resp = rest_get('/asset/v1/content/assets', token, rest_base, params={'page': 1, 'pageSize': 50})
        items = []
        if isinstance(resp, dict):
            items = resp.get('items') or resp.get('assets') or []
        elif isinstance(resp, list):
            items = resp
        for it in items:
            # only include HTML type assets (CloudPages)
            if it.get('contentType') in ('templatebased', 'htmlemail', 'webpage', 'webpageasset') or it.get('assetType') == 'webpage':
                out.append(it)
    except Exception:
        pass
    return out


def parse_cloudpage_for_des(content: str) -> List[str]:
    """Scan CloudPage HTML/SSJS/AMPscript for DE references (simple heuristics)."""
    tokens = set()
    if not content:
        return []
    # AMPscript Lookup, LookupRows, UpsertDE, DataExtension.Init patterns
    patterns = [r"Lookup\(\s*'([^']+)'", r"LookupRows\(\s*'([^']+)'", r"UpsertData\(\s*'([^']+)'", r"DataExtension\.Init\(\s*'([^']+)'", r"DataExtensionObject\(\s*'([^']+)'"]
    for p in patterns:
        for m in re.findall(p, content, flags=re.IGNORECASE):
            tokens.add(m.strip())
    # also look for usages in JS that reference /hub/v1/dataevents/key:KEY
    for m in re.findall(r"/hub/v1/dataevents/key:([\w\-_.]+)", content, flags=re.IGNORECASE):
        tokens.add(m.strip())
    return list(tokens)


def compute_confidence(evidence: List[str]) -> float:
    """Simple confidence scoring based on evidence strings.
    Assign weights: direct SQL/asset id -> high; name match -> medium; cloudpage token -> low.
    """
    score = 0.0
    for e in evidence:
        le = e.lower()
        if 'query:' in le or 'sql' in le or 'direct reference' in le:
            score += 0.6
        elif 'automation' in le or 'journey' in le or 'entry' in le or 'asset id' in le:
            score += 0.2
        elif 'cloudpage' in le or 'ampscript' in le or 'ssjs' in le:
            score += 0.08
        elif 'naming' in le or 'token' in le:
            score += 0.04
        else:
            score += 0.02
    return min(1.0, score)


def soap_retrieve(soap_base: str, token: str, object_type: str, properties: List[str], page: int = 1, verbose: bool = False) -> List[Dict[str, Any]]:
    """Perform a simple SOAP Retrieve for an object type. This is a minimal implementation and may need extension for large accounts.
    """
    soap_url = soap_base.rstrip('/') + '/Service.asmx'
    props_xml = ''.join(f'<Properties>{p}</Properties>' for p in properties)
    envelope = f'''<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Header>
    <fueloauth xmlns="http://exacttarget.com">{token}</fueloauth>
  </s:Header>
  <s:Body>
    <RetrieveRequestMsg xmlns="http://exacttarget.com/wsdl/partnerAPI">
      <RetrieveRequest>
        <ObjectType>{object_type}</ObjectType>
        {props_xml}
        <RetrieveOptions>
          <BatchSize>2500</BatchSize>
        </RetrieveOptions>
      </RetrieveRequest>
    </RetrieveRequestMsg>
  </s:Body>
</s:Envelope>'''
    headers = {'Content-Type': 'text/xml'}
    r = requests.post(soap_url, data=envelope.encode('utf-8'), headers=headers, timeout=30)
    if verbose:
        # dump raw soap for inspection
        try:
            with open('soap_last_response.xml', 'w', encoding='utf-8') as fh:
                fh.write(r.text)
        except Exception:
            pass
    try:
        r.raise_for_status()
    except Exception:
        # surface raw response for debugging
        return [{'__soap_error': True, 'status_code': r.status_code, 'text': r.text}]
    # Very small XML parse to extract results; a full parser for partnerAPI is out of scope here
    # We'll attempt a naive approach: look for <Results> blocks and key/value pairs within
    import xml.etree.ElementTree as ET
    root = ET.fromstring(r.text)
    namespace = {'soap': 'http://schemas.xmlsoap.org/soap/envelope/', 'tns': 'http://exacttarget.com/wsdl/partnerAPI'}
    results = []
    for res in root.findall('.//tns:Results', namespace):
        obj = {}
        for child in list(res):
            tag = child.tag
            if '}' in tag:
                tag = tag.split('}', 1)[1]
            # if element has text, use it
            text = child.text.strip() if child.text else ''
            obj[tag] = text
        if obj:
            results.append(obj)
    return results


# -------------------------------
# Scanners / parsers
# -------------------------------

def extract_table_tokens(sql_text: str) -> List[str]:
    # remove comments and quoted literals using sqlparse
    try:
        formatted = sqlparse.format(sql_text, strip_comments=True)
    except Exception:
        formatted = sql_text
    tokens = FROM_RE.findall(formatted)
    cleaned = [t[1].strip(' []') for t in tokens]
    return cleaned


def detect_field_pii(field_name: str, field_type: str = '') -> Dict[str, Any]:
    name = (field_name or '').lower()
    hints = {
        'pii_suspect': False,
        'reasons': []
    }
    # quick heuristics
    if 'email' in name or 'e-mail' in name or field_type.lower() == 'emailaddress':
        hints['pii_suspect'] = True
        hints['reasons'].append('email pattern')
    if 'phone' in name or 'mobile' in name:
        hints['pii_suspect'] = True
        hints['reasons'].append('phone pattern')
    if any(x in name for x in ['ssn', 'ssn_mask', 'social']):
        hints['pii_suspect'] = True
        hints['reasons'].append('ssn-like')
    # type hint
    if field_type and field_type.lower() in ['emailaddress', 'phone']:
        hints['pii_suspect'] = True
        hints['reasons'].append(f'type:{field_type}')
    return hints


# -------------------------------
# Graph builder
# -------------------------------

def build_graph(known_des: List[Dict[str, Any]], queries: List[Dict[str, Any]]) -> Dict[str, Any]:
    nodes = []
    edges = []

    # Create DE nodes
    for de in known_des:
        node = {
            'id': f"de::{de.get('CustomerKey') or de.get('CustomerKey')}",
            'type': 'DataExtension',
            'name': de.get('Name') or de.get('CustomerKey'),
            'externalKey': de.get('CustomerKey'),
            'accountId': ACCOUNT_ID,
            'metadata': {
                'fields': de.get('fields', []),
            }
        }
        nodes.append(node)

    # Query nodes and edges
    for q in queries:
        qid = q.get('id') or q.get('CustomerKey') or str(q.get('ObjectID') or q.get('ObjectID'))
        qnode = {
            'id': f"query::{qid}",
            'type': 'Query',
            'name': q.get('name') or q.get('Name') or f"Query {qid}",
            'sql': q.get('queryText') or q.get('QueryText') or q.get('SQL'),
        }
        nodes.append(qnode)
        sql_text = qnode['sql'] or ''
        tokens = extract_table_tokens(sql_text)
        for t in tokens:
            normalized = t.lower()
            matched = None
            for de in known_des:
                if (de.get('Name') and de.get('Name').lower() == normalized) or (de.get('CustomerKey') and de.get('CustomerKey').lower() == normalized):
                    matched = de
                    break
            if matched:
                edges.append({
                    'from': qnode['id'],
                    'to': f"de::{matched.get('CustomerKey')}",
                    'relationship': 'reads_from',
                    'evidence': [f"Query:{qid} reference"],
                    'confidence': 0.9
                })
            else:
                edges.append({
                    'from': qnode['id'],
                    'to': f"unknown::{t}",
                    'relationship': 'reads_from',
                    'evidence': [f"SQL token:{t}"],
                    'confidence': 0.4
                })

    return {'nodes': nodes, 'edges': edges}


# -------------------------------
# Main orchestration
# -------------------------------

def orchestrate(out_dir: str):
    os.makedirs(out_dir, exist_ok=True)
    verbose = bool(globals().get('VERBOSE_FLAG', False))

    print('Authenticating to SFMC...')
    token_resp = get_oauth_token(SFMC_CLIENT_ID, SFMC_CLIENT_SECRET, SFMC_AUTH_BASE_URL)
    # get_oauth_token may return either a token string (cached helper) or a dict
    if isinstance(token_resp, dict):
        access_token = token_resp.get('access_token') or token_resp.get('accessToken')
    else:
        access_token = token_resp
    if not access_token:
        print('Failed to obtain access token. Response:', token_resp)
        sys.exit(1)

    print('Fetching Data Extensions (SOAP)...')
    try:
        des = soap_retrieve(SFMC_SOAP_BASE_URL, access_token, 'DataExtension', ['CustomerKey', 'Name'], verbose=verbose)
    except Exception as e:
        print('SOAP DataExtension retrieve failed:', e)
        des = []

    # Attempt REST query definitions
    print('Fetching Query Definitions (REST)...')
    queries = []
    try:
        q_resp = rest_get('/automation/v1/queries', access_token, SFMC_REST_BASE_URL)
        # may be under 'queries' or 'items'
        if isinstance(q_resp, dict):
            queries = q_resp.get('items') or q_resp.get('queries') or []
        elif isinstance(q_resp, list):
            queries = q_resp
    except Exception as e:
        print('REST queries fetch failed, trying SOAP fallback. Error:', e)
        # SOAP fallback for QueryDefinition
        try:
                queries = soap_retrieve(SFMC_SOAP_BASE_URL, access_token, 'QueryDefinition', ['ObjectID', 'CustomerKey', 'Name', 'QueryText'], verbose=verbose)
        except Exception as e2:
            print('SOAP QueryDefinition retrieve failed:', e2)
            queries = []

    print(f'Found {len(des)} DEs and {len(queries)} queries (best-effort).')

    # Fetch automations, journeys, and cloudpages
    print('Fetching Automations, Journeys, and CloudPages (REST)...')
    automations = fetch_automations(access_token, SFMC_REST_BASE_URL)
    journeys = fetch_journeys(access_token, SFMC_REST_BASE_URL)
    cloudpages = fetch_cloudpages(access_token, SFMC_REST_BASE_URL)

    print(f'Found {len(automations)} automations, {len(journeys)} journeys, {len(cloudpages)} cloudpages (best-effort).')
    # For each DE, try to fetch fields (SOAP DataExtensionField)
    print('Fetching DE fields (SOAP, per-DE, up to limits)...')
    for de in des:
        ck = de.get('CustomerKey') or de.get('CustomerKey')
        if not ck:
            continue
        try:
            fields = soap_retrieve(SFMC_SOAP_BASE_URL, access_token, 'DataExtensionField', ['Name', 'FieldType', 'IsPrimaryKey'], verbose=verbose)
            # naive: return all fields and attach; in some SOAP responses you'll need to filter by DataExtension.CustomerKey
            de['fields'] = []
            for f in fields:
                de['fields'].append({'name': f.get('Name'), 'type': f.get('FieldType')})
        except Exception:
            de['fields'] = []

    graph = build_graph(des, queries)

    # Enrich graph with automations, journeys, and cloudpages
    for a in automations:
        aid = a.get('id') or a.get('automationId') or a.get('objectId')
        anode = {'id': f"automation::{aid}", 'type': 'Automation', 'name': a.get('name') or a.get('Name')}
        graph['nodes'].append(anode)
        # inspect activities in automation if available
        acts = a.get('activities') or a.get('activity') or []
        for act in acts:
            # if activity references a query or DE
            label = act.get('activityType') or act.get('type') or ''
            # look for target DE in payload
            target = None
            if isinstance(act, dict):
                target = act.get('arguments', {}).get('to') or act.get('configuration', {}).get('destination') or act.get('dataExtensionCustomerKey')
            if target:
                ev = [f"Automation:{aid} activity:{label}"]
                conf = compute_confidence(ev)
                graph['edges'].append({'from': anode['id'], 'to': f"de::{target}", 'relationship': 'writes_to', 'evidence': ev, 'confidence': conf})

    for j in journeys:
        jid = j.get('id') or j.get('interactionKey') or j.get('definitionId')
        jnode = {'id': f"journey::{jid}", 'type': 'Journey', 'name': j.get('name') or j.get('displayName')}
        graph['nodes'].append(jnode)
        # try to find entry sources referencing DE
        entry = j.get('entryEvent') or j.get('entrySource') or j.get('entry')
        if isinstance(entry, dict):
            de_ref = entry.get('dataExtensionId') or entry.get('dataExtensionKey') or entry.get('customerKey')
            if de_ref:
                ev = [f"Journey:{jid} entry"]
                conf = compute_confidence(ev)
                graph['edges'].append({'from': f"de::{de_ref}", 'to': jnode['id'], 'relationship': 'used_by', 'evidence': ev, 'confidence': conf})

    for cp in cloudpages:
        cid = cp.get('id') or cp.get('assetId') or cp.get('id')
        cpnode = {'id': f"cloudpage::{cid}", 'type': 'CloudPage', 'name': cp.get('name') or cp.get('displayName')}
        graph['nodes'].append(cpnode)
        # try to fetch content if available (asset content endpoint)
        content = ''
        try:
            asset_id = cp.get('id') or cp.get('assetId')
            if asset_id:
                aresp = rest_get(f'/asset/v1/content/assets/{asset_id}', access_token, SFMC_REST_BASE_URL)
                # asset content may be nested; try some fields
                content = aresp.get('content') or aresp.get('html') or json.dumps(aresp)
        except Exception:
            content = ''
        tokens = parse_cloudpage_for_des(content)
        for t in tokens:
            ev = [f"CloudPage:{cid} token:{t}"]
            conf = compute_confidence(ev)
            graph['edges'].append({'from': cpnode['id'], 'to': f"de::{t}", 'relationship': 'references', 'evidence': ev, 'confidence': conf})

    out_json = os.path.join(out_dir, 'graph.json')
    with open(out_json, 'w', encoding='utf-8') as fh:
        json.dump(graph, fh, ensure_ascii=False, indent=2)
    print('Wrote', out_json)

    # produce simple CSV for Neo4j import (nodes.csv, edges.csv)
    import csv
    nodes_csv = os.path.join(out_dir, 'nodes.csv')
    edges_csv = os.path.join(out_dir, 'edges.csv')

    with open(nodes_csv, 'w', newline='', encoding='utf-8') as nf:
        writer = csv.writer(nf)
        writer.writerow(['id', 'type', 'name', 'externalKey', 'metadata'])
        for n in graph['nodes']:
            writer.writerow([n.get('id'), n.get('type'), n.get('name'), n.get('externalKey', ''), json.dumps(n.get('metadata', {}))])

    with open(edges_csv, 'w', newline='', encoding='utf-8') as ef:
        writer = csv.writer(ef)
        writer.writerow(['from', 'to', 'relationship', 'evidence', 'confidence'])
        for e in graph['edges']:
            writer.writerow([e.get('from'), e.get('to'), e.get('relationship'), json.dumps(e.get('evidence', [])), e.get('confidence', '')])

    print('Wrote', nodes_csv, edges_csv)
    print('Done.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='SFMC scanner: export DE lineage graph')
    parser.add_argument('--out', '--out-dir', dest='out', default='./output', help='Output directory for graph.json and CSVs')
    parser.add_argument('--verbose', dest='verbose', action='store_true', help='Write verbose SOAP/REST responses for debugging')
    args = parser.parse_args()
    # pass verbose flag to orchestrate via global var set (quick pattern)
    if args.verbose:
        # set a module-level flag by monkeypatching local symbol (simple approach)
        globals()['VERBOSE_FLAG'] = True
    orchestrate(args.out)
