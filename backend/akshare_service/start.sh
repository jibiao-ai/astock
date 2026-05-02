#!/bin/bash
# AkShare Microservice Startup Script
# Installs dependencies and starts the service

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[AkShare] Installing dependencies..."
pip3 install --quiet --disable-pip-version-check akshare pandas 2>/dev/null || \
pip install --quiet --disable-pip-version-check akshare pandas 2>/dev/null

echo "[AkShare] Starting service..."
cd "$SCRIPT_DIR"
python3 main.py
