import cv2
from ultralytics import YOLO

# Load your trained model
model = YOLO(r"C:\Users\shruti\runs\detect\train6\weights\best.pt")

# DroidCam URL
DROIDCAM_URL = "http://192.168.0.102:4747/video"  # change if IP differs

cap = cv2.VideoCapture(DROIDCAM_URL)

if not cap.isOpened():
    print("❌ Could not connect to DroidCam")
    exit()

print("✅ Live impurity detection started. Press ESC to exit.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.resize(frame, (640, 480))

    results = model(frame, conf=0.1)

    impurity_found = False

    for r in results:
        for box in r.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            label = model.names[cls_id]

            impurity_found = True

            cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
            cv2.putText(frame, f"{label} {conf:.2f}",
                        (x1, y1 - 8),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (0, 0, 255), 2)

    if impurity_found:
        print("⚠️ IMPURITY DETECTED")

    cv2.imshow("AI Impurity Detection", frame)

    if cv2.waitKey(1) & 0xFF == 27:
        break

cap.release()
cv2.destroyAllWindows()
