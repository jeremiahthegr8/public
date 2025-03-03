import { auth, db } from '../../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  doc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';
// Import Chart.js as an ES module from a CDN:
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.esm.js';

// Listen for authentication state changes
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../../index.html';
    return;
  }

  // Retrieve the user's document from the "users" collection
  const userDocRef = doc(db, 'users', user.uid);
  const userDocSnap = await getDoc(userDocRef);
  if (!userDocSnap.exists()) {
    window.location.href = '../registerseller/registerseller.html';
    return;
  }
  const userData = userDocSnap.data();

  // Check if the user is registered as a seller and has a sellerID stored
  if (!userData.sellerStatus || !userData.sellerID) {
    window.location.href = '../registerseller/registerseller.html';
    return;
  }

  // Retrieve seller details from the "sellers" collection using the stored sellerID
  const sellerDocRef = doc(db, 'sellers', userData.sellerID);
  const sellerDocSnap = await getDoc(sellerDocRef);
  if (!sellerDocSnap.exists()) {
    window.location.href = '../registerseller/registerseller.html';
    return;
  }
  const sellerData = sellerDocSnap.data();

  // Update summary stats on the page using real seller data.
  document.getElementById('totalRevenue').textContent = `$${(
    sellerData.totalRevenue || 0
  ).toFixed(2)}`;
  document.getElementById('totalSales').textContent =
    sellerData.receivedOrders || 0;
  document.getElementById('activeListings').textContent =
    sellerData.numberOfListings || 0;
  document.getElementById('avgRating').textContent = `${
    sellerData.rating || 0
  } / 5`;

  // --- Revenue Over Time Chart (Line Chart) ---
  let revenueLabels = [];
  let revenueData = [];
  if (sellerData.revenueHistory && sellerData.revenueHistory.length > 0) {
    revenueLabels = sellerData.revenueHistory.map((entry) => entry.month);
    revenueData = sellerData.revenueHistory.map((entry) => entry.amount);
  } else {
    // Fallback: simulate 6 months of data
    revenueLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const avgMonthly = (sellerData.totalRevenue || 0) / 6;
    revenueData = Array(6).fill(avgMonthly);
  }

  const revenueCtx = document.getElementById('revenueChart').getContext('2d');
  new Chart(revenueCtx, {
    type: 'line',
    data: {
      labels: revenueLabels,
      datasets: [
        {
          label: 'Revenue ($)',
          data: revenueData,
          backgroundColor: 'rgba(67, 97, 238, 0.1)',
          borderColor: 'rgba(67, 97, 238, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.3,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // --- Sales by Category Chart (Bar Chart) ---
  let categoryLabels = [];
  let categorySalesData = [];
  if (sellerData.categorySales) {
    categoryLabels = Object.keys(sellerData.categorySales);
    categorySalesData = Object.values(sellerData.categorySales);
  } else {
    // Fallback values if no sales by category data available
    categoryLabels = ['Electronics', 'Fashion', 'Home', 'Sports', 'Others'];
    categorySalesData = [0, 0, 0, 0, 0];
  }

  const salesCategoryCtx = document
    .getElementById('salesCategoryChart')
    .getContext('2d');
  new Chart(salesCategoryCtx, {
    type: 'bar',
    data: {
      labels: categoryLabels,
      datasets: [
        {
          label: 'Sales',
          data: categorySalesData,
          backgroundColor: [
            'rgba(67, 97, 238, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
          ],
          borderColor: [
            'rgba(67, 97, 238, 1)',
            'rgba(255, 99, 132, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });

  // --- Ratings Distribution Chart (Pie Chart) ---
  let ratingLabels = [];
  let ratingData = [];
  if (sellerData.ratingsDistribution) {
    ratingLabels = Object.keys(sellerData.ratingsDistribution).map(
      (star) => `${star} Stars`
    );
    ratingData = Object.values(sellerData.ratingsDistribution);
  } else {
    ratingLabels = ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'];
    const avgRating = sellerData.rating || 0;
    ratingData = [
      avgRating >= 5 ? 50 : 10,
      avgRating >= 4 ? 30 : 10,
      avgRating >= 3 ? 15 : 10,
      avgRating >= 2 ? 5 : 10,
      avgRating >= 1 ? 0 : 10,
    ];
  }

  const ratingsCtx = document.getElementById('ratingsChart').getContext('2d');
  new Chart(ratingsCtx, {
    type: 'pie',
    data: {
      labels: ratingLabels,
      datasets: [
        {
          label: 'Ratings',
          data: ratingData,
          backgroundColor: [
            'rgba(76, 175, 80, 0.7)',
            'rgba(139, 195, 74, 0.7)',
            'rgba(255, 235, 59, 0.7)',
            'rgba(255, 152, 0, 0.7)',
            'rgba(244, 67, 54, 0.7)',
          ],
          borderColor: [
            'rgba(76, 175, 80, 1)',
            'rgba(139, 195, 74, 1)',
            'rgba(255, 235, 59, 1)',
            'rgba(255, 152, 0, 1)',
            'rgba(244, 67, 54, 1)',
          ],
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
    },
  });
});

// Logout handler
document.getElementById('logout-btn').addEventListener('click', () => {
  signOut(auth)
    .then(() => {
      window.location.href = '../../index.html';
    })
    .catch((error) => {
      alert('Error signing out: ' + error.message);
    });
});
