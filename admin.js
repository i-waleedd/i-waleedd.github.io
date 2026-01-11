import { db, auth } from "./firebase.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// LOGOUT BUTTON
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "login.html";
});

// ADD PRODUCT BUTTON
const addProductBtn = document.getElementById("addProductBtn");
addProductBtn.addEventListener("click", async () => {
  const name = document.getElementById("name").value.trim();
  const price = parseFloat(document.getElementById("price").value);
  const category = document.getElementById("category").value;
  const image1 = document.getElementById("image1").value.trim();
  const image2 = document.getElementById("image2").value.trim();
  const image3 = document.getElementById("image3").value.trim();
  const description = document.getElementById("description").value.trim();

  // Simple validation
  if (!name || !price || !category || !image1) {
    alert("Please fill in all required fields (at least first image).");
    return;
  }

  try {
    await addDoc(collection(db, "products"), {
      name,
      price,
      category,
      images: [image1, image2, image3].filter(Boolean), // remove empty
      description
    });

    alert("Product added successfully!");
    
    // Clear fields
    document.getElementById("name").value = "";
    document.getElementById("price").value = "";
    document.getElementById("category").value = "home";
    document.getElementById("image1").value = "";
    document.getElementById("image2").value = "";
    document.getElementById("image3").value = "";
    document.getElementById("description").value = "";

  } catch (err) {
    alert("Error adding product: " + err.message);
  }
});
