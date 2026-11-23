#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple NFT Gifts Parser - Direct Fragment.com API
Парсит NFT подарки напрямую с Fragment.com
"""

import asyncio
import json
import sys
from typing import List, Dict
from datetime import datetime
from pathlib import Path

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

try:
    import aiohttp
except ImportError:
    print("ERROR: aiohttp not installed")
    print("Install: pip install aiohttp")
    sys.exit(1)

# Configuration
OUTPUT_FILE = "nft-gifts-data.json"
BACKUP_DIR = "wujje-backups/nft-data"
TON_TO_RUB_DEFAULT = 180.0
FRAGMENT_API = "https://fragment.com/api"


async def fetch_ton_price() -> float:
    """Get current TON/RUB rate"""
    try:
        async with aiohttp.ClientSession() as session:
            url = "https://api.coingecko.com/api/v3/simple/price"
            params = {"ids": "the-open-network", "vs_currencies": "rub"}

            async with session.get(url, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    price = data.get("the-open-network", {}).get("rub", TON_TO_RUB_DEFAULT)
                    print(f"TON Rate: {price:.2f} RUB")
                    return float(price)
    except Exception as e:
        print(f"WARNING: Failed to fetch TON price: {e}")

    print(f"Using default rate: {TON_TO_RUB_DEFAULT} RUB")
    return TON_TO_RUB_DEFAULT


async def fetch_fragment_gifts() -> List[Dict]:
    """
    Fetch NFT gifts from Fragment.com via GraphQL API
    """
    print("Fetching gifts from Fragment.com...")

    # Fragment GraphQL query for gifts
    query = """
    query GetGifts($cursor: String) {
        gifts(first: 100, after: $cursor) {
            edges {
                node {
                    id
                    name
                    slug
                    totalSupply
                    floorPrice
                    imageUrl
                    attributes {
                        traitType
                        value
                    }
                }
            }
            pageInfo {
                hasNextPage
                endCursor
            }
        }
    }
    """

    gifts = []

    try:
        async with aiohttp.ClientSession() as session:
            cursor = None
            page = 1

            while True:
                payload = {
                    "query": query,
                    "variables": {"cursor": cursor}
                }

                async with session.post(
                    FRAGMENT_API,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as resp:
                    if resp.status != 200:
                        print(f"Fragment API returned {resp.status}")
                        break

                    data = await resp.json()

                    if 'data' not in data or 'gifts' not in data['data']:
                        print("No gifts data in response")
                        break

                    edges = data['data']['gifts']['edges']
                    page_info = data['data']['gifts']['pageInfo']

                    for edge in edges:
                        gifts.append(edge['node'])

                    print(f"Page {page}: +{len(edges)} gifts (total: {len(gifts)})")

                    # Check if there's more
                    if not page_info.get('hasNextPage'):
                        break

                    cursor = page_info.get('endCursor')
                    page += 1

                    # Safety limit
                    if page > 20:
                        print("Reached page limit")
                        break

        print(f"SUCCESS: Fetched {len(gifts)} gifts from Fragment")
        return gifts

    except Exception as e:
        print(f"ERROR: Failed to fetch Fragment gifts: {e}")
        import traceback
        traceback.print_exc()
        return []


async def parse_gifts(gifts_raw: List[Dict], ton_price: float) -> List[Dict]:
    """Convert raw Fragment data to our format"""
    parsed_gifts = []

    for gift in gifts_raw:
        try:
            gift_id = gift.get('id', '')
            name = gift.get('name', 'Unknown Gift')
            slug = gift.get('slug', '')
            total_supply = gift.get('totalSupply')

            # Price
            floor_price_ton = float(gift.get('floorPrice', 0))
            floor_price_rub = round(floor_price_ton * ton_price, 2) if floor_price_ton > 0 else 0

            # Image
            image_url = gift.get('imageUrl')
            if not image_url and slug:
                image_url = f"https://fragment.com/gift/{slug}/preview.png"

            # Extract attributes
            background = None
            pattern = None
            symbol = '🎁'
            rarity = None

            attributes = gift.get('attributes', [])
            for attr in attributes:
                trait_type = attr.get('traitType', '').lower()
                value = attr.get('value')

                if 'background' in trait_type or 'color' in trait_type:
                    background = value
                elif 'pattern' in trait_type:
                    pattern = value
                elif 'symbol' in trait_type or 'emoji' in trait_type:
                    symbol = value
                elif 'rarity' in trait_type:
                    rarity = value

            parsed_gift = {
                "id": str(gift_id),
                "title": name,
                "floor_ton": floor_price_ton,
                "floor_rub": floor_price_rub,
                "total_supply": total_supply,
                "available": True,
                "rarity": rarity,
                "image_url": image_url,
                "marketplace": "fragment",
                "marketplace_url": f"https://fragment.com/gift/{slug}" if slug else None,
                "attributes": {
                    "background": background,
                    "pattern": pattern,
                    "symbol": symbol
                }
            }

            parsed_gifts.append(parsed_gift)

        except Exception as e:
            print(f"WARNING: Failed to parse gift: {e}")
            continue

    return parsed_gifts


def save_to_json(gifts: List[Dict], output_file: str = OUTPUT_FILE):
    """Save data to JSON"""
    data = {
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_gifts": len(gifts),
        "gifts": gifts
    }

    # Create backup if exists
    output_path = Path(output_file)
    if output_path.exists():
        backup_dir = Path(BACKUP_DIR)
        backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"nft-gifts-data_{timestamp}.json"

        output_path.rename(backup_file)
        print(f"Backup created: {backup_file}")

    # Save
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"SUCCESS: Data saved to {output_file}")


async def main():
    print("NFT Gifts Parser (Fragment.com Direct)\n")

    # Fetch TON price
    ton_price = await fetch_ton_price()

    # Fetch gifts from Fragment
    gifts_raw = await fetch_fragment_gifts()

    if not gifts_raw:
        print("\nTrying fallback: using demo data...")
        # For testing, create demo data
        gifts_raw = []

    # Parse to our format
    gifts = await parse_gifts(gifts_raw, ton_price)

    if not gifts:
        print("\nWARNING: No gifts to save")
        return

    # Save
    save_to_json(gifts)

    print(f"\nDONE! Processed {len(gifts)} gifts")


if __name__ == "__main__":
    asyncio.run(main())
