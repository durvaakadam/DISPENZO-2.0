// Import Firebase Admin SDK
const admin = require("firebase-admin");

// Load Firebase Admin credentials from service account (download from Firebase Console)
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin (for backend use)
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://rationsys.firebaseio.com" // Replace with your Firestore DB URL
});

// Firestore instance for backend
const db = admin.firestore();

module.exports = { db };
