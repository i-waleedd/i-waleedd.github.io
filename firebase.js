import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDsTxlWCnYH-9Q7oHVOFetkMLwFzjF6fGQ",
  authDomain: "waleed-6d2b1.firebaseapp.com",
  projectId: "waleed-6d2b1",
  storageBucket: "waleed-6d2b1.firebasestorage.app",
  messagingSenderId: "41201313634",
  appId: "1:41201313634:web:574a75545eb9361f5e6e3b",
  measurementId: "G-V6V3MTGPHF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
