import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  signOut,
 } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// DOM Elements
const ordersContainer = document.getElementById("orders-container");
const orderFilter = document.getElementById("order-filter");

let currentUser = null;

// Listen for authentication state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadOrders(orderFilter.value);
  } else {
    window.location.href = "../../index.html"; // Redirect if not logged in
  }
});

// Load Orders
async function loadOrders(filterStatus = "all") {
  if (!currentUser) return;

  ordersContainer.innerHTML = "<p>Loading orders...</p>";
  try {
    const ordersRef = collection(db, "users", currentUser.uid, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));
    const ordersSnapshot = await getDocs(q);

    if (ordersSnapshot.empty) {
      ordersContainer.innerHTML = "<p>No orders found.</p>";
      return;
    }

    const ordersArray = [];
    ordersSnapshot.forEach((docSnap) => {
      ordersArray.push({ id: docSnap.id, ...docSnap.data() });
    });

    const filteredOrders =
      filterStatus === "all"
        ? ordersArray
        : ordersArray.filter((order) => order.status === filterStatus);

    if (filteredOrders.length === 0) {
      ordersContainer.innerHTML = "<p>No orders found.</p>";
      return;
    }

    ordersContainer.innerHTML = "";
    filteredOrders.forEach((order) => {
      const orderDate =
        order.createdAt?.toDate?.().toLocaleString() || "Unknown Date";
      displayOrder(order.id, order, orderDate);
    });
  } catch (error) {
    console.error("Error loading orders:", error);
    ordersContainer.innerHTML =
      "<p>Error loading orders. Please try again.</p>";
  }
}

// Display order details
function displayOrder(docId, order, orderDate) {
  const orderElement = document.createElement("div");
  orderElement.classList.add("order-item");
  orderElement.innerHTML = `
    <div class="order-header">
      <p><strong>Order ID:</strong> ${docId}</p>
      <p><strong>Status:</strong> <span class="order-status ${
        order.status?.toLowerCase() || "pending"
      }">${order.status || "Pending"}</span></p>
    </div>
    <p><strong>Date:</strong> ${orderDate}</p>
    <p><strong>Payment Method:</strong> ${order.paymentMethod || "N/A"}</p>
    <p><strong>Total Amount:</strong> $${order.total?.toFixed(2) || "0.00"}</p>
    <div class="order-items">
      <h4>Items Purchased:</h4>
      <ul>
        ${
          order.items
            ?.map(
              (item) =>
                `<li>${item.itemName} (x${item.quantity}) - $${(
                  item.price * item.quantity
                ).toFixed(2)}</li>`
            )
            .join("") || "<li>No items found.</li>"
        }
      </ul>
    </div>
    <button class="track-order-btn" data-order-id="${docId}">Track Order</button>
  `;
  ordersContainer.appendChild(orderElement);

  // Add event listener to the "Track Order" button
  const trackOrderBtn = orderElement.querySelector(".track-order-btn");
  trackOrderBtn.addEventListener("click", () => {
    window.location.href = `../OrderDetails/OrderDetails.html?orderId=${docId}`;
  });
}

// Filter orders
orderFilter.addEventListener("change", (e) => {
  loadOrders(e.target.value);
});
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
