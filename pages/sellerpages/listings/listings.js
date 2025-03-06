import { auth, db } from '../../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// DOM Elements
const listingsContainer = document.getElementById('listingsContainer');
const searchInput = document.getElementById('searchInput');
const tabButtons = document.querySelectorAll('.filter-tabs .tab');
const sortSelect = document.getElementById('sort-select');
const totalProductsEl = document.getElementById('totalProducts');
const totalSalesEl = document.getElementById('totalSales');
const conversionRateEl = document.getElementById('conversionRate');
const avgRatingEl = document.getElementById('avgRating');
const logoutBtn = document.getElementById('logout-btn');

// Analytics Elements
const topProductCard = document.getElementById('topProductCard');
const topProductNameEl = document.getElementById('topProductName');
const topProductSoldEl = document.getElementById('topProductSold');

// const salesChartCtx = document.getElementById('salesChart').getContext('2d');
// const timePeriodSelect = document.getElementById('timePeriodSelect');
// const salesComparisonEl = document.getElementById('salesComparison');
// const returnsComparisonEl = document.getElementById('returnsComparison');

const listingsDataContainer = document.getElementById('listingsContainer');
const paginationControls = document.getElementById('paginationControls');
const pageNumbersEl = document.getElementById('pageNumbers');

let allListings = [];
let currentPage = 1;
const itemsPerPage = 10;

// Update Analytics Section based on real listings data
function updateAnalytics() {
  totalProductsEl.textContent = allListings.length;

  let totalSold = 0,
    totalRevenue = 0,
    totalRating = 0,
    ratingCount = 0;
  allListings.forEach((listing) => {
    totalSold += listing.sold || 0;
    totalRevenue += (listing.price || 0) * (listing.sold || 0);
    if (listing.rating) {
      totalRating += listing.rating;
      ratingCount++;
    }
  });
  totalSalesEl.textContent = `$${totalRevenue.toFixed(2)}`;
  conversionRateEl.textContent = allListings.length
    ? ((totalSold / allListings.length) * 100).toFixed(1) + '%'
    : '0%';
  avgRatingEl.textContent =
    ratingCount > 0 ? `${(totalRating / ratingCount).toFixed(1)} / 5` : '0 / 5';

  // Determine the top selling product
  const topProduct = allListings.reduce((prev, curr) => {
    return (curr.sold || 0) > (prev.sold || 0) ? curr : prev;
  }, {});
  if (topProduct && topProduct.itemName) {
    topProductNameEl.textContent = topProduct.itemName;
    topProductSoldEl.textContent = `Sold: ${topProduct.sold || 0}`;
    if (topProduct.imageURL) {
      topProductCard.querySelector('img').src = topProduct.imageURL;
    }
  } else {
    topProductNameEl.textContent = 'No Data';
    topProductSoldEl.textContent = 'Sold: 0';
  }
}

// Render listings table with pagination & filtering
function renderListingsTable() {
  if (filteredListings.length === 0) {
    listingsDataContainer.innerHTML = `
      <div class="no-listings">
        <i class="fas fa-box-open"></i>
        <p>No listings found.</p>
      </div>`;
    renderPagination(0);
    return;
  }
  const totalPages = Math.ceil(filteredListings.length / itemsPerPage);
  currentPage = Math.min(currentPage, totalPages);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentListings = filteredListings.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Product</th>
      <th>Price</th>
      <th>Sold</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  `;
  const tbody = document.createElement('tbody');

  currentListings.forEach((listing) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="product-info">
        <div class="product-image">
          <img src="${
            listing.imageURL || '../../assets/images/default-product.png'
          }" alt="${listing.itemName}" />
        </div>
        <div class="product-name">${listing.itemName}</div>
      </td>
      <td>$${listing.price ? listing.price.toFixed(2) : '0.00'}</td>
      <td>${listing.sold || 0}</td>
      <td><span class="stock-status">${listing.status || 'Active'}</span></td>
      <td class="action-cell">
        <button class="action-btn" title="Edit"><i class="fas fa-edit"></i></button>
        <button class="action-btn" title="Delete"><i class="fas fa-trash-alt"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(thead);
  table.appendChild(tbody);
  listingsDataContainer.innerHTML = '';
  listingsDataContainer.appendChild(table);
  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  pageNumbersEl.innerHTML = '';
  if (totalPages <= 1) return;
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.classList.add('page-btn');
    if (i === currentPage) btn.classList.add('active');
    btn.textContent = i;
    btn.addEventListener('click', () => {
      currentPage = i;
      renderListingsTable();
    });
    pageNumbersEl.appendChild(btn);
  }
}

// Filtering & Sorting
let filteredListings = [];
function filterAndRenderListings() {
  let filtered = [...allListings];
  const searchTerm = searchInput.value.trim().toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter((listing) =>
      listing.itemName.toLowerCase().includes(searchTerm)
    );
  }
  // (Optional) Apply tab filter if you add filters (e.g., active/inactive)
  // Apply sort filter
  const sortOption = sortSelect.value;
  if (sortOption === 'mostSold') {
    filtered.sort((a, b) => (b.sold || 0) - (a.sold || 0));
  } else if (sortOption === 'leastSold') {
    filtered.sort((a, b) => (a.sold || 0) - (b.sold || 0));
  } else if (sortOption === 'priceLowHigh') {
    filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
  } else if (sortOption === 'priceHighLow') {
    filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
  }
  filteredListings = filtered;
  renderListingsTable();
}

// Attach search and sort listeners
searchInput.addEventListener('input', () => {
  currentPage = 1;
  filterAndRenderListings();
});
sortSelect.addEventListener('change', () => {
  currentPage = 1;
  filterAndRenderListings();
});

// Real Listings Fetch: Listen for seller listings in Firestore
function fetchListingsForSeller(sellerId) {
  const listingsRef = collection(db, 'sellers', sellerId, 'listings');
  // Order by a timestamp field if you have one; otherwise, use a default order.
  const q = query(listingsRef, orderBy('createdAt', 'desc'));
  onSnapshot(q, (snapshot) => {
    allListings = [];
    snapshot.forEach((doc) => {
      allListings.push({ id: doc.id, ...doc.data() });
    });
    updateAnalytics();
    filterAndRenderListings();
  });
}

// Authentication check and load listings from Firestore
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '../../index.html';
  } else {
    // Assuming the seller's UID is used as the seller ID in Firestore.
    fetchListingsForSeller(auth.currentUser.uid);
  }
});

// // Initialize sales chart with default period
// let salesChart;
// function initSalesChart(timePeriod) {
//   let labels = [],
//     salesData = [],
//     returnsData = [],
//     salesComp = 0,
//     returnsComp = 0;
//   if (timePeriod === 'lastWeek') {
//     labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
//     salesData = [200, 180, 220, 210, 190, 230, 250];
//     returnsData = [10, 12, 8, 15, 9, 11, 10];
//     salesComp = 5;
//     returnsComp = -2;
//   } else if (timePeriod === 'lastMonth') {
//     labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
//     salesData = [800, 950, 900, 1000];
//     returnsData = [35, 40, 38, 42];
//     salesComp = 8;
//     returnsComp = 3;
//   } else if (timePeriod === 'last3Months') {
//     labels = ['Month 1', 'Month 2', 'Month 3'];
//     salesData = [3000, 3200, 3100];
//     returnsData = [120, 130, 125];
//     salesComp = -4;
//     returnsComp = 2;
//   } else if (timePeriod === 'thisYear') {
//     labels = ['Q1', 'Q2', 'Q3', 'Q4'];
//     salesData = [7000, 7500, 7800, 8000];
//     returnsData = [280, 300, 290, 310];
//     salesComp = 10;
//     returnsComp = -5;
//   }

//   salesComparisonEl.textContent =
//     salesComp >= 0 ? `+${salesComp}%` : `${salesComp}%`;
//   returnsComparisonEl.textContent =
//     returnsComp >= 0 ? `+${returnsComp}%` : `${returnsComp}%`;

//   if (salesChart) {
//     salesChart.data.labels = labels;
//     salesChart.data.datasets[0].data = salesData;
//     salesChart.data.datasets[1].data = returnsData;
//     salesChart.update();
//   } else {
//     salesChart = new Chart(salesChartCtx, {
//       type: 'line',
//       data: {
//         labels: labels,
//         datasets: [
//           {
//             label: 'Sales',
//             data: salesData,
//             backgroundColor: 'rgba(67, 97, 238, 0.1)',
//             borderColor: 'rgba(67, 97, 238, 1)',
//             borderWidth: 2,
//             fill: true,
//             tension: 0.3,
//           },
//           {
//             label: 'Returns',
//             data: returnsData,
//             backgroundColor: 'rgba(220, 53, 69, 0.1)',
//             borderColor: 'rgba(220, 53, 69, 1)',
//             borderWidth: 2,
//             fill: true,
//             tension: 0.3,
//           },
//         ],
//       },
//       options: {
//         responsive: true,
//         maintainAspectRatio: false, // <-- add this line
//         plugins: { legend: { display: true } },
//         scales: { y: { beginAtZero: true } },
//       },
//     });

//   }
// }

// initSalesChart(timePeriodSelect.value);
// timePeriodSelect.addEventListener('change', () => {
//   initSalesChart(timePeriodSelect.value);
// });

// Logout handler
logoutBtn.addEventListener('click', () => {
  signOut(auth)
    .then(() => (window.location.href = '../../index.html'))
    .catch((err) => console.error('Error signing out:', err));
});
