#!/bin/sh
set -e

PORT="${PORT:-8000}"

echo "⏳ Checking database configuration..."
python -c "
import time, os
url = os.getenv('DATABASE_URL', '')
if url.startswith('postgresql:') or url.startswith('postgres:'):
    import psycopg2
    for i in range(30):
        try:
            conn = psycopg2.connect(url)
            conn.close()
            print('✅ PostgreSQL connection established!')
            break
        except Exception as e:
            print(f'Waiting for db... ({i+1}/30)')
            time.sleep(1)
else:
    print('ℹ️ Using persistent SQLite / MongoDB Atlas configuration')
"

echo "🌱 Running database initialization and seed..."
python seed.py

echo "🚀 Starting SchemeSecure AI FastAPI server on port $PORT..."
exec uvicorn main:app --host 0.0.0.0 --port "$PORT"
