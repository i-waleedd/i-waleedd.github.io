import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsTxlWCnYH-9Q7oHVOFetkMLwFzjF6fGQ",
  authDomain: "waleed-6d2b1.firebaseapp.com",
  projectId: "waleed-6d2b1",
  // ✅ Fixed (common/default Firebase Storage bucket format)
  storageBucket: "waleed-6d2b1.appspot.com",
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
// - if Firestore was already initialized elsewhere, reuse the existing instance
let _db;
try {
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  const msg = String(e?.message || e || "");
  const isAlreadyInitialized =
    msg.toLowerCase().includes("already been initialized") ||
    msg.toLowerCase().includes("has already been started") ||
    e?.code === "failed-precondition";

  if (isAlreadyInitialized) {
    // Reuse existing Firestore instance (prevents double-initialize crash)
    _db = getFirestore(app);
  } else {
    console.log("Firestore persistent cache not available, using memory cache.", e?.message || e);
    try {
      _db = initializeFirestore(app, {
        localCache: memoryLocalCache()
      });
    } catch (e2) {
      // If this also fails (e.g., already initialized), reuse existing instance
      _db = getFirestore(app);
    }
  }
}

export const db = _db;

// ✅ Safe analytics init (prevents crashes on unsupported environments)
// - Analytics requires a browser environment and typically HTTPS (localhost is OK)
export let analytics = null;

const _canUseAnalytics =
  typeof window !== "undefined" &&
  typeof document !== "undefined" &&
  typeof location !== "undefined" &&
  (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1");

if (_canUseAnalytics) {
  isSupported()
    .then((ok) => {
      if (ok) analytics = getAnalytics(app);
    })
    .catch(() => {
      analytics = null;
    });
} else {
  analytics = null;
}