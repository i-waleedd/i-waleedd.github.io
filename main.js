import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// --- 1. PROFESSIONAL TOAST SYSTEM (Replaces Alerts) ---
export function showToast(message, type = 'success') {
  // Remove existing toast if any
  const existing = document.getElementById("customToast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "customToast";
  toast.innerText = message;
  
  // Professional Styling applied via JS to ensure it works everywhere
  Object.assign(toast.style, {
    position: 'fixed', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
    backgroundColor: type === 'error' ? '#991b1b' : '#1f2937',
    color: '#fff', padding: '12px 24px', borderRadius: '50px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)', zIndex: '9999',
    fontSize: '14px', fontWeight: '500', opacity: '0', transition: '0.4s ease',
    display: 'flex', alignItems: 'center', gap: '10px'
  });

  document.body.appendChild(toast);

  // Animate In
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.bottom = '50px';
  });

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.bottom = '30px';
    setTimeout(() => toast.remove(), 400);
  }, 3000);
}

// --- 2. GLOBAL CART LOGIC ---
let cart = JSON.parse(localStorage.getItem("cart")) || [];

export function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const el = document.getElementById("cart-count");
  if (el) {
    el.innerText = count;
    el.style.display = count > 0 ? 'flex' : 'none'; // Hide badge if 0
  }
}

export function addToCart(name, price, image = '') {
  const existing = cart.find(item => item.name === name);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ name, price, image, qty: 1 });
  }
  saveCart();
  showToast(`${name} added to bag`);
}

export function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
}

export function changeQty(index, change) {
  cart[index].qty += change;
  if (cart[index].qty <= 0) {
    cart.splice(index, 1);
  }
  saveCart();
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
  updateCartCount();
  // If cart dropdown is open, re-render it (check availability function)
  if (typeof window.renderCartDropdown === 'function') window.renderCartDropdown();
}

// --- 3. UI HANDLERS (Menu, Cart Toggle) ---
document.addEventListener("DOMContentLoaded", () => {
  updateCartCount();

  // Auth Listener
  const loginBtn = document.getElementById("loginBtn");
  const adminLink = document.getElementById("adminLink");

  if(loginBtn) {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        loginBtn.textContent = "Logout";
        loginBtn.onclick = async () => {
          await signOut(auth);
          showToast("Logged out successfully");
          setTimeout(() => window.location.href = "index.html", 1000);
        };
        // Check if admin
        if (adminLink && user.email === "workwithwaleed1@gmail.com") {
          adminLink.style.display = "inline-block";
        }
      } else {
        loginBtn.textContent = "Login";
        loginBtn.onclick = () => window.location.href = "login.html";
        if(adminLink) adminLink.style.display = "none";
      }
    });
  }

  // Mobile Menu Toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const navLinks = document.getElementById('navLinks');
  if(menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }

  // Cart Toggle
  const cartIcon = document.querySelector('.cart-icon');
  const cartOverlay = document.getElementById('cartOverlay');
  const closeCartBtn = document.querySelector('.close-cart');
  
  if(cartIcon) {
    cartIcon.addEventListener('click', toggleCart);
  }
  if(cartOverlay) {
    cartOverlay.addEventListener('click', toggleCart);
  }
  if(closeCartBtn) {
    closeCartBtn.addEventListener('click', toggleCart);
  }
});

function toggleCart() {
  const dropdown = document.getElementById("cartDropdown");
  const overlay = document.getElementById("cartOverlay");
  if(dropdown && overlay) {
    dropdown.classList.toggle("show");
    overlay.classList.toggle("show");
    if(dropdown.classList.contains("show")) renderCartDropdown();
  }
}

// Render Cart inside Dropdown
window.renderCartDropdown = function() {
  const itemsDiv = document.getElementById("cartItems");
  const totalDiv = document.getElementById("cartTotal");
  if(!itemsDiv) return;

  itemsDiv.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    itemsDiv.innerHTML = "<p style='text-align:center; color:#888; margin-top:20px; font-size:13px;'>Your bag is empty.</p>";
  }

  cart.forEach((item, index) => {
    total += item.price * item.qty;
    const itemRow = document.createElement("div");
    itemRow.className = "cart-item";
    itemRow.innerHTML = `
      <div style="display:flex; align-items:center; gap:10px;">
        <img src="${item.image || 'https://placehold.co/50'}" style="width:40px; height:40px; border-radius:6px; object-fit:cover;">
        <div>
          <div style="font-weight:600; font-size:13px;">${item.name}</div>
          <div style="font-size:11px; color:#666;">PKR ${item.price.toLocaleString()}</div>
        </div>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <div class="cart-controls">
          <button class="qty-btn-minus" data-idx="${index}">−</button>
          <span style="font-size:12px; font-weight:600;">${item.qty}</span>
          <button class="qty-btn-plus" data-idx="${index}">+</button>
        </div>
      </div>
    `;
    itemsDiv.appendChild(itemRow);
  });

  if(totalDiv) totalDiv.innerText = "Total: PKR " + total.toLocaleString();

  // Attach listeners dynamically to avoid inline HTML mess
  document.querySelectorAll('.qty-btn-minus').forEach(btn => {
    btn.addEventListener('click', (e) => changeQty(e.target.dataset.idx, -1));
  });
  document.querySelectorAll('.qty-btn-plus').forEach(btn => {
    btn.addEventListener('click', (e) => changeQty(e.target.dataset.idx, 1));
  });
};

// Make functions available globally for HTML buttons if needed
window.addToCart = addToCart;