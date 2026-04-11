from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from config import Config
from datetime import datetime
import json
import re
import os

app = Flask(__name__)
CORS(app)
app.config.from_object(Config)
db = SQLAlchemy(app)

# ================================
# MODELS
# ================================
class User(db.Model):
    __tablename__ = 'users'
    id    = db.Column(db.Integer, primary_key=True)
    name  = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    # removed relationship — MealPlan.user_id has no ForeignKey constraint

class MealPlan(db.Model):
    __tablename__ = 'meal_plans'
    id           = db.Column(db.Integer, primary_key=True)
    user_id      = db.Column(db.Integer, nullable=False)
    meal_name    = db.Column(db.String(200), nullable=False)
    calories     = db.Column(db.Float)
    protein      = db.Column(db.Float)
    carbs        = db.Column(db.Float)
    fats         = db.Column(db.Float)
    date_planned = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    try:
        db.create_all()
        print("✅ Tables ready!")
    except Exception as e:
        print(f"⚠️ DB init: {e}")

# ================================
# GEMINI
# ================================
from google import genai
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", "AIzaSyCMCvp7Uk89_fhHggGtUCe6NgNQiHUI82I"))

def call_gemini(prompt):
    try:
        return client.models.generate_content(model="gemini-2.0-flash", contents=prompt).text
    except Exception as e:
        print(f"Gemini error: {e}")
        return None

# ================================
# DCM
# ================================
DCM_FILE = "/tmp/dcm_state.json"

def load_previous_dw_dds():
    if os.path.exists(DCM_FILE):
        with open(DCM_FILE, "r") as f:
            return json.load(f).get("previous_dw_dds")
    return None

def save_current_dw_dds(dw_dds):
    with open(DCM_FILE, "w") as f:
        json.dump({"previous_dw_dds": dw_dds}, f)

# ================================
# FRONTEND
# ================================
@app.route("/")
def serve_index():
    return send_from_directory(".", "index.html")

@app.route("/login")
def serve_login():
    return send_from_directory(".", "login.html")

@app.route("/script.js")
def serve_js():
    return send_from_directory(".", "script.js")

@app.route("/style.css")
def serve_css():
    return send_from_directory(".", "style.css")

# ================================
# LOGIN
# ================================
@app.route("/api/login", methods=["POST"])
def login():
    try:
        data  = request.get_json()
        name  = data.get("name", "").strip()
        email = data.get("email", "").strip().lower()
        if not name or not email:
            return jsonify({"error": "Name and email required"}), 400
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(name=name, email=email)
            db.session.add(user)
            db.session.commit()
        return jsonify({"user_id": user.id, "name": user.name}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ================================
# INITIAL MEAL PLAN
# ================================
@app.route("/initial-meal-plan")
def initial_meal_plan():
    base_dir  = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(base_dir, "data", "processed")
    return send_from_directory(json_path, "initial_meal_plan.json")

# ================================
# CALCULATE DDS
# ================================
@app.route("/calculate-dds", methods=["POST"])
def calculate_dds():
    data    = request.json
    foods   = data.get("foods", [])
    disease = data.get("disease", "general")
    user_id = data.get("user_id", 1)

    prompt = f"""
    Estimate total daily nutrition for: {foods}
    Return ONLY valid JSON with no markdown:
    {{"calories": number, "protein": number, "carbohydrates": number, "fat": number, "fiber": number, "sodium": number}}
    """
    text = call_gemini(prompt)
    default = {"calories": 1800, "protein": 65, "carbohydrates": 220, "fat": 55, "fiber": 25, "sodium": 2000}
    if not text:
        actual = default
    else:
        try:
            actual = json.loads(re.sub(r"```json|```", "", text.strip()))
        except:
            actual = default

    recommended = {"calories": 2000, "protein": 75, "carbohydrates": 250, "fat": 60, "fiber": 30, "sodium": 2300}
    ndv = {n: round((actual[n] - recommended[n]) / recommended[n], 3) for n in recommended}
    ndv_status = {}
    for n, v in ndv.items():
        if v < -0.1:   ndv_status[n] = "Deficient"
        elif v > 0.1:  ndv_status[n] = "Excess"
        else:          ndv_status[n] = "Optimal"

    dds = round(sum(abs(v) for v in ndv.values()) / len(ndv) * 100, 2)

    disease_weights = {
        "diabetes":     {"carbohydrates": 2.0, "calories": 1.5, "fiber": 1.2},
        "hypertension": {"sodium": 2.5, "fat": 1.5, "fiber": 1.2},
        "obesity":      {"calories": 2.0, "fat": 1.8, "carbohydrates": 1.5},
        "gastric":      {"fiber": 1.8, "fat": 1.5, "protein": 1.2},
        "general":      {}
    }
    weights      = disease_weights.get(disease, {})
    weighted_sum = sum(abs(ndv[n]) * weights.get(n, 1.0) for n in ndv)
    weight_total = sum(weights.get(n, 1.0) for n in ndv)
    dw_dds       = round((weighted_sum / weight_total) * 100, 2)

    prev      = load_previous_dw_dds()
    dcm_value = round((prev - dw_dds) / prev, 3) if prev else 0.0
    if dcm_value > 0.10:    dcm_status = "Strong Improvement"
    elif dcm_value > 0.03:  dcm_status = "Moderate Improvement"
    elif dcm_value < -0.03: dcm_status = "Diet Worsening"
    else:                   dcm_status = "No Significant Change"
    save_current_dw_dds(dw_dds)

    risk = "Low" if dw_dds < 40 else "Medium" if dw_dds < 60 else "High"
    adaptive = {
        "breakfast": "Vegetable oats with paneer",
        "lunch":     "Brown rice with dal and vegetables",
        "dinner":    "Chapati with curry",
        "snack":     "Fruit or nuts"
    }

    try:
        meal_label = ", ".join(foods) if isinstance(foods, list) else str(foods)
        db.session.add(MealPlan(
            user_id=user_id, meal_name=meal_label[:200],
            calories=actual.get("calories"), protein=actual.get("protein"),
            carbs=actual.get("carbohydrates"), fats=actual.get("fat")
        ))
        db.session.commit()
    except Exception as e:
        print(f"⚠️ DB save failed: {e}")
        db.session.rollback()

    return jsonify({
        "actual_nutrition": actual, "recommended_nutrition": recommended,
        "NDV": ndv, "NDV_status": ndv_status, "DDS": dds,
        "DW_DDS": dw_dds, "DCM_value": dcm_value, "DCM_status": dcm_status,
        "risk_level": risk, "adaptive_meal_plan": adaptive
    })

# ================================
# MEAL ROUTES
# ================================
@app.route('/api/save-meal', methods=['POST'])
def save_meal():
    try:
        data = request.get_json()
        db.session.add(MealPlan(
            user_id=data.get('user_id', 1), meal_name=data['meal_name'],
            calories=data.get('calories'), protein=data.get('protein'),
            carbs=data.get('carbs'), fats=data.get('fats')
        ))
        db.session.commit()
        return jsonify({"message": "✅ Meal saved!"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/get-meals', methods=['GET'])
def get_meals():
    try:
        user_id = request.args.get('user_id', 1)
        meals   = MealPlan.query.filter_by(user_id=user_id).all()
        return jsonify([{
            "id": m.id, "meal_name": m.meal_name, "calories": m.calories,
            "protein": m.protein, "carbs": m.carbs, "fats": m.fats,
            "date": str(m.date_planned)
        } for m in meals]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/delete-meal/<int:meal_id>', methods=['DELETE'])
def delete_meal(meal_id):
    try:
        meal = MealPlan.query.get(meal_id)
        if not meal:
            return jsonify({"error": "Not found"}), 404
        db.session.delete(meal)
        db.session.commit()
        return jsonify({"message": "✅ Deleted!"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ================================
# RUN
# ================================
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)