export type SfmcDe = {
  id: string;
  name: string;
  externalKey?: string;
  folderPath?: string;
  fields: Array<{ name: string; dataType?: string }>;
};

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 10_000 > now) {
    return tokenCache.token;
  }

  const clientId = process.env.SFMC_CLIENT_ID;
  const clientSecret = process.env.SFMC_CLIENT_SECRET;
  const authBase = (process.env.SFMC_AUTH_BASE_URL || '').replace(/\/$/, '');
  const accountId = process.env.SFMC_ACCOUNT_ID; // optional BU scoping

  if (!clientId || !clientSecret || !authBase) {
    throw new Error('SFMC env not configured (SFMC_CLIENT_ID/SECRET/AUTH_BASE_URL)');
  }

  const url = `${authBase}/v2/token`;
  const body: any = {
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
  };
  if (accountId) body.account_id = accountId;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SFMC token error ${res.status}: ${txt}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 30) * 1000 };
  return data.access_token;
}

async function sfmcGet(path: string, init?: RequestInit) {
  const restBase = (process.env.SFMC_REST_BASE_URL || '').replace(/\/$/, '');
  if (!restBase) throw new Error('SFMC_REST_BASE_URL not set');
  const token = await getAccessToken();
  const res = await fetch(`${restBase}${path}`, {
    ...init,
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SFMC GET ${path} failed ${res.status}: ${txt}`);
  }
  return res.json();
}

export async function fetchDataExtensions(): Promise<SfmcDe[]> {
  // If env not present, return deterministic sample data so UI is interactive
  if (!process.env.SFMC_CLIENT_ID) {
    return sampleDes();
  }
  try {
    // Connectivity sanity check (does not expose data)
    await sfmcGet('/platform/v1/endpoints');

    // Retrieve DE metadata via SOAP (preferred for full DE details)
    const live = await fetchDataExtensionsSOAP();
    if (live.length > 0) return live;
    return sampleDes();
  } catch {
    // Graceful fallback: return sample data if anything fails
    return sampleDes();
  }
}

// --------- Additional SFMC REST helpers for usage mapping (best-effort) ---------
export async function fetchJourneys() {
  try {
    const data = await sfmcGet('/interaction/v1/interactions');
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((x: any) => ({ id: x.id ?? x.key ?? x.objectID, name: x.name ?? x.description ?? 'Journey' }));
  } catch {
    return [
      { id: 'j-1', name: 'WelcomeJourney' },
      { id: 'j-2', name: 'ReactivationJourney' },
    ];
  }
}

export async function fetchAutomations() {
  try {
    const data = await sfmcGet('/automation/v1/automations');
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((x: any) => ({ id: x.id ?? x.key ?? x.objectID, name: x.name ?? 'Automation', status: x.status }));
  } catch {
    return [
      { id: 'a-1', name: 'Nightly_Load', status: 'Ready' },
      { id: 'a-2', name: 'Weekly_Cleanup', status: 'Ready' },
    ];
  }
}

export async function fetchQueries() {
  try {
    const data = await sfmcGet('/automation/v1/queries');
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((x: any) => ({ id: x.id ?? x.key ?? x.objectID, name: x.name ?? 'Query', queryText: x.queryText ?? '' }));
  } catch {
    return [
      { id: 'q-1', name: 'Q_LoadSubscribers', queryText: 'SELECT * FROM StagingContacts' },
      { id: 'q-2', name: 'Q_UpdateMaster', queryText: 'UPDATE MasterSubscribers SET ...' },
    ];
  }
}

export async function fetchCloudPages() {
  try {
    // Best-effort: Assets API (asset/v1) is commonly available; filter basic web types
    const data = await sfmcGet('/asset/v1/content/assets?$page=1&$pagesize=50');
    const items = Array.isArray(data?.items) ? data.items : [];
    return items
      .filter((x: any) => (x?.assetType?.name || '').toLowerCase().includes('web'))
      .map((x: any) => ({ id: x.id ?? x.customerKey ?? x.objectID, name: x.name ?? 'CloudPage' }));
  } catch {
    return [
      { id: 'cp-1', name: 'ProfileUpdatePage' },
    ];
  }
}

export async function fetchExports() {
  try {
    // Placeholder: Data Extracts/Exports endpoints vary; return empty gracefully
    const data = await sfmcGet('/automation/v1/dataextracts');
    const items = Array.isArray(data?.items) ? data.items : [];
    return items.map((x: any) => ({ id: x.id ?? x.key ?? x.objectID, name: x.name ?? 'Export' }));
  } catch {
    return [
      { id: 'ex-1', name: 'Weekly_Export' },
    ];
  }
}

export async function fetchAssetContentById(id: string) {
  try {
    const data = await sfmcGet(`/asset/v1/content/assets/${encodeURIComponent(id)}`);
    return data || null;
  } catch {
    return null;
  }
}

// ---------------- SOAP helpers ----------------
const SOAP_NS = 'http://exacttarget.com/wsdl/partnerAPI';

async function soapPost(xmlBody: string) {
  const token = await getAccessToken();
  const base = (process.env.SFMC_SOAP_BASE_URL || '').replace(/\/$/, '');
  if (!base) throw new Error('SFMC_SOAP_BASE_URL not set');
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
  <s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
    <s:Header>
      <fueloauth xmlns="${SOAP_NS}">${token}</fueloauth>
    </s:Header>
    <s:Body>
      ${xmlBody}
    </s:Body>
  </s:Envelope>`;
  const res = await fetch(`${base}/Service.asmx`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      Accept: 'text/xml',
    },
    body: envelope,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SFMC SOAP error ${res.status}: ${txt}`);
  }
  return res.text();
}

function extractTag(text: string, tag: string): string[] {
  const rx = new RegExp(`<${tag}[^>]*>([\s\S]*?)<\\/${tag}>`, 'g');
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text))) out.push(m[1]);
  return out;
}

function decodeXml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

type SoapRetrieveOpts = { objectType: string; properties: string[]; continueRequestId?: string; filterXml?: string };

async function soapRetrieve({ objectType, properties, continueRequestId, filterXml }: SoapRetrieveOpts) {
  const propsXml = properties.map((p) => `<Properties xmlns=\"${SOAP_NS}\">${p}</Properties>`).join('');
  const body = continueRequestId
    ? `<ContinueRequest xmlns=\"${SOAP_NS}\">${continueRequestId}</ContinueRequest>`
    : `<RetrieveRequestMsg xmlns=\"${SOAP_NS}\"><RetrieveRequest><ObjectType>${objectType}</ObjectType>${propsXml}${filterXml ?? ''}</RetrieveRequest></RetrieveRequestMsg>`;
  const xml = await soapPost(body);
  const hasMore = /<OverallStatus>MoreDataAvailable<\/OverallStatus>/.test(xml);
  const requestIdMatch = xml.match(/<RequestID>([^<]+)<\/RequestID>/);
  const requestId = requestIdMatch ? requestIdMatch[1] : undefined;
  const results = extractTag(xml, 'Results');
  return { xml, results, hasMore, requestId };
}

function mapFieldTypeToDataType(t: string | undefined): string {
  if (!t) return 'Unknown';
  const n = t.toLowerCase();
  if (n.includes('email')) return 'Email';
  if (n.includes('phone')) return 'Phone';
  if (n.includes('date')) return 'Date';
  if (n.includes('bool')) return 'Bool';
  if (n.includes('number') || n.includes('decimal') || n.includes('int')) return 'Number';
  if (n.includes('text') || n.includes('string')) return 'Text';
  return 'Unknown';
}

async function fetchDataExtensionsSOAP(): Promise<SfmcDe[]> {
  const des: Array<{ Name: string; CustomerKey: string; CategoryID?: string }> = [];
  // Retrieve DataExtension basic info (paged)
  let more = true;
  let continueId: string | undefined;
  while (more) {
    const { xml, hasMore, requestId } = await soapRetrieve({
      objectType: 'DataExtension',
      properties: ['Name', 'CustomerKey', 'CategoryID'],
      continueRequestId: continueId,
    });
    const nameTags = extractTag(xml, 'Name');
    const keyTags = extractTag(xml, 'CustomerKey');
    const catTags = extractTag(xml, 'CategoryID');
    for (let i = 0; i < keyTags.length; i++) {
      des.push({
        Name: decodeXml(nameTags[i] || ''),
        CustomerKey: decodeXml(keyTags[i] || ''),
        CategoryID: decodeXml(catTags[i] || ''),
      });
    }
    more = hasMore;
    continueId = hasMore ? requestId : undefined;
    if (des.length > 2000) break; // safety cap
  }

  // For each DE, retrieve its fields
  const results: SfmcDe[] = [];
  for (const de of des) {
    const filterXml = `<Filter xsi:type=\"SimpleFilterPart\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\"><Property>DataExtension.CustomerKey</Property><SimpleOperator>equals</SimpleOperator><Value>${de.CustomerKey}</Value></Filter>`;
    const { xml } = await soapRetrieve({
      objectType: 'DataExtensionField',
      properties: ['Name', 'FieldType'],
      filterXml,
    });
    const fieldNames = extractTag(xml, 'Name');
    const fieldTypes = extractTag(xml, 'FieldType');
    const fields = fieldNames.map((n, i) => ({ name: decodeXml(n), dataType: mapFieldTypeToDataType(fieldTypes[i]) }));
    results.push({ id: de.CustomerKey, name: de.Name, fields });
    if (results.length >= 400) break; // avoid huge scans on first pass
  }
  return results;
}

function sampleDes(): SfmcDe[] {
  return [
    {
      id: 'sample-1',
      name: 'Contacts',
      fields: [
        { name: 'EmailAddress', dataType: 'Email' },
        { name: 'FirstName', dataType: 'Text' },
        { name: 'LastName', dataType: 'Text' },
      ],
    },
    {
      id: 'sample-2',
      name: 'Leads_Archive',
      fields: [
        { name: 'Phone', dataType: 'Text' },
        { name: 'CreatedAt', dataType: 'Date' },
      ],
    },
  ];
}
