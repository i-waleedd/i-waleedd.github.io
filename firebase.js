import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

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
export const storage = getStorage(app);

// ✅ Firestore init with IndexedDB persistence (v9 API)
// - multi-tab persistence when possible
// - fallback to single-tab persistence
// - final fallback = no persistence (still works)
(async () => {
  try {
    await enableMultiTabIndexedDbPersistence(db);
  } catch (e) {
    const code = String(e?.code || "");
    const msg = String(e?.message || e || "").toLowerCase();

    const isAlreadyEnabled =
      code === "failed-precondition" ||
      msg.includes("persistence can only be enabled") ||
      msg.includes("already been enabled");

    const isUnsupported = code === "unimplemented";

    if (isUnsupported) {
      console.log("Firestore persistence not supported in this browser/environment.");
      return;
    }

    // If multi-tab fails, try single-tab persistence (common fallback)
    if (!isAlreadyEnabled) {
      try {
        await enableIndexedDbPersistence(db);
      } catch (e2) {
        const code2 = String(e2?.code || "");
        if (code2 === "unimplemented") {
          console.log("Firestore persistence not supported in this browser/environment.");
        } else {
          console.log("Firestore persistence could not be enabled, continuing without persistence.", e2?.message || e2);
        }
      }
    }
  }
})();

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
