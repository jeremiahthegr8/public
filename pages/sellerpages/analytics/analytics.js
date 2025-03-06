    import { auth, db } from '../../../database/config.js';
    import {
      onAuthStateChanged,
      signOut,
    } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
    import {
      collection,
      query,
      where,
      onSnapshot,
      doc,
      getDoc,
      getDocs,
      Timestamp,
    } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

    // Global variables
    let currentSellerId = null;
    let allOrders = [];
    let startDate = null;
    let endDate = null;

    // DOM Elements
    const totalOrdersEl = document.getElementById('total-orders');
    const totalRevenueEl = document.getElementById('total-revenue');
    const itemsSoldEl = document.getElementById('items-sold');
    const uniqueCustomersEl = document.getElementById('unique-customers');
    const recentOrdersEl = document.getElementById('recent-orders');
    const statusFilterEl = document.getElementById('status-filter');
    const sortByEl = document.getElementById('sort-by');
    const startDateEl = document.getElementById('start-date');
    const endDateEl = document.getElementById('end-date');
    const applyDateFilterBtn = document.getElementById('apply-date-filter');
    const logoutBtn = document.getElementById('logout-btn');

    // Charts
    let revenueChart, statusChart, productsChart, weekdayChart;

    // Check authentication
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        window.location.href = '../../index.html';
      } else {
        // Get the user's document
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          currentSellerId = userData.sellerID;
          if (!currentSellerId) {
            console.error("Seller ID not found in user's document.");
            return;
          }
          
          // Set default date range (last 30 days)
          const today = new Date();
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(today.getDate() - 30);
          
          startDateEl.valueAsDate = thirtyDaysAgo;
          endDateEl.valueAsDate = today;
          
          startDate = thirtyDaysAgo;
          endDate = today;
          
          loadOrders();
          setupEventListeners();
          initCharts();
        } else {
          console.error('User document does not exist.');
        }
      }
    });

    // Initialize charts
    function initCharts() {
      // Revenue Over Time Chart
      const revCtx = document.getElementById('revenue-chart').getContext('2d');
      revenueChart = new Chart(revCtx, {
        type: 'line',
        data: {
          labels: [],
          datasets: [{
            label: 'Daily Revenue',
            data: [],
            borderColor: '#4A6FFF',
            backgroundColor: 'rgba(74, 111, 255, 0.1)',
            fill: true,
            tension: 0.4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return '$' + value;
                }
              }
            }
          }
        }
      });
      
      // Order Status Distribution Chart
      const statusCtx = document.getElementById('status-chart').getContext('2d');
      statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: ['Pending', 'Confirmed', 'Delivered', 'Returned'],
          datasets: [{
            data: [0, 0, 0, 0],
            backgroundColor: [
              '#FFC107',
              '#4A6FFF',
              '#4CAF50',
              '#F44336'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right'
            }
          }
        }
      });
      
      // Top Products Chart
      const productsCtx = document.getElementById('products-chart').getContext('2d');
      productsChart = new Chart(productsCtx, {
        type: 'bar',
        data: {
          labels: [],
          datasets: [{
            label: 'Units Sold',
            data: [],
            backgroundColor: 'rgba(74, 111, 255, 0.7)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
      
      // Orders by Day of Week Chart
      const weekdayCtx = document.getElementById('weekday-chart').getContext('2d');
      weekdayChart = new Chart(weekdayCtx, {
        type: 'bar',
        data: {
          labels: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
          datasets: [{
            label: 'Number of Orders',
            data: [0, 0, 0, 0, 0, 0, 0],
            backgroundColor: 'rgba(74, 111, 255, 0.7)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    // Load orders from the seller's orders subcollection
    function loadOrders() {
      const sellerOrdersRef = collection(db, 'sellers', currentSellerId, 'orders');
      
      onSnapshot(sellerOrdersRef, (snapshot) => {
        allOrders = [];
        
        snapshot.forEach((docSnap) => {
          const order = docSnap.data();
          order.id = docSnap.id;
          
          // Convert Firestore timestamp to JavaScript Date if it exists
          if (order.createdAt instanceof Timestamp) {
            order.orderDate = order.createdAt.toDate();
          } else if (order.date instanceof Timestamp) {
            order.orderDate = order.date.toDate();
          } else {
            // If no date exists, use current date as fallback
            order.orderDate = new Date();
          }
          
          allOrders.push(order);
        });
        
        // Apply date filters
        filterAndDisplayOrders();
      });
    }

    // Filter orders and update all displays
    function filterAndDisplayOrders() {
      // Filter orders by date range
      const filteredByDate = allOrders.filter(order => {
        return (!startDate || order.orderDate >= startDate) && 
               (!endDate || order.orderDate <= endDate);
      });
      
      // Filter by status if needed
      const statusFilter = statusFilterEl.value;
      const filteredOrders = statusFilter === 'all' 
        ? filteredByDate 
        : filteredByDate.filter(order => {
            const orderStatus = (order.shippingInfo?.status || order.status || '').toLowerCase();
            return orderStatus === statusFilter;
          });
      
      // Sort orders
      const sortBy = sortByEl.value;
      const sortedOrders = [...filteredOrders].sort((a, b) => {
        switch (sortBy) {
          case 'date-desc':
            return b.orderDate - a.orderDate;
          case 'date-asc':
            return a.orderDate - b.orderDate;
          case 'amount-desc':
            return (b.totals?.total || 0) - (a.totals?.total || 0);
          case 'amount-asc':
            return (a.totals?.total || 0) - (b.totals?.total || 0);
          default:
            return b.orderDate - a.orderDate;
        }
      });
      
      // Update summary metrics
      updateSummaryMetrics(filteredByDate);
      
      // Update charts
      updateCharts(filteredByDate);
      
      // Display recent orders (top 10)
      displayRecentOrders(sortedOrders.slice(0, 10));
    }

    // Update summary metrics
    function updateSummaryMetrics(orders) {
      // Total orders
      totalOrdersEl.textContent = orders.length;
      
      // Total revenue
      const totalRevenue = orders.reduce((sum, order) => {
        return sum + (order.totals?.total || 0);
      }, 0);
      totalRevenueEl.textContent = '$' + totalRevenue.toFixed(2);
      
      // Items sold
      const itemsSold = orders.reduce((sum, order) => {
        if (!order.items) return sum;
        return sum + order.items.reduce((itemSum, item) => {
          return itemSum + (item.quantity || 1);
        }, 0);
      }, 0);
      itemsSoldEl.textContent = itemsSold;
      
      // Unique customers
      const customerIds = new Set(orders.map(order => order.userId));
      uniqueCustomersEl.textContent = customerIds.size;
    }

    // Update all charts with filtered data
    function updateCharts(orders) {
      updateRevenueChart(orders);
      updateStatusChart(orders);
      updateProductsChart(orders);
      updateWeekdayChart(orders);
    }

    // Update revenue over time chart
    function updateRevenueChart(orders) {
      // Group orders by date and calculate daily revenue
      const dailyRevenue = {};
      
      // Initialize all dates in range
      if (startDate && endDate) {
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dateString = currentDate.toISOString().split('T')[0];
          dailyRevenue[dateString] = 0;
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
      
      // Add revenue from orders
      orders.forEach(order => {
        const dateString = order.orderDate.toISOString().split('T')[0];
        if (!dailyRevenue[dateString]) {
          dailyRevenue[dateString] = 0;
        }
        dailyRevenue[dateString] += (order.totals?.total || 0);
      });
      
      // Sort dates chronologically
      const sortedDates = Object.keys(dailyRevenue).sort();
      
      // Update chart
      revenueChart.data.labels = sortedDates.map(date => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      });
      revenueChart.data.datasets[0].data = sortedDates.map(date => dailyRevenue[date]);
      revenueChart.update();
    }

    // Update status distribution chart
    function updateStatusChart(orders) {
      // Count orders by status
      const statusCounts = {
        pending: 0,
        confirmed: 0,
        delivered: 0,
        returned: 0
      };
      
      orders.forEach(order => {
        const orderStatus = (order.shippingInfo?.status || order.status || '').toLowerCase();
        if (statusCounts.hasOwnProperty(orderStatus)) {
          statusCounts[orderStatus]++;
        } else if (orderStatus === 'returned requested') {
          statusCounts.returned++;
        }
      });
      
      // Update chart
      statusChart.data.datasets[0].data = [
        statusCounts.pending,
        statusCounts.confirmed,
        statusCounts.delivered,
        statusCounts.returned
      ];
      statusChart.update();
    }

    // Update top products chart
    function updateProductsChart(orders) {
      // Count items sold
      const productCounts = {};
      
      orders.forEach(order => {
        if (!order.items) return;
        
        order.items.forEach(item => {
          const productName = item.itemName || item.name || 'N/A';
          if (!productCounts[productName]) {
            productCounts[productName] = 0;
          }
          productCounts[productName] += (item.quantity || 1);
        });
      });
      
      // Sort products by quantity
      const sortedProducts = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5 products
      
      // Update chart
      productsChart.data.labels = sortedProducts.map(([name]) => name);
      productsChart.data.datasets[0].data = sortedProducts.map(([, count]) => count);
      productsChart.update();
    }

    // Update orders by day of week chart
    function updateWeekdayChart(orders) {
      // Count orders by day of week
      const weekdayCounts = [0, 0, 0, 0, 0, 0, 0]; // Sun, Mon, ..., Sat
      
      orders.forEach(order => {
        const dayOfWeek = order.orderDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        weekdayCounts[dayOfWeek]++;
      });
      
      // Update chart
      weekdayChart.data.datasets[0].data = weekdayCounts;
      weekdayChart.update();
    }

    // Display recent orders
    async function displayRecentOrders(orders) {
      recentOrdersEl.innerHTML = '';
      
      if (orders.length === 0) {
        recentOrdersEl.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; padding: 20px;">
              No orders found.
            </td>
          </tr>
        `;
        return;
      }
      
      // Get buyer names for all orders
      const buyerPromises = orders.map(order => getBuyerName(order.userId));
      const buyerNames = await Promise.all(buyerPromises);
      
      orders.forEach((order, index) => {
        const row = document.createElement('tr');
        
        const orderStatus = (order.shippingInfo?.status || order.status || '').toLowerCase();
        const formattedDate = order.orderDate.toLocaleDateString();
        
        // Format items string
        const itemsStr = order.items
          ? order.items
              .map(item => {
                const name = item.itemName || item.name || 'N/A';
                return `${name} (x${item.quantity})`;
              })
              .join(', ')
          : 'N/A';
        
        row.innerHTML = `
          <td>${order.id}</td>
          <td>${formattedDate}</td>
          <td>${buyerNames[index]}</td>
          <td>${itemsStr}</td>
          <td>$${order.totals && order.totals.total ? order.totals.total.toFixed(2) : '0.00'}</td>
          <td><span class="status ${orderStatus}">${orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}</span></td>
        `;
        
        recentOrdersEl.appendChild(row);
      });
    }

    // Helper: Get buyer's full name
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

    // Setup event listeners
    function setupEventListeners() {
      // Status filter change
      statusFilterEl.addEventListener('change', filterAndDisplayOrders);
      
      // Sort by change
      sortByEl.addEventListener('change', filterAndDisplayOrders);
      
      // Date filter apply button
      applyDateFilterBtn.addEventListener('click', () => {
        startDate = startDateEl.valueAsDate;
        endDate = endDateEl.valueAsDate;
        
        // Add one day to end date to include that day fully
        if (endDate) {
          endDate = new Date(endDate);
          endDate.setDate(endDate.getDate() + 1);
        }
        
        filterAndDisplayOrders();
      });
      
      // Logout button
      logoutBtn.addEventListener('click', () => {
        signOut(auth)
          .then(() => (window.location.href = '../../index.html'))
          .catch((err) => console.error('Error signing out:', err));
      });
    }