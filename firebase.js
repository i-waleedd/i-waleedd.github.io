import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsTxlWCnYH-9Q7oHVOFetkMLwFzjF6fGQ",
  authDomain: "waleed-6d2b1.firebaseapp.com",
  projectId: "waleed-6d2b1",
  storageBucket: "waleed-6d2b1.firebasestorage.app",
  messagingSenderId: "41201313634",
  appId: "1:41201313634:web:574a75545eb9361f5e6e3b",
  measurementId: "G-V6V3MTGPHF"
};

// 1. Initialize App
const app = initializeApp(firebaseConfig);

// 2. Export Services
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Safe analytics init (prevents crashes on unsupported environments)
export let analytics = null;
isSupported()
  .then((ok) => {
    if (ok) analytics = getAnalytics(app);
  })
  .catch(() => {
    analytics = null;
  });

// 3. Enable Offline Persistence (Professional Speed Upgrade)
// This makes the website load instantly for returning users even on slow internet.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
      console.log("Offline persistence failed: Multiple tabs open.");
  } else if (err.code == 'unimplemented') {
      console.log("Offline persistence not supported by this browser.");
  }
});
