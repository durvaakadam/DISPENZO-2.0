import firebase_admin
from firebase_admin import credentials, db
import pandas as pd

# --- Step 1: Load Firebase Credentials ---
cred = credentials.Certificate("dispenzo2service.json")  # replace with your JSON filename
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://dispenzo2-default-rtdb.firebaseio.com/'  # replace with your actual DB URL
})

# --- Step 2: Load CSV File ---
df = pd.read_csv("Dispenzo_2.0_Sample_Dataset.csv")

# --- Step 3: Convert DataFrame to Dict ---
data = df.to_dict(orient="records")

# --- Step 4: Reference to Database Node ---
ref = db.reference("/Dispenzo_Transactions")

# --- Step 5: Push Data to Firebase ---
for record in data:
    ref.push(record)

print("✅ Data successfully uploaded to Firebase Realtime Database!")