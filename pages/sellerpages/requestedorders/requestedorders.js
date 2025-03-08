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
import { increment } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Global variable to store the seller's ID
let currentSellerId = null;

// DOM Elements
const ordersListEl = document.querySelector('.orders-list');
const tabButtons = document.querySelectorAll('.tab');
const logoutBtn = document.getElementById('logout-btn');

let allOrders = [];

/**
 * Helper: Retrieves the buyer's full name from the "users" collection using buyerId.
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
      order.sellerId = sellerId;
      allOrders.push(order);
    });

    // Filter orders based on the active tab's status
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
    const orderStatus = order.shippingInfo?.status || order.status;
    const orderCard = document.createElement('div');
    orderCard.classList.add('order-card');

    const itemsStr = order.items
      ? order.items
          .map((item) => {
            const name = item.itemName || item.name || 'N/A';
            return `${name} (x${item.quantity})`;
          })
          .join(', ')
      : 'N/A';

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

    if (!order.buyerInfo || !order.buyerInfo.fullName) {
      getBuyerName(order.userId).then((name) => {
        const span = orderCard.querySelector(
          `.buyer-name[data-buyerid="${order.userId}"]`
        );
        if (span) span.textContent = name;
      });
    }

    const actionsDiv = orderCard.querySelector('.order-actions');
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
    } else if (orderStatus.toLowerCase() === 'returned requested') {
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
 */

async function updateOrderStatus(orderId, newStatus) {
  console.log(`Attempting to update order ${orderId} to status: ${newStatus}`);
  if (
    !confirm(
      `Are you sure you want to update order ${orderId} to ${newStatus}?`
    )
  ) {
    console.log('User canceled the update.');
    return;
  }
  try {
    // Get the order from the seller's orders subcollection.
    const sellerOrderRef = doc(
      db,
      'sellers',
      currentSellerId,
      'orders',
      orderId
    );
    const orderSnap = await getDoc(sellerOrderRef);
    if (!orderSnap.exists()) {
      alert('Order not found.');
      console.log(`Order ${orderId} not found in seller's orders`);
      return;
    }
    const orderData = orderSnap.data();
    console.log('Order data retrieved:', orderData);

    // References for global and buyer order documents.
    const globalOrderRef = doc(db, 'orders', orderId);
    const userOrderRef = doc(db, 'users', orderData.userId, 'orders', orderId);
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
    console.log(
      `Order ${orderId} status updated to ${newStatus} in all locations.`
    );

    if (newStatus.toLowerCase() === 'delivered') {
      // For delivered orders: update salesCount, quantity, and revenue.
      for (const item of orderData.items) {
        const listingId = item.id;
        if (!listingId) {
          console.error('Missing listing id in order item:', item);
          continue;
        }
        const qty = Number(item.quantity);
        // Compute revenueDelta = price * quantity.
        const revenueDelta = parseFloat(item.price) * qty;
        console.log(
          `Delivered: For listing id ${listingId}, quantity = ${qty}, revenueDelta = ${revenueDelta}`
        );
        const productRef = doc(db, 'listings', listingId);
        console.log(
          `Updating listing ${listingId}: incrementing salesCount by ${qty}, decrementing quantity by ${qty}, incrementing revenue by ${revenueDelta}`
        );
        await updateDoc(productRef, {
          salesCount: increment(qty),
          quantity: increment(-qty),
          revenue: increment(revenueDelta),
        });
        const sellerRef = doc(db, 'sellers', currentSellerId);
        console.log(
          `Updating seller ${currentSellerId}: decrementing numberInStock by ${qty}, incrementing totalRevenue by ${revenueDelta}`
        );
        await updateDoc(sellerRef, {
          numberInStock: increment(-qty),
          totalRevenue: increment(revenueDelta),
        });
      }
    } else if (newStatus.toLowerCase() === 'returned') {
      // For returned orders: update returnsCount, quantity, and revenue.
      for (const item of orderData.items) {
        const listingId = item.id;
        if (!listingId) {
          console.error('Missing listing id in order item:', item);
          continue;
        }
        const qty = Number(item.quantity);
        const revenueDelta = parseFloat(item.price) * qty;
        console.log(
          `Returned: For listing id ${listingId}, quantity = ${qty}, revenueDelta = ${revenueDelta}`
        );
        const productRef = doc(db, 'listings', listingId);
        console.log(
          `Updating listing ${listingId}: incrementing returnsCount by ${qty}, incrementing quantity by ${qty}, decrementing revenue by ${revenueDelta}`
        );
        await updateDoc(productRef, {
          returnsCount: increment(qty),
          quantity: increment(qty),
          revenue: increment(-revenueDelta),
        });
        const sellerRef = doc(db, 'sellers', currentSellerId);
        console.log(
          `Updating seller ${currentSellerId}: incrementing numberInStock by ${qty}, decrementing totalRevenue by ${revenueDelta}`
        );
        await updateDoc(sellerRef, {
          numberInStock: increment(qty),
          totalRevenue: increment(-revenueDelta),
        });
      }
    }
    alert(`Order ${orderId} updated to ${newStatus}.`);
    console.log(`Completed updating order ${orderId}.`);
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
