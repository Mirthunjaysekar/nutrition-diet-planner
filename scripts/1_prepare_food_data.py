import pandas as pd
import json

# -----------------------------
# STEP 1.1: LOAD CLEANED DATASET
# -----------------------------

DATASET_PATH = "../data/raw/detailed_meals_macros_CLEANED.csv"

df = pd.read_csv(DATASET_PATH)

print("Dataset loaded successfully")
print("Initial shape:", df.shape)

# -----------------------------
# STEP 1.2: STANDARDIZE COLUMN NAMES
# -----------------------------

df.columns = (
    df.columns
    .str.lower()
    .str.strip()
    .str.replace(" ", "_")
    .str.replace(".", "")
)

# -----------------------------
# STEP 1.3: SELECT REQUIRED COLUMNS
# -----------------------------

required_columns = [
    "protein",
    "carbohydrates",
    "fat",
    "fiber",
    "sodium",
    "calories",
    "disease",
    "breakfast_suggestion",
    "lunch_suggestion",
    "dinner_suggestion",
    "snack_suggestion"
]

df = df[required_columns]

print("Columns selected:", df.columns.tolist())

# -----------------------------
# STEP 1.4: HANDLE MISSING VALUES
# -----------------------------

nutrients = ["protein", "carbohydrates", "fat", "fiber", "sodium", "calories"]

for col in nutrients:
    df[col] = df[col].fillna(0)

df["disease"] = df["disease"].fillna("unknown")

# -----------------------------
# STEP 1.5: CREATE FOOD / MEAL CATALOG
# -----------------------------
# We treat meal suggestions as food items for simplicity

meal_catalog = df.groupby(
    [
        "breakfast_suggestion",
        "lunch_suggestion",
        "dinner_suggestion",
        "snack_suggestion",
        "disease"
    ],
    as_index=False
)[nutrients].mean()

meal_catalog[nutrients] = meal_catalog[nutrients].round(2)

print("Meal catalog created")
print("Total records:", meal_catalog.shape[0])

# -----------------------------
# STEP 1.6: SAVE OUTPUT AS JSON
# -----------------------------

OUTPUT_PATH = "../data/processed/food_catalog.json"

meal_catalog.to_json(
    OUTPUT_PATH,
    orient="records",
    indent=4
)

print("Food catalog saved to:", OUTPUT_PATH)

# -----------------------------
# STEP 1 COMPLETED
# -----------------------------
