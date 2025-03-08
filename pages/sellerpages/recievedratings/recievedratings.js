import { db, auth } from '../../../database/config.js';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

// Select DOM elements
const ratingsListEl = document.querySelector('.rating-list');
const loaderEl = document.querySelector('.loader');
const sortSelectEl = document.getElementById('sort-select');
const searchInputEl = document.getElementById('search-input');
const categoryFilterEl = document.getElementById('category-filter');
const tabButtons = document.querySelectorAll('.rating-tabs .tab');
const gridViewBtn = document.getElementById('grid-view');
const tableViewBtn = document.getElementById('table-view');

// Global state
let allRatings = []; // Array to hold { ratingData, orderDetails } objects
let currentView = 'grid'; // 'grid' or 'table'

// Loader helper functions
function showLoader(message = 'Loading ratings…') {
  if (loaderEl) {
    loaderEl.innerHTML = `<div class="loader-message">${message}</div>`;
  }
}

function clearLoader() {
  if (loaderEl) {
    loaderEl.innerHTML = '';
  }
}

// Helper: render stars (active stars in gold)
function renderStars(rating) {
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    starsHtml += `<span class="${
      i <= rating ? 'star active' : 'star'
    }">★</span>`;
  }
  return starsHtml;
}

// Helper: format Firestore timestamps into a human-readable string.
function formatDate(timestamp) {
  if (!timestamp || !timestamp.seconds) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString();
}

// Function: render rating card for grid view (includes quantity)
function renderRatingItem(ratingData, orderDetails) {
  const card = document.createElement('div');
  card.classList.add('rating-card');

  // Get product details (with fallbacks)
  const productName = orderDetails.name || 'Item Name Not Available';
  const productImage = orderDetails.mainImageUrl || 'default-placeholder.png';
  const productCategory = orderDetails.category || 'Category Not Available';
  // New: Display quantity from order details (assumes orderDetails.quantity exists)
  const quantity =
    orderDetails.quantity !== undefined ? orderDetails.quantity : 'N/A';

  const reviewText = ratingData.review
    ? ratingData.review
    : 'No review provided.';
  const issueText = ratingData.issue
    ? `<p class="rating-issue"><strong>Issue:</strong> ${ratingData.issue}</p>`
    : '';

  card.innerHTML = `
    <div class="rating-card-header">
      <img src="${productImage}" alt="${productName}" class="product-image">
      <div class="product-info">
        <h3 class="product-name">${productName}</h3>
        <p class="product-category">Category: ${productCategory}</p>
        <p class="quantity">Quantity: ${quantity}</p>
        <p class="order-id">Order ID: ${ratingData.orderId}</p>
      </div>
    </div>
    <div class="rating-card-body">
      <div class="rating-stars">${renderStars(ratingData.rating)}</div>
      <p class="rating-review">${reviewText}</p>
      ${issueText}
    </div>
    <div class="rating-card-footer">
      <span class="created-at">Rated on: ${formatDate(
        ratingData.createdAt
      )}</span>
    </div>
  `;
  return card;
}

// Function: render ratings in grid view
function renderRatingsGrid(ratingsArray) {
  ratingsListEl.innerHTML = '';
  if (ratingsArray.length === 0) {
    ratingsListEl.innerHTML =
      '<div class="no-rating"><i class="fas fa-comments"></i><p>No rating found.</p></div>';
    return;
  }
  ratingsArray.forEach(({ ratingData, orderDetails }) => {
    const ratingCard = renderRatingItem(ratingData, orderDetails);
    ratingsListEl.appendChild(ratingCard);
  });
}

// Function: render ratings in table view (exclude review and order id)
function renderRatingsTable(ratingsArray) {
  ratingsListEl.innerHTML = '';
  if (ratingsArray.length === 0) {
    ratingsListEl.innerHTML =
      '<div class="no-rating"><i class="fas fa-comments"></i><p>No rating found.</p></div>';
    return;
  }
  const table = document.createElement('table');
  table.classList.add('ratings-table');
  table.innerHTML = `
    <thead>
      <tr>
        <th>Product</th>
        <th>Category</th>
        <th>Rating</th>
        <th>Date</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  ratingsArray.forEach(({ ratingData, orderDetails }) => {
    const tr = document.createElement('tr');
    const productName = orderDetails.name || 'N/A';
    const category = orderDetails.category || 'N/A';
    const rating = ratingData.rating || 'N/A';
    const date = formatDate(ratingData.createdAt);
    tr.innerHTML = `
      <td>${productName}</td>
      <td>${category}</td>
      <td>${renderStars(rating)} (${rating})</td>
      <td>${date}</td>
    `;
    tbody.appendChild(tr);
  });
  ratingsListEl.appendChild(table);
}

// Function: apply filters and sorting based on active tab, search, category, etc.
function applyFiltersAndSort() {
  let filtered = [...allRatings];

  // Filter by active tab.
  // If active tab is "complaints", only show ratings with an issue.
  // If active tab is a number (as a string), filter for that star rating.
  // If active tab is "all", do not filter.
  const activeTab = document.querySelector('.rating-tabs .tab.active').dataset
    .type;
  if (activeTab === 'complaints') {
    filtered = filtered.filter(({ ratingData }) => ratingData.issue);
  } else if (activeTab !== 'all') {
    const starValue = parseInt(activeTab);
    filtered = filtered.filter(
      ({ ratingData }) => ratingData.rating === starValue
    );
  }

  // Filter by search query (checks product name, order id, category)
  const searchQuery = searchInputEl.value.trim().toLowerCase();
  if (searchQuery) {
    filtered = filtered.filter(({ ratingData, orderDetails }) => {
      const prodName = orderDetails.name ? orderDetails.name.toLowerCase() : '';
      const ordId = ratingData.orderId ? ratingData.orderId.toLowerCase() : '';
      const cat = orderDetails.category
        ? orderDetails.category.toLowerCase()
        : '';
      return (
        prodName.includes(searchQuery) ||
        ordId.includes(searchQuery) ||
        cat.includes(searchQuery)
      );
    });
  }

  // Filter by category
  const categoryVal = categoryFilterEl.value;
  if (categoryVal !== 'all') {
    filtered = filtered.filter(({ orderDetails }) => {
      return (
        orderDetails.category &&
        orderDetails.category.toLowerCase() === categoryVal.toLowerCase()
      );
    });
  }

  // Sorting
  const sortBy = sortSelectEl.value;
  filtered.sort((a, b) => {
    if (sortBy === 'recent') {
      return b.ratingData.createdAt.seconds - a.ratingData.createdAt.seconds;
    } else if (sortBy === 'oldest') {
      return a.ratingData.createdAt.seconds - b.ratingData.createdAt.seconds;
    } else if (sortBy === 'highest') {
      return b.ratingData.rating - a.ratingData.rating;
    } else if (sortBy === 'lowest') {
      return a.ratingData.rating - b.ratingData.rating;
    }
    return 0;
  });

  // Render based on view mode.
  if (currentView === 'grid') {
    renderRatingsGrid(filtered);
  } else {
    renderRatingsTable(filtered);
  }
}

// Function: load seller ratings from Firestore
async function loadSellerRatings(sellerId) {
  try {
    console.log('Loading ratings for sellerId:', sellerId);
    showLoader('Loading ratings…');
    const ratingsRef = collection(db, 'ratings');
    const ratingsQuery = query(
      ratingsRef,
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(ratingsQuery);
    clearLoader();
    if (querySnapshot.empty) {
      ratingsListEl.innerHTML =
        '<div class="no-rating"><i class="fas fa-comments"></i><p>No rating found.</p></div>';
      return;
    }
    allRatings = [];
    for (const docSnap of querySnapshot.docs) {
      const ratingData = docSnap.data();
      let orderDetails = {};
      try {
        const orderDocRef = doc(db, 'orders', ratingData.orderId);
        const orderSnap = await getDoc(orderDocRef);
        if (orderSnap.exists()) {
          const orderData = orderSnap.data();
          if (orderData.items && orderData.items.length > 0) {
            orderDetails = orderData.items[0];
          } else {
            console.warn(
              'No items found in order for orderId:',
              ratingData.orderId
            );
          }
        } else {
          console.warn('No order found for orderId:', ratingData.orderId);
        }
      } catch (err) {
        console.error(
          'Error fetching order details for orderId:',
          ratingData.orderId,
          err
        );
      }
      allRatings.push({ ratingData, orderDetails });
    }
    applyFiltersAndSort();
  } catch (error) {
    console.error('Error loading seller ratings:', error);
    clearLoader();
    ratingsListEl.innerHTML =
      '<p>Error loading ratings. Please try again later.</p>';
  }
}

// Event listeners for filtering and sorting
sortSelectEl.addEventListener('change', applyFiltersAndSort);
searchInputEl.addEventListener('input', applyFiltersAndSort);
categoryFilterEl.addEventListener('change', applyFiltersAndSort);

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    applyFiltersAndSort();
  });
});

gridViewBtn.addEventListener('click', () => {
  currentView = 'grid';
  gridViewBtn.classList.add('active');
  tableViewBtn.classList.remove('active');
  applyFiltersAndSort();
});

tableViewBtn.addEventListener('click', () => {
  currentView = 'table';
  tableViewBtn.classList.add('active');
  gridViewBtn.classList.remove('active');
  applyFiltersAndSort();
});

// Authenticate the user and load ratings based on sellerID.
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const sellerId = userData.sellerID;
        if (!sellerId) {
          ratingsListEl.innerHTML =
            '<p>Your profile is missing a seller id. Please update your profile.</p>';
        } else {
          loadSellerRatings(sellerId);
        }
      } else {
        ratingsListEl.innerHTML = '<p>User profile not found.</p>';
      }
    } catch (error) {
      ratingsListEl.innerHTML = '<p>Error retrieving your profile details.</p>';
    }
  } else {
    window.location.href = '../Login/Login.html';
  }
});
