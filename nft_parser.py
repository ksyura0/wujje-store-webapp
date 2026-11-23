#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NFT Gifts Parser with tg-gifts-sdk
Парсер для получения данных о NFT подарках через tg-gifts-sdk
Объединяет данные с Tonnel, Portals, Fragment
"""

import asyncio
import json
import sys
from typing import List, Dict, Optional
from datetime import datetime
import os
from pathlib import Path

# Фиксим кодировку для Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

try:
    from tg_gifts_sdk import FragmentClient, Gift
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    print("WARNING: tg-gifts-sdk not installed")
    print("Install: pip install tg-gifts-sdk")

try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    print("WARNING: aiohttp not installed")
    print("Install: pip install aiohttp")


# ============================================
# CONFIGURATION
# ============================================

OUTPUT_FILE = "nft-gifts-data.json"
BACKUP_DIR = "wujje-backups/nft-data"
TON_TO_RUB_DEFAULT = 180.0  # Default rate if API unavailable


# ============================================
# TON PRICE FETCHER
# ============================================

async def fetch_ton_price() -> float:
    """Get current TON/RUB rate from CoinGecko"""
    if not AIOHTTP_AVAILABLE:
        print(f"WARNING: Using default rate: {TON_TO_RUB_DEFAULT} RUB")
        return TON_TO_RUB_DEFAULT

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
                else:
                    print(f"WARNING: CoinGecko returned {resp.status}, using default")
                    return TON_TO_RUB_DEFAULT
    except Exception as e:
        print(f"WARNING: Failed to fetch TON price: {e}")
        return TON_TO_RUB_DEFAULT


# ============================================
# PARSER FUNCTIONS
# ============================================

async def fetch_all_gifts() -> List[Dict]:
    """
    Fetch all NFT gifts via tg-gifts-sdk FragmentClient (public API)
    """
    if not SDK_AVAILABLE:
        print("ERROR: tg-gifts-sdk not installed")
        print("Install: pip install tg-gifts-sdk")
        return []

    try:
        print("Fetching gifts from Fragment...")

        # Create Fragment client (no auth required, public API)
        client = FragmentClient()

        # Fetch all gift listings from Fragment
        gifts_response = await client.fetch_listings()

        print(f"SUCCESS: Received {len(gifts_response)} gift listings from Fragment")

        # Get current TON rate
        ton_price = await fetch_ton_price()

        # Convert to our format
        parsed_gifts = []

        for idx, listing in enumerate(gifts_response):
            try:
                # Safe attribute extraction from Listing object
                gift_id = getattr(listing, 'id', f"gift_{idx}")

                # Get gift object
                gift = getattr(listing, 'gift', None)
                if not gift:
                    continue

                name = getattr(gift, 'name', 'Unknown Gift')

                # Price handling
                price_ton = float(getattr(listing, 'price', 0))
                price_rub = round(price_ton * ton_price, 2) if price_ton > 0 else 0

                # Gift attributes
                total_supply = getattr(gift, 'total_supply', None)
                rarity = getattr(gift, 'rarity', None)

                # Image URL construction
                image_url = None
                if hasattr(gift, 'image_url'):
                    image_url = gift.image_url
                elif hasattr(gift, 'slug'):
                    # Construct Fragment image URL
                    image_url = f"https://fragment.com/gift/{gift.slug}/preview.png"

                # Marketplace info
                url = f"https://fragment.com/gifts/{gift_id}"

                # Attributes from traits
                background = None
                pattern = None
                symbol = '🎁'

                if hasattr(gift, 'traits') and gift.traits:
                    for trait in gift.traits:
                        trait_type = getattr(trait, 'trait_type', '').lower()
                        trait_value = getattr(trait, 'value', None)

                        if 'background' in trait_type or 'color' in trait_type:
                            background = trait_value
                        elif 'pattern' in trait_type:
                            pattern = trait_value
                        elif 'symbol' in trait_type or 'emoji' in trait_type:
                            symbol = trait_value

                parsed_gift = {
                    "id": str(gift_id),
                    "title": name,
                    "floor_ton": price_ton,
                    "floor_rub": price_rub,
                    "total_supply": total_supply,
                    "available": True,
                    "rarity": rarity,
                    "image_url": image_url,
                    "marketplace": "fragment",
                    "marketplace_url": url,
                    "attributes": {
                        "background": background,
                        "pattern": pattern,
                        "symbol": symbol
                    }
                }

                parsed_gifts.append(parsed_gift)

            except Exception as e:
                print(f"WARNING: Failed to process listing #{idx}: {e}")
                continue

        print(f"SUCCESS: Processed {len(parsed_gifts)} gifts")
        return parsed_gifts

    except Exception as e:
        print(f"ERROR: Failed to fetch gifts: {e}")
        import traceback
        traceback.print_exc()
        return []


# ============================================
# DATA MANAGEMENT
# ============================================

def save_to_json(gifts: List[Dict], output_file: str = OUTPUT_FILE):
    """Save data to JSON"""
    data = {
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_gifts": len(gifts),
        "gifts": gifts
    }

    # Create backup if file exists
    output_path = Path(output_file)
    if output_path.exists():
        backup_dir = Path(BACKUP_DIR)
        backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = backup_dir / f"nft-gifts-data_{timestamp}.json"

        output_path.rename(backup_file)
        print(f"Backup created: {backup_file}")

    # Save new data
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"SUCCESS: Data saved to {output_file}")


def group_by_collection(gifts: List[Dict]) -> List[Dict]:
    """
    Group gifts by collections
    (if they have the same base name)
    """
    collections = {}

    for gift in gifts:
        # Extract base collection name
        # Example: "Chill Flame #123" -> "Chill Flame"
        title = gift['title']
        base_name = title.split('#')[0].strip()

        if base_name not in collections:
            collections[base_name] = {
                "id": gift['id'].split('_')[0],
                "title": base_name,
                "floor_ton": gift['floor_ton'],
                "floor_rub": gift['floor_rub'],
                "models": []
            }

        # Add model to collection
        collections[base_name]['models'].append({
            "name": gift['title'],
            "rarity": gift['rarity'],
            "bg": gift['attributes']['background'],
            "pattern": gift['attributes']['pattern'],
            "floor_rub": gift['floor_rub'],
            "floor_ton": gift['floor_ton'],
            "img_url": gift['image_url'],
            "marketplace_url": gift['marketplace_url'],
            "available": gift['available']
        })

        # Update collection floor price
        if gift['floor_ton'] < collections[base_name]['floor_ton']:
            collections[base_name]['floor_ton'] = gift['floor_ton']
            collections[base_name]['floor_rub'] = gift['floor_rub']

    return list(collections.values())


# ============================================
# MAIN
# ============================================

async def main():
    """Main function"""
    print("NFT Gifts Parser (tg-gifts-sdk)\n")

    if not SDK_AVAILABLE:
        print("ERROR: Cannot continue without tg-gifts-sdk")
        print("\nInstall:")
        print("   pip install tg-gifts-sdk aiohttp")
        return

    # Fetch data
    gifts = await fetch_all_gifts()

    if not gifts:
        print("\nWARNING: Failed to fetch gifts data")
        return

    # Save
    save_to_json(gifts)

    # Group by collections (optional)
    collections = group_by_collection(gifts)

    if collections:
        collections_file = "nft-collections-grouped.json"
        with open(collections_file, 'w', encoding='utf-8') as f:
            json.dump({
                "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "total_collections": len(collections),
                "collections": collections
            }, f, indent=2, ensure_ascii=False)
        print(f"SUCCESS: Collections grouped in {collections_file}")

    print(f"\nDONE! Fetched {len(gifts)} gifts")
    print(f"Grouped into {len(collections)} collections")


if __name__ == "__main__":
    asyncio.run(main())
