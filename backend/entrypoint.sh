#!/bin/sh
set -e

echo "⏳ Waiting for PostgreSQL to be ready..."
python -c "
import time, os, psycopg2
url = os.getenv('DATABASE_URL', 'postgresql://verdant:verdant_pass@db:5432/leakage_db')
for i in range(30):
    try:
        conn = psycopg2.connect(url)
        conn.close()
        print('✅ Database connection established!')
        break
    except Exception as e:
        print(f'Waiting for db... ({i+1}/30)')
        time.sleep(1)
"

echo "🌱 Running database initialization and seed..."
python seed.py

echo "🚀 Starting FastAPI server on port 8000..."
exec uvicorn main:app --host 0.0.0.0 --port 8000
