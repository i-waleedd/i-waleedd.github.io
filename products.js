import { db } from "./firebase.js";
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// This function is imported by index.html, products.html, and best-sellers.html
export async function fetchProducts() {
  try {
    // UPDATED: Added sorting so newest products (by creation date) show first
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));

    const querySnapshot = await getDocs(q);
    const products = [];

    querySnapshot.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...docSnap.data() });
    });

    return products;
  } catch (error) {
    // Fallback: If sorting fails (requires an index), fetch normally
    console.warn("Sorting failed (index might be missing), fetching unsorted:", error);
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      const products = [];
      querySnapshot.forEach((docSnap) => {
        products.push({ id: docSnap.id, ...docSnap.data() });
      });
      return products;
    } catch (e) {
      console.error("Critical error fetching products:", e);
      return [];
    }
  }
}