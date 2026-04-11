import json
import random

# ---------------------------------
# LOAD FOOD CATALOG
# ---------------------------------

CATALOG_PATH = "../data/processed/food_catalog.json"

with open(CATALOG_PATH, "r") as f:
    food_catalog = json.load(f)

print("Food catalog loaded")
print("Total records:", len(food_catalog))

# ---------------------------------
# USER INPUT
# ---------------------------------

user_disease = input(
    "Enter disease (diabetes / hypertension / obesity / gastric): "
).strip().lower()

food_pref = input(
    "Enter food preference (veg / non-veg): "
).strip().lower()

user_allergy = input(
    "Enter allergy (milk / nuts / egg / gluten / fish / chicken / mutton / none): "
).strip().lower()

# ---------------------------------
# ALLERGY RULES
# ---------------------------------

ALLERGY_RULES = {
    "milk": ["milk", "curd", "yogurt", "butter", "cheese", "paneer", "ghee"],
    "nuts": ["peanut", "almond", "cashew", "nuts"],
    "egg": ["egg", "omelette"],
    "gluten": ["wheat", "chapati", "roti", "bread", "pasta", "noodles"],
    "fish": ["fish", "salmon", "tuna", "pomfret"],
    "chicken": ["chicken"],
    "mutton": ["mutton", "lamb"],
    "beef": ["beef"]
}

SUBSTITUTES = {
    "milk": "soy milk",
    "paneer": "tofu",
    "curd": "coconut curd",
    "egg": "boiled chickpeas",
    "chapati": "rice roti",
    "bread": "gluten-free bread",
    "fish": "grilled chicken",
    "chicken": "tofu curry",
    "mutton": "soy chunks curry",
    "beef": "mixed vegetable curry"
}

# ---------------------------------
# HELPER FUNCTIONS
# ---------------------------------

def disease_match(dataset_disease, user_disease):
    return user_disease in dataset_disease.lower()

def is_non_veg(meal_text):
    non_veg_items = [
        "chicken", "fish", "egg", "mutton", "beef", "prawn", "meat"
    ]
    meal_text = meal_text.lower()
    return any(item in meal_text for item in non_veg_items)

def contains_allergen(meal_text, allergy):
    if allergy == "none":
        return False
    meal_text = meal_text.lower()
    for word in ALLERGY_RULES.get(allergy, []):
        if word in meal_text:
            return True
    return False

def make_meal_safe(meal_text, allergy):
    if allergy == "none":
        return meal_text

    meal_lower = meal_text.lower()
    for allergen in ALLERGY_RULES.get(allergy, []):
        if allergen in meal_lower:
            return SUBSTITUTES.get(allergen, "safe alternative food")
    return meal_text

# ---------------------------------
# FILTER BY DISEASE
# ---------------------------------

disease_meals = [
    item for item in food_catalog
    if disease_match(item["disease"], user_disease)
]

print("Meals found for disease:", len(disease_meals))

if not disease_meals:
    print("No meals found for this disease.")
    exit()

# ---------------------------------
# FILTER BY FOOD PREFERENCE
# ---------------------------------

if food_pref == "veg":
    disease_meals = [
        item for item in disease_meals
        if not (
            is_non_veg(item["breakfast_suggestion"]) or
            is_non_veg(item["lunch_suggestion"]) or
            is_non_veg(item["dinner_suggestion"]) or
            is_non_veg(item["snack_suggestion"])
        )
    ]

print("Meals after food preference filter:", len(disease_meals))

if not disease_meals:
    print("No meals found for this food preference.")
    exit()

# ---------------------------------
# SELECT MEAL & APPLY ALLERGY FILTER
# ---------------------------------

selected = random.choice(disease_meals)

meal_plan = {
    "disease": user_disease,
    "food_preference": food_pref,
    "allergy": user_allergy,

    "breakfast": make_meal_safe(
        selected["breakfast_suggestion"], user_allergy
    ),
    "lunch": make_meal_safe(
        selected["lunch_suggestion"], user_allergy
    ),
    "dinner": make_meal_safe(
        selected["dinner_suggestion"], user_allergy
    ),
    "snack": make_meal_safe(
        selected["snack_suggestion"], user_allergy
    ),

    "recommended_nutrition": {
        "calories": selected["calories"],
        "protein": selected["protein"],
        "carbohydrates": selected["carbohydrates"],
        "fat": selected["fat"],
        "fiber": selected["fiber"],
        "sodium": selected["sodium"]
    }
}

# ---------------------------------
# SAVE OUTPUT
# ---------------------------------

OUTPUT_PATH = "../data/processed/initial_meal_plan.json"

with open(OUTPUT_PATH, "w") as f:
    json.dump(meal_plan, f, indent=4)

print("Disease + food preference + allergy safe meal plan generated")
print("Saved to:", OUTPUT_PATH)
