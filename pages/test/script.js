import { auth, db } from '../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Global variable to store the seller's ID
let currentSellerId = null;

// DOM Elements
const totalRevenueEl = document.getElementById('total-revenue');
const totalOrdersEl = document.getElementById('total-orders');
const ordersByStatusEl = document.getElementById('orders-by-status');
const topSellingItemsEl = document.getElementById('top-selling-items');
const netRevenueEl = document.getElementById('net-revenue');
const returnRateEl = document.getElementById('return-rate');

// Check authentication and retrieve the seller ID
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../../index.html';
  } else {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      currentSellerId = userData.sellerID;
      if (!currentSellerId) {
        console.error("Seller ID not found in user's document.");
        return;
      }
      loadAnalytics(currentSellerId);
    } else {
      console.error('User document does not exist.');
    }
  }
});

// Load analytics data for the seller
async function loadAnalytics(sellerId) {
  const sellerOrdersRef = collection(db, 'sellers', sellerId, 'orders');
  const ordersSnapshot = await getDocs(sellerOrdersRef);

  if (ordersSnapshot.empty) {
    console.log('No orders found for this seller.');
    return;
  }

  const orders = ordersSnapshot.docs.map((doc) => doc.data());
  calculateAnalytics(orders);
}

// Calculate and display analytics
function calculateAnalytics(orders) {
  // 1. Total Revenue
  const totalRevenue = orders.reduce((sum, order) => {
    return sum + (order.totals?.total || 0);
  }, 0);
  totalRevenueEl.textContent = `$${totalRevenue.toFixed(2)}`;

  // 2. Total Orders
  const totalOrders = orders.length;
  totalOrdersEl.textContent = totalOrders;

  // 3. Orders by Status
  const ordersByStatus = orders.reduce((acc, order) => {
    const status = order.shippingInfo?.status || order.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  ordersByStatusEl.innerHTML = Object.entries(ordersByStatus)
    .map(([status, count]) => `<p>${status}: ${count}</p>`)
    .join('');

  // 4. Top Selling Items
  const itemsCount = orders.reduce((acc, order) => {
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item) => {
        const itemName = item.itemName || item.name || 'Unknown';
        acc[itemName] = (acc[itemName] || 0) + item.quantity;
      });
    }
    return acc;
  }, {});
  const topSellingItems = Object.entries(itemsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Show top 5 items
  topSellingItemsEl.innerHTML = topSellingItems
    .map(([item, count]) => `<p>${item}: ${count} sold</p>`)
    .join('');

  // 5. Net Revenue
  const netRevenue = orders.reduce((sum, order) => {
    const orderTotal = order.totals?.total || 0;
    const isReturned =
      (order.shippingInfo?.status || order.status) === 'returned';
    return isReturned ? sum - orderTotal : sum + orderTotal;
  }, 0);
  netRevenueEl.textContent = `$${netRevenue.toFixed(2)}`;

  // 6. Return Rate
  const returnedOrders = orders.filter(
    (order) => (order.shippingInfo?.status || order.status) === 'returned'
  ).length;
  const returnRate = ((returnedOrders / totalOrders) * 100).toFixed(2);
  returnRateEl.textContent = `${returnRate}%`;
}

// Logout handler
const logoutBtn = document.getElementById('logout-btn');
logoutBtn.addEventListener('click', () => {
  signOut(auth)
    .then(() => (window.location.href = '../../index.html'))
    .catch((err) => console.error('Error signing out:', err));
});
