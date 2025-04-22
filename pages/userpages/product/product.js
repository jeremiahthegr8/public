import { auth, db } from '../../../database/config.js';
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
} from '../../../carts.js';
import { toggleWishlist } from '../../../components/wishlist.js';

// Global variables
let currentProduct = null;
let currentUser = null;
let inCart = false;
let cartQuantity = 0;
let isInWishlist = false;

// DOM elements
const productContainer = document.getElementById('product-container');
const loadingIndicator = document.getElementById('loading-indicator');
const errorContainer = document.getElementById('error-container');
const Attributes = document.getElementById('specifications');

// Initialize the page on load
document.addEventListener('DOMContentLoaded', init);

// Tab functionality
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');
const AttributesContainer = document.getElementById('spec-table');

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

      renderProductDetails();
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
    fetchProductReviews(productId);
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

// Render product details
function renderProductDetails() {
  if (!currentProduct) return;
  renderProductAttributes();

  // Render main product container
  productContainer.innerHTML = `
    
    <div class="product-details">
      <div class="product-gallery">
        <div class="thumbnail-gallery" id="thumbnail-gallery">
          <div class="thumbnail active">
            <img
              src="${
              currentProduct.mainImageUrl ||
              '../../../assets/images/new/placeholder-image.jpg'
            }"
              alt="${currentProduct.name}"
              data-main-img="${
              currentProduct.mainImageUrl || '../../../assets/images/new/placeholder-image.jpg' }"
            />
          </div>
          ${(currentProduct.additionalImageUrls || []) .map( (img, index) => `
          <div class="thumbnail">
            <img
              src="${
                img ||
                `../../../assets/images/new/placeholder-image.jpg?text=Image${
                  index + 2
                }`
              }"
              alt="${currentProduct.name} - Image ${
                index + 2
              }"
              data-main-img="${
                img ||
                `../../../assets/images/new/placeholder-image.jpg?text=Image${
                  index + 2
                }`
              }"
            />
          </div>
          ` ) .join('')}
        </div>
        <div class="main-image">
          <img
            src="${
            currentProduct.mainImageUrl ||
            '../../../assets/images/new/placeholder-image.jpg'
          }"
            alt="${currentProduct.name}"
            id="main-product-image"
          />
        </div>
      </div>

      <div class="product-info">
        <div class="gone">
          <div class="gtwo">
            <div class="product-categoryz">
              <span class="category-tagz"> ${currentProduct.category} </span>
              <span class="subcategory-tagz">
                ${currentProduct.subcategory}
              </span>
            </div>
            <div class="namerate">
              <h1 class="product-title">${currentProduct.name}</h1>
              <div class="product-pricing">
                <span class="current-price">
                  $${parseFloat(currentProduct.price).toFixed(2)}
                </span>
                ${ currentProduct.salePrice ? `<span class="original-price"
                  >$${parseFloat( currentProduct.salePrice ).toFixed(2)}</span
                >
                <span class="discount-badge">SALE</span>` : '' }
              </div>

              <div class="product-availability">
                <span
                  class="${ currentProduct.quantity > 0 ? 'in-stock' : 'out-of-stock' }"
                >
                  ${ currentProduct.quantity > 0 ? 'In Stock:' : 'Out of Stock:'
                  }
                </span>
                ${ currentProduct.quantity > 0 ? `<span class="stock-count"
                  >${currentProduct.quantity} available</span
                >` : '' }
              </div>
              <div class="numsold">
                Number Sold:
                <span class="sold">${ currentProduct.salesCount }</span>
              </div>
              <div class="numreturned">
                Number Returned:
                <span class="returnedcount"
                  >${ currentProduct.returnsCount }</span
                >
              </div>
            </div>
          </div>
          <div class="product-meta">
            <div class="product-rating">
              ${renderStars(currentProduct.rating)}
              <span class="rating-count"
                >(${ currentProduct.ratingCount || 0 } reviews)
              </span>
            </div>
            <div class="product-category-tags">
              <span class="tagtitle"> Tags: </span>
              <span class="category-tag">${ currentProduct.category }</span>
              <span class="category-tag">${ currentProduct.subcategory }</span>
              ${(currentProduct.tags || []) .map((tag) => `<span class="tag"
                >${tag}</span
              >`) .join('')}
            </div>
            <div class="description">
              <h3>Description</h3>
              <p>${currentProduct.description}</p>
            </div>
          </div>
        </div>
        <div class="product-actions">
          <div class="quantity-selector" id="quantity-selector">
            ${renderQuantitySelector()}
          </div>

          <div class="action-buttons">
            <button
              id="wishlist-button"
              class="wishlist-button ${ isInWishlist ? 'active' : '' }"
            >
              <i class="${isInWishlist ? 'fas' : 'far'} fa-heart"></i>
              <span>${isInWishlist ? 'In Wishlist' : 'Add to Wishlist'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </body>
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

async function fetchProductReviews(productId) {
  try {
    const ratingsCollection = collection(db, 'listings', productId, 'ratings');
    const ratingsSnapshot = await getDocs(ratingsCollection);
    const allRatings = ratingsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const ratingCounts = [0, 0, 0, 0, 0]; // Index 0 for 1-star, 4 for 5-star
    allRatings.forEach((rating) => {
      if (rating.rating >= 1 && rating.rating <= 5) {
        ratingCounts[rating.rating - 1]++;
      }
    });

    const totalRatings = allRatings.length;
    const averageRating = totalRatings
      ? (
          allRatings.reduce((sum, rating) => sum + rating.rating, 0) /
          totalRatings
        ).toFixed(1)
      : 0;

    renderAverageRating(averageRating, totalRatings, ratingCounts);
    renderIndividualReviews(allRatings);
  } catch (error) {
    console.error('Error fetching product reviews:', error);
    showError('Failed to load product reviews. Please try again later.');
  }
}

function renderAverageRating(averageRating, totalRatings, ratingCounts) {
  const ratingDistribution = ratingCounts
    .map((count, index) => {
      const percentage = totalRatings
        ? ((count / totalRatings) * 100).toFixed(1)
        : 0;
      return `
      <div class="rating-bar">
        <div class="rating-level">${1 + index} ★</div>
        <div class="progress-container">
          <div class="progress" style="width: ${percentage}%"></div>
        </div>
        <div class="progress-percent">${percentage}%</div>
      </div>
    `;
    })
    .join('');

  const reviewsContainer = document.getElementById('reviews-summary');
  reviewsContainer.innerHTML = `
    <div>
      <div class="reviews-header">
        <h2>Customer Reviews</h2>
        <button class="view-all-reviews">View All ${totalRatings} Reviews</button>
      </div>
      <div class="average-rating">
        <div class="rating-number">${averageRating}</div>
        <div class="rating-stars">${renderStars(averageRating)}</div>
        <div class="rating-count">Based on ${totalRatings} reviews</div>
      </div>
    </div>
    <div id="rating-distributionz" class="rating-distribution">
      ${ratingDistribution}
    </div>
  `;
}

async function renderIndividualReviews(allRatings) {
  const reviewsContainer = document.getElementById('review-list');
  reviewsContainer.innerHTML = ''; // Clear existing reviews

  for (const review of allRatings) {
    try {
      // Fetch user details from Firestore
      const userDoc = await getDoc(doc(db, 'users', review.userId));
      const FullName = userDoc.exists() ? userDoc.data().FullName : 'Anonymous';

      // Check if "helpful" count exists
      const helpfulCount = review.helpful || 0;

      // Render each review
      const reviewHTML = `
        <div class="review-item">
          <div class="review-header">
            <div class="reviewer-info">
              <div class="reviewer-avatar">A</div>
              <div>
                <div class="reviewer-name">${FullName}</div>
                <div class="rating-stars">${renderStars(review.rating)}</div>
              </div>
            </div>
            <div class="review-date">${new Date(
              review.createdAt.seconds * 1000
            ).toLocaleDateString()}</div>
          </div>
          <div class="review-content">
            <p>${review.review}</p>
          </div>
          <div class="review-actions">
            <button class="like-button" data-review-id="${review.id}">
              👍 Helpful (<span class="helpful-count">${helpfulCount}</span>)
            </button>
          </div>
        </div>
      `;

      reviewsContainer.innerHTML += reviewHTML;
    } catch (error) {
      console.error('Error fetching user details for review:', error);
    }
  }

  // Attach event listeners to like buttons
  const likeButtons = document.querySelectorAll('.like-button');
  likeButtons.forEach((button) => {
    button.addEventListener('click', async (e) => {
      const reviewId = e.target.dataset.reviewId;
      try {
        const reviewRef = doc(
          db,
          'listings',
          currentProduct.id,
          'ratings',
          reviewId
        );
        await updateDoc(reviewRef, {
          helpful: increment(1),
        });

        // Update UI
        const helpfulCountElem = e.target.querySelector('.helpful-count');
        helpfulCountElem.textContent =
          parseInt(helpfulCountElem.textContent) + 1;

        console.log(`Review ${reviewId} marked as helpful.`);
      } catch (error) {
        console.error('Error updating helpful count:', error);
      }
    });
  });
}

// Render product attributes
async function renderProductAttributes() {
  if (!currentProduct) {
    console.log('Product not found');
  } else if (!AttributesContainer) {
    console.log('AttributesContainer not found');
  } else {
    const attributes = currentProduct.attributes || {};
    const attributesHTML = Object.entries(attributes)
      .map(([key, value]) => {
        return `
          <tr>
                  <th>${key}</th>
                  <td>${value}</td>
                </tr>
          `;
      })
      .join('');
    AttributesContainer.innerHTML = attributesHTML;
  }
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

tabButtons.forEach((button) => {
  button.addEventListener('click', () => {
    // Remove active class from all tabs
    tabButtons.forEach((btn) => btn.classList.remove('active'));
    tabContents.forEach((content) => content.classList.remove('active'));

    // Add active class to clicked tab
    button.classList.add('active');
    document.getElementById(button.dataset.tab).classList.add('active');
  });
});
