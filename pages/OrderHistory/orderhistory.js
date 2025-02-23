import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// DOM Elements
const ordersList = document.getElementById("orders-list");
const tabs = document.querySelectorAll(".tab");

let allOrders = []; // Store all orders for filtering

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadOrderHistory(user.uid); // Load all orders
    attachTabListeners(); // Attach tab click listeners
  } else {
    window.location.href = "../../index.html"; // Redirect to login if not authenticated
  }
});

// Load all orders for the logged-in user
function loadOrderHistory(userId) {
  const ordersRef = collection(db, "users", userId, "orders");
  const q = query(ordersRef, orderBy("createdAt", "desc"));

  onSnapshot(q, (snapshot) => {
    allOrders = []; // Reset all orders
    ordersList.innerHTML = ""; // Clear existing content

    if (snapshot.empty) {
      ordersList.innerHTML = "<p>No orders found.</p>";
      return;
    }

    snapshot.forEach((docSnap) => {
      const order = docSnap.data();
      order.id = docSnap.id; // Add the order ID to the order object
      allOrders.push(order);
    });

    // Display all orders by default
    filterOrders("All");
  });
}

// Filter orders by status and display them
function filterOrders(statusFilter) {
  ordersList.innerHTML = ""; // Clear existing content

  const filteredOrders =
    statusFilter === "All"
      ? allOrders // Show all orders
      : allOrders.filter((order) => order.status === statusFilter); // Filter by status

  if (filteredOrders.length === 0) {
    ordersList.innerHTML = `<p>No ${statusFilter.toLowerCase()} orders found.</p>`;
    return;
  }

  filteredOrders.forEach((order) => {
    const orderDiv = document.createElement("div");
    orderDiv.classList.add("order-entry");

    // Format order items
    const itemsList = order.items
      .map((item) => `${item.itemName} (x${item.quantity})`)
      .join(", ");

    // Format order date
    const orderDate = order.createdAt
      ? new Date(order.createdAt.toDate()).toLocaleString()
      : "N/A";

    orderDiv.innerHTML = `
      <div class="order-details">
        <p><strong>Order ID:</strong> ${order.id}</p>
        <p><strong>Date:</strong> ${orderDate}</p>
        <p><strong>Items:</strong> ${itemsList}</p>
        <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
        <p><strong>Status:</strong> <span class="order-status ${
          order.status
        }">${order.status}</span></p>
      </div>
      <div class="order-actions">
        ${
          order.status === "Pending" || order.status === "Confirmed"
            ? `<button class="cancel-btn" data-id="${order.id}">Cancel Order</button>`
            : ""
        }
        ${
          order.status === "Delivered" && isWithinReturnPeriod(order.createdAt)
            ? `<button class="return-btn" data-id="${order.id}">Request Return</button>`
            : ""
        }
      </div>
    `;
    ordersList.appendChild(orderDiv);
  });

  attachOrderActionListeners(); // Attach action button listeners
}

// Check if the order is within the 30-day return period
function isWithinReturnPeriod(createdAt) {
  const orderDate = createdAt.toDate();
  const currentDate = new Date();
  const diffTime = currentDate - orderDate;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
}

// Attach tab click listeners
function attachTabListeners() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const statusFilter = tab.getAttribute("data-status");
      filterOrders(statusFilter); // Filter and display orders
    });
  });
}

// Attach order action listeners (cancel and return)
function attachOrderActionListeners() {
  // Cancel order button
  document.querySelectorAll(".cancel-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orderId = btn.getAttribute("data-id");

      // Confirmation dialog
      const isConfirmed = confirm("Are you sure you want to cancel this order?");
      if (!isConfirmed) return;

      try {
        // Update user-specific order
        const userOrderRef = doc(
          db,
          "users",
          auth.currentUser.uid,
          "orders",
          orderId
        );
        await updateDoc(userOrderRef, { status: "Cancelled" });

        // Update global order
        const globalOrderRef = doc(db, "orders", orderId);
        await updateDoc(globalOrderRef, { status: "Cancelled" });

        alert(`Order ${orderId} cancelled.`);

        // Hide the cancel button immediately
        btn.style.display = "none";

        // Refresh the orders list
        filterOrders(
          document.querySelector(".tab.active").getAttribute("data-status")
        );
      } catch (error) {
        console.error("Error cancelling order:", error);
        alert("Failed to cancel order.");
      }
    });
  });

  // Return request button
  document.querySelectorAll(".return-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orderId = btn.getAttribute("data-id");

      // Confirmation dialog
      const isConfirmed = confirm("Are you sure you want to request a return for this order?");
      if (!isConfirmed) return;

      try {
        // Update user-specific order
        const userOrderRef = doc(
          db,
          "users",
          auth.currentUser.uid,
          "orders",
          orderId
        );
        await updateDoc(userOrderRef, { status: "ReturnRequested", returnRequested: true });

        // Update global order
        const globalOrderRef = doc(db, "orders", orderId);
        await updateDoc(globalOrderRef, { status: "ReturnRequested", returnRequested: true });

        alert(`Return requested for order ${orderId}.`);

        // Hide the return button immediately
        btn.style.display = "none";

        // Refresh the orders list
        filterOrders(
          document.querySelector(".tab.active").getAttribute("data-status")
        );
      } catch (error) {
        console.error("Error requesting return:", error);
        alert("Failed to request return.");
      }
    });
  });
}
// Listen for logout button click
function logout() {
  signOut(auth)
    .then(() => {
      window.location.href = "../../index.html";
    })
    .catch((error) => {
      console.error("Error signing out:", error);
    });
}  document.getElementById("logout-btn").addEventListener("click", logout);
