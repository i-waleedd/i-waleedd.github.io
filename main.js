import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// =========================================
// 1. PROFESSIONAL TOAST SYSTEM
// =========================================
window.showToast = function(message, type = 'success') {
  // Remove existing toast
  const existing = document.getElementById("customToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "customToast";
  toast.innerText = message;
  
  // Dynamic Styling
  Object.assign(toast.style, {
    position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
    backgroundColor: type === 'error' ? '#991b1b' : '#2b1719', // Brand Dark color
    color: '#fff', padding: '12px 24px', borderRadius: '50px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: '10000',
    fontSize: '13px', fontWeight: '500', opacity: '0', transition: 'all 0.4s ease',
    pointerEvents: 'none', whiteSpace: 'nowrap'
  });

  document.body.appendChild(toast);

  // Animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.bottom = '40px';
  });

  // Cleanup
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.bottom = '20px';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
};

// =========================================
// 2. GLOBAL CART SYSTEM
// =========================================
let cart = [];
try {
  cart = JSON.parse(localStorage.getItem("cart")) || [];
} catch {
  cart = [];
}

// Basic HTML escape for safe rendering
function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Update Badge
function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + Number(item?.qty || 0), 0);
  const el = document.getElementById("cart-count");
  if (el) {
    el.innerText = count;
    el.style.display = count > 0 ? 'flex' : 'none';
  }
}

// Add Item
window.addToCart = function(name, price, image = '') {
  const safeName = String(name ?? "");
  const safePrice = Number(price || 0);

  const existing = cart.find(item => item.name === safeName);
  if (existing) {
    existing.qty = Number(existing.qty || 0) + 1;
  } else {
    cart.push({ name: safeName, price: safePrice, image, qty: 1 });
  }
  saveCart();
  window.showToast(`${safeName} added to bag!`);
  
  // Open cart automatically on add (Optional, good UX)
  const dropdown = document.getElementById("cartDropdown");
  if (dropdown && !dropdown.classList.contains("show")) {
    window.toggleCart();
  }
};

// Change Quantity
window.changeQty = function(index, change) {
  if (!cart[index]) return;

  cart[index].qty = Number(cart[index].qty || 0) + Number(change || 0);
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  saveCart();
};

// Save & Render
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  renderCartDropdown();
}

// Render Dropdown UI
function renderCartDropdown() {
  const itemsDiv = document.getElementById("cartItems");
  const totalDiv = document.getElementById("cartTotal");
  const payBtn = document.querySelector(".checkout-btn"); // Get checkout button to disable if empty
  
  if (!itemsDiv) return;

  itemsDiv.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    itemsDiv.innerHTML = "<p style='text-align:center; color:#888; margin-top:20px; font-size:13px;'>Your bag is empty.</p>";
    if (payBtn) {
      payBtn.style.opacity = "0.5";
      payBtn.style.pointerEvents = "none";
    }
    if (totalDiv) totalDiv.innerText = "PKR 0";
    return;
  }

  // Enable button if items exist
  if (payBtn) {
    payBtn.style.opacity = "1";
    payBtn.style.pointerEvents = "auto";
  }

  cart.forEach((item, index) => {
    const qty = Number(item?.qty || 0);
    const price = Number(item?.price || 0);

    total += price * qty;

    // Fallback image if none provided
    const imgUrl = (item?.image && String(item.image).trim().length)
      ? item.image
      : 'https://placehold.co/100x100/E6D8C5/2b1719?text=Nails';

    itemsDiv.innerHTML += `
      <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size:13px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <img src="${imgUrl}" style="width:40px; height:40px; border-radius:6px; object-fit:cover; border:1px solid #eee;">
          <div>
            <div style="font-weight:600; color:#333;">${escapeHtml(item?.name || "")}</div>
            <div style="font-size:11px; color:#666;">PKR ${price.toLocaleString()}</div>
          </div>
        </div>
        <div class="cart-controls" style="display:flex; align-items:center; gap:5px;">
          <button onclick="changeQty(${index}, -1)" style="width:22px; height:22px; border:1px solid #ddd; background:#fff; cursor:pointer;">-</button>
          <span style="font-weight:600; font-size:12px;">${qty}</span>
          <button onclick="changeQty(${index}, 1)" style="width:22px; height:22px; border:1px solid #ddd; background:#fff; cursor:pointer;">+</button>
        </div>
      </div>
    `;
  });

  if (totalDiv) totalDiv.innerText = "PKR " + total.toLocaleString();
}

// =========================================
// 3. UI TOGGLES (Menu & Cart)
// =========================================

// Toggle Cart Drawer
window.toggleCart = function() {
  const dropdown = document.getElementById("cartDropdown");
  const overlay = document.getElementById("cartOverlay");
  
  if (dropdown && overlay) {
    dropdown.classList.toggle("show");
    overlay.classList.toggle("show");

    // Prevent background scrolling when cart open (matches site behavior)
    const isOpen = dropdown.classList.contains("show");
    document.body.classList.toggle("no-scroll", isOpen);
    
    // If opening, render cart
    if (isOpen) {
      renderCartDropdown();
    }
  }
};

// Toggle Mobile Menu (with Overlay)
window.toggleMenu = function() {
  const nav = document.getElementById("navLinks");
  const overlay = document.querySelector(".menu-overlay");
  
  if (nav) nav.classList.toggle("active");
  if (overlay) overlay.classList.toggle("active");
};

// =========================================
// 4. INITIALIZATION & AUTH
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Load Cart Count
  updateCartCount();

  // 2. Auth State Listener
  const loginBtn = document.getElementById("loginBtn");
  const adminLink = document.getElementById("adminLink");

  if (loginBtn) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        // Logged In
        loginBtn.textContent = "Logout";
        loginBtn.onclick = async () => {
          await signOut(auth);
          window.showToast("Logged out successfully");
          setTimeout(() => window.location.href = "index.html", 1000);
        };

        // Admin Check
        if (adminLink && user.email === "workwithwaleed1@gmail.com") {
          adminLink.style.display = "inline-block";
        }
      } else {
        // Logged Out
        loginBtn.textContent = "Login";
        loginBtn.onclick = () => window.location.href = "login.html";
        if (adminLink) adminLink.style.display = "none";
      }
    });
  }
});
