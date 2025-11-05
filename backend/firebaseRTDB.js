// firebaseRTDB.js
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountRTDB.json");

// ✅ Only initialize if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://dispenzo2-default-rtdb.firebaseio.com/"
  });
}

const rtdb = admin.database();
module.exports = rtdb;
