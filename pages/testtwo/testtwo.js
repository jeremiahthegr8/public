// DOM Elements
const sidebar = document.querySelector('.sidebar');
const productGrid = document.querySelector('.product-grid');
const searchInput = document.getElementById('search-input');
const cartCount = document.querySelector('.header-actions .cart .count');
const wishlistCount = document.querySelector('.header-actions .wishlist .count');
const quickViewModal = document.getElementById('quick-view-modal');
const closeQuickView = document.getElementById('close-quick-view');

// Sample Product Data (Replace with real data from backend)
const products = [
  {
    id: 1,
    name: 'Product 1',
    category: "Women's Fashion",
    brand: "Brand A",
    price: 100,
    discount: 20,
    rating: 4.5,
    image: '/api/placeholder/300/400',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    tags: ['Fashion', 'New Arrival'],
  },
  {
    id: 2,
    name: 'Product 2',
    category: "Men's Fashion",
    brand: "Brand B",
    price: 80,
    discount: 10,
    rating: 3.8,
    image: '/api/placeholder/300/400',
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    tags: ['Fashion', 'Sale'],
  },
  // Add more products as needed
];

// Cart and Wishlist Data
let cart = [];
let wishlist = [];

// Render Products
function renderProducts(filteredProducts) {
  productGrid.innerHTML = filteredProducts
    .map(
      (product) => `
      <div class="product-card" data-id="${product.id}">
        <div class="product-image">
          <img src="${product.image}" alt="${product.name}">
          ${product.discount ? `<div class="product-badge">-${product.discount}%</div>` : ''}
          <div class="product-actions">
            <button class="btn-wishlist"><i class="fas fa-heart"></i></button>
            <button class="btn-quick-view"><i class="fas fa-eye"></i></button>
          </div>
        </div>
        <div class="product-details">
          <h3 class="product-title">${product.name}</h3>
          <div class="product-rating">
            ${Array(Math.floor(product.rating))
              .fill('<i class="fas fa-star"></i>')
              .join('')}
            ${product.rating % 1 !== 0 ? '<i class="fas fa-star-half-alt"></i>' : ''}
            <span>(${product.rating})</span>
          </div>
          <p class="product-description">${product.description}</p>
          <div class="product-tags">
            ${product.tags.map((tag) => `<span>${tag}</span>`).join('')}
          </div>
          <div class="product-price">
            <span class="original-price">$${product.price.toFixed(2)}</span>
            ${product.discount
              ? `<span class="discounted-price">$${(product.price * (1 - product.discount / 100)).toFixed(2)}</span>`
              : ''}
          </div>
          <button class="btn-add-to-cart">Add to Cart</button>
        </div>
      </div>
    `
    )
    .join('');
}

// Filter Products
function filterProducts() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedCategory = document.querySelector('.filter-list li.active')?.textContent;
  const selectedBrand = document.querySelector('.filter-list li.active')?.textContent;
  const selectedRating = document.querySelector('.filter-list li.active')?.textContent;
  const priceRange = document.querySelector('.price-range').value;

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm);
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesBrand = !selectedBrand || product.brand === selectedBrand;
    const matchesRating = !selectedRating || product.rating >= parseFloat(selectedRating);
    const matchesPrice = product.price <= priceRange;

    return matchesSearch && matchesCategory && matchesBrand && matchesRating && matchesPrice;
  });

  renderProducts(filteredProducts);
}

// Add to Cart
function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  if (product) {
    cart.push(product);
    cartCount.textContent = cart.length;
    showNotification('Product added to cart!');
  }
}

// Add to Wishlist
function addToWishlist(productId) {
  const product = products.find((p) => p.id === productId);
  if (product) {
    wishlist.push(product);
    wishlistCount.textContent = wishlist.length;
    showNotification('Product added to wishlist!');
  }
}

// Show Notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.innerHTML = `
    <div class="notification-content">
      <i class="fas fa-check-circle"></i>
      <p>${message}</p>
    </div>
  `;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

// Quick View Modal
function openQuickView(productId) {
  const product = products.find((p) => p.id === productId);
  if (product) {
    quickViewModal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-header">
          <h3 class="modal-title">${product.name}</h3>
          <button class="close-modal" id="close-quick-view">&times;</button>
        </div>
        <div class="modal-body">
          <img src="${product.image}" alt="${product.name}">
          <p>${product.description}</p>
          <div class="product-price">
            <span class="original-price">$${product.price.toFixed(2)}</span>
            ${product.discount
              ? `<span class="discounted-price">$${(product.price * (1 - product.discount / 100)).toFixed(2)}</span>`
              : ''}
          </div>
          <button class="btn-add-to-cart">Add to Cart</button>
        </div>
      </div>
    `;
    quickViewModal.style.display = 'flex';
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  renderProducts(products);
});

searchInput.addEventListener('input', filterProducts);

document.querySelectorAll('.filter-list li').forEach((item) => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.filter-list li').forEach((li) => li.classList.remove('active'));
    item.classList.add('active');
    filterProducts();
  });
});

productGrid.addEventListener('click', (e) => {
  const productCard = e.target.closest('.product-card');
  if (productCard) {
    const productId = parseInt(productCard.dataset.id);
    if (e.target.closest('.btn-wishlist')) {
      addToWishlist(productId);
    } else if (e.target.closest('.btn-quick-view')) {
      openQuickView(productId);
    } else if (e.target.closest('.btn-add-to-cart')) {
      addToCart(productId);
    }
  }
});

closeQuickView.addEventListener('click', () => {
  quickViewModal.style.display = 'none';
});

quickViewModal.addEventListener('click', (e) => {
  if (e.target === quickViewModal) {
    quickViewModal.style.display = 'none';
  }
});