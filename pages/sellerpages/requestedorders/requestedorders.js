import { auth, db } from '../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// DOM Elements
const ordersListEl = document.querySelector('.orders-list');
const tabButtons = document.querySelectorAll('.tab');
const logoutBtn = document.getElementById('logout-btn');

let allOrders = [];

// Check authentication and load orders
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '../../index.html';
  } else {
    loadOrders(user.uid);
    attachTabListeners();
  }
});

// Load orders from Firestore for the seller
function loadOrders(sellerId) {
  const ordersRef = collection(db, 'orders');
  const ordersQuery = query(
    ordersRef,
    where('sellerId', '==', sellerId),
    orderBy('createdAt', 'desc')
  );

  onSnapshot(ordersQuery, (snapshot) => {
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
      allOrders.push(order);
    });

    // Apply the filter of the currently active tab
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
      : allOrders.filter(
          (order) => order.status.toLowerCase() === statusFilter
        );

  if (filteredOrders.length === 0) {
    ordersListEl.innerHTML = `
      <div class="no-orders">
        <i class="fas fa-box-open"></i>
        <p>No ${statusFilter} orders found.</p>
      </div>`;
    return;
  }

  filteredOrders.forEach((order) => {
    const orderCard = document.createElement('div');
    orderCard.classList.add('order-card');

    // Create a comma-separated list of items (if available)
    const itemsStr = order.items
      ? order.items
          .map((item) => `${item.itemName} (x${item.quantity})`)
          .join(', ')
      : 'N/A';

    orderCard.innerHTML = `
      <h3>Order ID: ${order.id}</h3>
      <p><strong>Buyer:</strong> ${order.buyerInfo?.fullName || 'N/A'}</p>
      <p><strong>Items:</strong> ${itemsStr}</p>
      <p><strong>Total:</strong> $${
        order.total ? order.total.toFixed(2) : '0.00'
      }</p>
      <p><strong>Status:</strong> <span class="order-status ${order.status.toLowerCase()}">${
        order.status
      }</span></p>
      <div class="order-actions"></div>
    `;

    // Add action buttons based on current order status
    const actionsDiv = orderCard.querySelector('.order-actions');
    if (order.status.toLowerCase() === 'pending') {
      const confirmBtn = document.createElement('button');
      confirmBtn.classList.add('btn', 'btn-primary');
      confirmBtn.textContent = 'Confirm Order';
      confirmBtn.addEventListener('click', () =>
        updateOrderStatus(order.id, 'Confirmed')
      );
      actionsDiv.appendChild(confirmBtn);
    } else if (order.status.toLowerCase() === 'confirmed') {
      const deliverBtn = document.createElement('button');
      deliverBtn.classList.add('btn', 'btn-primary');
      deliverBtn.textContent = 'Mark as Delivered';
      deliverBtn.addEventListener('click', () =>
        updateOrderStatus(order.id, 'Delivered')
      );
      actionsDiv.appendChild(deliverBtn);
    }
    if (order.status.toLowerCase() === 'returnrequested') {
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

// Function to update the order status
async function updateOrderStatus(orderId, newStatus) {
  if (
    !confirm(
      `Are you sure you want to update order ${orderId} to ${newStatus}?`
    )
  )
    return;
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status: newStatus });
    alert(`Order ${orderId} updated to ${newStatus}.`);
  } catch (error) {
    console.error('Error updating order status:', error);
    alert('Failed to update order status.');
  }
}

// Attach event listeners to the tab buttons
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
