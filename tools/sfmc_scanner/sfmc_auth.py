import time
import requests
from typing import Dict, Any, Optional


def get_oauth_token(client_id: str, client_secret: str, auth_base_url: str, timeout: int = 10, retries: int = 2, backoff: float = 1.0) -> Dict[str, Any]:
    """Request an OAuth v2 token from SFMC token endpoint with retries and basic validation.

    Parameters
    - client_id, client_secret: credentials
    - auth_base_url: e.g. https://your-subdomain.auth.marketingcloudapis.com
    - timeout: request timeout seconds
    - retries: retry count on transient failures
    - backoff: initial backoff seconds (multiplied on each retry)

    Returns the parsed JSON response (contains access_token, expires_in, etc.)

    Raises requests.HTTPError on non-2xx responses after retries.
    """
    if not client_id or not client_secret or not auth_base_url:
        raise ValueError('client_id, client_secret and auth_base_url are required')

    token_url = auth_base_url.rstrip('/') + '/v2/token'
    payload = {
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret,
    }

    last_exc: Optional[Exception] = None
    for attempt in range(0, retries + 1):
        try:
            resp = requests.post(token_url, json=payload, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()
            # minimal validation
            if 'access_token' not in data:
                raise ValueError(f"Token response missing access_token: {data}")
            return data
        except Exception as exc:
            last_exc = exc
            if attempt < retries:
                sleep_for = backoff * (2 ** attempt)
                time.sleep(sleep_for)
                continue
            # re-raise the last exception
            raise


# Optional simple in-memory cache helper
_cached_token: Dict[str, Any] = {}


def get_cached_oauth_token(client_id: str, client_secret: str, auth_base_url: str, **kwargs) -> str:
    """Get the access_token string, caching within process until expiry.

    Returns the access_token string. Uses response['expires_in'] to set TTL when available.
    """
    cache_key = f"{client_id}:{auth_base_url}"
    entry = _cached_token.get(cache_key)
    if entry:
        expires_at = entry.get('expires_at', 0)
        if time.time() < expires_at - 5:
            return entry['access_token']

    data = get_oauth_token(client_id, client_secret, auth_base_url, **kwargs)
    access_token = data.get('access_token')
    expires_in = int(data.get('expires_in') or 0)
    expires_at = time.time() + max(expires_in, 60)

    _cached_token[cache_key] = {'access_token': access_token, 'expires_at': expires_at}
    return access_token
