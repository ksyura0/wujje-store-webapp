#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FunPay Steam AutoBuy Module
Автоматический выкуп пополнения Steam с самого выгодного лота на FunPay через реальный парсинг HTML
"""

import requests
import logging
import os
import json
import re
from typing import Dict, Optional, Tuple
from datetime import datetime
from pathlib import Path
import time
from bs4 import BeautifulSoup
from urllib.parse import urljoin, parse_qs, urlparse

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FunPayAutoBuy:
    """FunPay Steam AutoBuy Handler - работает с реальным HTML"""

    # FunPay endpoints
    FUNPAY_BASE = "https://funpay.com"
    STEAM_SECTION = f"{FUNPAY_BASE}/chips/99/"  # Steam balance top-ups section

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
        self.user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        self.csrf_token = None
        self.user_id = None

    def _init_session(self) -> bool:
        """Initialize requests session with golden_key and load page data"""
        try:
            self.session = requests.Session()
            self.session.headers.update({
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ru-RU,ru;q=0.9",
                "Accept-Encoding": "gzip, deflate",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1"
            })

            # Set golden_key cookie
            self.session.cookies.set("golden_key", self.golden_key, domain="funpay.com", path="/")

            logger.info("✅ FunPay session initialized with golden_key")

            # Load main page to extract CSRF and user_id
            if not self._load_page_data():
                logger.error("❌ Failed to load page data")
                return False

            return True
        except Exception as e:
            logger.error(f"❌ Failed to init session: {e}")
            return False

    def _load_page_data(self) -> bool:
        """Load FunPay main page and extract CSRF token and user ID"""
        try:
            response = self.session.get(self.FUNPAY_BASE, timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Try to find data-app-data in body tag
            body_tag = soup.find('body')
            if body_tag and body_tag.get('data-app-data'):
                try:
                    app_data = json.loads(body_tag.get('data-app-data'))
                    self.csrf_token = app_data.get('csrf_token')
                    self.user_id = app_data.get('userId') or app_data.get('user_id')
                except:
                    pass

            # Try to find CSRF in meta tags
            if not self.csrf_token:
                csrf_meta = soup.find('meta', {'name': 'csrf-token'})
                if csrf_meta:
                    self.csrf_token = csrf_meta.get('content')

            # Try to extract user_id from page content
            if not self.user_id:
                user_script = soup.find('script', string=re.compile(r'userId|user_id'))
                if user_script:
                    match = re.search(r'["\']?(?:userId|user_id)["\']?\s*:\s*(\d+)', user_script.string)
                    if match:
                        self.user_id = match.group(1)

            if self.csrf_token:
                logger.info(f"✅ CSRF token loaded: {self.csrf_token[:10]}...")
            if self.user_id:
                logger.info(f"✅ User ID loaded: {self.user_id}")

            return bool(self.csrf_token)

        except Exception as e:
            logger.error(f"❌ Failed to load page data: {e}")
            return False

    def check_balance(self) -> Optional[float]:
        """Get current FunPay account balance from profile page"""
        try:
            if not self.session:
                self._init_session()

            response = self.session.get(self.FUNPAY_BASE, timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Try to find balance in span.badge-balance or .user-balance
            balance_text = None

            # Primary: look for span.badge-balance
            balance_span = soup.find('span', {'class': re.compile(r'badge-balance')})
            if balance_span:
                text = balance_span.get_text(strip=True)
                # Remove spaces inside the number (e.g., "1 250.50" -> "1250.50")
                text = text.replace(' ', '').replace(',', '.')
                match = re.search(r'(\d+(?:\.\d{1,2})?)', text)
                if match:
                    balance_text = match.group(1)

            # Fallback: look for .user-balance
            if not balance_text:
                balance_elem = soup.find('span', {'class': re.compile(r'user-balance|balance')})
                if balance_elem:
                    text = balance_elem.get_text(strip=True)
                    text = text.replace(' ', '').replace(',', '.')
                    match = re.search(r'(\d+(?:\.\d{1,2})?)', text)
                    if match:
                        balance_text = match.group(1)

            # Last resort: search for balance pattern in page
            if not balance_text:
                content_text = soup.get_text()
                match = re.search(r'(\d+(?:\s+\d{3})*(?:[.,]\d{1,2})?)\s*₽', content_text)
                if match:
                    balance_text = match.group(1).replace(' ', '').replace(',', '.')

            if balance_text:
                balance = float(balance_text)
                logger.info(f"📊 Current FunPay balance: {balance:.2f} ₽")
                return balance
            else:
                logger.warning("⚠️ Could not parse balance from page")
                return None

        except Exception as e:
            logger.error(f"❌ Failed to check balance: {e}")
            return None

    def search_best_offer(self, amount_rub: float, currency: str) -> Optional[Dict]:
        """
        Search for best Steam balance offer on FunPay by parsing HTML

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

            # Load Steam section page
            response = self.session.get(self.STEAM_SECTION, timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Find all offer items (tc-item class is typical for FunPay offer cards)
            offer_items = soup.find_all('a', {'class': re.compile(r'tc-item|offer')})

            if not offer_items:
                logger.warning(f"⚠️ No Steam balance offers found")
                return None

            valid_offers = []

            for item in offer_items:
                try:
                    # Extract offer ID from href
                    href = item.get('href', '')
                    if not href:
                        continue

                    offer_id = href.strip('/')

                    # Get offer content
                    offer_text = item.get_text(separator=' ', strip=True)

                    # Check if online (look for online badge)
                    is_online = bool(item.find(class_=re.compile(r'online|status-online')))

                    # Check for auto-delivery (lightning icon or "auto" text)
                    is_auto = bool(re.search(r'⚡|auto|automatic', offer_text, re.IGNORECASE))

                    # Extract seller name
                    seller_elem = item.find(class_=re.compile(r'seller|username'))
                    seller_name = seller_elem.get_text(strip=True) if seller_elem else "Unknown"

                    # Extract price
                    price_match = re.search(r'(\d+(?:\.\d{1,2})?)\s*₽', offer_text)
                    if not price_match:
                        continue
                    price = float(price_match.group(1))

                    # Extract rating
                    rating_match = re.search(r'(\d+(?:\.\d{1,2})?)\s*(?:rating|★)', offer_text)
                    rating = float(rating_match.group(1)) if rating_match else 5.0

                    # Apply filters
                    if not is_online:
                        logger.debug(f"Skipping offer: seller offline")
                        continue

                    if rating < self.MIN_RATING:
                        logger.debug(f"Skipping offer: low rating {rating}")
                        continue

                    # Check price within markup
                    if price > (amount_rub * self.max_price_markup):
                        logger.debug(f"Skipping offer: price {price} > max {amount_rub * self.max_price_markup}")
                        continue

                    valid_offers.append({
                        "id": offer_id,
                        "offer_url": urljoin(self.FUNPAY_BASE, href),
                        "seller_name": seller_name,
                        "price": price,
                        "price_per_unit": price / amount_rub if amount_rub > 0 else price,
                        "rating": rating,
                        "currency": currency,
                        "is_auto": is_auto,
                        "is_online": is_online
                    })

                except (KeyError, ValueError, AttributeError) as e:
                    logger.debug(f"Skipping malformed offer: {e}")
                    continue

            if not valid_offers:
                logger.warning("❌ No valid offers after filtering")
                return None

            # Sort by is_auto (True first) then by price per unit (ascending = cheapest first)
            valid_offers.sort(key=lambda x: (not x["is_auto"], x["price_per_unit"]))
            best_offer = valid_offers[0]

            logger.info(f"✅ Best offer found:")
            logger.info(f"   Seller: {best_offer['seller_name']} (rating: {best_offer['rating']})")
            logger.info(f"   Price: {best_offer['price']:.2f} {best_offer['currency']}")
            logger.info(f"   Per unit: {best_offer['price_per_unit']:.4f}")
            logger.info(f"   URL: {best_offer['offer_url']}")

            return best_offer

        except Exception as e:
            logger.error(f"❌ Failed to search offers: {e}")
            return None

    def purchase_offer(self, offer: Dict, steam_login: str, amount_rub: float) -> Optional[str]:
        """
        Purchase selected offer with Steam login by parsing and submitting real form

        Args:
            offer: Offer dict from search_best_offer()
            steam_login: Steam account login for order
            amount_rub: Amount in rubles

        Returns:
            Order ID on FunPay (e.g., #XXXXXXX) or None if failed
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

            # Load offer page to extract form fields
            response = self.session.get(offer['offer_url'], timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            # Find purchase form
            form = soup.find('form', {'method': 'POST'})
            if not form:
                logger.error("❌ Could not find purchase form on offer page")
                return None

            # Extract form fields
            form_data = {}
            for input_field in form.find_all(['input', 'textarea']):
                name = input_field.get('name')
                value = input_field.get('value', '')
                if name:
                    form_data[name] = value

            # Log hidden fields (csrf_token, offer_id, node_id, location, secrets)
            hidden_fields = [k for k in form_data.keys() if k not in ['steam_login', 'amount']]
            if hidden_fields:
                logger.debug(f"Found hidden form fields: {hidden_fields}")

            # Set/override critical fields
            form_data['steam_login'] = steam_login
            form_data['amount'] = str(int(amount_rub))
            form_data['payment_method'] = 'balance'  # Use FunPay internal balance
            if self.csrf_token:
                form_data['csrf_token'] = self.csrf_token

            # Determine form action URL
            form_action = form.get('action', '')
            if form_action.startswith('http'):
                form_url = form_action
            else:
                form_url = urljoin(self.FUNPAY_BASE, form_action)

            logger.info(f"📝 Submitting form to: {form_url}")
            logger.info(f"   Form data: steam_login={steam_login}, amount={amount_rub}")

            # Submit purchase
            purchase_response = self.session.post(
                form_url,
                data=form_data,
                timeout=20,
                allow_redirects=True
            )

            # Look for order ID in response
            order_id = None

            # Try to find order ID in URL (redirect)
            if 'order' in purchase_response.url:
                match = re.search(r'/order/(\d+)', purchase_response.url)
                if match:
                    order_id = f"#{match.group(1)}"

            # Try to find order ID in response content
            if not order_id:
                content = purchase_response.text
                # Look for order ID pattern like #XXXXXXX
                match = re.search(r'#(\d+)', content)
                if match:
                    order_id = f"#{match.group(1)}"

            if not order_id:
                logger.error(f"❌ Failed to extract order ID from response")
                logger.debug(f"Response URL: {purchase_response.url}")
                return None

            logger.info(f"✅ Order created: {order_id}")
            logger.info(f"   Seller: {offer['seller_name']}")
            logger.info(f"   Amount: {amount_rub} ₽")
            logger.info(f"   Steam login: {steam_login}")

            return order_id

        except Exception as e:
            logger.error(f"❌ Failed to purchase offer: {e}")
            return None

    def handle_order_chat(self, funpay_order_id: str, steam_login: str, timeout_sec: int = 180, max_responses: int = 6) -> Optional[str]:
        """
        Monitor order chat and auto-respond to seller bot messages

        Args:
            funpay_order_id: FunPay order ID (e.g., "123456")
            steam_login: Steam login to send if requested
            timeout_sec: Maximum monitoring duration (seconds)
            max_responses: Maximum auto-responses per order (prevent loops)

        Returns:
            "completed" if success status detected, None otherwise
        """
        try:
            if not self.session:
                self._init_session()

            # Parse order ID (remove # if present)
            order_id = funpay_order_id.lstrip('#')
            order_url = f"{self.FUNPAY_BASE}/orders/{order_id}/"

            logger.info(f"🤖 Starting order chat monitor: {order_url}")

            processed_message_ids = set()
            response_count = 0
            start_time = time.time()
            poll_interval = 4  # seconds

            while True:
                # Check timeout
                elapsed = time.time() - start_time
                if elapsed > timeout_sec:
                    logger.info(f"⏰ Order chat monitor timeout ({timeout_sec}s)")
                    return None

                # Fetch order page
                try:
                    response = self.session.get(order_url, timeout=15)
                    response.raise_for_status()
                except Exception as e:
                    logger.debug(f"Failed to fetch order page: {e}")
                    time.sleep(poll_interval)
                    continue

                soup = BeautifulSoup(response.content, 'html.parser')

                # Find chat message list
                chat_list = soup.find('div', {'class': re.compile(r'chat-message-list|messages')})
                if not chat_list:
                    logger.debug("Chat list not found on page")
                    time.sleep(poll_interval)
                    continue

                # Find all chat messages
                messages = chat_list.find_all('div', {'class': re.compile(r'chat-msg-item|message-item|msg')})

                for msg in messages:
                    msg_id = msg.get('data-id') or msg.get('data-message-id')
                    if not msg_id:
                        continue

                    # Skip already processed messages
                    if msg_id in processed_message_ids:
                        continue

                    processed_message_ids.add(msg_id)

                    msg_text = msg.get_text(separator=' ', strip=True)
                    sender = msg.get('data-sender') or msg.get('data-from', '').lower()

                    # Ignore own messages
                    if 'own' in sender or sender == 'me':
                        logger.debug(f"Ignoring own message: {msg_text[:50]}")
                        continue

                    logger.info(f"📨 Seller message: {msg_text[:100]}")

                    # Check response limit
                    if response_count >= max_responses:
                        logger.warning(f"⚠️ Max responses ({max_responses}) reached, stopping")
                        return None

                    reply_text = None

                    # Check for login request
                    if re.search(r'логин|login|ник|укажите|введите|account', msg_text, re.IGNORECASE):
                        reply_text = steam_login
                        logger.info(f"→ Sending login: {steam_login}")

                    # Check for confirmation request
                    elif re.search(r'верно|уверены|подтвердите|правильно|да|нет|\+|confirm|yes', msg_text, re.IGNORECASE):
                        # Try to find specific command in quotes
                        cmd_match = re.search(r'[«"\']([^«"\']+)[«"\']', msg_text)
                        if cmd_match:
                            reply_text = cmd_match.group(1)
                            logger.info(f"→ Sending command: {reply_text}")
                        else:
                            reply_text = "Да"
                            logger.info(f"→ Sending confirmation: Да")

                    # Check for region request
                    elif re.search(r'регион|рф|россия|страна|region|country', msg_text, re.IGNORECASE):
                        reply_text = "РФ"
                        logger.info(f"→ Sending region: РФ")

                    # Check for success status
                    elif re.search(r'успешно|пополнено|выполнено|зачислены|completed|success', msg_text, re.IGNORECASE):
                        logger.info(f"✅ Order completed detected: {msg_text[:50]}")
                        return "completed"

                    # Send reply if needed
                    if reply_text:
                        if self._send_chat_message(order_id, reply_text):
                            response_count += 1
                        else:
                            logger.warning("Failed to send chat message")

                # Sleep before next poll
                time.sleep(poll_interval)

        except Exception as e:
            logger.error(f"❌ Error in order chat handler: {e}")
            return None

    def _send_chat_message(self, order_id: str, message: str) -> bool:
        """
        Send message in order chat via AJAX POST

        Args:
            order_id: FunPay order ID
            message: Message text

        Returns:
            True if sent successfully
        """
        try:
            # Prepare chat message POST data
            post_data = {
                'csrf_token': self.csrf_token,
                'chat_message': message,
                'node': order_id,
                'type': 'order'  # Specify it's an order chat
            }

            # Send message
            chat_url = f"{self.FUNPAY_BASE}/chat"
            response = self.session.post(
                chat_url,
                data=post_data,
                timeout=10,
                headers={'X-Requested-With': 'XMLHttpRequest'}
            )

            if response.status_code in [200, 201]:
                logger.debug(f"✅ Chat message sent: {message[:50]}")
                return True
            else:
                logger.warning(f"⚠️ Chat message send failed: {response.status_code}")
                return False

        except Exception as e:
            logger.error(f"❌ Failed to send chat message: {e}")
            return False

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

            # Initialize session if not already done
            if not self.session:
                if not self._init_session():
                    result["message"] = "Failed to initialize FunPay session"
                    return result

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

            # Step 4: Monitor chat and auto-respond to seller
            chat_status = self.handle_order_chat(funpay_order_id, steam_login)
            if chat_status == "completed":
                result["status"] = "completed"
                logger.info(f"✅ Order {funpay_order_id} marked as completed by auto-chat handler")
            else:
                result["status"] = "pending"

            # Step 5: Wait for processing
            time.sleep(2)

            # Step 6: Final balance
            balance_after = self.check_balance()

            result["success"] = True
            result["funpay_order_id"] = funpay_order_id
            result["message"] = f"Order created successfully: {funpay_order_id}"
            result["balance_after"] = balance_after

            logger.info(f"✅ Steam order {wujje_order_id} processed successfully")
            logger.info(f"   FunPay order: {funpay_order_id}")
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
