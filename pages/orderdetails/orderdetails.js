import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Global variable to store orders and current tab filter
let allOrders = [];
let currentFilter = "all";

// Listen for authentication state changes and load buyer orders
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    loadOrders(user.uid);
  } else {
    window.location.href = "../../index.html";
  }
});

// Real-time listener for buyer's orders
function loadOrders(buyerId) {
  const ordersRef = collection(db, "orders");
  // Query orders where buyerId matches (assuming orders have a buyerId field)
  const q = query(ordersRef, where("buyerId", "==", buyerId), orderBy("createdAt", "desc"), limit(20));

  onSnapshot(q, (snapshot) => {
    allOrders = [];
    snapshot.forEach((docSnap) => {
      const order = docSnap.data();
      order.id = docSnap.id;
      allOrders.push(order);
    });
    renderOrders();
  }, (error) => {
    console.error("Error loading orders:", error);
  });
}

// Render orders based on the current tab filter
function renderOrders() {
  const ordersList = document.getElementById("orders-list");
  ordersList.innerHTML = "";

  const filteredOrders = currentFilter === "all" 
    ? allOrders 
    : allOrders.filter(order => order.status === currentFilter);

  if (filteredOrders.length === 0) {
    ordersList.innerHTML = "<p>No orders found for this category.</p>";
    return;
  }

  filteredOrders.forEach((order) => {
    const orderDiv = document.createElement("div");
    orderDiv.classList.add("order-entry");
    orderDiv.innerHTML = `
      <div class="order-details">
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Seller:</strong> ${order.sellerName || "N/A"}</p>
        <p><strong>Quantity:</strong> ${order.quantity || 1}</p>
        <p><strong>Status:</strong> ${order.status}</p>
        <p><strong>Message:</strong> ${order.message || ""}</p>
      </div>
      <div class="order-actions">
        ${
          (order.status === "Pending" || order.status === "Confirmed")
            ? `<button class="cancel-btn" data-id="${order.id}">Cancel Order</button>`
            : order.status === "Delivered"
            ? `<button class="return-btn" data-id="${order.id}">Request Return</button>`
            : ""
        }
      </div>
    `;
    ordersList.appendChild(orderDiv);
  });
  attachActionListeners();
}

// Attach event listeners for cancellation and return requests
function attachActionListeners() {
  // Cancel Order action
  document.querySelectorAll(".cancel-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orderId = btn.getAttribute("data-id");
      try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { status: "Cancelled" });
        alert(`Order ${orderId} cancelled.`);
      } catch (error) {
        console.error("Error cancelling order:", error);
        alert("Failed to cancel order.");
      }
    });
  });

  // Request Return action
  document.querySelectorAll(".return-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orderId = btn.getAttribute("data-id");
      try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, { status: "Return Requested" });
        alert(`Return requested for Order ${orderId}.`);
      } catch (error) {
        console.error("Error requesting return:", error);
        alert("Failed to request return.");
      }
    });
  });
}

// Tab switching functionality
document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    // Remove active class from all tabs and set currentFilter based on clicked tab
    document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentFilter = tab.getAttribute("data-status");
    renderOrders();
  });
});

// Logout handler
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth)
      .then(() => (window.location.href = "../../index.html"))
      .catch((error) => console.error("Error signing out:", error));
  });
}
