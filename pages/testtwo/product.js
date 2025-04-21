import { auth, db } from '../../database/config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  increment,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Import cart and wishlist functions
import {
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
} from '../../carts.js';
import { toggleWishlist } from '../../components/wishlist.js';

// Global variables
let currentProduct = null;
let currentUser = null;
let relatedProducts = [];
let inCart = false;
let cartQuantity = 0;
let isInWishlist = false;

// DOM elements
const productContainer = document.getElementById('product-container');
const relatedProductsContainer = document.getElementById('related-products');
const loadingIndicator = document.getElementById('loading-indicator');
const errorContainer = document.getElementById('error-container');

// Initialize the page
function init() {
  showLoading(true);

  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  if (!productId) {
    showError('Product not found. Please try again.');
    return;
  }

  // Listen for auth state changes
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    updateAccountLink();

    try {
      // Fetch product details
      await fetchProductDetails(productId);

      // Check if product is in cart/wishlist
      if (currentUser) {
        await checkCartStatus();
        await checkWishlistStatus();
      }

      // Fetch related products
      await fetchRelatedProducts();

      renderProductDetails();
      renderRelatedProducts();
      setupEventListeners();

      showLoading(false);
    } catch (error) {
      console.error('Error initializing product page:', error);
      showError('Failed to load product details. Please try again later.');
    }
  });
}

// Fetch product details from Firestore
async function fetchProductDetails(productId) {
  try {
    const productDoc = await getDoc(doc(db, 'listings', productId));

    if (!productDoc.exists()) {
      throw new Error('Product not found');
    }

    currentProduct = {
      id: productDoc.id,
      ...productDoc.data(),
    };

    // Update document title
    document.title = `${currentProduct.name} | Your Store Name`;
  } catch (error) {
    console.error('Error fetching product details:', error);
    throw error;
  }
}

// Check if product is in user's cart
async function checkCartStatus() {
  if (!currentUser || !currentProduct) return;

  try {
    const cartDocRef = doc(
      db,
      'users',
      currentUser.uid,
      'cart',
      currentProduct.id
    );
    const cartDocSnap = await getDoc(cartDocRef);

    if (cartDocSnap.exists()) {
      inCart = true;
      cartQuantity = cartDocSnap.data().quantity || 1;
    } else {
      inCart = false;
      cartQuantity = 0;
    }
  } catch (error) {
    console.error('Error checking cart status:', error);
  }
}

// Check if product is in user's wishlist
async function checkWishlistStatus() {
  if (!currentUser || !currentProduct) return;

  try {
    const wishlistDocRef = doc(
      db,
      'users',
      currentUser.uid,
      'wishlist',
      currentProduct.id
    );
    const wishlistDocSnap = await getDoc(wishlistDocRef);

    isInWishlist = wishlistDocSnap.exists();
  } catch (error) {
    console.error('Error checking wishlist status:', error);
  }
}

// Fetch related products based on category
async function fetchRelatedProducts() {
  if (!currentProduct) return;

  try {
    const relatedQuery = query(
      collection(db, 'listings'),
      where('category', '==', currentProduct.category),
      where('subcategory', '==', currentProduct.subcategory)
    );

    const relatedSnapshot = await getDocs(relatedQuery);

    relatedProducts = relatedSnapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((product) => product.id !== currentProduct.id)
      .slice(0, 4); // Limit to 4 related products
  } catch (error) {
    console.error('Error fetching related products:', error);
  }
}

// Render product details
function renderProductDetails() {
  if (!currentProduct) return;

  // Render main product container
  productContainer.innerHTML = `
    <div class="product-details">
      <div class="product-gallery">
        <div class="main-image">
          <img src="${
            currentProduct.mainImageUrl || '/api/placeholder/500/500'
          }" alt="${currentProduct.name}" id="main-product-image">
        </div>
        <div class="thumbnail-gallery" id="thumbnail-gallery">
          <div class="thumbnail active">
            <img src="${
              currentProduct.mainImageUrl || '/api/placeholder/100/100'
            }" alt="${currentProduct.name}" data-main-img="${
    currentProduct.mainImageUrl || '/api/placeholder/500/500'
  }">
          </div>
          ${(currentProduct.additionalImageUrls || [])
            .map(
              (img, index) => `
            <div class="thumbnail">
              <img src="${
                img || `/api/placeholder/100/100?text=Image${index + 2}`
              }" alt="${currentProduct.name} - Image ${
                index + 2
              }" data-main-img="${
                img || `/api/placeholder/500/500?text=Image${index + 2}`
              }">
            </div>
          `
            )
            .join('')}
        </div>
      </div>
      
      <div class="product-info">
       <h1 class="product-title">${currentProduct.name}</h1>

          <div class="gone">
            <div class="gtwo">
                <div class="product-pricing">
                    <span class="current-price">
                        $${parseFloat(currentProduct.price).toFixed(2)}
                    </span>
                    ${
                      currentProduct.salePrice
                        ? `<span class="original-price">$${parseFloat(
                            currentProduct.salePrice
                          ).toFixed(2)}</span>
                    <span class="discount-badge">SALE</span>`
                        : ''
                    }   
                </div>
            </div>
                <div class="product-meta">
                    <div class="product-rating">
                        ${renderStars(currentProduct.rating)}
                        <span class="rating-count">(${
                          currentProduct.ratingCount || 0
                        } reviews)</span>
                    </div>
                    
                    <div class="product-category-tags">
                        <span class="category-tag">${
                          currentProduct.category
                        }</span>
                        <span class="category-tag">${
                          currentProduct.subcategory
                        }</span>
                        ${(currentProduct.tags || [])
                          .map((tag) => `<span class="tag">${tag}</span>`)
                          .join('')}
                    </div>
                </div>
        </div>
        <div class="product-availability">
          <span class="${
            currentProduct.quantity > 0 ? 'in-stock' : 'out-of-stock'
          }">
            ${currentProduct.quantity > 0 ? 'In Stock' : 'Out of Stock'}
          </span>
          ${
            currentProduct.quantity > 0
              ? `<span class="stock-count">${currentProduct.quantity} available</span>`
              : ''
          }
        </div>
        
        <div class="product-actions">
          <div class="quantity-selector" id="quantity-selector">
            ${renderQuantitySelector()}
          </div>
          
          <div class="action-buttons">
            <button id="wishlist-button" class="wishlist-button ${
              isInWishlist ? 'active' : ''
            }">
              <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
              <span>${isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}</span>
            </button>
          </div>
        </div>
        
        <div class="product-attributes">
          <h3>Specifications</h3>
          <table class="specs-table">
            <tbody>
              ${renderProductAttributes()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// Render quantity selector based on cart status
function renderQuantitySelector() {
  if (!currentProduct || currentProduct.quantity <= 0) {
    return `<div class="out-of-stock-notice">This item is currently out of stock</div>`;
  }

  if (inCart) {
    return `
      <div class="cart-controls">
        <button id="cart-decrement" class="cart-decrement btn btn-secondary">-</button>
        <span id="cart-quantity" class="cart-quantity">${cartQuantity}</span>
        <button id="cart-increment" class="cart-increment btn btn-secondary">+</button>
        <button id="cart-remove" class="cart-remove btn btn-danger">
          <i class="fa fa-trash"></i> Remove
        </button>
      </div>
    `;
  } else {
    return `
      <div class="add-to-cart-container">
        <button id="add-to-cart-btn" class="add-to-cart-btn btn btn-primary">
          <i class="fa fa-shopping-cart"></i> Add to Cart
        </button>
      </div>
    `;
  }
}

// Render product attributes from the attributes map
function renderProductAttributes() {
  const attributes = currentProduct.attributes || {};

  return (
    Object.entries(attributes)
      .map(
        ([key, value]) => `
      <tr>
        <th>${key}</th>
        <td>${value}</td>
      </tr>
    `
      )
      .join('') +
    `
      <tr>
        <th>Model</th>
        <td>${currentProduct.Model || 'N/A'}</td>
      </tr>
    `
  );
}

// Render related products
function renderRelatedProducts() {
  if (relatedProducts.length === 0) {
    relatedProductsContainer.innerHTML = '<p>No related products found.</p>';
    return;
  }

  relatedProductsContainer.innerHTML = `
    <h2>Related Products</h2>
    <div class="related-products-grid">
      ${relatedProducts
        .map(
          (product) => `
        <div class="related-product-card" data-product-id="${product.id}">
          <div class="related-product-image">
            <img src="${
              product.mainImageUrl || '/api/placeholder/200/200'
            }" alt="${product.name}">
          </div>
          <div class="related-product-info">
            <h3>${product.name}</h3>
            <div class="related-product-rating">
              ${renderStars(product.rating)}
            </div>
            <div class="related-product-price">
              $${parseFloat(product.price).toFixed(2)}
            </div>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

// Set up event listeners
function setupEventListeners() {
  // Gallery thumbnails
  const thumbnails = document.querySelectorAll(
    '#thumbnail-gallery .thumbnail img'
  );
  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener('click', (e) => {
      document.getElementById('main-product-image').src =
        e.target.dataset.mainImg;

      // Update active state
      document
        .querySelectorAll('#thumbnail-gallery .thumbnail')
        .forEach((thumb) => {
          thumb.classList.remove('active');
        });
      e.target.parentElement.classList.add('active');
    });
  });

  // Related products click
  const relatedProductCards = document.querySelectorAll(
    '.related-product-card'
  );
  relatedProductCards.forEach((card) => {
    card.addEventListener('click', () => {
      const productId = card.dataset.productId;
      window.location.href = `../product/product.html?id=${productId}`;
    });
  });

  // Cart buttons
  setupCartButtons();

  // Wishlist button
  const wishlistButton = document.getElementById('wishlist-button');
  if (wishlistButton) {
    wishlistButton.addEventListener('click', handleWishlistToggle);
  }
}

// Set up cart-related buttons
function setupCartButtons() {
  const addToCartBtn = document.getElementById('add-to-cart-btn');
  const cartDecrement = document.getElementById('cart-decrement');
  const cartIncrement = document.getElementById('cart-increment');
  const cartRemove = document.getElementById('cart-remove');

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', handleAddToCart);
  }

  if (cartDecrement) {
    cartDecrement.addEventListener('click', handleDecrement);
  }

  if (cartIncrement) {
    cartIncrement.addEventListener('click', handleIncrement);
  }

  if (cartRemove) {
    cartRemove.addEventListener('click', handleRemoveFromCart);
  }
}

// Handle adding product to cart
async function handleAddToCart() {
  if (!currentUser) {
    showToast('Please login to add items to your cart', 'error');
    return;
  }

  if (!currentProduct) return;

  try {
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) addToCartBtn.disabled = true;

    await addToCart(db, currentUser, currentProduct);
    await updateDoc(doc(db, 'users', currentUser.uid), {
      cartCount: increment(1),
    });

    inCart = true;
    cartQuantity = 1;

    // Update UI
    document.getElementById('quantity-selector').innerHTML =
      renderQuantitySelector();
    setupCartButtons();
    await updateUserCounters();

    showToast('Product added to cart', 'success');
  } catch (error) {
    console.error('Error adding to cart:', error);
    showToast('Failed to add product to cart', 'error');
  } finally {
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) addToCartBtn.disabled = false;
  }
}

// Handle cart quantity decrement
async function handleDecrement() {
  if (!currentUser || !currentProduct) return;

  try {
    const decrementBtn = document.getElementById('cart-decrement');
    if (decrementBtn) decrementBtn.disabled = true;

    const newQty = cartQuantity - 1;

    if (newQty > 0) {
      await updateCartItemQuantity(db, currentUser, currentProduct, newQty);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        cartCount: increment(-1),
      });

      cartQuantity = newQty;
      document.getElementById('cart-quantity').textContent = cartQuantity;
    } else {
      await handleRemoveFromCart();
    }

    await updateUserCounters();
  } catch (error) {
    console.error('Error decrementing quantity:', error);
    showToast('Failed to update cart', 'error');
  } finally {
    const decrementBtn = document.getElementById('cart-decrement');
    if (decrementBtn) decrementBtn.disabled = false;
  }
}

// Handle cart quantity increment
async function handleIncrement() {
  if (!currentUser || !currentProduct) return;

  try {
    const incrementBtn = document.getElementById('cart-increment');
    if (incrementBtn) incrementBtn.disabled = true;

    await updateDoc(
      doc(db, 'users', currentUser.uid, 'cart', currentProduct.id),
      {
        quantity: increment(1),
      }
    );
    await updateDoc(doc(db, 'users', currentUser.uid), {
      cartCount: increment(1),
    });

    cartQuantity++;
    document.getElementById('cart-quantity').textContent = cartQuantity;

    await updateUserCounters();
  } catch (error) {
    console.error('Error incrementing quantity:', error);
    showToast('Failed to update cart', 'error');
  } finally {
    const incrementBtn = document.getElementById('cart-increment');
    if (incrementBtn) incrementBtn.disabled = false;
  }
}

// Handle removing product from cart
async function handleRemoveFromCart() {
  if (!currentUser || !currentProduct) return;

  try {
    const removeBtn = document.getElementById('cart-remove');
    if (removeBtn) removeBtn.disabled = true;

    await removeFromCart(db, currentUser, currentProduct);
    await updateDoc(doc(db, 'users', currentUser.uid), {
      cartCount: increment(-cartQuantity),
    });

    inCart = false;
    cartQuantity = 0;

    // Update UI
    document.getElementById('quantity-selector').innerHTML =
      renderQuantitySelector();
    setupCartButtons();
    await updateUserCounters();

    showToast('Product removed from cart', 'success');
  } catch (error) {
    console.error('Error removing from cart:', error);
    showToast('Failed to remove product from cart', 'error');
  }
}

// Handle wishlist toggle
async function handleWishlistToggle() {
  if (!currentUser) {
    showToast('Please login to add items to your wishlist', 'error');
    return;
  }

  if (!currentProduct) return;

  try {
    const wishlistBtn = document.getElementById('wishlist-button');
    if (wishlistBtn) wishlistBtn.disabled = true;

    // Optimistic UI update
    const wasInWishlist = isInWishlist;
    isInWishlist = !isInWishlist;

    wishlistBtn.classList.toggle('active', isInWishlist);
    wishlistBtn.innerHTML = `
      <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
      <span>${isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}</span>
    `;

    await toggleWishlist(db, currentUser, currentProduct);
    await updateDoc(doc(db, 'users', currentUser.uid), {
      wishlistCount: increment(isInWishlist ? 1 : -1),
    });

    await updateUserCounters();

    showToast(
      isInWishlist
        ? 'Product added to wishlist'
        : 'Product removed from wishlist',
      'success'
    );
  } catch (error) {
    console.error('Error updating wishlist:', error);

    // Revert UI if operation fails
    isInWishlist = !isInWishlist;
    const wishlistBtn = document.getElementById('wishlist-button');
    if (wishlistBtn) {
      wishlistBtn.classList.toggle('active', isInWishlist);
      wishlistBtn.innerHTML = `
        <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
        <span>${isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}</span>
      `;
    }

    showToast('Failed to update wishlist', 'error');
  } finally {
    const wishlistBtn = document.getElementById('wishlist-button');
    if (wishlistBtn) wishlistBtn.disabled = false;
  }
}

// ========= 1. HEADER COUNTERS =========
async function updateUserCounters() {
  if (!currentUser) return;
  const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
  const userData = userDocSnap.data() || {};
  const cartCount = userData.cartCount || 0;
  const wishlistCount = userData.wishlistCount || 0;
  updateHeaderIcons(cartCount, wishlistCount);
}

function updateHeaderIcons(cartCount, wishlistCount) {
  const cartCountElems = document.querySelectorAll('.cartcount');
  cartCountElems.forEach((elem) => {
    elem.textContent = cartCount;
  });
  const wishlistCountElems = document.querySelectorAll('.whishlistcount');
  wishlistCountElems.forEach((elem) => {
    elem.textContent = wishlistCount;
  });
}

// ========= 2. ACCOUNT LINK LOGIC =========
function updateAccountLink() {
  const containerMain = document.getElementById('account-container-main');
  const containerSticky = document.getElementById('account-container-sticky');

  if (currentUser) {
    if (containerMain) {
      containerMain.innerHTML = `
          <a href="../account/account.html" id="account-link">
            <i class="fas fa-user-circle"></i>
            <span>Account</span>
          </a>
          <button id="logout-button" title="Logout">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        `;
    }
    if (containerSticky) {
      containerSticky.innerHTML = `
          <a href="../account/account.html" id="account-link-sticky">
            <i class="fas fa-user-circle"></i>
            <span>Account</span>
          </a>
          <button id="logout-button-sticky" title="Logout">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        `;
    }
  } else {
    if (containerMain) {
      containerMain.innerHTML = `
          <a href="../SignUp/SignUp.html" id="account-link">
            <i class="fas fa-sign-in-alt"></i>
            <span>Sign In</span>
          </a>
        `;
    }
    if (containerSticky) {
      containerSticky.innerHTML = `
          <a href="../SignUp/SignUp.html" id="account-link-sticky">
            <i class="fas fa-sign-in-alt"></i>
            <span>Sign In</span>
          </a>
        `;
    }
  }
  attachLogoutHandler();
}

function attachLogoutHandler() {
  const logoutBtn = document.getElementById('logout-button');
  const logoutBtnSticky = document.getElementById('logout-button-sticky');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      auth.signOut().then(() => {
        updateAccountLink();
      });
    });
  }
  if (logoutBtnSticky) {
    logoutBtnSticky.addEventListener('click', (e) => {
      e.preventDefault();
      auth.signOut().then(() => {
        updateAccountLink();
      });
    });
  }
}

auth.onAuthStateChanged((user) => {
  currentUser = user;
  updateUserCounters();
  updateAccountLink();
});

// Helper function to render star ratings
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  let starsHTML = '';

  for (let i = 0; i < fullStars; i++) {
    starsHTML += '<i class="fas fa-star"></i>';
  }

  if (halfStar) {
    starsHTML += '<i class="fas fa-star-half-alt"></i>';
  }

  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  for (let i = 0; i < emptyStars; i++) {
    starsHTML += '<i class="far fa-star"></i>';
  }

  return starsHTML;
}

// Show/hide loading indicator
function showLoading(isLoading) {
  if (loadingIndicator) {
    loadingIndicator.style.display = isLoading ? 'flex' : 'none';
  }
}

// Show error message
function showError(message) {
  showLoading(false);

  if (errorContainer) {
    errorContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-circle"></i>
        <p>${message}</p>
        <button onclick="window.location.href='../shop/shop.html'">
          Return to Shop
        </button>
      </div>
    `;
    errorContainer.style.display = 'block';
  }

  productContainer.style.display = 'none';
  relatedProductsContainer.style.display = 'none';
}

// Show toast notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast') || createToast();

  toast.className = `toast ${type}`;
  toast.querySelector('.toast-message').textContent = message;

  toast.style.display = 'flex';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// Create toast element if it doesn't exist
function createToast() {
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = 'toast';
  toast.innerHTML = `
    <div class="toast-message"></div>
    <button class="toast-close">&times;</button>
  `;

  toast.querySelector('.toast-close').addEventListener('click', () => {
    toast.style.display = 'none';
  });

  document.body.appendChild(toast);
  return toast;
}

// ========= 10. BACK TO TOP BUTTON & CART NOTIFICATION =========
const backToTopButton = document.getElementById('back-to-top');
window.addEventListener('scroll', () => {
  backToTopButton.style.display = window.scrollY > 300 ? 'block' : 'none';
});
backToTopButton.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
const cartNotification = document.getElementById('cart-notification');
document.querySelectorAll('.add-to-cart').forEach((button) => {
  button.addEventListener('click', () => {
    cartNotification.style.display = 'block';
    setTimeout(() => {
      cartNotification.style.display = 'none';
    }, 3000);
  });
});

// Initialize the page on load
document.addEventListener('DOMContentLoaded', init);
