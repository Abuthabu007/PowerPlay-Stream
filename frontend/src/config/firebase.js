// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBXTUybif-6rKmSUkqcVKtInmMK-hV-o-A",
  authDomain: "komo-infra-479911.firebaseapp.com",
  projectId: "komo-infra-479911",
  storageBucket: "komo-infra-479911.firebasestorage.app",
  messagingSenderId: "868383408248",
  appId: "1:868383408248:web:68590bfdb934a6d4cd6d8d",
  measurementId: "G-536RT67Q2Q"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
