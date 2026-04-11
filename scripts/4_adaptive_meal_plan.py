import json
import google.generativeai as genai

# ================================
# CONFIGURE GEMINI
# ================================
genai.configure(api_key="AIzaSyD0_AtSeuhYU-Q4OIYMSN3VS_svO13VJR4")
model = genai.GenerativeModel("gemini-3-flash-preview")

# ================================
# LOAD DDS RESULT
# ================================
with open("../data/processed/daily_dds.json", "r") as f:
    dds_data = json.load(f)

actual = dds_data["actual_nutrition"]
recommended = dds_data["recommended_nutrition_scaled"]
risk = dds_data["risk_level"]
disease = dds_data["disease"]
food_pref = dds_data["food_preference"]
allergy = dds_data["allergy"]

print("DDS Loaded")
print("Risk Level:", risk)

# ================================
# NUTRIENT GAP ANALYSIS
# ================================
deficiency = []
excess = []

for nutrient in recommended:
    if actual[nutrient] < recommended[nutrient] * 0.8:
        deficiency.append(nutrient)
    elif actual[nutrient] > recommended[nutrient] * 1.2:
        excess.append(nutrient)

# ================================
# GEMINI – ADAPTIVE MEAL GENERATION
# ================================
prompt = f"""
You are a clinical dietitian.

User profile:
Disease: {disease}
Food preference: {food_pref}
Allergy: {allergy}

Nutrient deficiencies: {deficiency}
Nutrient excess: {excess}

Suggest an ADAPTIVE ONE-DAY MEAL PLAN
(breakfast, lunch, dinner, snack).

Rules:
- Avoid allergy foods
- Match disease condition
- Match food preference
- Use common Indian foods
- Output ONLY valid JSON

Format:
{{
  "breakfast": "...",
  "lunch": "...",
  "dinner": "...",
  "snack": "..."
}}
"""

response = model.generate_content(prompt)

try:
    adaptive_meal_plan = json.loads(response.text)
except Exception:
    print("Gemini adaptive plan parsing error")
    print(response.text)
    exit()

# ================================
# FINAL OUTPUT
# ================================
final_output = {
    "DDS": dds_data["DDS"],
    "risk_level": risk,
    "nutrient_deficiency": deficiency,
    "nutrient_excess": excess,
    "adaptive_meal_plan": adaptive_meal_plan
}

with open("../data/processed/adaptive_meal_plan.json", "w") as f:
    json.dump(final_output, f, indent=4)

print("\nFood-based adaptive meal plan generated using Gemini")
print("Saved to adaptive_meal_plan.json")
