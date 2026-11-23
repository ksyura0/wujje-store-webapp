#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
API Testing Script
Тестирует работу API Backend
"""

import requests
import json
from datetime import datetime

API_URL = "http://localhost:5000"

def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")

def test_health():
    """Test API health"""
    print_header("1. Testing API Health")
    try:
        resp = requests.get(f"{API_URL}/api/health")
        print(f"✅ Status: {resp.status_code}")
        print(json.dumps(resp.json(), indent=2))
        return resp.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_gifts():
    """Test getting gifts"""
    print_header("2. Getting All Gifts")
    try:
        resp = requests.get(f"{API_URL}/api/gifts")
        data = resp.json()
        print(f"✅ Status: {resp.status_code}")
        print(f"📊 Total gifts: {data.get('total', 0)}")

        if data.get('items'):
            print("\n🎁 First 3 gifts:")
            for gift in data.get('items', [])[:3]:
                print(f"  - {gift['title']}: {gift['floor_ton']} TON ({gift['floor_rub']} RUB)")

        return resp.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_gift_detail():
    """Test getting specific gift"""
    print_header("3. Getting Gift Details")
    try:
        resp = requests.get(f"{API_URL}/api/gifts/chill-flame")
        data = resp.json()
        print(f"✅ Status: {resp.status_code}")

        if data.get('ok'):
            gift = data.get('gift', {})
            print(f"\n🎁 Gift: {gift.get('title')}")
            print(f"   Price: {gift.get('floor_ton')} TON / {gift.get('floor_rub')} RUB")
            print(f"   Rarity: {gift.get('rarity')}")
            print(f"   Symbol: {gift.get('attributes', {}).get('symbol')}")

        return resp.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_create_purchase():
    """Test creating purchase"""
    print_header("4. Creating Purchase Order")
    try:
        payload = {
            "user_id": 123456789,
            "username": "@testuser",
            "gift_id": "chill-flame",
            "payment_method": "ton",
            "amount_ton": 820.0,
            "amount_rub": 147600
        }

        print("📋 Payload:")
        print(json.dumps(payload, indent=2))

        resp = requests.post(f"{API_URL}/api/purchase", json=payload)
        data = resp.json()

        print(f"\n✅ Status: {resp.status_code}")
        print(json.dumps(data, indent=2))

        if data.get('ok'):
            order_id = data.get('order_id')
            print(f"\n✅ Order created: {order_id}")
            return order_id
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None

def test_get_order_status(order_id):
    """Test getting order status"""
    if not order_id:
        return False

    print_header("5. Checking Order Status")
    try:
        resp = requests.get(f"{API_URL}/api/orders/{order_id}/status")
        data = resp.json()

        print(f"✅ Status: {resp.status_code}")
        print(json.dumps(data, indent=2))

        return resp.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_get_user_orders():
    """Test getting user orders"""
    print_header("6. Getting User Orders")
    try:
        resp = requests.get(f"{API_URL}/api/orders/123456789")
        data = resp.json()

        print(f"✅ Status: {resp.status_code}")
        print(f"📊 Total orders: {data.get('total', 0)}")

        if data.get('orders'):
            print("\n📋 Orders:")
            for order in data.get('orders', []):
                print(f"  - {order.get('order_id')}: {order.get('gift_title')} ({order.get('status')})")

        return resp.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_admin_stats():
    """Test admin stats"""
    print_header("7. Admin Statistics")
    try:
        resp = requests.get(f"{API_URL}/api/admin/stats")
        data = resp.json()

        print(f"✅ Status: {resp.status_code}")

        if data.get('ok'):
            stats = data.get('stats', {})
            print(f"\n📊 Statistics:")
            print(f"  Total orders: {stats.get('total_orders', 0)}")
            print(f"  Completed: {stats.get('completed_orders', 0)}")
            print(f"  Pending: {stats.get('pending_orders', 0)}")
            print(f"  Revenue: {stats.get('total_revenue_rub', 0)} RUB")
            print(f"  Gifts available: {stats.get('total_gifts_available', 0)}")

        return resp.status_code == 200
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("\n" + "="*60)
    print("🧪 WUJJE STORE API TEST SUITE")
    print("="*60)

    print("\n⚠️  Make sure API is running: python wujje_api.py")

    results = []

    # Run tests
    results.append(("Health Check", test_health()))
    results.append(("Get All Gifts", test_get_gifts()))
    results.append(("Get Gift Details", test_get_gift_detail()))

    order_id = test_create_purchase()
    results.append(("Create Purchase", order_id is not None))

    if order_id:
        results.append(("Get Order Status", test_get_order_status(order_id)))

    results.append(("Get User Orders", test_get_user_orders()))
    results.append(("Admin Stats", test_admin_stats()))

    # Summary
    print_header("📊 TEST SUMMARY")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")

    print(f"\n📈 Result: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! API is working correctly!")
    else:
        print(f"\n⚠️  {total - passed} tests failed. Check API logs.")

if __name__ == "__main__":
    main()
