// Sample Data
const products = [
  {
    id: 1,
    name: 'Product 1',
    category: 'Electronics',
    price: 99.99,
    stock: 50,
    status: 'Active',
    image: 'https://via.placeholder.com/150',
  },
  {
    id: 2,
    name: 'Product 2',
    category: 'Fashion',
    price: 49.99,
    stock: 0,
    status: 'Out of Stock',
    image: 'https://via.placeholder.com/150',
  },
];

// Render Product Listings
function renderProducts() {
  const container = document.getElementById('productListings');
  container.innerHTML = products
    .map(
      (product) => `
      <div class="col">
        <div class="card h-100">
          <img src="${product.image}" class="card-img-top" alt="${
        product.name
      }">
          <div class="card-body">
            <h5 class="card-title">${product.name}</h5>
            <p class="card-text"><strong>Category:</strong> ${
              product.category
            }</p>
            <p class="card-text"><strong>Price:</strong> $${product.price}</p>
            <p class="card-text"><strong>Stock:</strong> ${product.stock}</p>
            <p class="card-text"><strong>Status:</strong> <span class="badge ${
              product.status === 'Active' ? 'bg-success' : 'bg-danger'
            }">${product.status}</span></p>
            <div class="d-grid gap-2">
              <button class="btn btn-warning btn-sm">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="showConfirmationModal('delete', ${
                product.id
              })">Delete</button>
              <button class="btn btn-secondary btn-sm" onclick="showConfirmationModal('toggle', ${
                product.id
              })">Toggle Visibility</button>
              <button class="btn btn-info btn-sm" onclick="showSalesSummary(${
                product.id
              })">Sales Summary</button>
            </div>
          </div>
        </div>
      </div>
    `
    )
    .join('');
}

// Show Sales Summary Page
function showSalesSummary(productId) {
  document.querySelector('main').classList.add('d-none');
  document.getElementById('salesSummaryPage').classList.remove('d-none');
  // Fetch and display sales data for the product (mock data for now)
}

// Go Back to Listings
function goBackToListings() {
  document.getElementById('salesSummaryPage').classList.add('d-none');
  document.querySelector('main').classList.remove('d-none');
}

// Show Confirmation Modal
function showConfirmationModal(action, productId) {
  const modal = new bootstrap.Modal(
    document.getElementById('confirmationModal')
  );
  const modalMessage = document.getElementById('modalMessage');
  const confirmButton = document.getElementById('confirmAction');

  if (action === 'delete') {
    modalMessage.textContent =
      'Are you sure you want to delete this product? This action cannot be undone.';
    confirmButton.className = 'btn btn-danger';
    confirmButton.textContent = 'Delete Product';
  } else if (action === 'toggle') {
    modalMessage.textContent =
      'Are you sure you want to toggle the visibility of this product?';
    confirmButton.className = 'btn btn-secondary';
    confirmButton.textContent = 'Toggle Visibility';
  }

  confirmButton.onclick = () => {
    // Perform action (e.g., delete or toggle visibility)
    modal.hide();
  };

  modal.show();
}

// Initialize Chart.js
const ctx = document.getElementById('salesChart').getContext('2d');
const salesChart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Sales',
        data: [12, 19, 3, 5, 2, 3],
        borderColor: 'var(--primary-color)',
        borderWidth: 2,
        fill: false,
      },
    ],
  },
  options: {
    responsive: true,
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  },
});

// Initial Render
renderProducts();
