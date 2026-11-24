#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FunPay Steam AutoBuy Module
Автоматический выкуп пополнения Steam с самого выгодного лота на FunPay
"""

import requests
import logging
import os
import json
from typing import Dict, Optional, Tuple
from datetime import datetime
from pathlib import Path
import time

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FunPayAutoBuy:
    """FunPay Steam AutoBuy Handler"""

    # FunPay API endpoints
    FUNPAY_BASE = "https://funpay.com"
    FUNPAY_LOGIN = f"{FUNPAY_BASE}/api/account/login"
    FUNPAY_PRODUCTS = f"{FUNPAY_BASE}/api/products"
    FUNPAY_BALANCE = f"{FUNPAY_BASE}/api/account/balance"
    FUNPAY_ORDER = f"{FUNPAY_BASE}/api/order"

    # Steam category ID on FunPay (may need adjustment based on current FunPay structure)
    STEAM_CATEGORY_ID = "steam_balance"

    # Currency/region mapping
    CURRENCY_MAP = {
        "RUB": "RUB",
        "KZT": "KZT",
        "UAH": "UAH",
        "USD": "USD"
    }

    # Min rating for seller
    MIN_RATING = 4.7

    def __init__(self, golden_key: str, admin_id: int, max_price_markup: float = 1.15):
        """
        Initialize FunPay AutoBuy

        Args:
            golden_key: FunPay session golden_key from .env
            admin_id: Telegram admin ID for notifications
            max_price_markup: Max acceptable price markup (1.15 = 15% above base)
        """
        self.golden_key = golden_key
        self.admin_id = admin_id
        self.max_price_markup = max_price_markup
        self.session = None
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"

    def _init_session(self) -> bool:
        """Initialize requests session with golden_key"""
        try:
            self.session = requests.Session()
            self.session.headers.update({
                "User-Agent": self.user_agent,
                "Accept": "application/json",
                "X-Requested-With": "XMLHttpRequest"
            })

            # Set golden_key cookie
            self.session.cookies.set("golden_key", self.golden_key, domain="funpay.com")

            logger.info("✅ FunPay session initialized")
            return True
        except Exception as e:
            logger.error(f"❌ Failed to init session: {e}")
            return False

    def check_balance(self) -> Optional[float]:
        """Get current FunPay account balance"""
        try:
            if not self.session:
                self._init_session()

            response = self.session.get(self.FUNPAY_BALANCE, timeout=10)
            response.raise_for_status()

            data = response.json()
            balance = float(data.get("balance", 0))
            logger.info(f"📊 FunPay balance: {balance:.2f} ₽")
            return balance

        except Exception as e:
            logger.error(f"❌ Failed to check balance: {e}")
            return None

    def search_best_offer(self, amount_rub: float, currency: str) -> Optional[Dict]:
        """
        Search for best Steam balance offer on FunPay

        Args:
            amount_rub: Amount in rubles to buy
            currency: Currency code (RUB, KZT, UAH, USD)

        Returns:
            Dict with offer details or None if not found
        """
        try:
            if not self.session:
                self._init_session()

            # Normalize currency
            currency = self.CURRENCY_MAP.get(currency, "RUB")

            logger.info(f"🔍 Searching best offer: {amount_rub} ₽ ({currency})")

            # Fetch Steam balance offers from FunPay
            params = {
                "category": self.STEAM_CATEGORY_ID,
                "currency": currency,
                "sort": "price",
                "online_only": True
            }

            response = self.session.get(f"{self.FUNPAY_PRODUCTS}/offers", params=params, timeout=15)
            response.raise_for_status()

            offers = response.json().get("offers", [])

            if not offers:
                logger.warning(f"⚠️ No Steam balance offers found for {currency}")
                return None

            # Filter and sort offers
            valid_offers = []
            for offer in offers:
                try:
                    # Check seller is online
                    if not offer.get("seller_online"):
                        continue

                    # Check auto-delivery enabled
                    if not offer.get("auto_delivery"):
                        continue

                    # Check rating >= MIN_RATING
                    rating = float(offer.get("seller_rating", 0))
                    if rating < self.MIN_RATING:
                        logger.debug(f"Skipping offer: low rating {rating}")
                        continue

                    # Check not frozen
                    if offer.get("frozen"):
                        continue

                    # Calculate price per unit
                    price = float(offer.get("price", float('inf')))
                    quantity = float(offer.get("quantity", 1))
                    price_per_unit = price / quantity if quantity > 0 else float('inf')

                    # Check within max markup
                    base_price = amount_rub  # Base price assumption
                    if price_per_unit > (base_price * self.max_price_markup):
                        logger.debug(f"Skipping offer: price markup too high {price_per_unit}")
                        continue

                    valid_offers.append({
                        "id": offer.get("id"),
                        "seller_id": offer.get("seller_id"),
                        "seller_name": offer.get("seller_name"),
                        "price": price,
                        "quantity": quantity,
                        "price_per_unit": price_per_unit,
                        "rating": rating,
                        "currency": currency
                    })

                except (KeyError, ValueError) as e:
                    logger.debug(f"Skipping malformed offer: {e}")
                    continue

            if not valid_offers:
                logger.warning("❌ No valid offers after filtering")
                return None

            # Sort by price per unit (ascending = cheapest first)
            valid_offers.sort(key=lambda x: x["price_per_unit"])
            best_offer = valid_offers[0]

            logger.info(f"✅ Best offer found:")
            logger.info(f"   Seller: {best_offer['seller_name']} (rating: {best_offer['rating']})")
            logger.info(f"   Price: {best_offer['price']:.2f} {best_offer['currency']}")
            logger.info(f"   Per unit: {best_offer['price_per_unit']:.4f}")

            return best_offer

        except Exception as e:
            logger.error(f"❌ Failed to search offers: {e}")
            return None

    def purchase_offer(self, offer: Dict, steam_login: str, amount_rub: float) -> Optional[str]:
        """
        Purchase selected offer with Steam login

        Args:
            offer: Offer dict from search_best_offer()
            steam_login: Steam account login for order
            amount_rub: Amount in rubles

        Returns:
            Order ID on FunPay or None if failed
        """
        try:
            if not self.session:
                self._init_session()

            # Check balance before purchase
            balance = self.check_balance()
            if balance is None or balance < offer["price"]:
                logger.error(f"❌ Insufficient balance: have {balance}, need {offer['price']}")
                return None

            logger.info(f"💳 Processing purchase from {offer['seller_name']}...")

            # Prepare order data
            order_data = {
                "offer_id": offer["id"],
                "steam_login": steam_login,
                "quantity": amount_rub,  # Amount in rubles
                "payment_method": "balance",  # Pay from FunPay internal balance
                "currency": offer["currency"]
            }

            # Create order on FunPay
            response = self.session.post(
                self.FUNPAY_ORDER,
                json=order_data,
                timeout=20
            )
            response.raise_for_status()

            result = response.json()
            order_id = result.get("order_id")

            if not order_id:
                logger.error(f"❌ Failed to get order ID: {result}")
                return None

            logger.info(f"✅ Order created: {order_id}")
            logger.info(f"   Seller: {offer['seller_name']}")
            logger.info(f"   Amount: {amount_rub} ₽")
            logger.info(f"   Steam login: {steam_login}")

            return order_id

        except Exception as e:
            logger.error(f"❌ Failed to purchase offer: {e}")
            return None

    def get_order_status(self, order_id: str) -> Optional[Dict]:
        """Get order status from FunPay"""
        try:
            if not self.session:
                self._init_session()

            response = self.session.get(f"{self.FUNPAY_ORDER}/{order_id}", timeout=10)
            response.raise_for_status()

            status_data = response.json()
            logger.info(f"📋 Order {order_id} status: {status_data.get('status', 'unknown')}")

            return status_data

        except Exception as e:
            logger.error(f"❌ Failed to get order status: {e}")
            return None

    def process_steam_order(self, order: Dict) -> Dict:
        """
        Main entry point: process Steam purchase order

        Args:
            order: {
                "steam_login": "...",
                "currency": "RUB",  # or KZT, UAH, USD
                "amount_rub": 500.0,
                "order_id": "wujje_...",  # Wujje order ID for tracking
                "user_id": 12345
            }

        Returns:
            {
                "success": bool,
                "funpay_order_id": str or None,
                "status": "completed" | "pending" | "failed",
                "message": str,
                "balance_after": float
            }
        """
        result = {
            "success": False,
            "funpay_order_id": None,
            "status": "failed",
            "message": "",
            "balance_after": None
        }

        try:
            steam_login = order.get("steam_login", "").strip()
            currency = order.get("currency", "RUB").upper()
            amount_rub = float(order.get("amount_rub", 0))
            wujje_order_id = order.get("order_id", "unknown")

            if not steam_login or amount_rub <= 0:
                result["message"] = "Invalid steam_login or amount_rub"
                logger.error(f"❌ Invalid order data: {order}")
                return result

            logger.info(f"🚀 Processing Steam order {wujje_order_id}")
            logger.info(f"   Steam login: {steam_login}")
            logger.info(f"   Amount: {amount_rub} ₽ ({currency})")

            # Step 1: Search best offer
            offer = self.search_best_offer(amount_rub, currency)
            if not offer:
                result["message"] = f"No valid Steam balance offers found for {currency}"
                return result

            # Step 2: Check balance
            balance_before = self.check_balance()
            if balance_before is None:
                result["message"] = "Failed to check FunPay balance"
                return result

            # Step 3: Purchase
            funpay_order_id = self.purchase_offer(offer, steam_login, amount_rub)
            if not funpay_order_id:
                result["message"] = "Failed to create FunPay order"
                return result

            # Step 4: Check status
            time.sleep(2)  # Wait for order to process
            status = self.get_order_status(funpay_order_id)

            # Step 5: Final balance
            balance_after = self.check_balance()

            result["success"] = True
            result["funpay_order_id"] = funpay_order_id
            result["status"] = status.get("status", "pending") if status else "pending"
            result["message"] = f"Order created successfully: {funpay_order_id}"
            result["balance_after"] = balance_after

            logger.info(f"✅ Steam order {wujje_order_id} processed successfully")
            logger.info(f"   FunPay order: {funpay_order_id}")
            logger.info(f"   Status: {result['status']}")
            logger.info(f"   Balance: {balance_before:.2f} → {balance_after:.2f} ₽")

            return result

        except Exception as e:
            logger.error(f"❌ Unexpected error processing order: {e}")
            result["message"] = str(e)
            return result


# Standalone test function
def test_autobuy():
    """Test FunPay AutoBuy module"""

    golden_key = os.getenv("FUNPAY_GOLDEN_KEY", "")
    admin_id = int(os.getenv("ADMIN_ID", 0))

    if not golden_key:
        logger.error("❌ FUNPAY_GOLDEN_KEY not set in .env")
        return

    autobuy = FunPayAutoBuy(golden_key, admin_id)

    # Test order
    test_order = {
        "steam_login": "test_account",
        "currency": "RUB",
        "amount_rub": 500.0,
        "order_id": "wujje_test_001",
        "user_id": 12345
    }

    logger.info("🧪 Testing FunPay AutoBuy...")
    result = autobuy.process_steam_order(test_order)

    logger.info(f"Result: {json.dumps(result, indent=2, ensure_ascii=False)}")

    return result


if __name__ == "__main__":
    test_autobuy()
