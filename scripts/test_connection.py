# scripts/test_connection.py
from app import app, db

with app.app_context():
    try:
        db.engine.connect()
        print("✅ Connected to Railway MySQL successfully!")
    except Exception as e:
        print(f"❌ Connection failed: {e}")