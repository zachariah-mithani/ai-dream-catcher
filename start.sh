#!/bin/sh
set -e
cd backend
mkdir -p data
if [ -f package-lock.json ]; then npm ci --omit=dev || npm ci; else npm install --only=prod || npm install; fi
node src/server.js
