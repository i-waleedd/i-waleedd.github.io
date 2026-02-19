import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
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

// ✅ Firestore init using the NEW cache API (replaces enableIndexedDbPersistence)
// - persistentLocalCache + persistentMultipleTabManager = works across multiple tabs
// - fallback to memory cache if persistence isn't available
let _db;
try {
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  console.log("Firestore persistent cache not available, using memory cache.", e?.message || e);
  _db = initializeFirestore(app, {
    localCache: memoryLocalCache()
  });
}

export const db = _db;

// ✅ Safe analytics init (prevents crashes on unsupported environments)
export let analytics = null;
isSupported()
  .then((ok) => {
    if (ok) analytics = getAnalytics(app);
  })
  .catch(() => {
    analytics = null;
  });
