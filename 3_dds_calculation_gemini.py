import json
import google.generativeai as genai

# ================================
# CONFIGURE GEMINI
# ================================
genai.configure(api_key="AIzaSyD0_AtSeuhYU-Q4OIYMSN3VS_svO13VJR4")
model = genai.GenerativeModel("gemini-3-flash-preview")

# ================================
# LOAD SELECTED MEAL PLAN
# ================================
with open("../data/processed/selected_meal_plan.json", "r") as f:
    meal_plan = json.load(f)

recommended_daily = meal_plan["recommended_nutrition"]

print("Meal plan loaded")
print("Disease:", meal_plan["disease"])

# ================================
# USER ENTERS FOODS EATEN
# ================================
foods = []

print("\nEnter foods eaten today (type 'done' to finish):")
while True:
    food = input("Food eaten: ").strip()
    if food.lower() == "done":
        break
    foods.append(food)

meal_count = len(foods)
if meal_count == 0:
    print("No food entered. Exiting.")
    exit()

# ================================
# GEMINI – ACTUAL NUTRITION
# ================================
prompt = f"""
You are a certified nutrition expert.

Estimate TOTAL DAILY nutrition for the following foods eaten:
{foods}

Return ONLY valid JSON in this exact format:
{{
  "calories": number,
  "protein": number,
  "carbohydrates": number,
  "fat": number,
  "fiber": number,
  "sodium": number
}}
"""

response = model.generate_content(prompt)

try:
    actual_nutrition = json.loads(response.text)
except Exception:
    print("Gemini parsing error")
    print(response.text)
    exit()

print("\nEstimated actual nutrition:")
print(actual_nutrition)

# ================================
# SCALE RECOMMENDED NUTRITION
# ================================
MEALS_PER_DAY = 3

recommended_scaled = {}
for nutrient, value in recommended_daily.items():
    recommended_scaled[nutrient] = round(
        (value / MEALS_PER_DAY) * meal_count, 2
    )

print("\nScaled recommended nutrition:")
print(recommended_scaled)

# ================================
# DDS CALCULATION
# ================================
def compute_dds(actual, recommended):
    total_dev = 0
    count = 0
    for nutrient in recommended:
        if recommended[nutrient] > 0:
            dev = abs(actual[nutrient] - recommended[nutrient]) / recommended[nutrient]
            total_dev += dev
            count += 1
    return round((total_dev / count) * 100, 2)

dds = compute_dds(actual_nutrition, recommended_scaled)

# ================================
# RISK LEVEL
# ================================
if dds < 40:
    risk = "Low"
elif dds < 60:
    risk = "Medium"
else:
    risk = "High"

print("\nDDS:", dds)
print("Risk Level:", risk)

# ================================
# SAVE DDS OUTPUT
# ================================
dds_output = {
    "disease": meal_plan["disease"],
    "food_preference": meal_plan["food_preference"],
    "allergy": meal_plan["allergy"],
    "foods_eaten": foods,
    "actual_nutrition": actual_nutrition,
    "recommended_nutrition_scaled": recommended_scaled,
    "DDS": dds,
    "risk_level": risk
}

with open("../data/processed/daily_dds.json", "w") as f:
    json.dump(dds_output, f, indent=4)

print("\nDDS saved to daily_dds.json")
