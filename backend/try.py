# import cv2
# import numpy as np
# from datetime import datetime
# import time
# import os
# import json
# import sys

# # ===== FIX FOR WINDOWS ENCODING =====
# if sys.platform == 'win32':
#     import io
#     sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
#     sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# class SmartRiceImpurityDetector:
#     """Smart detector that ignores white backgrounds and detects only dark stones/impurities"""
    
#     def __init__(self, droidcam_url="http://192.168.0.102:4747/video"):
#         self.droidcam_url = droidcam_url
#         self.cap = None
#         self.impurity_counter = 0
#         self.alert_sent = False
#         self.last_alert_time = 0
        
#         # Detection parameters - MADE MORE SENSITIVE
#         self.min_area = 100  # Reduced from 150
#         self.max_area = 20000  # Increased from 15000
#         self.stable_frames = 3  # Reduced from 5 for faster detection
#         self.alert_cooldown = 10
        
#         # Background reference
#         self.background_color = None
#         self.calibrated = False
    
#     def send_data_to_ui(self, data):
#         """Send data to UI via stdout in JSON format"""
#         try:
#             output = json.dumps(data)
#             print(f"DATA:{output}", flush=True)
#             sys.stdout.flush()
#         except Exception as e:
#             print(f"Error sending data: {str(e)}", file=sys.stderr)
    
#     def connect_camera(self):
#         """Connect to DroidCam"""
#         print("Connecting to DroidCam...")
#         self.cap = cv2.VideoCapture(self.droidcam_url)
        
#         if not self.cap.isOpened():
#             self.cap = cv2.VideoCapture(self.droidcam_url, cv2.CAP_FFMPEG)
        
#         if not self.cap.isOpened():
#             print("ERROR: Could not connect to DroidCam")
#             print("   Check IP address and make sure DroidCam app is running")
#             return False
        
#         self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
#         print("SUCCESS: DroidCam connected!")
#         return True
    
#     def calibrate_background(self, frame):
#         """Auto-detect background color (rice/surface)"""
#         gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
#         # Sample from center region
#         h, w = frame.shape[:2]
#         center_region = frame[h//4:3*h//4, w//4:3*w//4]
        
#         # Calculate average color and intensity
#         avg_color = np.mean(center_region, axis=(0, 1))
#         avg_intensity = np.mean(gray)
        
#         self.background_color = {
#             'bgr': avg_color,
#             'intensity': avg_intensity
#         }
        
#         print(f"Background calibrated - Avg intensity: {avg_intensity:.1f}")
#         self.calibrated = True
    
#     def detect_impurities(self, frame):
#         """Enhanced detection for dark stones in rice"""
        
#         # Resize
#         frame = cv2.resize(frame, (640, 480))
#         original = frame.copy()
        
#         # Auto-calibrate on first frame
#         if not self.calibrated:
#             self.calibrate_background(frame)
        
#         # Convert to grayscale
#         gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
#         # Get background intensity
#         background_intensity = self.background_color['intensity']
        
#         # METHOD 1: Enhanced darkness detection
#         # Detect objects darker than background (more lenient threshold)
#         darkness_threshold = background_intensity - 30  # Reduced from 50
#         _, dark_mask = cv2.threshold(gray, int(darkness_threshold), 255, cv2.THRESH_BINARY_INV)
        
#         # METHOD 2: Adaptive thresholding for local variations
#         adaptive_thresh = cv2.adaptiveThreshold(
#             gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
#             cv2.THRESH_BINARY_INV, 15, 5
#         )
        
#         # METHOD 3: Color-based detection (looking for non-white objects)
#         hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        
#         # Detect dark colors (stones, dirt, etc.)
#         lower_dark = np.array([0, 0, 0])
#         upper_dark = np.array([180, 255, 100])  # Low value = dark
#         dark_color_mask = cv2.inRange(hsv, lower_dark, upper_dark)
        
#         # METHOD 4: Edge detection
#         blur = cv2.GaussianBlur(gray, (5, 5), 0)
#         edges = cv2.Canny(blur, 30, 100)  # More sensitive edges
        
#         # Dilate edges
#         kernel_edge = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
#         edges_dilated = cv2.dilate(edges, kernel_edge, iterations=2)
        
#         # COMBINE METHODS
#         # Combine dark mask with adaptive threshold
#         combined = cv2.bitwise_or(dark_mask, adaptive_thresh)
#         combined = cv2.bitwise_or(combined, dark_color_mask)
#         combined = cv2.bitwise_and(combined, edges_dilated)
        
#         # Clean up noise
#         kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
#         cleaned = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel, iterations=1)
#         cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)
        
#         # Find contours
#         contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
#         impurities_detected = []
        
#         for cnt in contours:
#             area = cv2.contourArea(cnt)
            
#             # Filter by area
#             if area < self.min_area or area > self.max_area:
#                 continue
            
#             # Get bounding box
#             x, y, w, h = cv2.boundingRect(cnt)
            
#             # Filter by aspect ratio (allow more variation)
#             aspect_ratio = w / float(h)
#             if aspect_ratio > 5 or aspect_ratio < 0.2:  # More lenient
#                 continue
            
#             # Check darkness
#             mask = np.zeros(gray.shape, dtype=np.uint8)
#             cv2.drawContours(mask, [cnt], -1, 255, -1)
#             mean_intensity = cv2.mean(gray, mask=mask)[0]
            
#             # More lenient darkness check
#             darkness_diff = background_intensity - mean_intensity
#             if darkness_diff < 10:  # Reduced from 20
#                 continue
            
#             # Calculate shape features
#             perimeter = cv2.arcLength(cnt, True)
#             if perimeter == 0:
#                 continue
            
#             circularity = 4 * np.pi * area / (perimeter * perimeter)
            
#             # Calculate solidity
#             hull = cv2.convexHull(cnt)
#             hull_area = cv2.contourArea(hull)
#             solidity = area / hull_area if hull_area > 0 else 0
            
#             # RELAXED SCORING SYSTEM
#             confidence = 0
            
#             # Darkness scoring
#             if darkness_diff > 30:
#                 confidence += 35
#             elif darkness_diff > 20:
#                 confidence += 25
#             elif darkness_diff > 10:
#                 confidence += 15
            
#             # Area scoring
#             if 150 <= area <= 10000:
#                 confidence += 25
#             else:
#                 confidence += 10
            
#             # Shape scoring (more lenient)
#             if 0.2 <= circularity <= 1.0:
#                 confidence += 20
#             else:
#                 confidence += 10
            
#             # Solidity scoring
#             if solidity > 0.5:
#                 confidence += 10
            
#             # Accept lower confidence detections (reduced from 60)
#             if confidence >= 40:
#                 impurities_detected.append({
#                     'contour': cnt,
#                     'bbox': (x, y, w, h),
#                     'area': area,
#                     'confidence': confidence,
#                     'intensity': mean_intensity,
#                     'darkness_diff': darkness_diff,
#                     'circularity': circularity,
#                     'solidity': solidity
#                 })
        
#         return original, cleaned, impurities_detected
    
#     def draw_detections(self, frame, impurities):
#         """Draw bounding boxes and info"""
#         for idx, imp in enumerate(impurities, 1):
#             x, y, w, h = imp['bbox']
            
#             if imp['confidence'] >= 70:
#                 color = (0, 0, 255)  # Red - high confidence
#             elif imp['confidence'] >= 50:
#                 color = (0, 165, 255)  # Orange - medium confidence
#             else:
#                 color = (0, 255, 255)  # Yellow - low confidence
            
#             cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            
#             label = f"STONE #{idx}"
#             conf = f"{imp['confidence']:.0f}%"
            
#             (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
#             cv2.rectangle(frame, (x, y-30), (x+tw+60, y), color, -1)
            
#             cv2.putText(frame, label, (x+2, y-16), 
#                        cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
#             cv2.putText(frame, conf, (x+2, y-4), 
#                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
            
#             cx, cy = x + w//2, y + h//2
#             cv2.circle(frame, (cx, cy), 4, (0, 255, 0), -1)
        
#         return frame
    
#     def send_alert(self, impurity_count, frame):
#         """Send comprehensive alert"""
#         timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
#         print("\n" + "="*70)
#         print("ALERT! IMPURITY ALERT - CONTAMINATION DETECTED!")
#         print("="*70)
#         print(f"Time: {timestamp}")
#         print(f"Impurities Count: {impurity_count} stone(s) detected")
#         print(f"STATUS: CONTAMINATION DETECTED!")
#         print(f"Location: Rice Container - Quality Control Station")
#         print(f"ACTION REQUIRED: Remove impurities immediately!")
#         print("="*70 + "\n")
        
#         # Save image
#         os.makedirs("detections", exist_ok=True)
#         timestamp_file = datetime.now().strftime('%Y%m%d_%H%M%S')
#         filename = f"detections/impurity_alert_{timestamp_file}.jpg"
#         cv2.imwrite(filename, frame)
#         print(f"Detection image saved: {filename}")
        
#         # Log
#         with open("impurity_log.txt", "a") as f:
#             f.write(f"{timestamp} - ALERT - {impurity_count} impurities detected\n")
    
#     def run(self):
#         """Main detection loop"""
#         if not self.connect_camera():
#             return
        
#         print("\n" + "="*70)
#         print("SMART RICE IMPURITY DETECTION SYSTEM - ENHANCED MODE")
#         print("="*70)
#         print("Starting camera feed...")
#         print("Calibrating background... (please wait)")
#         print("\nTIP: Point camera at rice/surface for best results")
#         print("Press 'r' to recalibrate background")
#         print("Press 'ESC' to exit\n")
        
#         fps = 0.0
#         fps_counter = 0
#         fps_start = time.time()
#         frame_count = 0
        
#         try:
#             while True:
#                 ret, frame = self.cap.read()
                
#                 if not ret:
#                     print("WARNING: Frame read failed")
#                     time.sleep(0.5)
#                     continue
                
#                 frame_count += 1
                
#                 # Detect impurities
#                 processed, threshold, impurities = self.detect_impurities(frame)
                
#                 # Draw detections
#                 if impurities:
#                     processed = self.draw_detections(processed, impurities)
                
#                 # Update counter
#                 if len(impurities) > 0:
#                     self.impurity_counter += 1
#                 else:
#                     self.impurity_counter = 0
#                     self.alert_sent = False
                
#                 # Calculate FPS
#                 fps_counter += 1
#                 elapsed = time.time() - fps_start
#                 if elapsed > 1:
#                     fps = fps_counter / elapsed
#                     fps_counter = 0
#                     fps_start = time.time()
                
#                 # Send data to UI
#                 data = {
#                     'impurities_count': len(impurities),
#                     'quality_score': max(0, 100 - (len(impurities) * 10)),
#                     'status': 'CONTAMINATION DETECTED' if len(impurities) > 0 else 'CLEAN',
#                     'stability': self.impurity_counter,
#                     'background_intensity': self.background_color['intensity'] if self.calibrated else 0,
#                     'timestamp': datetime.now().strftime('%H:%M:%S'),
#                     'fps': round(fps, 1),
#                     'detections': [{
#                         'confidence': int(imp['confidence']),
#                         'area': int(imp['area']),
#                         'darkness_diff': float(imp['darkness_diff'])
#                     } for imp in impurities]
#                 }
#                 self.send_data_to_ui(data)
                
#                 # Status
#                 status = "IMPURITY DETECTED!" if len(impurities) > 0 else "CLEAN"
#                 status_color = (0, 0, 255) if len(impurities) > 0 else (0, 255, 0)
                
#                 # Create info overlay
#                 overlay = processed.copy()
#                 cv2.rectangle(overlay, (0, 0), (640, 120), (0, 0, 0), -1)
#                 processed = cv2.addWeighted(overlay, 0.4, processed, 0.6, 0)
                
#                 # Draw status
#                 cv2.putText(processed, status, (10, 40), 
#                            cv2.FONT_HERSHEY_SIMPLEX, 1.0, status_color, 2)
                
#                 # Info
#                 info = f"Stones: {len(impurities)} | Stability: {self.impurity_counter}/{self.stable_frames}"
#                 cv2.putText(processed, info, (10, 70), 
#                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                
#                 # Background info
#                 if self.calibrated:
#                     bg_info = f"Background: {self.background_color['intensity']:.0f}"
#                     cv2.putText(processed, bg_info, (10, 95), 
#                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
                
#                 # FPS
#                 cv2.putText(processed, f"FPS: {fps:.1f}", (10, 115), 
#                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
                
#                 # Send alert if stable
#                 current_time = time.time()
#                 if (self.impurity_counter >= self.stable_frames and 
#                     not self.alert_sent and 
#                     current_time - self.last_alert_time > self.alert_cooldown):
                    
#                     self.send_alert(len(impurities), processed)
#                     self.alert_sent = True
#                     self.last_alert_time = current_time
                
#                 # Display
#                 cv2.imshow("Smart Rice Impurity Detector", processed)
#                 cv2.imshow("Detection Mask", threshold)
                
#                 # Handle keys
#                 key = cv2.waitKey(1) & 0xFF
#                 if key == 27:  # ESC
#                     print("\nShutting down...")
#                     break
#                 elif key == ord('r'):  # Recalibrate
#                     print("Recalibrating background...")
#                     self.calibrated = False
                    
#         except KeyboardInterrupt:
#             print("\nStopped by user")
#         finally:
#             self.cap.release()
#             cv2.destroyAllWindows()
#             print("System stopped")


# if __name__ == "__main__":
#     detector = SmartRiceImpurityDetector(
#         droidcam_url="http://192.168.0.102:4747/video"
#     )
#     detector.run()


import cv2
import numpy as np
from datetime import datetime
import time
import os
import json
import sys
import base64

# ===== FIX FOR WINDOWS ENCODING =====
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

class SmartRiceImpurityDetector:
    """Smart detector that streams frames via base64"""
    
    def __init__(self, droidcam_url="http://192.168.0.102:4747/video"):
        self.droidcam_url = droidcam_url
        self.cap = None
        self.impurity_counter = 0
        self.alert_sent = False
        self.last_alert_time = 0
        
        # Detection parameters
        self.min_area = 100
        self.max_area = 20000
        self.stable_frames = 3
        self.alert_cooldown = 10
        
        # Background reference
        self.background_color = None
        self.calibrated = False
    
    def send_data_to_ui(self, data):
        """Send data to UI via stdout in JSON format"""
        try:
            output = json.dumps(data)
            print(f"DATA:{output}", flush=True)
            sys.stdout.flush()
        except Exception as e:
            print(f"Error sending data: {str(e)}", file=sys.stderr)
    
    def send_frame_to_ui(self, frame):
        """Encode frame as base64 and send to UI"""
        try:
            # Encode frame as JPEG
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            # Convert to base64
            frame_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # Send as FRAME: prefix
            print(f"FRAME:{frame_base64}", flush=True)
            sys.stdout.flush()
        except Exception as e:
            print(f"Error sending frame: {str(e)}", file=sys.stderr)
    
    def connect_camera(self):
        """Connect to DroidCam"""
        print("Connecting to DroidCam...")
        self.cap = cv2.VideoCapture(self.droidcam_url)
        
        if not self.cap.isOpened():
            self.cap = cv2.VideoCapture(self.droidcam_url, cv2.CAP_FFMPEG)
        
        if not self.cap.isOpened():
            print("ERROR: Could not connect to DroidCam")
            return False
        
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        print("SUCCESS: DroidCam connected!")
        return True
    
    def calibrate_background(self, frame):
        """Auto-detect background color"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        h, w = frame.shape[:2]
        center_region = frame[h//4:3*h//4, w//4:3*w//4]
        avg_color = np.mean(center_region, axis=(0, 1))
        avg_intensity = np.mean(gray)
        
        self.background_color = {
            'bgr': avg_color,
            'intensity': avg_intensity
        }
        
        print(f"Background calibrated - Avg intensity: {avg_intensity:.1f}")
        self.calibrated = True
    
    def detect_impurities(self, frame):
        """Enhanced detection for dark stones in rice"""
        frame = cv2.resize(frame, (640, 480))
        original = frame.copy()
        
        if not self.calibrated:
            self.calibrate_background(frame)
        
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        background_intensity = self.background_color['intensity']
        
        # Detection methods
        darkness_threshold = background_intensity - 30
        _, dark_mask = cv2.threshold(gray, int(darkness_threshold), 255, cv2.THRESH_BINARY_INV)
        
        adaptive_thresh = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY_INV, 15, 5
        )
        
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        lower_dark = np.array([0, 0, 0])
        upper_dark = np.array([180, 255, 100])
        dark_color_mask = cv2.inRange(hsv, lower_dark, upper_dark)
        
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 30, 100)
        kernel_edge = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        edges_dilated = cv2.dilate(edges, kernel_edge, iterations=2)
        
        combined = cv2.bitwise_or(dark_mask, adaptive_thresh)
        combined = cv2.bitwise_or(combined, dark_color_mask)
        combined = cv2.bitwise_and(combined, edges_dilated)
        
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        cleaned = cv2.morphologyEx(combined, cv2.MORPH_OPEN, kernel, iterations=1)
        cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_CLOSE, kernel, iterations=2)
        
        contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        impurities_detected = []
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            
            if area < self.min_area or area > self.max_area:
                continue
            
            x, y, w, h = cv2.boundingRect(cnt)
            aspect_ratio = w / float(h)
            if aspect_ratio > 5 or aspect_ratio < 0.2:
                continue
            
            mask = np.zeros(gray.shape, dtype=np.uint8)
            cv2.drawContours(mask, [cnt], -1, 255, -1)
            mean_intensity = cv2.mean(gray, mask=mask)[0]
            
            darkness_diff = background_intensity - mean_intensity
            if darkness_diff < 10:
                continue
            
            perimeter = cv2.arcLength(cnt, True)
            if perimeter == 0:
                continue
            
            circularity = 4 * np.pi * area / (perimeter * perimeter)
            hull = cv2.convexHull(cnt)
            hull_area = cv2.contourArea(hull)
            solidity = area / hull_area if hull_area > 0 else 0
            
            confidence = 0
            if darkness_diff > 30:
                confidence += 35
            elif darkness_diff > 20:
                confidence += 25
            elif darkness_diff > 10:
                confidence += 15
            
            if 150 <= area <= 10000:
                confidence += 25
            else:
                confidence += 10
            
            if 0.2 <= circularity <= 1.0:
                confidence += 20
            else:
                confidence += 10
            
            if solidity > 0.5:
                confidence += 10
            
            if confidence >= 40:
                impurities_detected.append({
                    'contour': cnt,
                    'bbox': (x, y, w, h),
                    'area': area,
                    'confidence': confidence,
                    'intensity': mean_intensity,
                    'darkness_diff': darkness_diff,
                    'circularity': circularity,
                    'solidity': solidity
                })
        
        return original, cleaned, impurities_detected
    
    def draw_detections(self, frame, impurities):
        """Draw bounding boxes"""
        for idx, imp in enumerate(impurities, 1):
            x, y, w, h = imp['bbox']
            
            if imp['confidence'] >= 70:
                color = (0, 0, 255)
            elif imp['confidence'] >= 50:
                color = (0, 165, 255)
            else:
                color = (0, 255, 255)
            
            cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
            
            label = f"STONE #{idx}"
            conf = f"{imp['confidence']:.0f}%"
            
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(frame, (x, y-30), (x+tw+60, y), color, -1)
            
            cv2.putText(frame, label, (x+2, y-16), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            cv2.putText(frame, conf, (x+2, y-4), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
            
            cx, cy = x + w//2, y + h//2
            cv2.circle(frame, (cx, cy), 4, (0, 255, 0), -1)
        
        return frame
    
    def send_alert(self, impurity_count, frame):
        """Send comprehensive alert"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        print("\n" + "="*70)
        print("ALERT! IMPURITY ALERT - CONTAMINATION DETECTED!")
        print("="*70)
        print(f"Time: {timestamp}")
        print(f"Impurities Count: {impurity_count} stone(s) detected")
        print("="*70 + "\n")
        
        # Save alert image
        os.makedirs("detections", exist_ok=True)
        timestamp_file = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"detections/impurity_alert_{timestamp_file}.jpg"
        cv2.imwrite(filename, frame)
        print(f"Detection image saved: {filename}")
    
    def run(self):
        """Main detection loop with frame streaming"""
        if not self.connect_camera():
            return
        
        print("\n" + "="*70)
        print("SMART RICE IMPURITY DETECTION SYSTEM - STREAMING MODE")
        print("="*70)
        print("Starting camera feed...")
        print("Streaming frames to UI...")
        
        fps = 0.0
        fps_counter = 0
        fps_start = time.time()
        frame_count = 0
        last_frame_send = time.time()
        
        try:
            while True:
                ret, frame = self.cap.read()
                
                if not ret:
                    time.sleep(0.1)
                    continue
                
                frame_count += 1
                
                # Detect impurities
                processed, threshold, impurities = self.detect_impurities(frame)
                
                # Draw detections
                if impurities:
                    processed = self.draw_detections(processed, impurities)
                
                # Update counter
                if len(impurities) > 0:
                    self.impurity_counter += 1
                else:
                    self.impurity_counter = 0
                    self.alert_sent = False
                
                # Calculate FPS
                fps_counter += 1
                elapsed = time.time() - fps_start
                if elapsed > 1:
                    fps = fps_counter / elapsed
                    fps_counter = 0
                    fps_start = time.time()
                
                # Add overlay
                status = "IMPURITY DETECTED!" if len(impurities) > 0 else "CLEAN"
                status_color = (0, 0, 255) if len(impurities) > 0 else (0, 255, 0)
                
                overlay = processed.copy()
                cv2.rectangle(overlay, (0, 0), (640, 120), (0, 0, 0), -1)
                processed = cv2.addWeighted(overlay, 0.4, processed, 0.6, 0)
                
                cv2.putText(processed, status, (10, 40), 
                           cv2.FONT_HERSHEY_SIMPLEX, 1.0, status_color, 2)
                
                info = f"Stones: {len(impurities)} | Stability: {self.impurity_counter}/{self.stable_frames}"
                cv2.putText(processed, info, (10, 70), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
                
                if self.calibrated:
                    bg_info = f"Background: {self.background_color['intensity']:.0f}"
                    cv2.putText(processed, bg_info, (10, 95), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
                
                cv2.putText(processed, f"FPS: {fps:.1f}", (10, 115), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 255), 1)
                
                # Send frame every 200ms (5 FPS to UI)
                current_time = time.time()
                if current_time - last_frame_send >= 0.2:
                    self.send_frame_to_ui(processed)
                    last_frame_send = current_time
                
                # Send data to UI
                data = {
                    'impurities_count': len(impurities),
                    'quality_score': max(0, 100 - (len(impurities) * 10)),
                    'status': 'CONTAMINATION DETECTED' if len(impurities) > 0 else 'CLEAN',
                    'stability': self.impurity_counter,
                    'background_intensity': self.background_color['intensity'] if self.calibrated else 0,
                    'timestamp': datetime.now().strftime('%H:%M:%S'),
                    'fps': round(fps, 1),
                    'detections': [{
                        'confidence': int(imp['confidence']),
                        'area': int(imp['area']),
                        'darkness_diff': float(imp['darkness_diff'])
                    } for imp in impurities]
                }
                self.send_data_to_ui(data)
                
                # Send alert if stable
                if (self.impurity_counter >= self.stable_frames and 
                    not self.alert_sent and 
                    current_time - self.last_alert_time > self.alert_cooldown):
                    
                    self.send_alert(len(impurities), processed)
                    self.alert_sent = True
                    self.last_alert_time = current_time
                
                # Optional: Show local window
                # cv2.imshow("Detection", processed)
                
                key = cv2.waitKey(1) & 0xFF
                if key == 27:  # ESC
                    print("\nShutting down...")
                    break
                elif key == ord('r'):
                    print("Recalibrating background...")
                    self.calibrated = False
                    
        except KeyboardInterrupt:
            print("\nStopped by user")
        finally:
            if self.cap:
                self.cap.release()
            cv2.destroyAllWindows()
            print("System stopped")

    
if __name__ == "__main__":
    detector = SmartRiceImpurityDetector(
        droidcam_url="http://192.168.0.102:4747/video"
    )
    detector.run()