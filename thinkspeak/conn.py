import firebase_admin
from firebase_admin import credentials, db
import requests
import time

# Firebase setup
cred = credentials.Certificate("dispenzo2service.json")  # your JSON key
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://dispenzo2-default-rtdb.firebaseio.com/'
})

# ThingSpeak setup
THINGSPEAK_API_KEY = "5YM4K6VYIKM2BGYN"
THINGSPEAK_URL = "https://api.thingspeak.com/update"

def upload_to_thingspeak(data):
    payload = {
        "api_key": THINGSPEAK_API_KEY,
        "field1": data.get("Quantity_Dispensed (kg)", 0),
        "field2": data.get("Stock_Remaining (kg)", 0),
        "field3": data.get("Dispense_Time (s)", 0),
        "field4": data.get("Power_Consumption (W)", 0),
        "field5": data.get("Temperature (°C)", 0),
        "field6": data.get("Humidity (%)", 0),
        "field7": 0 if data.get("Error_Code") == "ERR_NONE" else 1,
        "field8": 1  # Incremental user count (optional)
    }
    response = requests.post(THINGSPEAK_URL, params=payload)
    if response.status_code == 200:
        print("✅ Data uploaded to ThingSpeak successfully.")
    else:
        print(f"⚠️ Upload failed: {response.status_code}")

# Continuously sync new data every few seconds
while True:
    # Fetch latest transaction from Firebase
    ref = db.reference("/Dispenzo_Transactions")
    all_data = ref.get()

    if all_data:
        # Get last transaction (most recent)
        last_key = list(all_data.keys())[-1]
        last_entry = all_data[last_key]
        upload_to_thingspeak(last_entry)

    time.sleep(30)  # update every 30 seconds