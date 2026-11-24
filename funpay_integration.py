#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FunPay Integration Handler for Wujje Store
Обработчик заказов Steam с автоматическим выкупом через FunPay
"""

import os
import logging
from funpay_autobuy import FunPayAutoBuy

logger = logging.getLogger(__name__)

# Global AutoBuy instance
_autobuy_instance = None


def init_autobuy():
    """Initialize FunPay AutoBuy handler"""
    global _autobuy_instance

    golden_key = os.getenv("FUNPAY_GOLDEN_KEY", "").strip()
    admin_id = int(os.getenv("ADMIN_ID", 0))

    if not golden_key or golden_key == "YOUR_FUNPAY_GOLDEN_KEY_HERE":
        logger.warning("⚠️ FUNPAY_GOLDEN_KEY not configured - Steam AutoBuy disabled")
        return None

    max_markup = float(os.getenv("FUNPAY_MAX_PRICE_MARKUP", "1.15"))

    _autobuy_instance = FunPayAutoBuy(
        golden_key=golden_key,
        admin_id=admin_id,
        max_price_markup=max_markup
    )

    logger.info("✅ FunPay AutoBuy initialized")
    return _autobuy_instance


def get_autobuy():
    """Get AutoBuy instance (lazy init)"""
    global _autobuy_instance
    if _autobuy_instance is None:
        init_autobuy()
    return _autobuy_instance


def handle_steam_order(order_data: dict) -> dict:
    """
    Handle incoming Steam balance purchase order

    Args:
        order_data: {
            "steam_login": "username",
            "currency": "RUB",
            "amount_rub": 500.0,
            "order_id": "wujje_...",
            "user_id": 12345
        }

    Returns:
        {
            "success": bool,
            "funpay_order_id": str or None,
            "status": str,
            "message": str,
            "balance_after": float
        }
    """
    autobuy = get_autobuy()

    if autobuy is None:
        return {
            "success": False,
            "message": "FunPay AutoBuy not configured",
            "status": "failed"
        }

    # Process order through FunPay
    result = autobuy.process_steam_order(order_data)

    return result


# Usage in wujje_api.py or wujje_bot.py:
#
# from funpay_integration import handle_steam_order
#
# # When Steam order received:
# result = handle_steam_order({
#     "steam_login": "user_steam_login",
#     "currency": "RUB",
#     "amount_rub": 500.0,
#     "order_id": "wujje_order_123",
#     "user_id": telegram_user_id
# })
#
# if result["success"]:
#     # Update order status in database
#     update_order_status(result["order_id"], "completed")
#     # Notify admin
#     send_admin_notification(f"✅ Steam order {result['order_id']} completed")
# else:
#     # Notify user of failure
#     send_user_notification(f"Failed to process Steam order: {result['message']}")
