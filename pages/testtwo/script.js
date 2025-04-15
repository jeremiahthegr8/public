// State management
const state = {
  products: [],
  cartCount: 0,
  currentUser: null,
  loading: true,
  error: null,

  // Fetch products from API
  fetchProducts: async function () {
    try {
      state.loading = true;
      updateUI();

      // Simulated API call with timeout to show loading state
      setTimeout(async () => {
        try {
          // In a real app, this would be a real API endpoint
          // const response = await fetch("/api/products");
          // state.products = await response.json();

          // For demo purposes, using mock data
          state.products = getMockProducts();
          state.loading = false;
          updateUI();
        } catch (err) {
          state.error = 'Failed to load products';
          state.loading = false;
          updateUI();
        }
      }, 1000);
    } catch (err) {
      state.error = 'Failed to load products';
      state.loading = false;
      updateUI();
    }
  },

  // Add product to cart
  addToCart: async function (product) {
    if (!product.inStock) return;

    try {
      // In a real app, this would be a real API call
      // await fetch("/api/cart/add", {
      //   method: "POST",
      //   body: JSON.stringify({
      //     productId: product.id,
      //   }),
      // });

      // For demo purposes, just increment cart count
      state.cartCount++;
      alert(`Added ${product.name} to cart! Cart count: ${state.cartCount}`);
    } catch (err) {
      state.error = 'Failed to add to cart';
      updateUI();
    }
  },

  // Toggle product in wishlist
  toggleWishlist: async function (product) {
    try {
      // In a real app, this would be a real API call
      // await fetch("/api/wishlist/toggle", {
      //   method: "POST",
      //   body: JSON.stringify({
      //     productId: product.id,
      //   }),
      // });

      // For demo purposes, just show an alert
      alert(`Toggled ${product.name} in wishlist!`);
    } catch (err) {
      state.error = 'Failed to update wishlist';
      updateUI();
    }
  },
};

// DOM elements
const loadingMessage = document.getElementById('loadingMessage');
const errorMessage = document.getElementById('errorMessage');
const productGrid = document.getElementById('productGrid');

// Update UI based on state
function updateUI() {
  // Handle loading state
  loadingMessage.style.display = state.loading ? 'block' : 'none';

  // Handle error state
  errorMessage.style.display = state.error ? 'block' : 'none';
  errorMessage.textContent = state.error || '';

  // Handle products display
  productGrid.style.display = !state.loading && !state.error ? 'grid' : 'none';

  // Only render products if we're not loading and don't have an error
  if (!state.loading && !state.error) {
    renderProducts();
  }
}

// Render products to the grid
function renderProducts() {
  // Clear existing products
  productGrid.innerHTML = '';

  // Add each product to the grid
  state.products.forEach((product) => {
    const productCard = createProductCard(product);
    productGrid.appendChild(productCard);
  });
}

// Create a product card element
function createProductCard(product) {
  const card = document.createElement('article');
  card.className = 'product-card';
  card.addEventListener('click', () => {
    // Navigate to product detail page
    // In a real app, this would redirect to the product page
    alert(`Navigating to product: ${product.name}`);
  });

  // Image container with out of stock badge
  const imageContainer = document.createElement('div');
  imageContainer.className = 'product-image-container';

  const image = document.createElement('img');
  image.className = 'product-image';
  image.src = product.mainImageUrl || '/api/placeholder/220/220';
  image.alt = product.name;
  imageContainer.appendChild(image);

  const outOfStockBadge = document.createElement('div');
  outOfStockBadge.className = 'out-of-stock-badge';
  outOfStockBadge.textContent = 'Out of Stock';
  if (!product.inStock) {
    outOfStockBadge.style.display = 'block';
  }
  imageContainer.appendChild(outOfStockBadge);

  // Product details
  const details = document.createElement('div');
  details.className = 'product-details';

  // Product name
  const name = document.createElement('h3');
  name.className = 'product-name';
  name.textContent = product.name;
  details.appendChild(name);

  // Rating container
  const ratingContainer = document.createElement('div');
  ratingContainer.className = 'rating-container';

  const starRating = document.createElement('div');
  starRating.className = 'star-rating';
  starRating.textContent = '★'.repeat(Math.round(product.rating));
  ratingContainer.appendChild(starRating);

  const ratingCount = document.createElement('div');
  ratingCount.className = 'rating-count';
  ratingCount.textContent = `(${product.ratingCount || 0})`;
  ratingContainer.appendChild(ratingCount);

  details.appendChild(ratingContainer);

  // Price
  const price = document.createElement('div');
  price.className = 'product-price';
  price.textContent = `$${parseFloat(product.price).toFixed(2)}`;
  details.appendChild(price);

  // Button container
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'button-container';

  // Add to cart button
  const addToCartButton = document.createElement('button');
  addToCartButton.className = 'add-to-cart-button';
  addToCartButton.textContent = 'Add to Cart';
  addToCartButton.disabled = !product.inStock;
  addToCartButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent card click
    state.addToCart(product);
  });
  buttonContainer.appendChild(addToCartButton);

  // Wishlist button
  const wishlistButton = document.createElement('button');
  wishlistButton.className = 'wishlist-button';
  wishlistButton.textContent = '♡';
  wishlistButton.setAttribute('aria-label', 'Add to Wishlist');
  wishlistButton.addEventListener('click', (event) => {
    event.stopPropagation(); // Prevent card click
    state.toggleWishlist(product);
  });
  buttonContainer.appendChild(wishlistButton);

  details.appendChild(buttonContainer);

  // Assemble the card
  card.appendChild(imageContainer);
  card.appendChild(details);

  return card;
}

// Mock data for demonstration
function getMockProducts() {
  return [
    {
      id: 1,
      name: 'Wireless Bluetooth Headphones',
      price: 79.99,
      rating: 4.5,
      ratingCount: 128,
      inStock: true,
      mainImageUrl: 'https://via.placeholder.com/300/FFFFFF?text=Headphones',
    },
    {
      id: 2,
      name: 'Smartphone Stand with Wireless Charger',
      price: 34.99,
      rating: 4,
      ratingCount: 75,
      inStock: true,
      mainImageUrl: 'https://via.placeholder.com/300/FFFFFF?text=Phone+Stand',
    },
    {
      id: 3,
      name: 'Ultra HD Smart TV - 55 inch',
      price: 499.99,
      rating: 5,
      ratingCount: 42,
      inStock: false,
      mainImageUrl: 'https://via.placeholder.com/300/FFFFFF?text=Smart+TV',
    },
    {
      id: 4,
      name: 'Ergonomic Office Chair',
      price: 189.99,
      rating: 4.5,
      ratingCount: 56,
      inStock: true,
      mainImageUrl: 'https://via.placeholder.com/300/FFFFFF?text=Office+Chair',
    },
    {
      id: 5,
      name: 'Portable Bluetooth Speaker',
      price: 49.99,
      rating: 3.5,
      ratingCount: 89,
      inStock: true,
      mainImageUrl: 'https://via.placeholder.com/300/FFFFFF?text=Speaker',
    },
    {
      id: 6,
      name: 'Digital Drawing Tablet',
      price: 129.99,
      rating: 4,
      ratingCount: 37,
      inStock: true,
      mainImageUrl:
        'https://via.placeholder.com/300/FFFFFF?text=Drawing+Tablet',
    },
  ];
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  // Fetch products when page loads
  state.fetchProducts();
});
