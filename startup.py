#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Wujje Store - Startup Manager
Запускает API Backend и Bot одновременно
"""

import os
import sys
import subprocess
import time
import logging
from pathlib import Path

# Try to load .env
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not required

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Check .env
def check_env():
    """Check if .env exists and has required variables"""
    if not Path('.env').exists():
        logger.error("❌ .env file not found!")
        logger.info("📝 Create .env file from .env.example:")
        logger.info("   cp .env.example .env")
        logger.info("   Then edit .env with your Bot Token and Admin ID")
        return False

    with open('.env', 'r') as f:
        content = f.read()
        if 'YOUR_BOT_TOKEN_HERE' in content or 'YOUR_TELEGRAM_ID_HERE' in content:
            logger.error("❌ .env has placeholder values!")
            logger.info("📝 Please update .env with real values:")
            logger.info("   - WUJJE_BOT_TOKEN: Get from @BotFather")
            logger.info("   - ADMIN_ID: Your Telegram user ID")
            return False

    logger.info("✅ .env file OK")
    return True


def start_api():
    """Start Flask API Backend"""
    logger.info("🚀 Starting API Backend...")
    logger.info("📡 API will run on http://localhost:5000")

    try:
        proc = subprocess.Popen(
            [sys.executable, 'wujje_api.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        logger.info("✅ API Backend started (PID: {})".format(proc.pid))
        return proc
    except Exception as e:
        logger.error(f"❌ Failed to start API: {e}")
        return None


def start_bot():
    """Start Telegram Bot"""
    logger.info("🤖 Starting Telegram Bot...")

    # Wait for API to be ready
    time.sleep(2)

    try:
        proc = subprocess.Popen(
            [sys.executable, 'wujje_bot.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        logger.info("✅ Bot started (PID: {})".format(proc.pid))
        return proc
    except Exception as e:
        logger.error(f"❌ Failed to start Bot: {e}")
        return None


def test_api():
    """Test if API is responding"""
    logger.info("🧪 Testing API...")
    time.sleep(2)

    try:
        import requests
        response = requests.get('http://localhost:5000/api/health', timeout=5)
        if response.status_code == 200:
            logger.info("✅ API is responding")
            return True
    except Exception as e:
        logger.warning(f"⚠️  API not ready yet: {e}")
        return False


def main():
    """Main startup function"""
    logger.info("=" * 60)
    logger.info("🎁 WUJJE STORE - STARTUP MANAGER")
    logger.info("=" * 60)

    # Check environment
    if not check_env():
        logger.error("\n❌ Setup failed. Please configure .env")
        sys.exit(1)

    logger.info("\n📋 Starting Wujje Store components...\n")

    # Start API
    api_proc = start_api()
    if not api_proc:
        logger.error("Failed to start API Backend")
        sys.exit(1)

    # Test API
    if not test_api():
        logger.warning("⚠️  API might not be ready, but continuing...")

    # Start Bot
    bot_proc = start_bot()
    if not bot_proc:
        logger.error("Failed to start Bot")
        api_proc.terminate()
        sys.exit(1)

    logger.info("\n" + "=" * 60)
    logger.info("✅ ALL COMPONENTS STARTED SUCCESSFULLY!")
    logger.info("=" * 60)
    logger.info("\n📊 Status:")
    logger.info(f"  API Backend:   http://localhost:5000 (PID: {api_proc.pid})")
    logger.info(f"  Telegram Bot:  Running (PID: {bot_proc.pid})")
    logger.info("\n💡 Useful commands:")
    logger.info("  - Check API: curl http://localhost:5000/api/health")
    logger.info("  - View gifts: curl http://localhost:5000/api/gifts")
    logger.info("  - View stats: curl http://localhost:5000/api/admin/stats")
    logger.info("\n🛑 To stop: Press Ctrl+C\n")

    # Keep processes running
    try:
        while True:
            time.sleep(1)
            if api_proc.poll() is not None:
                logger.error("❌ API Backend crashed!")
                break
            if bot_proc.poll() is not None:
                logger.error("❌ Bot crashed!")
                break
    except KeyboardInterrupt:
        logger.info("\n🛑 Shutting down...")
        api_proc.terminate()
        bot_proc.terminate()
        api_proc.wait(timeout=5)
        bot_proc.wait(timeout=5)
        logger.info("✅ All processes stopped")


if __name__ == "__main__":
    main()
