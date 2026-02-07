import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { collection, getDocs } from "firebase/firestore";
import Analytics from "./components/Analytics/Analytics";
import AdminPage from "./pages/AdminPage";
import VoiceGuide from "./components/VoiceGuide";

import "./Rfid.css";

const razorpayApiKey = process.env.REACT_APP_RAZORPAY_API_KEY;
const socket = io("http://localhost:5000");

function Rfid() {
  const [showProceed, setShowProceed] = useState(false);
const [fingerprintError, setFingerprintError] = useState(false);

    const [fingerprintLogs, setFingerprintLogs] = useState([]);
  const [fingerprintStatus, setFingerprintStatus] = useState(null);
// null | "success" | "fail"

const [fingerprintId, setFingerprintId] = useState(null);

  const [currentView, setCurrentView] = useState("main");
  
  // Initialize settings based on localStorage synchronously to prevent audio playing on first render
  const [showSettings, setShowSettings] = useState(() => {
    const hasVisited = localStorage.getItem('dispenzo_visited');
    return !hasVisited; // Show settings if NOT visited before
  });
  const [firstVisit, setFirstVisit] = useState(() => {
    const hasVisited = localStorage.getItem('dispenzo_visited');
    return !hasVisited;
  });
  // IMPORTANT: Voice mode starts DISABLED - only enabled when user explicitly saves settings with voice ON
  const [voiceAssistantMode, setVoiceAssistantMode] = useState(false);
  // Track if user has confirmed settings this session (prevents auto-play on page load)
  const [settingsConfirmed, setSettingsConfirmed] = useState(() => {
    return !!localStorage.getItem('dispenzo_visited'); // true if visited before, false if first time
  });
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
  
  const [fingerprintPending, setFingerprintPending] = useState(false);


  const [rfidUID, setRfidUID] = useState("");
  const [enteredPassword, setEnteredPassword] = useState("");
  const [authSuccess, setAuthSuccess] = useState(false);
  const [error, setError] = useState("");
  const [userData, setUserData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [dispenseMessage, setDispenseMessage] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [users, setUsers] = useState([]);
  const [temperatureValue, setTemperatureValue] = useState(null);
  const [temperatureAlert, setTemperatureAlert] = useState(false);
  const [tempActive, setTempActive] = useState(false);
  const [fillData, setFillData] = useState(null);

  const [containerLevel, setContainerLevel] = useState(null);
  const [levelAlert, setLevelAlert] = useState(false);
  const [ultrasonicDistance, setUltrasonicDistance] = useState(null);
  const [stockStatus, setStockStatus] = useState(null);
  const lowStockThreshold = 20; // % fill below which alert triggers
const [moisturePercent, setMoisturePercent] = useState(null);
const [moistureRaw, setMoistureRaw] = useState(null);
  
  // Payment success state
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentId, setPaymentId] = useState("");
  
  // Helper function to get the best voice for a language
  const getBestVoiceForLanguage = (lang) => {
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    // For Marathi - try to find Google or Microsoft voice first (better quality)
    if (lang === "mr-IN") {
      // First try native Marathi voices (Google/Microsoft are better)
      let voice = voices.find(v => v.lang === "mr-IN" && (v.name.includes("Google") || v.name.includes("Microsoft")));
      if (voice) return voice;
      
      // Try any Marathi voice
      voice = voices.find(v => v.lang === "mr-IN" || v.lang.startsWith("mr"));
      if (voice) return voice;
      
      // Fallback to Hindi (closest language) - prefer Google/Microsoft
      voice = voices.find(v => (v.lang === "hi-IN" || v.lang.startsWith("hi")) && (v.name.includes("Google") || v.name.includes("Microsoft")));
      if (voice) {
        console.log(`🗣️ Marathi fallback: using Hindi voice ${voice.name}`);
        return voice;
      }
      
      voice = voices.find(v => v.lang === "hi-IN" || v.lang.startsWith("hi"));
      if (voice) {
        console.log(`🗣️ Marathi fallback: using Hindi voice ${voice.name}`);
        return voice;
      }
    }

    // Exact language match - prefer Google/Microsoft voices
    let voice = voices.find(v => v.lang === lang && (v.name.includes("Google") || v.name.includes("Microsoft")));
    if (voice) return voice;
    
    voice = voices.find(v => v.lang === lang) ||
      voices.find(v => v.lang.startsWith(lang.split("-")[0]));

    // Intelligent fallback for Indian languages
    if (!voice) {
      const languageFallbacks = {
        "mr-IN": ["hi-IN", "hi"], // Marathi → Hindi
        "ta-IN": ["en-IN", "en"], // Tamil → English
        "te-IN": ["en-IN", "en"], // Telugu → English
        "kn-IN": ["en-IN", "en"], // Kannada → English
        "hi-IN": ["en-IN", "en"], // Hindi → English
        "en-IN": ["en"],           // English → English
      };

      const fallbacks = languageFallbacks[lang] || [];
      for (const fallbackLang of fallbacks) {
        voice = voices.find(v => v.lang === fallbackLang || v.lang.startsWith(fallbackLang));
        if (voice) {
          console.log(`🗣️ Fallback: ${lang} → using ${fallbackLang}`);
          break;
        }
      }
    }

    // Last fallback: use any available voice
    return voice || voices[0];
  };
  
  // Note: Settings initialization is now done synchronously in useState
  // This effect is kept for any additional setup if needed in the future
  useEffect(() => {
    // Settings are already initialized from localStorage in useState
    // No additional setup needed on mount
  }, []);

  // Play voice preview immediately when enabled
  const playVoicePreview = () => {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    
    const previewMessage = {
      "en-IN": "Voice assistant enabled. You will now hear automatic instructions on every screen.",
      "hi-IN": "वॉयस असिस्टेंट सक्षम किया गया है। अब आपको हर स्क्रीन पर स्वचालित निर्देश सुनाई देंगे।",
      "mr-IN": "व्हॉइस असिस्टंट सक्षम केले आहे. आता तुम्हाला प्रत्येक स्क्रीनवर स्वयंचलित सूचना ऐकू येतील.",
      "ta-IN": "குரல் உதவியாளர் இயக்கப்பட்டது. இப்போது ஒவ்வொரு திரையிலும் தானியங்கி வழிமுறைகளை கேட்பீர்கள்.",
      "te-IN": "వాయిస్ అసిస్టెంట్ ఎనేబుల్ చేయబడింది. ఇప్పుడు మీరు ప్రతి స్క్రీన్‌లో స్వయంచాలక సూచనలను వింటారు.",
      "kn-IN": "ಧ್ವನಿ ಸಹಾಯಕ ಸಕ್ರಿಯಗೊಳಿಸಲಾಗಿದೆ. ಈಗ ನೀವು ಪ್ರತಿ ಪರದೆಯಲ್ಲಿ ಸ್ವಯಂಚಾಲಿತ ಸೂಚನೆಗಳನ್ನು ಕೇಳುತ್ತೀರಿ."
    };
    
    const utterance = new SpeechSynthesisUtterance(previewMessage[selectedLanguage]);
    const selectedVoice = getBestVoiceForLanguage(selectedLanguage);
    if (selectedVoice) utterance.voice = selectedVoice;
    
    utterance.lang = selectedLanguage;
    utterance.rate = 1.3;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    window.speechSynthesis.speak(utterance);
  };

  // Save preferences to localStorage
  const saveSettings = () => {
    // Immediately stop any ongoing speech (demo audio, preview, etc.)
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    localStorage.setItem('dispenzo_visited', 'true');
    localStorage.setItem('dispenzo_language', selectedLanguage);
    localStorage.setItem('dispenzo_voice_mode', voiceAssistantMode.toString());
    
    // Mark settings as confirmed - this enables voice guide to work
    setSettingsConfirmed(true);
    setShowSettings(false);
    setFirstVisit(false);
    
    // Voice will be triggered by the useEffect watching showSettings change
    // No need to manually play here - the VoiceGuide component will handle it
  };
  
  // Cancel speech when currentView changes
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentView]);

  // Cancel speech immediately when settings modal closes
  useEffect(() => {
    if (!showSettings) {
      // Stop any ongoing demo audio or preview speech
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Audio will be handled by VoiceGuide component - no need to manually play here
      // VoiceGuide autoPlay prop will handle audio playback when settings close
    }
  }, [showSettings]);
  

  useEffect(() => {
    socket.on("moistureData", (data) => {
      console.log("💧 Moisture data received:", data);
      setMoisturePercent(data.percent);
      setMoistureRaw(data.raw);
    });

    return () => socket.off("moistureData");
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const handleCheckLevel = () => {
    // Emit command to ESP
    socket.emit("checkLevel");

    // Subscribe to the response only once
    socket.once("containerLevelUpdate", (data) => {
      const level = parseFloat(data.percentage);
      setContainerLevel(level);

      // Trigger low stock alert
      setLevelAlert(level <= lowStockThreshold);
    });
  };

  useEffect(() => {
    socket.on("ultrasonicUpdate", (data) => {
      console.log("📡 Ultrasonic data received:", data);
      setFillData(data);
      
      // Store specific data types for single line display
      if (data.type === "distance") {
        console.log(`📏 Setting distance: ${data.value}`);
        setUltrasonicDistance(data.value);
      } else if (data.type === "stockLevel") {
        console.log(`📦 Setting stock status: ${data.status}`);
        setStockStatus(data.status);
      }
      
      // Debug current state
      console.log(`📊 Current state - Distance: ${ultrasonicDistance}, Stock: ${stockStatus}`);
    });

    return () => {
      socket.off("ultrasonicUpdate");
    };
  }, [ultrasonicDistance, stockStatus]);

  useEffect(() => {
    socket.on("temperatureUpdate", (temp) => {
      setTemperatureValue(temp);

      // optional alert logic
      if (temp !== null && temp > 35) {
        setTemperatureAlert(true);
      } else {
        setTemperatureAlert(false);
      }
    });
    return () => {
      socket.off("temperatureUpdate");
    };
  }, []);

  useEffect(() => {
    console.log("🔌 Connecting to Socket.IO server...");
    socket.on("connect", () => {
      console.log("✅ Socket connected with ID:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected");
    });

    socket.on("rfidData", (uid) => {
      if (uid) {
        setScanning(false);
        setRfidUID(uid);
        setAuthSuccess(false);
        setEnteredPassword("");
        setError("");
        setUserData(null);
        setDispenseMessage("");
        setFingerprintLogs([]); // Reset logs on new scan
      }
    });


    return () => {
      socket.off("rfidData");
    };
  }, []);

useEffect(() => {
  socket.on("fingerprintResult", async (data) => {
    if (data.log) {
      setFingerprintLogs((prev) => [...prev, data.log]);
    }

    if (data.success && data.fingerId !== null) {
      // ✅ Fingerprint matched in sensor, now verify against database
      const scannedFingerId = data.fingerId;
      
      try {
        // Fetch the user's registered fingerprintID from database
        const userRef = doc(db, "customer", rfidUID.trim());
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const user = userSnap.data();
          const registeredFingerprintId = user.fingerprintID;
          
          // Compare scanned fingerprint ID with database fingerprint ID
          if (scannedFingerId === registeredFingerprintId) {
            // ✅ Fingerprint ID matches the user's registered ID
            setFingerprintStatus("success");
            setFingerprintId(scannedFingerId);
            setShowProceed(true);
            setFingerprintError(false);
            setFingerprintLogs((prev) => [...prev, `✅ Fingerprint ID ${scannedFingerId} matches user ${user.Name}`]);
          } else {
            // ❌ Fingerprint matched but doesn't belong to this user
            setFingerprintStatus("fail");
            setFingerprintError(true);
            setFingerprintLogs((prev) => [
              ...prev, 
              `❌ Fingerprint ID ${scannedFingerId} does not match user's registered ID ${registeredFingerprintId}`
            ]);
          }
        } else {
          // User not found in database
          setFingerprintStatus("fail");
          setFingerprintError(true);
          setFingerprintLogs((prev) => [...prev, "❌ User not found in database"]);
        }
      } catch (error) {
        console.error("Error verifying fingerprint ID:", error);
        setFingerprintStatus("fail");
        setFingerprintError(true);
        setFingerprintLogs((prev) => [...prev, "❌ Error verifying fingerprint"]);
      }
    } else {
      // No match found in sensor
      setFingerprintStatus("fail");
      setFingerprintError(true);
    }
  });

  return () => socket.off("fingerprintResult");
}, [rfidUID]);


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "customer"));
        const usersData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
      } catch (error) {
        console.error("Error fetching users: ", error);
      }
    };
    fetchUsers();
  }, []);

  const verifyPassword = async () => {
    if (!rfidUID || !enteredPassword.trim()) {
      setError("Please scan your card and enter the password.");
      return;
    }

    try {
      const userRef = doc(db, "customer", rfidUID.trim()); // Use the scanned UID
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const user = userSnap.data();

        if (enteredPassword.trim() === user.password.trim()) {
  setAuthSuccess(true);
  setUserData(user);
  setError("");

  // 🔄 reset fingerprint UI state
  setFingerprintStatus(null);
  setFingerprintId(null);

  // 👉 move to fingerprint step
  setFingerprintPending(true);
  setCurrentView("fingerprint");
  socket.emit("startFingerprint");
}
else {
          setAuthSuccess(false);
          setUserData(null);
          setError("Incorrect Password! Please try again.");
        }
      } else {
        setAuthSuccess(false);
        setUserData(null);
        setError("No user found for this UID.");
      }
    } catch (error) {
      setError("Error fetching user data.");
    }
  };

  const scanCard = () => {
    setScanning(true); // Start scanning animation
    setRfidUID(""); // Clear previous UID

    socket.emit("scancard"); // Send command to Arduino via server

    setTimeout(() => {
      setScanning(false); // Stop scanning effect after 5s
    }, 5000);
  };

  const startCountdown = (message, callback) => {
    setCountdown(5);
    setDispenseMessage(message);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === 1) {
          clearInterval(interval);
          callback();
          setDispenseMessage(""); // Clear message after dispensing
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleDispenseWater = () => {
    if (countdown === 0) {
      startCountdown("Dispensing Liquid", () => socket.emit("dispenseWater"));
    }
  };

  const handleDispenseGrains = () => {
    if (countdown === 0) {
      startCountdown("Dispensing grains", () => socket.emit("dispenseGrains"));
    }
  };

  const handlePayment = async () => {
    if (!window.Razorpay) {
      alert("Razorpay SDK not loaded! Please wait and try again.");
      return;
    }

    try {
      const userRef = doc(db, "customer", rfidUID);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const user = userSnap.data();
        const paymentAmount = user.amount;
        const razorpayAmount = paymentAmount * 100;

        const options = {
          key: razorpayApiKey,
          amount: razorpayAmount,
          currency: "INR",
          name: user.Name || "User",
          description: `RFID Payment - ₹${paymentAmount}`,
          handler: function (response) {
            console.log("✅ Payment Successful!", response.razorpay_payment_id);
            
            // Show payment success popup instead of redirecting
            setPaymentSuccess(true);
            setPaymentId(response.razorpay_payment_id);
          },
          prefill: {
            name: user.Name || "User",
            email: user.email || "user@example.com",
            contact: user.phone || "0000000000",
          },
          theme: {
            color: "#F37254",
          },
        };

        const rzp1 = new window.Razorpay(options);
        rzp1.open();
      } else {
        alert("❌ No user data found for payment.");
      }
    } catch (error) {
      console.error("⚠️ Error fetching user data for payment:", error);
      alert("⚠️ Something went wrong. Please try again.");
    }
  };

  const handleExitUser = () => {
    // Reset all states to initial values
    setPaymentSuccess(false);
    setPaymentId("");
    setRfidUID("");
    setEnteredPassword("");
    setAuthSuccess(false);
    setError("");
    setUserData(null);
    setDispenseMessage("");
    setCountdown(0);
    setFingerprintStatus(null);
    setFingerprintId(null);
    setFingerprintPending(false);
    setShowProceed(false);
    setFingerprintError(false);
    setFingerprintLogs([]);
    setCurrentView("main");
  };

const scanCardHelp = {
  "en-IN": "Please click on ‘Scan Card’. Hold your ration card close to the scanner and wait until it is read.",
  "hi-IN": "कृपया ‘स्कैन कार्ड’ पर क्लिक करें। अपना राशन कार्ड स्कैनर के पास रखें और पढ़े जाने तक प्रतीक्षा करें।",
  "mr-IN": "कृपया ‘स्कॅन कार्ड’ वर क्लिक करा. तुमचे रेशन कार्ड स्कॅनरजवळ ठेवा आणि वाचले जाईपर्यंत थांबा.",
  "ta-IN": "தயவுசெய்து ‘ஸ்கேன் கார்டு’ என்பதை கிளிக் செய்யவும். உங்கள் ரேஷன் கார்டை ஸ்கேனருக்கு அருகில் வைத்து வாசிக்கப்படும் வரை காத்திருக்கவும்.",
  "te-IN": "దయచేసి ‘స్కాన్ కార్డ్’పై క్లిక్ చేయండి. మీ రేషన్ కార్డును స్కానర్ దగ్గర ఉంచి చదవబడే వరకు వేచి ఉండండి.",
  "kn-IN": "ದಯವಿಟ್ಟು ‘ಸ್ಕ್ಯಾನ್ ಕಾರ್ಡ್’ ಕ್ಲಿಕ್ ಮಾಡಿ. ನಿಮ್ಮ ರೇಷನ್ ಕಾರ್ಡ್ ಅನ್ನು ಸ್ಕ್ಯಾನರ್ ಹತ್ತಿರ ಹಿಡಿದು ಓದಾಗುವವರೆಗೆ ಕಾಯಿರಿ."
};
const setupHelp = {
  "en-IN": "Welcome to Dispenzo. Please select your preferred language for instructions, then enable or disable voice assistant mode. Click continue when ready.",
  "hi-IN": "डिस्पेंजो में आपका स्वागत है। कृपया निर्देशों के लिए अपनी पसंदीदा भाषा चुनें, फिर वॉयस असिस्टेंट मोड को सक्षम या अक्षम करें। तैयार होने पर जारी रखें पर क्लिक करें।",
  "mr-IN": "डिस्पेंझोमध्ये आपले स्वागत आहे. कृपया सूचनांसाठी तुमची पसंतीची भाषा निवडा, नंतर व्हॉइस असिस्टंट मोड सक्षम किंवा अक्षम करा. तयार असताना चालू ठेवा वर क्लिक करा.",
  "ta-IN": "டிஸ்பென்சோவிற்கு வரவேற்கிறோம். வழிமுறைகளுக்கு உங்கள் விருப்பமான மொழியைத் தேர்ந்தெடுக்கவும், பின்னர் குரல் உதவியாளர் பயன்முறையை இயக்கவும் அல்லது முடக்கவும். தயாராக இருக்கும்போது தொடரவும் என்பதைக் கிளிக் செய்யவும்.",
  "te-IN": "డిస్పెంజోకు స్వాగతం. దయచేసి సూచనల కోసం మీ ఇష్టమైన భాషను ఎంచుకోండి, తర్వాత వాయిస్ అసిస్టెంట్ మోడ్‌ను ఎనేబుల్ లేదా డిసేబుల్ చేయండి. సిద్ధంగా ఉన్నప్పుడు కొనసాగించు క్లిక్ చేయండి.",
  "kn-IN": "ಡಿಸ್ಪೆನ್ಜೋಗೆ ಸುಸ್ವಾಗತ. ದಯವಿಟ್ಟು ಸೂಚನೆಗಳಿಗಾಗಿ ನಿಮ್ಮ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ, ನಂತರ ಧ್ವನಿ ಸಹಾಯಕ ಮೋಡ್ ಅನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ ಅಥವಾ ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಿ. ಸಿದ್ಧವಾದಾಗ ಮುಂದುವರಿಸು ಕ್ಲಿಕ್ ಮಾಡಿ."
};

 const passwordHelp = {
  "en-IN": "Your card has been read successfully. Please enter your password carefully and click on ‘Submit’ to continue.",
  "hi-IN": "आपका कार्ड सफलतापूर्वक पढ़ लिया गया है। कृपया अपना पासवर्ड सावधानी से दर्ज करें और आगे बढ़ने के लिए ‘सबमिट’ पर क्लिक करें।",
  "mr-IN": "तुमचे कार्ड यशस्वीरित्या वाचले आहे. कृपया तुमचा पासवर्ड काळजीपूर्वक टाका आणि पुढे जाण्यासाठी ‘सबमिट’ क्लिक करा.",
  "ta-IN": "உங்கள் கார்டு வெற்றிகரமாக வாசிக்கப்பட்டது. தயவுசெய்து உங்கள் கடவுச்சொல்லை உள்ளீடு செய்து ‘சமர்ப்பிக்க’ கிளிக் செய்யவும்.",
  "te-IN": "మీ కార్డ్ విజయవంతంగా చదవబడింది. దయచేసి మీ పాస్‌వర్డ్‌ను నమోదు చేసి ‘సబ్మిట్’ పై క్లిక్ చేయండి.",
  "kn-IN": "ನಿಮ್ಮ ಕಾರ್ಡ್ ಯಶಸ್ವಿಯಾಗಿ ಓದಲಾಗಿದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪಾಸ್ವರ್ಡ್ ನಮೂದಿಸಿ ಮತ್ತು ‘ಸಬ್ಮಿಟ್’ ಕ್ಲಿಕ್ ಮಾಡಿ."
};


const fingerprintHelp = {
  "en-IN": "Password verified. Please place your finger properly on the fingerprint machine and keep it steady.",
  "hi-IN": "पासवर्ड सत्यापित हो गया है। कृपया अपनी उंगली फिंगरप्रिंट मशीन पर रखें और स्थिर रखें।",
  "mr-IN": "पासवर्ड पडताळणी झाली आहे. कृपया तुमचे बोट फिंगरप्रिंट मशीनवर ठेवा आणि हलवू नका.",
  "ta-IN": "கடவுச்சொல் சரிபார்க்கப்பட்டது. தயவுசெய்து உங்கள் விரலை விரல் ரேகை இயந்திரத்தில் வைத்து அசையாமல் பிடிக்கவும்.",
  "te-IN": "పాస్‌వర్డ్ ధృవీకరించబడింది. దయచేసి మీ వేలిని ఫింగర్‌ప్రింట్ యంత్రంపై ఉంచి కదలకుండా ఉంచండి.",
  "kn-IN": "ಪಾಸ್ವರ್ಡ್ ಪರಿಶೀಲನೆ ಆಗಿದೆ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಬೆರಳನ್ನು ಫಿಂಗರ್‌ಪ್ರಿಂಟ್ ಯಂತ್ರದ ಮೇಲೆ ಇಟ್ಟು ಅಚಲವಾಗಿ ಹಿಡಿಯಿರಿ."
};


const dispenseHelp = {
  "en-IN": "Verification completed successfully. You may now collect water or grains as per your entitlement, or proceed for payment if required.",
  "hi-IN": "सत्यापन सफल रहा। अब आप अपने हक के अनुसार पानी या अनाज प्राप्त कर सकते हैं, या आवश्यक हो तो भुगतान के लिए आगे बढ़ें।",
  "mr-IN": "तपासणी यशस्वी झाली आहे. आता तुम्ही तुमच्या हक्कानुसार पाणी किंवा धान्य घेऊ शकता किंवा गरज असल्यास पेमेंटसाठी पुढे जा.",
  "ta-IN": "சரிபார்ப்பு வெற்றிகரமாக முடிந்தது. இப்போது உங்கள் உரிமைக்கு ஏற்ப தண்ணீர் அல்லது தானியங்களை பெற்றுக்கொள்ளலாம் அல்லது பணம் செலுத்தலாம்.",
  "te-IN": "ధృవీకరణ విజయవంతమైంది. ఇప్పుడు మీ అర్హత ప్రకారం నీరు లేదా ధాన్యాన్ని తీసుకోవచ్చు లేదా అಗత్యమైతే చెల్లింపుకు కొనసాగండి.",
  "kn-IN": "ಪರಿಶೀಲನೆ ಯಶಸ್ವಿಯಾಗಿದೆ. ಈಗ ನಿಮ್ಮ ಹಕ್ಕಿನಂತೆ ನೀರು ಅಥವಾ ಧಾನ್ಯವನ್ನು ಪಡೆಯಬಹುದು ಅಥವಾ ಅಗತ್ಯವಿದ್ದರೆ ಪಾವತಿಗೆ ಮುಂದಾಗಬಹುದು."
};


 const paymentSuccessHelp = {
  "en-IN": "Payment has been completed successfully. You may send a confirmation message or press exit to return to the home screen.",
  "hi-IN": "भुगतान सफलतापूर्वक पूरा हो गया है। आप पुष्टि संदेश भेज सकते हैं या होम स्क्रीन पर लौटने के लिए बाहर निकलें।",
  "mr-IN": "पेमेंट यशस्वीरित्या पूर्ण झाले आहे. तुम्ही पुष्टी संदेश पाठवू शकता किंवा मुख्य स्क्रीनवर जाण्यासाठी बाहेर पडा.",
  "ta-IN": "பணம் வெற்றிகரமாக செலுத்தப்பட்டுள்ளது. உறுதிப்படுத்தல் செய்தியை அனுப்பலாம் அல்லது முகப்பு திரைக்கு திரும்பலாம்.",
  "te-IN": "చెల్లింపు విజయవంతంగా పూర్తయింది. మీరు నిర్ధారణ సందేశాన్ని పంపవచ్చు లేదా హోమ్ స్క్రీన్‌కు వెళ్లవచ్చు.",
  "kn-IN": "ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿ ಪೂರ್ಣಗೊಂಡಿದೆ. ದೃಢೀಕರಣ ಸಂದೇಶವನ್ನು ಕಳುಹಿಸಬಹುದು ಅಥವಾ ಮುಖಪುಟಕ್ಕೆ ಮರಳಬಹುದು."
};


  const renderCurrentView = () => {
    switch (currentView) {
      case "fingerprint":
        return renderFingerprintView();
      case "analytics":
        return <Analytics />;
      case "admin":
        // Simply render AdminPage - it will handle its own authentication
        return (
          <AdminPage
            socket={socket}
            users={users}
            temperatureValue={temperatureValue}
            temperatureAlert={temperatureAlert}
            containerLevel={containerLevel}
            levelAlert={levelAlert}
            ultrasonicDistance={ultrasonicDistance}
            stockStatus={stockStatus}
            moisturePercent={moisturePercent}
            moistureRaw={moistureRaw}
            onBackToUser={() => setCurrentView("main")}
          />
        );
      case "main":
      default:
        return renderMainView();
    }
  };

  const renderMainView = () => (
    <>
      {/* Simple Admin Button */}
      <button className="admin-btn" onClick={() => setCurrentView("admin")}>
        Admin Login
      </button>  
      {/* HEREDURVA */}
      
      <div className="rfid-container">
        <>
            {/* User Side */}
            <div className="scanner-box">
              {authSuccess ? (
                <div className="dispenzo-text dispenzo-move-up">
                  DISPENZO
                </div>
              ) : (
                <div className={`dispenzo-text ${rfidUID ? "move-up" : ""}`}>
                  DISPENZO
                </div>
              )}
              
              {scanning || !rfidUID ? (
                <>
                  <div className="rotating-card">
                    <div className="card-chip"></div>
                    <div className="card-icon">📡</div>
                    <div className="card-text">SCAN YOUR RFID CARD</div>
                  </div>
                  {!rfidUID && (
    <button
      className="scan-btn"
      onClick={scanCard}
      disabled={scanning}
    >
      {scanning ? "📡 Reading the Card..." : "SCAN CARD"}
    </button>
  )}

                </>
              ) : (
                !authSuccess && <p className="uid-display">Scanned UID: {rfidUID}</p>
              )}
            </div>

            {rfidUID && !authSuccess && (
              <>
                <div className="input-container">
                  <input
                    type="password"
                    placeholder="Enter Password"
                    value={enteredPassword}
                    onChange={(e) => setEnteredPassword(e.target.value)}
                  />
                  <button onClick={verifyPassword}>Submit</button>
                </div>
              </>
            )}

            {authSuccess && userData && (
  <div className="user-info">
    <h2>
      <strong>
        {dispenseMessage ? dispenseMessage : "✅ Access Granted"}
      </strong>
    </h2>

    {!dispenseMessage && (
      <>
        {/* BASIC DETAILS */}
        <div className="user-info-details">
          <p>
            <strong>Name: </strong>
            <span>{userData.Name}</span>
          </p>

          <p>
            <strong>Phone: </strong>
            <span>{userData.phone}</span>
          </p>

          <p>
            <strong>Family Members: </strong>
            <span>{userData.family_members}</span>
          </p>

          <p>
            <strong>Weight Allocated: </strong>
            <span>{userData.weightThreshold} kg</span>
          </p>

          {userData.rdk && (
            <p>
              <strong>Address: </strong>
              <span>{userData.rdk}</span>
            </p>
          )}
        </div>

        {/* FAMILY MEMBERS LIST */}
        {Array.isArray(userData.members) && userData.members.length >= 0 && (
  <div className="family-members">
    <strong>Family Member Details</strong>

    <div className="member-chips">
      {userData.members.map((member, index) => (
        <div key={index} className="member-chip">
          <div className="member-name">
            {member.name}
          </div>

          <div className="member-meta">
            <span className="member-relation">
              {member.relation}
            </span>
            <span className="member-age">
              • {member.age} yrs
            </span>
            <span className="member-gender">
              • {member.gender}
            </span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}


        {/* ACTION BUTTONS */}
        <div className="button-container">
          <button
            className="dispense-btn water-btn"
            onClick={handleDispenseWater}
          >
            Dispense Liquid
          </button>

          <button
            className="dispense-btn grain-btn"
            onClick={handleDispenseGrains}
          >
            Dispense Grains
          </button>

          <button
            className="payment-btn"
            onClick={handlePayment}
          >
            Pay Now
          </button>
        </div>
      </>
    )}
  </div>
)}


            {dispenseMessage && (
              <div className="dispense-countdown-overlay">
                <div className="dispense-countdown">
                  {countdown}
                </div>
                <p className="dispense-text">
                  {dispenseMessage}
                </p>
              </div>
            )}
          </>
      </div>
    </>
  );
const renderFingerprintView = () => (
  <div className="fp-page">

    {/* HEADER */}
    <div className="fp-header">
      <h1>DISPENZO</h1>
      <span>Secure Ration Distribution System</span>
    </div>

    {/* BODY */}
    <div className="fp-body">

      {/* LEFT FLOW */}
      <div className="fp-flow">

        <h3>Authentication Flow</h3>

        <div className="fp-flow-step completed">
          <span className="fp-check"></span>
          <p>RFID Card Scanned</p>
        </div>

        <div className={`fp-flow-step ${
          fingerprintStatus === null ? "active" : "completed"
        }`}>
          <span className="fp-check"></span>
          <p>Fingerprint Scanning</p>
        </div>

        <div className={`fp-flow-step ${
          fingerprintStatus === "success"
            ? "completed"
            : fingerprintStatus === "fail"
            ? "failed"
            : "pending"
        }`}>
          <span className="fp-check"></span>
          <p>Fingerprint Verification</p>
        </div>

        <div className={`fp-flow-step ${
          fingerprintStatus === "success" ? "completed" : "pending"
        }`}>
          <span className="fp-check"></span>
          <p>Access Authorization</p>
        </div>

        <div className="fp-flow-note">
          Identity verification is required before dispensing ration items.
        </div>
      </div>

      {/* RIGHT SCANNER */}
      <div className="fp-scanner-section">

        <div className={`fp-scanner 
          ${fingerprintStatus === "success" ? "success" : ""}
          ${fingerprintStatus === "fail" ? "fail" : ""}
        `}>
          <img
            src={require("./assets/finger.jpg")}
            alt="Fingerprint"
            className="fp-image"
          />
          <div className="fp-scan-line"></div>
        </div>

        {fingerprintStatus === null && (
          <p className="fp-status scanning">Scanning fingerprint…</p>
        )}

        {fingerprintStatus === "success" && (
          <p className="fp-status success">
            Fingerprint Verified<br />
            ID: {fingerprintId}
          </p>
        )}

        {fingerprintStatus === "fail" && (
          <p className="fp-status fail">
            Fingerprint Not Recognized
          </p>
        )}

        {/* LOGS */}
        {/* SIMPLE STATUS MESSAGE */}
{fingerprintStatus === null && (
  <p className="fp-text scanning">
    Please place your finger on the scanner
  </p>
)}

{fingerprintStatus === "success" && (
  <p className="fp-text success">
    Identity verified successfully
  </p>
)}

{fingerprintStatus === "fail" && (
  <p className="fp-text fail">
    Verification failed. Please try again.
  </p>
)}


        {/* BUTTONS */}
        {fingerprintStatus === "fail" && (
          <button
            className="fp-btn retry"
            onClick={() => {
              setFingerprintStatus(null);
              setFingerprintError(false);
              setFingerprintLogs([]);
              socket.emit("startFingerprint");
            }}
          >
            Retry Scan
          </button>
        )}

        {showProceed && fingerprintStatus === "success" && (
          <button
            className="fp-btn proceed"
            onClick={() => {
              setCurrentView("main");
              setFingerprintPending(false);
              setShowProceed(false);
            }}
          >
            Proceed
          </button>
        )}

      </div>
    </div>

    {/* FOOTER */}
    <div className="fp-footer">
      Secure • Transparent • Automated Public Distribution
    </div>

  </div>
);

  return (
    <>
      {/* Floating Settings Button */}
      {currentView === "main" && (
        <button 
          className="floating-settings-btn" 
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          ⚙️
        </button>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="settings-overlay">
          <div className="settings-modal">
            <div className="settings-header">
              <h2>⚙️ Settings</h2>
              {!firstVisit && (
                <button 
                  className="settings-close-btn" 
                  onClick={() => {
                    // Stop any ongoing speech (demo audio, preview, etc.)
                    if (window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                    }
                    setShowSettings(false);
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div className="settings-content">
              <div className="settings-section">
                <h3>🌐 Language / भाषा</h3>
                <div className="language-grid">
                  <button 
                    className={`lang-btn ${selectedLanguage === "en-IN" ? "active" : ""}`}
                    onClick={() => setSelectedLanguage("en-IN")}
                  >
                    <span className="lang-name">English</span>
                  </button>
                  <button 
                    className={`lang-btn ${selectedLanguage === "hi-IN" ? "active" : ""}`}
                    onClick={() => setSelectedLanguage("hi-IN")}
                  >
                    <span className="lang-name">हिन्दी</span>
                  </button>
                  <button 
                    className={`lang-btn ${selectedLanguage === "mr-IN" ? "active" : ""}`}
                    onClick={() => setSelectedLanguage("mr-IN")}
                  >
                    <span className="lang-name">मराठी</span>
                  </button>
                  <button 
                    className={`lang-btn ${selectedLanguage === "ta-IN" ? "active" : ""}`}
                    onClick={() => setSelectedLanguage("ta-IN")}
                  >
                    <span className="lang-name">தமிழ்</span>
                  </button>
                  <button 
                    className={`lang-btn ${selectedLanguage === "te-IN" ? "active" : ""}`}
                    onClick={() => setSelectedLanguage("te-IN")}
                  >
                    <span className="lang-name">తెలుగు</span>
                  </button>
                  <button 
                    className={`lang-btn ${selectedLanguage === "kn-IN" ? "active" : ""}`}
                    onClick={() => setSelectedLanguage("kn-IN")}
                  >
                    <span className="lang-name">ಕನ್ನಡ</span>
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <h3>🔊 Voice Assistant</h3>
                <p className="voice-desc">
                  {selectedLanguage === "hi-IN" ? "स्वचालित आवाज मार्गदर्शन सक्षम करें" :
                   selectedLanguage === "mr-IN" ? "स्वयंचलित आवाज मार्गदर्शन सक्षम करा" :
                   selectedLanguage === "ta-IN" ? "தானியங்கி குரல் வழிகாட்டுதலை இயக்கவும்" :
                   selectedLanguage === "te-IN" ? "స్వయంచాలక వాయిస్ గైడెన్స్ ఎనేబుల్ చేయండి" :
                   selectedLanguage === "kn-IN" ? "ಸ್ವಯಂಚಾಲಿತ ಧ್ವನಿ ಮಾರ್ಗದರ್ಶನ ಸಕ್ರಿಯಗೊಳಿಸಿ" :
                   "Enable automatic voice guidance"}
                </p>
                <div className="voice-toggle-container">
                  <button 
                    className={`voice-toggle-btn ${voiceAssistantMode ? "enabled" : "disabled"}`}
                    onClick={() => {
                      const newMode = !voiceAssistantMode;
                      setVoiceAssistantMode(newMode);
                      if (newMode) {
                        setTimeout(() => playVoicePreview(), 400);
                      } else {
                        window.speechSynthesis.cancel();
                      }
                    }}
                  >
                    <span className="toggle-status-text">
                      {voiceAssistantMode ? 
                        (selectedLanguage === "hi-IN" ? "सक्षम" :
                         selectedLanguage === "mr-IN" ? "सक्षम" :
                         selectedLanguage === "ta-IN" ? "இயக்கப்பட்டது" :
                         selectedLanguage === "te-IN" ? "ఎనేబుల్" :
                         selectedLanguage === "kn-IN" ? "ಸಕ್ರಿಯ" :
                         "ENABLED") :
                        (selectedLanguage === "hi-IN" ? "अक्षम" :
                         selectedLanguage === "mr-IN" ? "अक्षम" :
                         selectedLanguage === "ta-IN" ? "முடக்கப்பட்டது" :
                         selectedLanguage === "te-IN" ? "డిసేబుల్" :
                         selectedLanguage === "kn-IN" ? "ನಿಷ್ಕ್ರಿಯ" :
                         "DISABLED")}
                    </span>
                    <span className="toggle-indicator"></span>
                  </button>
                </div>
              </div>

              <button 
                className="settings-save-btn"
                onClick={saveSettings}
              >
                {firstVisit ? 
                  (selectedLanguage === "hi-IN" ? "जारी रखें →" :
                   selectedLanguage === "mr-IN" ? "सुरू ठेवा →" :
                   selectedLanguage === "ta-IN" ? "தொடரவும் →" :
                   selectedLanguage === "te-IN" ? "కొనసాగించు →" :
                   selectedLanguage === "kn-IN" ? "ಮುಂದುವರಿಸಿ →" :
                   "Continue →") :
                  (selectedLanguage === "hi-IN" ? "सहेजें" :
                   selectedLanguage === "mr-IN" ? "जतन करा" :
                   selectedLanguage === "ta-IN" ? "சேமி" :
                   selectedLanguage === "te-IN" ? "సేవ్ చేయి" :
                   selectedLanguage === "kn-IN" ? "ಉಳಿಸು" :
                   "Save Settings")}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Success Popup - keep this here */}
      {paymentSuccess && (
        <div className="payment-success-overlay">
          <div className="payment-success-popup">
            <VoiceGuide 
              scripts={paymentSuccessHelp}
              autoPlay={voiceAssistantMode}
              defaultLanguage={selectedLanguage}
            />
            
            {/* Left Section - Success Icon & Title */}
            <div className="success-left">
              <div className="success-icon-large">✅</div>
              <h2>Payment Successful!</h2>
              <p className="success-subtitle">Transaction Completed</p>
            </div>

            {/* Right Section - Details & Actions */}
            <div className="success-right">
              <div className="transaction-details">
                <div className="detail-header">
                  <h3>Transaction Details</h3>
                  <p className="payment-id-small">{paymentId}</p>
                </div>

                <div className="details-grid">
                  <div className="detail-row">
                    <span className="detail-label">👤 Customer</span>
                    <span className="detail-value">{userData?.Name || "N/A"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">💰 Amount Paid</span>
                    <span className="detail-value">₹{userData?.amount || "0"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">🎫 RFID</span>
                    <span className="detail-value">{rfidUID || "N/A"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">✓ Status</span>
                    <span className="detail-value status-success">Completed</span>
                  </div>
                </div>
              </div>

              <div className="popup-actions">
                <button 
                  className="popup-btn notify-btn"
                  onClick={() => {
                    socket.emit("sendNotification");
                    alert("📨 Notification sent to ESP32!");
                  }}
                >
                  📨 Send Notification
                </button>
                <button className="popup-btn exit-btn" onClick={handleExitUser}>
                  🚪 Exit & Return Home
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {currentView === "analytics" && (
        <button 
          className="back-btn" 
          onClick={() => setCurrentView("main")}
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 1000,
            padding: '10px 15px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          ← Back to Main
        </button>
      )}
      
      {/* Consolidated Voice Guide - Only one instance controls all pages */}
      {/* Don't play audio until settings are confirmed and voice mode is enabled */}
      {!showSettings && settingsConfirmed && currentView === "fingerprint" && (
        <VoiceGuide 
          scripts={fingerprintHelp}
          autoPlay={voiceAssistantMode}
          defaultLanguage={selectedLanguage}
        />
      )}
      
      {!showSettings && settingsConfirmed && currentView === "main" && (
        <VoiceGuide 
          scripts={
            authSuccess && userData 
              ? dispenseHelp 
              : rfidUID && !authSuccess 
              ? passwordHelp 
              : scanCardHelp
          }
          autoPlay={voiceAssistantMode}
          defaultLanguage={selectedLanguage}
        />
      )}
      
      {renderCurrentView()}
    </>
  );
}

export default Rfid;