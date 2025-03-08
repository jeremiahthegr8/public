import { auth, db } from '../../../database/config.js';
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

// Utility function to format currency
function formatCurrency(amount) {
  return '$' + amount.toFixed(2);
}

// Get style (background and text color) based on status
function getStatusStyle(status) {
  switch (status.toLowerCase()) {
    case 'pending':
      return { bg: '#ffcc00', text: '#000' }; // yellow
    case 'confirmed':
      return { bg: '#007bff', text: '#fff' }; // blue
    case 'delivered':
      return { bg: '#28a745', text: '#fff' }; // green
    case 'cancelled':
      return { bg: '#ff4d4d', text: '#fff' }; // red
    case 'returned requested':
      return { bg: '#fd7e14', text: '#fff' }; // orange
    case 'returned':
      return { bg: '#6f42c1', text: '#fff' }; // purple
    default:
      return { bg: '#6c757d', text: '#fff' }; // grey fallback
  }
}

function renderOrders(orders) {
  const grid = document.querySelector('.order-history-grid');
  grid.innerHTML = ''; // Clear any existing content

  orders.forEach((order) => {
    // Convert Firestore timestamp to a local date string if available
    let placedDate = 'N/A';
    if (order.createdAt && order.createdAt.seconds) {
      placedDate = new Date(
        order.createdAt.seconds * 1000
      ).toLocaleDateString();
    }

    // Prepare a simple list of item names and quantities (adjust as needed)
    const itemsDetails =
      order.items && Array.isArray(order.items)
        ? order.items
            .map((item) => {
              const name = item.itemName || item.name || 'N/A';
              return `${name} (x${item.quantity})`;
            })
            .join(', ')
        : 'No items';

    // Get product id from the first order item (if exists)
    const productId =
      order.items && order.items.length > 0 ? order.items[0].id : '';

    // Order status (default to pending if not set)
    const orderStatus = order.status ? order.status.toLowerCase() : 'pending';
    const style = getStatusStyle(orderStatus);

    // Determine the label for the rating button and the class to apply
    const ratingLabel =
      order.rating != null && order.rating > 0 ? 'Edit Rating' : 'Rate Order';
    const ratingClass =
      ratingLabel === 'Edit Rating' ? 'btn-edit-rating' : 'btn-rate-order';

    // Create a new order item element and store product id as a data attribute.
    const orderElement = document.createElement('div');
    orderElement.classList.add('order-item');
    orderElement.setAttribute('data-status', orderStatus);
    orderElement.setAttribute('data-order-id', order.orderId || '');
    orderElement.setAttribute('data-seller-id', order.sellerId || '');
    orderElement.setAttribute(
      'data-created-at',
      order.createdAt && order.createdAt.seconds ? order.createdAt.seconds : ''
    );
    // Add the product (listing) id
    orderElement.setAttribute('data-product-id', productId);

    orderElement.innerHTML = `
      <div class="order-header">
        <h3>Order ID: ${order.orderId || 'N/A'}</h3>
        <p class="order-date">Placed on: ${placedDate}</p>
        <span class="order-status" style="background-color: ${
          style.bg
        }; color: ${
      style.text
    }; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; margin-left: 8px;">
          ${orderStatus.toUpperCase()}
        </span>
      </div>
      <div class="order-body">
        <div class="order-details">
          <p>Item: ${itemsDetails}</p>
          <p>Total: ${
            order.totals ? formatCurrency(order.totals.total) : 'N/A'
          }</p>
        </div>
        <div class="order-actions">
          ${
            orderStatus === 'pending'
              ? `<button class="btn btn-secondary cancel-order" data-order-id="${order.orderId}">
                   <i class="fas fa-times"></i> Cancel Order
                 </button>`
              : ''
          }
          ${
            orderStatus === 'delivered' || orderStatus === 'returned requested'
              ? `
                 ${
                   orderStatus === 'delivered'
                     ? `<button class="btn btn-primary request-return" data-order-id="${order.orderId}">
                          <i class="fas fa-undo"></i> Request Return
                        </button>`
                     : ''
                 }
                 <button class="btn ${ratingClass} rate-order" data-order-id="${
                  order.orderId
                }" data-product-id="${productId}">
                   <i class="fas fa-star"></i> ${ratingLabel}
                 </button>
                `
              : ''
          }
        </div>
      </div>
    `;
    grid.appendChild(orderElement);
  });

  attachOrderActions();
}



// Cancel order function: Only pending orders can be cancelled.
async function cancelOrder(orderElement) {
  const orderId = orderElement.dataset.orderId;
  const sellerId = orderElement.dataset.sellerId;
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  // Verify the order is pending
  if (orderElement.dataset.status.toLowerCase() !== 'pending') {
    alert('Only pending orders can be cancelled.');
    return;
  }

  try {
    // Update the global order document to 'cancelled'
    const globalOrderDoc = doc(db, 'orders', orderId);
    await updateDoc(globalOrderDoc, { status: 'cancelled' });

    // Update the user's order document
    const userOrderDoc = doc(db, 'users', currentUser.uid, 'orders', orderId);
    await updateDoc(userOrderDoc, { status: 'cancelled' });

    // Delete the order from the seller's orders collection
    if (sellerId) {
      const sellerOrderDoc = doc(db, 'sellers', sellerId, 'orders', orderId);
      await deleteDoc(sellerOrderDoc);
    }

    alert('Order cancelled successfully.');
    loadOrders();
  } catch (error) {
    console.error('Error cancelling order:', error);
    alert('Error cancelling order. Please try again.');
  }
}

// Request return function: Only delivered orders within 30 days can request a return.
async function requestReturn(orderElement) {
  const orderId = orderElement.dataset.orderId;
  const sellerId = orderElement.dataset.sellerId;
  const createdAtSec = parseInt(orderElement.dataset.createdAt);
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  if (orderElement.dataset.status.toLowerCase() !== 'delivered') {
    alert('Only delivered orders can request a return.');
    return;
  }

  const deliveredDate = new Date(createdAtSec * 1000);
  const today = new Date();
  const diffDays = (today - deliveredDate) / (1000 * 60 * 60 * 24);
  if (diffDays > 30) {
    alert(
      'Return request period has expired (more than 30 days since delivery).'
    );
    return;
  }

  try {
    // Update global, user, and seller orders to 'returned requested'
    const globalOrderDoc = doc(db, 'orders', orderId);
    await updateDoc(globalOrderDoc, { status: 'returned requested' });

    const userOrderDoc = doc(db, 'users', currentUser.uid, 'orders', orderId);
    await updateDoc(userOrderDoc, { status: 'returned requested' });

    if (sellerId) {
      const sellerOrderDoc = doc(db, 'sellers', sellerId, 'orders', orderId);
      await updateDoc(sellerOrderDoc, {
        status: 'returned requested',
        'shippingInfo.status': 'returned requested',
      });
    }

    alert('Return requested successfully.');
    loadOrders();
  } catch (error) {
    console.error('Error requesting return:', error);
    alert('Error requesting return. Please try again.');
  }
}

// Attach event listeners for order action buttons
// Attach event listeners for order action buttons
function attachOrderActions() {
  document.querySelectorAll('.cancel-order').forEach((button) => {
    button.addEventListener('click', () => {
      const orderElement = button.closest('.order-item');
      cancelOrder(orderElement);
    });
  });

  document.querySelectorAll('.request-return').forEach((button) => {
    button.addEventListener('click', () => {
      const orderElement = button.closest('.order-item');
      requestReturn(orderElement);
    });
  });

  document.querySelectorAll('.rate-order').forEach((button) => {
    button.addEventListener('click', () => {
      // Retrieve the product id and order id from the order element's data attributes
      const orderElement = button.closest('.order-item');
      const productId = orderElement.getAttribute('data-product-id');
      const orderId = orderElement.getAttribute('data-order-id');
      console.log(`Passing product id ${productId} and order id ${orderId} to the ratings page.`);
      // Redirect to the ratings page with both product id and order id as query parameters
window.location.href = `../rateproduct/rateproduct.html?productId=${productId}&orderId=${orderId}`;
    });
  });
}



// Attach tab filtering functionality
function attachTabFiltering() {
  const tabs = document.querySelectorAll('.order-tabs .tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs and add to the clicked tab
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      const status = tab.getAttribute('data-status');
      const orderItems = document.querySelectorAll('.order-item');

      orderItems.forEach((item) => {
        // Show all orders if "all" tab is selected; otherwise, filter by data-status attribute
        if (status === 'all' || item.getAttribute('data-status') === status) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

// Load orders for the currently authenticated user from Firestore
async function loadOrders() {
  try {
    const user = auth.currentUser;
    if (!user) {
      document.querySelector('.order-history-grid').innerHTML =
        '<p>Please sign in to view your orders.</p>';
      return;
    }

    const ordersRef = collection(db, 'users', user.uid, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    const orders = ordersSnapshot.docs.map((docSnap) => docSnap.data());
    renderOrders(orders);
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadOrders();
  } else {
    document.querySelector('.order-history-grid').innerHTML =
      '<p>Please sign in to view your orders.</p>';
  }
});

// Initialize tab filtering after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  attachTabFiltering();
});
