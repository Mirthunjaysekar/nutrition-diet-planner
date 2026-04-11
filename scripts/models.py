# scripts/models.py
from app import db
from datetime import datetime

class User(db.Model):
    __tablename__ = 'users'
    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), nullable=False)
    email      = db.Column(db.String(150), unique=True, nullable=False)
    meals      = db.relationship('MealPlan', backref='user', lazy=True)

class MealPlan(db.Model):
    __tablename__ = 'meal_plans'
    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    meal_name    = db.Column(db.String(200), nullable=False)
    calories     = db.Column(db.Float)
    protein      = db.Column(db.Float)
    carbs        = db.Column(db.Float)
    fats         = db.Column(db.Float)                  # ← this was cut off
    date_planned = db.Column(db.DateTime, default=datetime.utcnow)