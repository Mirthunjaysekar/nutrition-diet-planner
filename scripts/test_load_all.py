import pandas as pd
import os

print("Script started")

DATA_PATH = "../data/raw/"

print("Looking for files in:", DATA_PATH)

files = os.listdir(DATA_PATH)
print("Files found:", files)

for file in files:
    if file.endswith(".csv"):
        print("\n==============================")
        print("FILE NAME:", file)
        print("==============================")
        df = pd.read_csv(os.path.join(DATA_PATH, file))
        print("Shape:", df.shape)
        print("Columns:")
        for col in df.columns:
            print(" -", col)

print("Script finished")
