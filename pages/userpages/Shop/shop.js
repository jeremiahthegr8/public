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

const searchInput = document.getElementById('search-input');
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

// ========= 4. DROPDOWN & MOBILE MENUS =========
const cartToggle = document.getElementById('cart-toggle');
const cartDropdown = document.querySelector('.cart-dropdown');

cartToggle.addEventListener('click', (e) => {
  e.preventDefault();
  cartDropdown.style.display =
    cartDropdown.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', (e) => {
  if (!cartToggle.contains(e.target) && !cartDropdown.contains(e.target)) {
    cartDropdown.style.display = 'none';
  }
});

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

async function checkIfInWishlist(productId) {
  if (!currentUser) return false;
  const wishlistDocRef = doc(db, 'users', currentUser.uid, 'wishlist', productId);
  const docSnap = await getDoc(wishlistDocRef);
  return docSnap.exists();
}



function renderProducts(productsToRender) {
  productsGrid.innerHTML = '';
  if (productsToRender.length === 0) {
    productsGrid.innerHTML = '<p>No products found matching your criteria.</p>';
    productCountElement.textContent = '0';
    return;
  }

  productsToRender.forEach(async (product) => {
    const isInWishlist = await checkIfInWishlist(product.id);
    const productCard = document.createElement('div');
    productCard.className = 'product-card';
    productCard.innerHTML = `
          <img src="${
            product.mainImageUrl || '/api/placeholder/220/220'
          }" alt="${product.name}" class="product-image" />
          <div class="product-info">
            <h3 class="product-title">${product.name}</h3>
            <div class="categoriezcon">
            <div class="product-category">${product.category}</div>
            <div class="catarrow">></div>
            <div class="product-subcategory">${product.subcategory}</div>
            </div>
            <p class="product-description">${product.description}</p>
            <div class="product-rating">
              <span class="star-rating">${renderStars(product.rating)}</span>
              <span>${product.rating} (${
      product.ratingCount || 0
    }) reviews </span>
            </div>
            <div class="product-price">$${parseFloat(product.price).toFixed(
              2
            )}</div>
          <div class="product-actions" style="margin-top: var(--spacing-md); display: flex; align-items: center; justify-content: space-between;">
            <div class="cart-action-area">
              <!-- Cart controls will be added here -->
            </div>
            <button class="wishlist-btn btn btn-light" style="border: none; background: none; cursor: pointer;">
              <i class="wishlist-icon ${
                isInWishlist ? 'fas fa-heart' : 'far fa-heart'
              }" style="color: ${isInWishlist ? 'blue' : 'inherit'}"></i>
            </button>
          </div>
        `;

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
        e.target.closest('.wishlist-btn') ||
        e.target.closest('.wishlist-icon')
      )
        return;
      window.location.href = `../product/product.html?id=${product.id}`;
    });

    // Initialize cart controls
    updateProductActions(product, productCard);

    // Wishlist button event listener
    const wishlistBtn = productCard.querySelector('.wishlist-btn');
    if (wishlistBtn) {
      wishlistBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!currentUser) {
          console.warn('User must be logged in to use wishlist');
          return;
        }

        const wishlistIcon = wishlistBtn.querySelector('.wishlist-icon');
        const isCurrentlyInWishlist = wishlistIcon.classList.contains('fas');
        
        // Optimistic UI update
        wishlistIcon.classList.toggle('fas', !isCurrentlyInWishlist);
        wishlistIcon.classList.toggle('far', isCurrentlyInWishlist);
        wishlistIcon.style.color = !isCurrentlyInWishlist ? 'blue' : 'inherit';

        try {
          await toggleWishlist(db, currentUser, product);
          await updateDoc(doc(db, 'users', currentUser.uid), {
            wishlistCount: increment(isCurrentlyInWishlist ? -1 : 1),
          });
          await updateUserCounters();
        } catch (error) {
          // Revert UI if operation fails
          wishlistIcon.classList.toggle('fas', isCurrentlyInWishlist);
          wishlistIcon.classList.toggle('far', !isCurrentlyInWishlist);
          wishlistIcon.style.color = isCurrentlyInWishlist ? 'blue' : 'inherit';
          console.error('Error updating wishlist:', error);
        }
      });
    }

    productsGrid.appendChild(productCard);
  });
  productCountElement.textContent = productsToRender.length;
}
async function updateProductActions(product, productCard) {
  const cartActionArea = productCard.querySelector('.cart-action-area');
  if (!cartActionArea) return;

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

  if (inCart) {
    cartActionArea.innerHTML = `
        <div class="cart-controls">
          <button class="cart-decrement btn btn-secondary" style="margin-right:5px;" disabled>-</button>
          <span class="cart-quantity" style="margin:0 8px;">${quantity}</span>
          <button class="cart-increment btn btn-secondary" style="margin-left:5px;" disabled>+</button>
          <button class="cart-remove btn btn-danger" style="margin-left:10px;" disabled><i class="fa fa-trash"></i></button>
        </div>
      `;

    const decrementBtn = cartActionArea.querySelector('.cart-decrement');
    const incrementBtn = cartActionArea.querySelector('.cart-increment');
    const removeBtn = cartActionArea.querySelector('.cart-remove');

    decrementBtn.disabled = false;
    incrementBtn.disabled = false;
    removeBtn.disabled = false;

    decrementBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      decrementBtn.disabled = true;

      const newQty = quantity - 1;
      try {
        if (newQty > 0) {
          await updateCartItemQuantity(db, currentUser, product, newQty);
          await updateDoc(doc(db, 'users', currentUser.uid), {
            cartCount: increment(-1),
          });
        } else {
          await removeFromCart(db, currentUser, product);
          await updateDoc(doc(db, 'users', currentUser.uid), {
            cartCount: increment(-quantity),
          });
        }
        await updateProductActions(product, productCard);
        await updateUserCounters();
      } catch (error) {
        console.error('Error decrementing quantity:', error);
      } finally {
        decrementBtn.disabled = false;
      }
    });

    incrementBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      incrementBtn.disabled = true;

      try {
        await updateDoc(doc(db, 'users', currentUser.uid, 'cart', product.id), {
          quantity: increment(1),
        });
        await updateDoc(doc(db, 'users', currentUser.uid), {
          cartCount: increment(1),
        });
        await updateProductActions(product, productCard);
        await updateUserCounters();
      } catch (error) {
        console.error('Error incrementing quantity:', error);
      } finally {
        incrementBtn.disabled = false;
      }
    });

    removeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      removeBtn.disabled = true;

      try {
        await removeFromCart(db, currentUser, product);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          cartCount: increment(-quantity),
        });
        await updateProductActions(product, productCard);
        await updateUserCounters();
      } catch (error) {
        console.error('Error removing item from cart:', error);
      } finally {
        removeBtn.disabled = false;
      }
    });
  } else {
    cartActionArea.innerHTML = `<button class="add-to-cart-btn" disabled>Add to Cart</button>`;
    const addToCartBtn = cartActionArea.querySelector('.add-to-cart-btn');
    addToCartBtn.disabled = false;

    addToCartBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      addToCartBtn.disabled = true;

      try {
        await addToCart(db, currentUser, product);
        await updateDoc(doc(db, 'users', currentUser.uid), {
          cartCount: increment(1),
        });
        await updateProductActions(product, productCard);
        await updateUserCounters();

        const cartNotification = document.getElementById('cart-notification');
        cartNotification.style.display = 'block';
        setTimeout(() => {
          cartNotification.style.display = 'none';
        }, 3000);
      } catch (error) {
        console.error('Error adding to cart:', error);
      } finally {
        addToCartBtn.disabled = false;
      }
    });
  }
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

function filterProducts() {
  let filteredProducts = [...products];

  // Category and Subcategory Filters
  const mainCategory = document.getElementById('mainCategory').value;
  const subCategory = document.getElementById('subCategory').value;

  if (mainCategory) {
    filteredProducts = filteredProducts.filter(
      (product) => product.category.toLowerCase() === mainCategory.toLowerCase()
    );
  }

  if (subCategory) {
    filteredProducts = filteredProducts.filter(
      (product) =>
        product.subcategory &&
        product.subcategory.toLowerCase() === subCategory.toLowerCase()
    );
  }

  // Price Filter
  const minPrice = parseFloat(minPriceInput.value) || 0;
  const maxPrice = parseFloat(maxPriceInput.value) || Number.MAX_VALUE;
  filteredProducts = filteredProducts.filter(
    (product) =>
      parseFloat(product.price) >= minPrice &&
      parseFloat(product.price) <= maxPrice
  );

  // In Stock Filter
  if (inStockFilter.checked) {
    filteredProducts = filteredProducts.filter(
      (product) => parseInt(product.quantity) > 0
    );
  }

  // Brand Filter
  const selectedBrands = Array.from(brandFilters)
    .filter((el) => el.checked)
    .map((el) => el.value.toLowerCase());
  if (selectedBrands.length > 0) {
    filteredProducts = filteredProducts.filter((product) =>
      selectedBrands.includes(product.brand.toLowerCase())
    );
  }

  // Rating Filter
  const selectedRatings = Array.from(ratingFilters)
    .filter((el) => el.checked)
    .map((el) => parseFloat(el.value));
  if (selectedRatings.length > 0) {
    const minRating = Math.min(...selectedRatings);
    filteredProducts = filteredProducts.filter(
      (product) => product.rating >= minRating
    );
  }

  // Sort Products
  sortProducts(filteredProducts, sortSelect.value);

  return filteredProducts;
}

// Event listeners for dynamic category and subcategory updates
mainCategory.addEventListener('change', () => {
  const category = mainCategory.value;
  subCategory.disabled = !category;
  subCategory.innerHTML = '<option value="">All Subcategories</option>';

  if (category) {
    const subcategories = products
      .filter(
        (product) =>
          product.category &&
          product.category.toLowerCase() === category.toLowerCase()
      )
      .map((product) => product.subcategory)
      .filter((value, index, self) => value && self.indexOf(value) === index);

    subcategories.forEach((sub) => {
      const option = document.createElement('option');
      option.value = sub;
      option.textContent = sub;
      subCategory.appendChild(option);
    });
  }

  renderProducts(filterProducts());
});

subCategory.addEventListener('change', () => {
  renderProducts(filterProducts());
});

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
      array.reverse();
      break;
    default:
      break;
  }
}

// Search functionality
searchBtn.addEventListener('click', () => {
  const searchTerm = searchInput.value.toLowerCase();
  if (searchTerm) {
    const filteredProducts = products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm)
    );
    renderProducts(filteredProducts);
  } else {
    renderProducts(products);
  }
});
if (searchInput) {
  searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
      const searchTerm = searchInput.value.toLowerCase();
      if (searchTerm) {
        const filteredProducts = products.filter((product) =>
          product.name.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm) ||
          product.subcategory.toLowerCase().includes(searchTerm)
        );
        renderProducts(filteredProducts);
      } else {
        renderProducts(products);
      }
    }
  });
}

// Event listeners
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
  renderProducts(filterProducts());
});

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

let currentPage = 1;
const listingsPerPage = 18;

function renderPagination(totalListings) {
  const paginationContainer = document.getElementById('pagination');
  paginationContainer.innerHTML = '';

  const totalPages = Math.ceil(totalListings / listingsPerPage);
  const maxVisiblePages = 3;

  // Previous button
  const prevButton = document.createElement('button');
  prevButton.className = 'page-button prev-button';
  prevButton.textContent = 'Prev';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderProducts(getPaginatedProducts());
      renderPagination(totalListings);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationContainer.appendChild(prevButton);

  // Page buttons
  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('button');
    pageButton.className = 'page-button';
    pageButton.textContent = i;
    if (i === currentPage) {
      pageButton.classList.add('active');
    }
    pageButton.addEventListener('click', () => {
      currentPage = i;
      renderProducts(getPaginatedProducts());
      renderPagination(totalListings);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationContainer.appendChild(pageButton);
  }

  // Ellipsis for pages before the visible range
  if (startPage > 1) {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'ellipsis';
    ellipsis.textContent = '...';
    paginationContainer.insertBefore(ellipsis, paginationContainer.children[1]);
  }

  // Ellipsis for pages after the visible range
  if (endPage < totalPages) {
    const ellipsis = document.createElement('span');
    ellipsis.className = 'ellipsis';
    ellipsis.textContent = '...';
    paginationContainer.appendChild(ellipsis);
  }

  // Next button
  const nextButton = document.createElement('button');
  nextButton.className = 'page-button next-button';
  nextButton.textContent = 'Next';
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderProducts(getPaginatedProducts());
      renderPagination(totalListings);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  paginationContainer.appendChild(nextButton);
}

function getPaginatedProducts() {
  const startIndex = (currentPage - 1) * listingsPerPage;
  const endIndex = startIndex + listingsPerPage;
  return products.slice(startIndex, endIndex);
}

async function fetchProducts() {
  try {
    const listingsSnapshot = await getDocs(collection(db, 'listings'));
    products = listingsSnapshot.docs.map((docSnap) => {
      return { id: docSnap.id, ...docSnap.data() };
    });
    const filteredProducts = filterProducts(); // Apply filters if any
    renderProducts(getPaginatedProducts(filteredProducts));
    renderPagination(filteredProducts.length);
  } catch (error) {
    console.error('Error fetching products:', error);
  }
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    userCart = {};
    userWishlist = [];
  }
  await fetchProducts();
});