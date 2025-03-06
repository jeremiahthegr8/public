import { auth, db } from '../../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  addDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Global variable to store the seller's ID (retrieved from the user's document in "users")
let currentSellerId = null;

// DOM Elements
const ordersListEl = document.querySelector('.orders-list');
const tabButtons = document.querySelectorAll('.tab');
const logoutBtn = document.getElementById('logout-btn');

let allOrders = [];

/**
 * Helper: Retrieves the buyer's full name from the "users" collection using buyerId.
 * Assumes user document has "FirstName" and "LastName" fields.
 */
async function getBuyerName(buyerId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', buyerId));
    if (userDoc.exists()) {
      const data = userDoc.data();
      return `${data.FirstName || ''} ${data.LastName || ''}`.trim() || 'N/A';
    }
  } catch (error) {
    console.error('Error fetching buyer name:', error);
  }
  return 'N/A';
}

// Check authentication and then retrieve the seller ID from the user's document
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../../index.html';
  } else {
    // Get the user's document from the "users" collection
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      // The seller's ID is stored under the "sellerID" field in the user document
      currentSellerId = userData.sellerID;
      if (!currentSellerId) {
        console.error("Seller ID not found in user's document.");
        return;
      }
      loadOrders(currentSellerId);
      attachTabListeners();
    } else {
      console.error('User document does not exist.');
    }
  }
});

// Load orders from the seller's orders subcollection: sellers/{sellerID}/orders
function loadOrders(sellerId) {
  const sellerOrdersRef = collection(db, 'sellers', sellerId, 'orders');

  onSnapshot(sellerOrdersRef, (snapshot) => {
    allOrders = [];
    ordersListEl.innerHTML = ''; // Clear previous orders

    if (snapshot.empty) {
      ordersListEl.innerHTML = `
        <div class="no-orders">
          <i class="fas fa-box-open"></i>
          <p>No orders found.</p>
        </div>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const order = docSnap.data();
      order.id = docSnap.id;
      // Ensure each order document includes the sellerId (if not already present)
      order.sellerId = sellerId;
      allOrders.push(order);
    });

    // Filter orders based on the active tab's status (using shippingInfo.status if available)
    const activeTab = document.querySelector('.tab.active');
    const statusFilter = activeTab
      ? activeTab.getAttribute('data-status')
      : 'all';
    filterOrders(statusFilter);
  });
}

// Filter orders based on status and render them
function filterOrders(statusFilter) {
  ordersListEl.innerHTML = '';
  const filteredOrders =
    statusFilter === 'all'
      ? allOrders
      : allOrders.filter((order) => {
          const orderStatus = order.shippingInfo?.status || order.status;
          return orderStatus.toLowerCase() === statusFilter;
        });

  if (filteredOrders.length === 0) {
    ordersListEl.innerHTML = `
      <div class="no-orders">
        <i class="fas fa-box-open"></i>
        <p>No ${statusFilter} orders found.</p>
      </div>`;
    return;
  }

  filteredOrders.forEach((order) => {
    // Use shippingInfo.status if available for display
    const orderStatus = order.shippingInfo?.status || order.status;
    const orderCard = document.createElement('div');
    orderCard.classList.add('order-card');

    // Build a comma-separated list of items. Use "name" from checkout if item.itemName is missing.
    const itemsStr = order.items
      ? order.items
          .map((item) => {
            const name = item.itemName || item.name || 'N/A';
            return `${name} (x${item.quantity})`;
          })
          .join(', ')
      : 'N/A';

    // Prepare buyer name. If buyerInfo is not provided, display "Loading..."
    let buyerName = order.buyerInfo?.fullName || 'Loading...';

    orderCard.innerHTML = `
      <h3>Order ID: ${order.id}</h3>
      <p><strong>Buyer:</strong> <span class="buyer-name" data-buyerid="${
        order.userId
      }">${buyerName}</span></p>
      <p><strong>Items:</strong> ${itemsStr}</p>
      <p><strong>Total:</strong> $${
        order.totals && order.totals.total
          ? order.totals.total.toFixed(2)
          : '0.00'
      }</p>
      <p><strong>Status:</strong> <span class="order-status ${orderStatus.toLowerCase()}">${orderStatus}</span></p>
      <div class="order-actions"></div>
    `;

    // If buyerInfo wasn't set, fetch the buyer name asynchronously and update the span
    if (!order.buyerInfo || !order.buyerInfo.fullName) {
      getBuyerName(order.userId).then((name) => {
        const span = orderCard.querySelector(
          `.buyer-name[data-buyerid="${order.userId}"]`
        );
        if (span) span.textContent = name;
      });
    }

    const actionsDiv = orderCard.querySelector('.order-actions');
    // Display action buttons based on the current order status
    if (orderStatus.toLowerCase() === 'pending') {
      const confirmBtn = document.createElement('button');
      confirmBtn.classList.add('btn', 'btn-primary');
      confirmBtn.textContent = 'Confirm Order';
      confirmBtn.addEventListener('click', () =>
        updateOrderStatus(order.id, 'Confirmed')
      );
      actionsDiv.appendChild(confirmBtn);
    } else if (orderStatus.toLowerCase() === 'confirmed') {
      const deliverBtn = document.createElement('button');
      deliverBtn.classList.add('btn', 'btn-primary');
      deliverBtn.textContent = 'Mark as Delivered';
      deliverBtn.addEventListener('click', () =>
        updateOrderStatus(order.id, 'Delivered')
      );
      actionsDiv.appendChild(deliverBtn);
    }
    if (orderStatus.toLowerCase() === 'returnrequested') {
      const approveReturnBtn = document.createElement('button');
      approveReturnBtn.classList.add('btn', 'btn-warning');
      approveReturnBtn.textContent = 'Approve Return';
      approveReturnBtn.addEventListener('click', () =>
        updateOrderStatus(order.id, 'Returned')
      );
      actionsDiv.appendChild(approveReturnBtn);
    }

    ordersListEl.appendChild(orderCard);
  });
}

/**
 * Updates the order status in three locations:
 * 1. The seller's orders subcollection: sellers/{sellerID}/orders/{orderID}
 * 2. The global orders collection: orders/{orderID}
 * 3. The buyer's orders subcollection: users/{buyerID}/orders/{orderID}
 *
 * It then calculates net revenue effect using the subtotal from totals (or, if zero, by summing price*quantity from items)
 * and creates an analytics record.
 */
async function updateOrderStatus(orderId, newStatus) {
  if (
    !confirm(
      `Are you sure you want to update order ${orderId} to ${newStatus}?`
    )
  )
    return;
  try {
    // Reference the seller's order document
    const sellerOrderRef = doc(
      db,
      'sellers',
      currentSellerId,
      'orders',
      orderId
    );
    // Get the current order data from the seller's subcollection
    const orderSnap = await getDoc(sellerOrderRef);
    if (!orderSnap.exists()) {
      alert('Order not found.');
      return;
    }
    const orderData = orderSnap.data();

    // Prepare references to the global and buyer's order documents
    const globalOrderRef = doc(db, 'orders', orderId);
    const userOrderRef = doc(db, 'users', orderData.userId, 'orders', orderId);

    // Update all three order documents concurrently
    await Promise.all([
      updateDoc(sellerOrderRef, {
        status: newStatus,
        'shippingInfo.status': newStatus,
      }),
      updateDoc(globalOrderRef, {
        status: newStatus,
        'shippingInfo.status': newStatus,
      }),
      updateDoc(userOrderRef, {
        status: newStatus,
        'shippingInfo.status': newStatus,
      }),
    ]);

    // Calculate revenue using totals.subtotal if available; otherwise, recalc from items
    let revenue = 0;
    if (orderData.totals && parseFloat(orderData.totals.subtotal) > 0) {
      revenue = parseFloat(orderData.totals.subtotal);
    } else if (orderData.items && orderData.items.length > 0) {
      revenue = orderData.items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = item.quantity || 1;
        return sum + price * quantity;
      }, 0);
    }

    let netRevenueEffect = 0;
    if (newStatus.toLowerCase() === 'returned') {
      netRevenueEffect = -revenue;
    } else if (
      newStatus.toLowerCase() === 'confirmed' ||
      newStatus.toLowerCase() === 'delivered'
    ) {
      netRevenueEffect = revenue;
    }

    // Create an analytics record in the "sellerAnalytics" collection
    const analyticsRef = collection(db, 'sellerAnalytics');
    await addDoc(analyticsRef, {
      orderId,
      sellerId: currentSellerId,
      status: newStatus,
      netRevenueEffect,
      totals: orderData.totals || null,
      timestamp: new Date(),
    });

    alert(`Order ${orderId} updated to ${newStatus}.`);
  } catch (error) {
    console.error('Error updating order status:', error);
    alert('Failed to update order status.');
  }
}

// Attach event listeners to tab buttons for filtering orders by status
function attachTabListeners() {
  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabButtons.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const statusFilter = tab.getAttribute('data-status');
      filterOrders(statusFilter);
    });
  });
}

// Logout handler
logoutBtn.addEventListener('click', () => {
  signOut(auth)
    .then(() => (window.location.href = '../../index.html'))
    .catch((err) => console.error('Error signing out:', err));
});
