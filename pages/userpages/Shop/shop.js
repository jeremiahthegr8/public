import { auth, db } from '../../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  getDoc,
  increment,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Import cart and wishlist functions
import {
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
} from '../../../carts.js';
import { toggleWishlist } from '../../../components/wishlist.js';

let products = []; // To hold listings fetched from Firestore.
let userCart = {}; // { productId: quantity }
let userWishlist = []; // [ productId, ... ]
let currentUser = null;
let cartCount = 0;

// Query selectors
const productsGrid = document.getElementById('productsGrid');
const cartCountElement = document.querySelector('.cart-count');
const toast = document.getElementById('toast');
const productCountElement = document.getElementById('productCount');

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const categoryFilter = document.getElementById('categoryFilter');
const minPriceInput = document.getElementById('minPrice');
const maxPriceInput = document.getElementById('maxPrice');
const applyPriceFilter = document.getElementById('applyPriceFilter');
const inStockFilter = document.getElementById('inStockFilter');
const sortSelect = document.getElementById('sortSelect');
const brandFilters = document.querySelectorAll('.category-filter');
const ratingFilters = document.querySelectorAll('.rating-filter');
const gridViewBtn = document.getElementById('gridViewBtn');
const listViewBtn = document.getElementById('listViewBtn');
const productsContainer = document.querySelector('.products-container');

// ========= 1. HEADER COUNTERS =========
// Instead of iterating through the cart/wishlist subcollections, we now fetch the aggregated counters
async function updateUserCounters() {
  if (!currentUser) return;
  const userDocSnap = await getDoc(doc(db, 'users', currentUser.uid));
  const userData = userDocSnap.data() || {};
  const cartCount = userData.cartCount || 0;
  const wishlistCount = userData.wishlistCount || 0;
  updateHeaderIcons(cartCount, wishlistCount);
}

function updateHeaderIcons(cartCount, wishlistCount) {
  // Update all elements with class 'cartcount'
  const cartCountElems = document.querySelectorAll('.cartcount');
  cartCountElems.forEach((elem) => {
    elem.textContent = cartCount;
  });
  // Update all elements with class 'whishlistcount'
  const wishlistCountElems = document.querySelectorAll('.whishlistcount');
  wishlistCountElems.forEach((elem) => {
    elem.textContent = wishlistCount;
  });
}

// ========= 2. ACCOUNT LINK LOGIC =========
// Update the account containers based on login status.
function updateAccountLink() {
  const containerMain = document.getElementById('account-container-main');
  const containerSticky = document.getElementById('account-container-sticky');

  if (currentUser) {
    // User is logged in: show profile link and logout button.
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
    // User is not logged in: show "Sign In" link with login icon.
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
  // Attach logout handlers if needed.
  attachLogoutHandler();
}

// Attach click handlers to logout buttons.
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

// Listen for auth state changes.
auth.onAuthStateChanged((user) => {
  currentUser = user;
  updateUserCounters();
  updateAccountLink();
});

// ========= 4. DROPDOWN & MOBILE MENUS =========
// For Cart dropdown.
const cartToggle = document.getElementById('cart-toggle');
const cartDropdown = document.querySelector('.cart-dropdown');

cartToggle.addEventListener('click', (e) => {
  e.preventDefault();
  cartDropdown.style.display =
    cartDropdown.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', (e) => {
  // Close cart dropdown if click outside.
  if (!cartToggle.contains(e.target) && !cartDropdown.contains(e.target)) {
    cartDropdown.style.display = 'none';
  }
});

// Render star rating
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  let starsHTML = '';
  for (let i = 0; i < fullStars; i++) {
    starsHTML += '★';
  }
  if (halfStar) {
    starsHTML += '★';
  }
  while (starsHTML.length < 5) {
    starsHTML += '☆';
  }
  return starsHTML;
}

// Render products using the current UI
function renderProducts(productsToRender) {
  productsGrid.innerHTML = '';
  if (productsToRender.length === 0) {
    productsGrid.innerHTML = '<p>No products found matching your criteria.</p>';
    productCountElement.textContent = '0';
    return;
  }
  productsToRender.forEach((product) => {
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
          <img src="${
            product.mainImageUrl || '/api/placeholder/220/220'
          }" alt="${product.name}" class="product-image" />
          <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="product-category">${product.category}</div>
                        <p class="product-description">${
                          product.description
                        }</p>
            <div class="product-rating">
              <span class="star-rating">${renderStars(product.rating)}</span>
              <span>${product.rating} (${
      product.ratingCount || 0
    }) reviews </span>
            </div>
            <div class="product-price">$${parseFloat(product.price).toFixed(
              2
            )}</div>
            <!-- Product Actions: Cart controls on the left, Wishlist toggle on the right -->
          <div class="product-actions" style="margin-top: var(--spacing-md); display: flex; align-items: center; justify-content: space-between;">
            <div class="cart-action-area">
              <!-- This area will be dynamically updated to show either Add to Cart or cart controls -->
            </div>
            <button class="wishlist-btn btn btn-outline">
              <i class="wishlist-icon far fa-heart"></i>
            </button>
          </div>
        `;
    // When clicking on the card (but not on the buttons), redirect to product details page.
    productCard.addEventListener('click', function (e) {
      if (
        e.target.closest('.add-to-cart') ||
        e.target.closest('.wishlist-button') ||
        e.target.closest('.cart-action-area') ||
        e.target.closest('.cart-controls') ||
        e.target.closest('.cart-remove') ||
        e.target.closest('.cart-increment') ||
        e.target.closest('.cart-decrement') ||
        e.target.closest('.cart-quantity') ||
        // wishlist button
        e.target.closest('.wishlist-btn') ||
        e.target.closest('.wishlist-icon')
      )
        return;
      // Redirect to the product details page (implement the details page later)
      window.location.href = `../product/product.html?id=${product.id}`;
    });

    // Load product state (cart and wishlist) to update the UI.
    updateProductActions(product);

    // Wishlist toggle event listener.
    const wishlistBtn = document.querySelector('.wishlist-btn');
    if (wishlistBtn && currentUser) {
      wishlistBtn.addEventListener('click', async () => {
        // Check if the product is already in the wishlist
        const wishlistDocRef = doc(
          db,
          'users',
          currentUser.uid,
          'wishlist',
          product.id
        );
        const docSnap = await getDoc(wishlistDocRef);
        const wasAdded = !docSnap.exists();
        await toggleWishlist(db, currentUser, product);
        // Update aggregated wishlist counter: increment if added, decrement if removed
        await updateDoc(doc(db, 'users', currentUser.uid), {
          wishlistCount: increment(wasAdded ? 1 : -1),
        });
        await updateUserCounters();
        updateWishlistIcon(product);
      });
    }

    productsGrid.appendChild(productCard);
  });
  productCountElement.textContent = productsToRender.length;
}

// This function checks whether the product is in the cart and displays the appropriate controls.
async function updateProductActions(product) {
  let inCart = false;
  let quantity = 0;
  if (currentUser) {
    const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', product.id);
    const docSnap = await getDoc(cartDocRef);
    if (docSnap.exists()) {
      inCart = true;
      quantity = docSnap.data().quantity || 1;
    }
  }

  const cartActionArea = document.querySelector('.cart-action-area');
  if (inCart) {
    cartActionArea.innerHTML = `
        <div class="cart-controls">
          <button class="cart-decrement btn btn-secondary" style="margin-right:5px;">-</button>
          <span class="cart-quantity" style="margin:0 8px;">${quantity}</span>
          <button class="cart-increment btn btn-secondary" style="margin-left:5px;">+</button>
          <button class="cart-remove btn btn-danger" style="margin-left:10px;"><i class="fa fa-trash"></i></button>
        </div>
      `;
    const decrementBtn = cartActionArea.querySelector('.cart-decrement');
    const incrementBtn = cartActionArea.querySelector('.cart-increment');
    const removeBtn = cartActionArea.querySelector('.cart-remove');

    decrementBtn.addEventListener('click', async () => {
      const newQty = quantity - 1;
      if (newQty > 0) {
        await updateCartItemQuantity(db, currentUser, product, newQty);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          cartCount: increment(-1),
        });
      } else {
        // Remove the product if quantity reaches 0
        await removeFromCart(db, currentUser, product);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          cartCount: increment(-quantity),
        });
      }
      updateProductActions(product);
      updateUserCounters();
    });

    // For the increment button:
    incrementBtn.addEventListener('click', async () => {
      // Disable the button and change its color to indicate it's processing.
      incrementBtn.disabled = true;
      incrementBtn.style.backgroundColor = 'gray';

      const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', product.id);
      try {
        // Atomically increment the quantity.
        await updateDoc(cartDocRef, { quantity: increment(1) });
        await updateDoc(doc(db, 'users', currentUser.uid), {
          cartCount: increment(1),
        });
      } catch (error) {
        console.error('Error incrementing quantity:', error);
      } finally {
        // Re-enable the button and reset its color.
        incrementBtn.disabled = false;
        incrementBtn.style.backgroundColor = '';
        // Refresh UI after update.
        updateProductActions(product);
        updateUserCounters();
      }
    });
  } else {
    cartActionArea.innerHTML = `<button class="add-to-cart-btn btn btn-primary">Add to Cart</button>`;
    const addToCartBtn = cartActionArea.querySelector('.add-to-cart-btn');
    addToCartBtn.addEventListener('click', async () => {
      await addToCart(db, currentUser, product);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        cartCount: increment(1),
      });
      updateProductActions(product);
      updateUserCounters();
      const cartNotification = document.getElementById('cart-notification');
      cartNotification.style.display = 'block';
      setTimeout(() => {
        cartNotification.style.display = 'none';
      }, 3000);
    });
  }
  updateWishlistIcon(product);
}

// This function updates the wishlist icon based on the current state.
async function updateWishlistIcon(product) {
  const wishlistIcon = document.querySelector('.wishlist-icon');
  let inWishlist = false;
  if (currentUser) {
    const wishlistDocRef = doc(
      db,
      'users',
      currentUser.uid,
      'wishlist',
      product.id
    );
    const docSnap = await getDoc(wishlistDocRef);
    if (docSnap.exists()) {
      inWishlist = true;
    }
  }
  if (wishlistIcon) {
    if (inWishlist) {
      wishlistIcon.classList.remove('far');
      wishlistIcon.classList.add('fas');
      wishlistIcon.style.color = 'red';
    } else {
      wishlistIcon.classList.remove('fas');
      wishlistIcon.classList.add('far');
      wishlistIcon.style.color = 'grey';
    }
  }
}

// Filter products based on multiple criteria
function filterProducts() {
  let filtered = [...products];
  // Replace the brand filters logic with:
  const mainCategory = document.getElementById('mainCategory');
  const subCategory = document.getElementById('subCategory');
  const attributesContainer = document.getElementById('attributesContainer');

  // Category change handler
  mainCategory.addEventListener('change', () => {
    const category = mainCategory.value;
    subCategory.disabled = !category;
    subCategory.innerHTML = '<option value="">All Subcategories</option>';
    attributesContainer.innerHTML = '';

    if (category && categoriesData[category]) {
      categoriesData[category].forEach((sub) => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        subCategory.appendChild(option);
      });
    }

    renderProducts(filterProducts());
  });

  // Subcategory change handler
  subCategory.addEventListener('change', () => {
    attributesContainer.innerHTML = '';
    const subcat = subCategory.value;

    if (subcat && subcategoryAttributes[subcat]) {
      const attributes = subcategoryAttributes[subcat];
      attributes.forEach((attr) => {
        const group = document.createElement('div');
        group.className = 'attribute-group';
        group.innerHTML = `
        <div class="attribute-title">${attr}</div>
        <div class="nested-attributes">
          <input type="text" 
                 class="attribute-input" 
                 placeholder="Enter ${attr}"
                 data-attribute="${attr}"
                 data-subcategory="${subcat}">
        </div>
      `;
        attributesContainer.appendChild(group);
      });
    }

    renderProducts(filterProducts());
  });

  // Update filterProducts function
  function filterProducts() {
    let filtered = [...products];

    // Category/Subcategory filter
    const mainCat = mainCategory.value;
    const subCat = subCategory.value;

    if (mainCat) {
      filtered = filtered.filter((p) => p.category === mainCat);
      if (subCat) {
        filtered = filtered.filter((p) => p.subcategory === subCat);

        // Attribute filtering
        const attributeInputs = document.querySelectorAll('.attribute-input');
        attributeInputs.forEach((input) => {
          const attr = input.dataset.attribute;
          const value = input.value.trim().toLowerCase();

          if (value) {
            filtered = filtered.filter((p) =>
              p.attributes[attr]?.toLowerCase().includes(value)
            );
          }
        });
      }
    }

    // Existing other filters (price, rating, etc)
    // ... keep existing price and rating filtering logic ...

    return filtered;
  }

  // Update your product rendering to include attributes
  function renderProducts(productsToRender) {
    // ... existing rendering code ...
    // Add attributes display in product card
    const attributesHTML = Object.entries(product.attributes || {})
      .map(([key, value]) => `<div>${key}: ${value}</div>`)
      .join('');

    productCard.innerHTML = `
    ...
    <div class="product-attributes">${attributesHTML}</div>
    ...
  `;
  }
  // Price filter
  const minPrice = parseFloat(minPriceInput.value) || 0;
  const maxPrice = parseFloat(maxPriceInput.value) || Number.MAX_VALUE;
  filtered = filtered.filter(
    (product) =>
      parseFloat(product.price) >= minPrice &&
      parseFloat(product.price) <= maxPrice
  );
  // In Stock filter
  if (inStockFilter.checked) {
    filtered = filtered.filter((product) => product.quantity > 0);
  }
  // Category filters
  const selectedBrands = Array.from(brandFilters)
    .filter((el) => el.checked)
    .map((el) => el.value);
  if (selectedBrands.length > 0) {
    filtered = filtered.filter((product) =>
      selectedBrands.includes(product.brand)
    );
  }
  // Rating filters
  const selectedRatings = Array.from(ratingFilters)
    .filter((el) => el.checked)
    .map((el) => parseFloat(el.value));
  if (selectedRatings.length > 0) {
    const minRating = Math.min(...selectedRatings);
    filtered = filtered.filter((product) => product.rating >= minRating);
  }
  // Sort filter
  sortProducts(filtered, sortSelect.value);
  return filtered;
}

// Sorting functionality
function sortProducts(array, sortType) {
  switch (sortType) {
    case 'price-low':
      array.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
      break;
    case 'price-high':
      array.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
      break;
    case 'rating':
      array.sort((a, b) => b.rating - a.rating);
      break;
    case 'newest':
      array.reverse(); // Adjust if you have a date field
      break;
    default:
      break; // featured – leave in original order
  }
}

categoryFilter.addEventListener('change', () => {
  renderProducts(filterProducts());
});
applyPriceFilter.addEventListener('click', () => {
  renderProducts(filterProducts());
});
inStockFilter.addEventListener('change', () => {
  renderProducts(filterProducts());
});
brandFilters.forEach((filter) => {
  filter.addEventListener('change', () => {
    renderProducts(filterProducts());
  });
});
ratingFilters.forEach((filter) => {
  filter.addEventListener('change', () => {
    renderProducts(filterProducts());
  });
});
sortSelect.addEventListener('change', () => {
  let filtered = filterProducts();
  renderProducts(filtered);
});

// View toggle functionality
gridViewBtn.addEventListener('click', function () {
  productsContainer.classList.remove('list-view');
  gridViewBtn.classList.add('active');
  listViewBtn.classList.remove('active');
});
listViewBtn.addEventListener('click', function () {
  productsContainer.classList.add('list-view');
  listViewBtn.classList.add('active');
  gridViewBtn.classList.remove('active');
});

// Pagination (demo only)
document.querySelectorAll('.page-button').forEach((button) => {
  button.addEventListener('click', function () {
    document
      .querySelectorAll('.page-button')
      .forEach((btn) => btn.classList.remove('active'));
    this.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Fetch products from Firestore and update UI
async function fetchProducts() {
  try {
    const listingsSnapshot = await getDocs(collection(db, 'listings'));
    products = listingsSnapshot.docs.map((docSnap) => {
      return { id: docSnap.id, ...docSnap.data() };
    });
    renderProducts(products);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

// Auth state listener to manage user data and cart/wishlist
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    // Optionally, fetch the user's cart and wishlist from Firestore
    // and update the UI accordingly.
    // For brevity, we assume empty cart/wishlist if not implemented.
  } else {
    userCart = {};
    userWishlist = [];
  }
  // Fetch products after setting auth state so that add-to-cart and wishlist
  // functions know if a user is logged in.
  await fetchProducts();
});
