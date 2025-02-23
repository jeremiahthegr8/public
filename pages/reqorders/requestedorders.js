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
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// DOM Elements
const ordersList = document.getElementById("orders-list");
const tabs = document.querySelectorAll(".tab");

let allOrders = []; // Store all orders for filtering

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    loadRequestedOrders(user.uid); // Load all orders
    attachTabListeners(); // Attach tab click listeners
  } else {
    window.location.href = "../../index.html";
  }
});

// Load all orders for the logged-in seller
function loadRequestedOrders(sellerId) {
  const ordersRef = collection(db, "orders");
  const q = query(
    ordersRef,
    where("sellerId", "==", sellerId),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    allOrders = []; // Reset all orders
    ordersList.innerHTML = ""; // Clear existing content

    if (snapshot.empty) {
      ordersList.innerHTML = "<p>No requested orders found.</p>";
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
        <p><strong>Buyer:</strong> ${order.buyerInfo.fullName || "N/A"}</p>
        <p><strong>Items:</strong> ${itemsList}</p>
        <p><strong>Total:</strong> $${order.total.toFixed(2)}</p>
        <p><strong>Status:</strong> <span class="order-status ${
          order.status
        }">${order.status}</span></p>
      </div>
      <div class="order-actions">
        ${
          order.status === "Pending"
            ? `<button class="update-status-btn" data-id="${order.id}" data-next="Confirmed">Confirm Order</button>`
            : order.status === "Confirmed"
            ? `<button class="update-status-btn" data-id="${order.id}" data-next="Delivered">Mark as Delivered</button>`
            : ""
        }
        ${
          order.status === "ReturnRequested"
            ? `<button class="approve-return-btn" data-id="${order.id}">Approve Return</button>`
            : ""
        }
      </div>
    `;
    ordersList.appendChild(orderDiv);
  });

  attachOrderActionListeners(); // Attach action button listeners
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

// Attach order action listeners (update status, approve return)
function attachOrderActionListeners() {
  // Update status button (for Pending or Confirmed orders)
  document.querySelectorAll(".update-status-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orderId = btn.getAttribute("data-id");
      const nextStatus = btn.getAttribute("data-next");

      try {
        // Reference to the global orders collection
        const globalOrderRef = doc(db, "orders", orderId);

        // Get the order data to find the userId
        const globalOrderSnap = await getDoc(globalOrderRef);
        if (!globalOrderSnap.exists()) {
          alert("Order not found.");
          return;
        }

        const orderData = globalOrderSnap.data();
        const userId = orderData.userId;

        // Reference to the user-specific orders subcollection
        const userOrderRef = doc(db, "users", userId, "orders", orderId);

        // Update status in both collections
        await Promise.all([
          updateDoc(globalOrderRef, { status: nextStatus }),
          updateDoc(userOrderRef, { status: nextStatus }),
        ]);

        alert(`Order ${orderId} updated to ${nextStatus}.`);
      } catch (error) {
        console.error("Error updating order status:", error);
        alert("Failed to update order status.");
      }
    });
  });

  // Approve return button (for ReturnRequested orders)
  document.querySelectorAll(".approve-return-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const orderId = btn.getAttribute("data-id");

      // Confirmation dialog
      const isConfirmed = confirm(
        "Are you sure you want to approve this return request?"
      );
      if (!isConfirmed) return;

      try {
        // Reference to the global orders collection
        const globalOrderRef = doc(db, "orders", orderId);

        // Get the order data to find the userId
        const globalOrderSnap = await getDoc(globalOrderRef);
        if (!globalOrderSnap.exists()) {
          alert("Order not found.");
          return;
        }

        const orderData = globalOrderSnap.data();
        const userId = orderData.userId;

        // Reference to the user-specific orders subcollection
        const userOrderRef = doc(db, "users", userId, "orders", orderId);

        // Update status in both collections
        await Promise.all([
          updateDoc(globalOrderRef, {
            status: "Returned",
            returnRequested: false,
          }),
          updateDoc(userOrderRef, {
            status: "Returned",
            returnRequested: false,
          }),
        ]);

        alert(`Return approved for order ${orderId}.`);

        // Refresh the orders list
        filterOrders(
          document.querySelector(".tab.active").getAttribute("data-status")
        );
      } catch (error) {
        console.error("Error approving return:", error);
        alert("Failed to approve return.");
      }
    });
  });
}

// Logout handler
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth)
      .then(() => (window.location.href = "../../index.html"))
      .catch((error) => console.error("Error signing out:", error));
  });
}
