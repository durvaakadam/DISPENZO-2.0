// ✅ Import Firebase SDK Modules
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; 

// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDJbZhdLbZoK05ULdiE520absl0cd1wgyU",
  authDomain: "rationsys.firebaseapp.com",
  projectId: "rationsys",
  storageBucket: "rationsys.firebasestorage.app",
  messagingSenderId: "1055503022527",
  appId: "1:1055503022527:web:ef52ede8b6eee66b88490a",
  measurementId: "G-V3H4N147N2"
};

// ✅ Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);

// ✅ Initialize Authentication + Google Provider
const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// ✅ Initialize Firestore
const db = getFirestore(firebaseApp);

// ✅ Export Firebase objects
export { auth, googleProvider, db };
