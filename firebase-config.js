import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyATv6PgzuWoOvfEZ15G4z15AkAGKNJyV_k",
  authDomain: "smart-expense-tracker-c3966.firebaseapp.com",
  projectId: "smart-expense-tracker-c3966",
  storageBucket: "smart-expense-tracker-c3966.firebasestorage.app",
  messagingSenderId: "582462347998",
  appId: "1:582462347998:web:62c321c00b8afe4967004f",
  measurementId: "G-HDLJ84FFSS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with offline persistence (Great for Vivas!)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
});