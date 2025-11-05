// firebase2.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseRTDBConfig = {
  apiKey: "AIzaSyBLZ3x02Y2xSEP1zYxKHQoa1oF07ayr42M",
  authDomain: "dispenzo2.firebaseapp.com",
  databaseURL: "https://dispenzo2-default-rtdb.firebaseio.com",
  projectId: "dispenzo2",
  storageBucket: "dispenzo2.firebasestorage.app",
  messagingSenderId: "121664512161",
  appId: "1:121664512161:web:2e780fc0af7e4c6712d0e0",
  measurementId: "G-JSLKM2VLML"
};

// ✅ Initialize with a *different name* to avoid conflict
const rtdbApp = getApps().some(app => app.name === "rtdbApp")
  ? getApp("rtdbApp")
  : initializeApp(firebaseRTDBConfig, "rtdbApp");

const rtdb = getDatabase(rtdbApp);

export { rtdb };
