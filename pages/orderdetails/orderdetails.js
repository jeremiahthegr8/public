import { auth, db } from "../../database/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// DOM Elements
const orderInfoContainer = document.getElementById("order-info");
const backBtn = document.getElementById("back-btn");

// Get orderId from URL
const urlParams = new URLSearchParams(window.location.search);
const orderId = urlParams.get("orderId");

let currentUser = null;

// Listen for authentication state changes
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    await loadOrderDetails(orderId);
  } else {
    window.location.href = "../../index.html"; // Redirect if not logged in
  }
});

// Load Order Details
async function loadOrderDetails(orderId) {
  if (!currentUser || !orderId) return;

  orderInfoContainer.innerHTML = "<p>Loading order details...</p>";
  try {
    const orderRef = doc(db, "users", currentUser.uid, "orders", orderId);
    const orderSnap = await getDoc(orderRef);

    if (!orderSnap.exists()) {
      orderInfoContainer.innerHTML = "<p>Order not found.</p>";
      return;
    }

    const order = orderSnap.data();
    const orderDate =
      order.createdAt?.toDate?.().toLocaleString() || "Unknown Date";

    // Fetch item details for each item in the order
    const itemsWithDetails = await Promise.all(
      order.items.map(async (item) => {
        const itemRef = doc(db, "items", item.itemId);
        const itemSnap = await getDoc(itemRef);
        return {
          ...item,
          ...itemSnap.data(),
        };
      })
    );

    // Display order details
    orderInfoContainer.innerHTML = `
      <div class="order-header">
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Status:</strong> <span class="order-status ${
          order.status?.toLowerCase() || "pending"
        }">${order.status || "Pending"}</span></p>
      </div>
      <p><strong>Date:</strong> ${orderDate}</p>
      <p><strong>Payment Method:</strong> ${order.paymentMethod || "N/A"}</p>
      <p><strong>Total Amount:</strong> $${
        order.total?.toFixed(2) || "0.00"
      }</p>
      <div class="order-process">
        <h3>Order Process</h3>
        <div class="process-steps">
          <div class="step ${
            order.status === "Pending" ? "active" : ""
          }">Pending</div>
          <div class="step ${
            order.status === "Shipped" ? "active" : ""
          }">Shipped</div>
          <div class="step ${
            order.status === "In Your Country" ? "active" : ""
          }">In Your Country</div>
          <div class="step ${
            order.status === "Delivered" ? "active" : ""
          }">Delivered</div>
        </div>
      </div>
      <div class="order-items">
        <h3>Items Purchased</h3>
        <ul>
          ${
            itemsWithDetails
              .map(
                (item) => `
                <li class="item">
                  <img src="${
                    item.imageBase64 || "https://via.placeholder.com/100"
                  }" alt="${item.itemName}" class="item-image" />
                  <div class="item-details">
                    <p><strong>${item.itemName}</strong></p>
                    <p>Quantity: ${item.quantity}</p>
                    <p>Price: $${item.price?.toFixed(2) || "0.00"}</p>
                    <p>Attributes: ${
                      item.attributes
                        ? Object.entries(item.attributes)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(", ")
                        : "N/A"
                    }</p>
                  </div>
                </li>
              `
              )
              .join("") || "<li>No items found.</li>"
          }
        </ul>
      </div>
      ${
        order.status === "Pending"
          ? `<button id="cancel-order-btn" class="cancel-btn">Cancel Order</button>`
          : ""
      }
    `;

    // Add event listener for cancel order button
    if (order.status === "Pending") {
      const cancelOrderBtn = document.getElementById("cancel-order-btn");
      cancelOrderBtn.addEventListener("click", async () => {
        if (confirm("Are you sure you want to cancel this order?")) {
          await cancelOrder(orderId);
        }
      });
    }
  } catch (error) {
    console.error("Error loading order details:", error);
    orderInfoContainer.innerHTML =
      "<p>Error loading order details. Please try again.</p>";
  }
}

// Cancel Order
async function cancelOrder(orderId) {
  try {
    const orderRef = doc(db, "users", currentUser.uid, "orders", orderId);
    await updateDoc(orderRef, { status: "Canceled" });
    alert("Order canceled successfully.");
    window.location.reload(); // Refresh the page to reflect the updated status
  } catch (error) {
    console.error("Error canceling order:", error);
    alert("Failed to cancel order. Please try again.");
  }
}

// Back to Orders
backBtn.addEventListener("click", () => {
  window.location.href = "../OrderHistory/Orderhistory.html";
});
