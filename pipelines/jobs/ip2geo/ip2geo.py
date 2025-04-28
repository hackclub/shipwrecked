import os
import sys
import requests
import itertools
import math
import argparse
import time
import logging
from typing import Callable, TypeVar, Any

from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

# -----
# Load Environment
# -----

parser = argparse.ArgumentParser(description='Iterates over Shipwrecked RSVP table and converts ip -> country, saving off that country to airtable')
parser.add_argument('--airtable-api-key', required=True, help='Airtable API Key')
parser.add_argument('--airtable-base-id', required=True, help='Airtable Base ID')
parser.add_argument('--ipinfo-api-token', required=True, help='IPInfo API Token')

args = parser.parse_args()

AIRTABLE_API = args.airtable_api_key
AIRTABLE_BASE = args.airtable_base_id
IPINFO_API = args.ipinfo_api_token

# -----
# Requests Setup
# -----

class AirtableAuth(requests.auth.AuthBase):
    def __call__(self, r):
        r.headers["Authorization"] = f"Bearer {AIRTABLE_API}"
        return r

class IpinfoAuth(requests.auth.AuthBase):
    def __call__(self, r):
        r.headers["Authorization"] = f"Bearer {IPINFO_API}"
        return r

# -----
# Retry Logic
# -----

T = TypeVar('T')

def with_retry(
    operation: Callable[[], T],
    max_retries: int = 5,
    initial_delay: float = 1.0,
    operation_name: str = "operation"
) -> T:
    """
    Retry an operation with exponential backoff.
    
    Args:
        operation: The function to retry
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        operation_name: Name of the operation for logging
    
    Returns:
        The result of the operation if successful
    
    Raises:
        Exception: If all retries are exhausted
    """
    retries = 0
    while retries < max_retries:
        try:
            logger.info(f"Attempting {operation_name} (attempt {retries + 1}/{max_retries})")
            return operation()
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 429:
                retries += 1
                if retries == max_retries:
                    logger.error(f"Rate limit exceeded after {max_retries} retries")
                    raise
                delay = initial_delay * (2 ** (retries - 1))
                logger.warning(f"Rate limit hit, waiting {delay} seconds before retry...")
                time.sleep(delay)
                continue
            logger.error(f"HTTP error occurred: {e}")
            raise
        except Exception as e:
            logger.error(f"Error occurred: {e}")
            raise

# -----
# Fetch Airtable Records
# -----

query = {
    "fields[]": "IP Address",
    "filterByFormula": "AND({IP Address} != 'Unknown', {Country} = BLANK())",
    "maxRecords": 100,
}

logger.info("Fetching Queued Airtable Records")
data = requests.get(
    f"https://api.airtable.com/v0/{AIRTABLE_BASE}/RSVPs",
    params=query,
    auth=AirtableAuth(),
).json()

logger.info(f'Found {len(data["records"])} Records!')
if len(data["records"]) == 0:
    logger.info("No Records left to process, exitting...")
    sys.exit(0)

# -----
# Parse Records
# -----

# Parses an airtable records to (AIRTABLE_ID, IP)
def parse_record(record):
    id = record["id"]
    ip = record["fields"]["IP Address"]
    return (id, ip)

# Parses all of the records
logger.info("Parsing Records...")
records = map(parse_record, data["records"])

# -----
# Processing
# -----

# Get Geo Location
def get_geoloc(ip: str) -> str:
    def fetch_country():
        response = requests.get(
            f"https://ipinfo.io/{ip}/country", auth=IpinfoAuth()
        )
        response.raise_for_status()
        return response.text.strip()
    
    return with_retry(
        operation=fetch_country,
        operation_name=f"fetching country for IP {ip}",
        max_retries=5,
        initial_delay=1
    )

# -----
# Update Records
# -----

def update(record):
    (id, ip) = record
    country = get_geoloc(ip)
    if country in ["Rate limit exceeded", "Error fetching country"]:
        logger.warning(f"Skipping update for {ip} due to error")
        return None
    return {"id": id, "fields": {"Country": country}}

logger.info("Updating Records...")
records = list(map(update, records))
records = [r for r in records if r is not None]  # Filter out None values

# -----
# Patch Airbase Table
# -----

# Airtable Patch works in groups of 10
if records:  # Only proceed if we have valid records to update
    batch_n = math.ceil(len(records) / 10)
    for i in range(0, len(records), 10):
        batch = records[i:i + 10]
        logger.info(f"Patching Airtable Base with Batch {i//10 + 1}/{batch_n}")
        data = requests.patch(
            f"https://api.airtable.com/v0/{AIRTABLE_BASE}/RSVPs",
            json={"records": batch},
            auth=AirtableAuth(),
        )
else:
    logger.info("No valid records to update")
