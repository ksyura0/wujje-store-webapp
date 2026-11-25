#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Wujje Store API Backend
Flask API для веб-приложения и интеграции с ботом
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import logging
from datetime import datetime
from typing import Dict, Optional
import asyncio
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Flask app
app = Flask(__name__)
CORS(app)

# Configuration
API_PORT = int(os.getenv("WUJJE_API_PORT", 5000))
NFT_DATA_FILE = "nft-gifts-data.json"
ORDERS_FILE = "wujje-backups/orders.json"


# ============================================
# UTILITIES
# ============================================

def load_nft_data() -> Dict:
    """Load NFT gifts data"""
    try:
        with open(NFT_DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Failed to load NFT data: {e}")
        return {"gifts": []}


def load_orders() -> list:
    """Load orders history"""
    try:
        path = Path(ORDERS_FILE)
        if path.exists():
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logger.warning(f"Failed to load orders: {e}")
    return []


def save_order(order: Dict) -> bool:
    """Save order to history"""
    try:
        path = Path(ORDERS_FILE)
        path.parent.mkdir(parents=True, exist_ok=True)

        orders = load_orders()
        orders.append({
            **order,
            "timestamp": datetime.now().isoformat()
        })

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(orders, f, indent=2, ensure_ascii=False)

        logger.info(f"Order saved: {order.get('order_id')}")
        return True
    except Exception as e:
        logger.error(f"Failed to save order: {e}")
        return False


# ============================================
# API ENDPOINTS
# ============================================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    })


@app.route('/api/gifts', methods=['GET'])
def get_gifts():
    """Get all NFT gifts"""
    try:
        data = load_nft_data()
        return jsonify({
            "ok": True,
            "gifts": data.get("gifts", []),
            "total": len(data.get("gifts", []))
        })
    except Exception as e:
        logger.error(f"Error in get_gifts: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/api/gifts/<gift_id>', methods=['GET'])
def get_gift(gift_id):
    """Get specific gift details"""
    try:
        data = load_nft_data()
        gifts = data.get("gifts", [])

        gift = next((g for g in gifts if g.get("id") == gift_id), None)

        if not gift:
            return jsonify({"ok": False, "error": "Gift not found"}), 404

        return jsonify({
            "ok": True,
            "gift": gift
        })
    except Exception as e:
        logger.error(f"Error in get_gift: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/api/purchase', methods=['POST'])
def create_purchase():
    """
    Create purchase order

    Request body:
    {
        "user_id": 123456,
        "username": "@username",
        "gift_id": "chill-flame",
        "payment_method": "balance|ton",
        "amount_ton": 820.0,
        "amount_rub": 147600
    }
    """
    try:
        data = request.get_json()

        # Validate input
        required_fields = ["user_id", "gift_id", "payment_method"]
        if not all(field in data for field in required_fields):
            return jsonify({
                "ok": False,
                "error": "Missing required fields"
            }), 400

        # Get gift data
        gifts_data = load_nft_data()
        gift = next((g for g in gifts_data.get("gifts", []) if g.get("id") == data["gift_id"]), None)

        if not gift:
            return jsonify({"ok": False, "error": "Gift not found"}), 404

        # Create order
        order_id = f"ord_{datetime.now().timestamp()}"
        order = {
            "order_id": order_id,
            "user_id": data["user_id"],
            "username": data.get("username", "unknown"),
            "gift_id": data["gift_id"],
            "gift_title": gift.get("title"),
            "payment_method": data["payment_method"],
            "amount_ton": gift.get("floor_ton"),
            "amount_rub": gift.get("floor_rub"),
            "status": "pending",
            "tx_hash": None
        }

        # Save order
        if not save_order(order):
            return jsonify({
                "ok": False,
                "error": "Failed to save order"
            }), 500

        logger.info(f"Order created: {order_id}")

        return jsonify({
            "ok": True,
            "order_id": order_id,
            "status": "pending",
            "message": "Order created. Processing..."
        })

    except Exception as e:
        logger.error(f"Error in create_purchase: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/api/orders/<user_id>', methods=['GET'])
def get_user_orders(user_id):
    """Get user's orders"""
    try:
        orders = load_orders()
        user_orders = [o for o in orders if o.get("user_id") == int(user_id)]

        return jsonify({
            "ok": True,
            "orders": user_orders,
            "total": len(user_orders)
        })
    except Exception as e:
        logger.error(f"Error in get_user_orders: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/api/orders/<order_id>/status', methods=['GET'])
def get_order_status(order_id):
    """Get order status"""
    try:
        orders = load_orders()
        order = next((o for o in orders if o.get("order_id") == order_id), None)

        if not order:
            return jsonify({"ok": False, "error": "Order not found"}), 404

        return jsonify({
            "ok": True,
            "order_id": order_id,
            "status": order.get("status"),
            "gift_title": order.get("gift_title"),
            "timestamp": order.get("timestamp")
        })
    except Exception as e:
        logger.error(f"Error in get_order_status: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/api/admin/stats', methods=['GET'])
def admin_stats():
    """Admin statistics"""
    try:
        orders = load_orders()
        gifts_data = load_nft_data()

        total_revenue = sum(o.get("amount_rub", 0) for o in orders)
        completed_orders = len([o for o in orders if o.get("status") == "completed"])
        pending_orders = len([o for o in orders if o.get("status") == "pending"])

        return jsonify({
            "ok": True,
            "stats": {
                "total_orders": len(orders),
                "completed_orders": completed_orders,
                "pending_orders": pending_orders,
                "total_revenue_rub": total_revenue,
                "total_gifts_available": len(gifts_data.get("gifts", [])),
                "last_updated": datetime.now().isoformat()
            }
        })
    except Exception as e:
        logger.error(f"Error in admin_stats: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/api/resolve_username', methods=['POST'])
def resolve_username():
    """Resolve Telegram username to user data"""
    try:
        data = request.get_json()
        username = data.get("username", "").strip()

        if not username or not username.startswith("@"):
            return jsonify({"ok": False, "error": "Invalid username format"}), 400

        # TODO: Integration with Telegram API or Fragment to resolve username
        # For now: mock response
        return jsonify({
            "ok": True,
            "username": username,
            "full_name": f"User {username}",
            "avatar_url": "/avatars/default.png",
            "status": "active"
        })
    except Exception as e:
        logger.error(f"Error in resolve_username: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route('/api/pay_balance', methods=['POST'])
def pay_balance():
    """
    Process payment from user balance (RUB or Stars)

    Request body:
    {
        "initData": "telegram_init_data",
        "stars": 100,
        "target": "@username"
    }
    """
    try:
        data = request.get_json()
        init_data = data.get("initData", "")
        stars = data.get("stars")
        target = data.get("target", "")

        # Validate input
        if not init_data:
            return jsonify({"ok": False, "error": "Missing initData"}), 400

        if not target or not target.startswith("@"):
            return jsonify({"ok": False, "error": "Invalid target username"}), 400

        if not isinstance(stars, (int, float)) or stars < 1 or stars > 100000:
            return jsonify({"ok": False, "error": "Invalid stars amount (1-100000)"}), 400

        # TODO: Validate initData with Telegram Bot API
        # TODO: Check user balance in database
        # TODO: Debit balance from user account
        # TODO: Call Fragment API to send Stars to target
        # TODO: Handle Fragment errors (invalid user, insufficient funds, timeout)

        order_id = f"stars_{int(datetime.now().timestamp() * 1000)}"

        # Mock success response
        return jsonify({
            "ok": True,
            "order_id": order_id,
            "stars": stars,
            "target": target,
            "status": "pending",
            "balance": 1000  # TODO: Return actual user balance
        })
    except Exception as e:
        logger.error(f"Error in pay_balance: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500



@app.errorhandler(404)
def not_found(error):
    return jsonify({"ok": False, "error": "Not found"}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"ok": False, "error": "Internal server error"}), 500


# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    logger.info(f"Starting Wujje Store API on port {API_PORT}...")
    app.run(host="0.0.0.0", port=API_PORT, debug=False)
