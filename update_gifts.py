#!/usr/bin/env python3
"""
Wujje Store NFT Gifts Price Updater
Fetches floor prices from Getgems, applies markup, converts to RUB
"""

import json
import requests
import sys
from datetime import datetime
from pathlib import Path
import shutil
from typing import Optional, Dict, List

# Configuration
CONFIG = {
    "MARKUP_PERCENT": 7.5,  # 5-10% markup average
    "TON_RATE_API": "https://api.coingecko.com/api/v3",
    "GETGEMS_API": "https://getgems.io/api",
    "BACKUP_DIR": "wujje-backups",
    "BACKUP_SUBDIR": "gifts",
    "GIFTS_FILE": "gifts.json",
    "RUB_RATE": 85,  # Fallback RUB/USD rate if API fails
}

class GiftsUpdater:
    def __init__(self):
        self.backup_dir = Path(CONFIG["BACKUP_DIR"]) / CONFIG["BACKUP_SUBDIR"]
        self.gifts_file = Path(CONFIG["GIFTS_FILE"])
        self.ton_rate_usd = None
        self.rub_rate_usd = None

    def log(self, msg: str, level: str = "INFO"):
        """Simple logging"""
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{ts}] {level}: {msg}")

    def get_ton_rate(self) -> Optional[float]:
        """Get TON/USD rate from CoinGecko"""
        try:
            self.log("Fetching TON/USD rate from CoinGecko...")
            url = f"{CONFIG['TON_RATE_API']}/simple/price?ids=the-open-network&vs_currencies=usd,rub"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            ton_data = data.get("the-open-network", {})
            self.ton_rate_usd = ton_data.get("usd")
            self.rub_rate_usd = ton_data.get("rub", CONFIG["RUB_RATE"])

            if self.ton_rate_usd:
                self.log(f"TON rate: ${self.ton_rate_usd:.2f} / ₽{self.rub_rate_usd:.2f}")
                return self.ton_rate_usd
        except Exception as e:
            self.log(f"Failed to fetch TON rate: {e}", "WARN")

        return None

    def get_gifts_from_getgems(self) -> List[Dict]:
        """
        Fetch NFT collections from Getgems
        Returns list of gifts with floor prices
        """
        try:
            self.log("Fetching NFT collections from Getgems...")
            # Getgems collections API endpoint
            url = f"{CONFIG['GETGEMS_API']}/v1/collections"
            resp = requests.get(url, timeout=10, params={"limit": 100})
            resp.raise_for_status()
            data = resp.json()

            gifts = []
            collections = data.get("collections", [])

            for col in collections:
                gift = {
                    "id": col.get("address"),
                    "title": col.get("name", "Unknown"),
                    "floorTon": col.get("floor_price", 0) / 1e9,  # Convert from nanoton
                    "description": col.get("description", ""),
                    "image": col.get("image", ""),
                }

                if gift["floorTon"] > 0:
                    gifts.append(gift)

            self.log(f"Found {len(gifts)} collections with floor prices")
            return gifts

        except Exception as e:
            self.log(f"Failed to fetch from Getgems: {e}", "WARN")
            return []

    def get_gifts_hardcoded(self) -> List[Dict]:
        """
        Fallback: Return hardcoded popular Telegram NFT gifts
        (In production, you'd parse more sources)
        """
        self.log("Using fallback hardcoded gifts data...", "WARN")

        return [
            {
                "id": "telegram_nft_1",
                "title": "Snoop Dogg",
                "floorTon": 50.0,
                "description": "Official Telegram NFT",
                "image": "https://example.com/snoop.jpg",
            },
            {
                "id": "telegram_nft_2",
                "title": "Telegram Hearts",
                "floorTon": 30.0,
                "description": "Limited edition hearts",
                "image": "https://example.com/hearts.jpg",
            },
            {
                "id": "telegram_nft_3",
                "title": "Telegram Stars",
                "floorTon": 100.0,
                "description": "Exclusive stars collection",
                "image": "https://example.com/stars.jpg",
            },
        ]

    def apply_markup_and_convert(self, gifts: List[Dict]) -> List[Dict]:
        """Apply markup % and convert TON to RUB"""
        if not self.ton_rate_usd or not self.rub_rate_usd:
            self.log("No exchange rates available, skipping markup", "WARN")
            return gifts

        updated = []
        for gift in gifts:
            floor_ton = gift.get("floorTon", 0)
            if floor_ton <= 0:
                continue

            # Apply markup (7.5%)
            with_markup_ton = floor_ton * (1 + CONFIG["MARKUP_PERCENT"] / 100)

            # Convert to RUB
            rub_price = with_markup_ton * self.rub_rate_usd

            gift["floorRub"] = round(rub_price, 2)
            gift["markupPercent"] = CONFIG["MARKUP_PERCENT"]
            gift["updatedAt"] = datetime.now().isoformat()

            updated.append(gift)

        self.log(f"Applied markup and converted {len(updated)} gifts to RUB")
        return updated

    def backup_current(self):
        """Create backup of current gifts.json"""
        if not self.gifts_file.exists():
            self.log("No existing gifts.json to backup")
            return

        self.backup_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = self.backup_dir / f"gifts_{timestamp}.json"

        shutil.copy2(self.gifts_file, backup_path)
        self.log(f"Backup created: {backup_path}")

    def save_gifts(self, gifts: List[Dict]):
        """Save updated gifts to gifts.json"""
        payload = {
            "updated_at": int(datetime.now().timestamp()),
            "items": gifts,
        }

        with open(self.gifts_file, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        self.log(f"Saved {len(gifts)} gifts to {self.gifts_file}")

    def run(self):
        """Main update process"""
        self.log("=" * 60)
        self.log("Starting Wujje Store Gifts Updater")
        self.log("=" * 60)

        # Step 1: Get exchange rates
        if not self.get_ton_rate():
            self.log("Failed to get TON rate, using fallback", "WARN")
            self.rub_rate_usd = CONFIG["RUB_RATE"]

        # Step 2: Fetch gifts
        gifts = self.get_gifts_from_getgems()
        if not gifts:
            self.log("Getgems API failed, using fallback gifts", "WARN")
            gifts = self.get_gifts_hardcoded()

        # Step 3: Apply markup & convert
        gifts = self.apply_markup_and_convert(gifts)

        if not gifts:
            self.log("No gifts to save!", "ERROR")
            return 1

        # Step 4: Backup current
        self.backup_current()

        # Step 5: Save updated
        self.save_gifts(gifts)

        self.log("=" * 60)
        self.log("Update completed successfully!")
        self.log("=" * 60)

        return 0

if __name__ == "__main__":
    updater = GiftsUpdater()
    sys.exit(updater.run())
