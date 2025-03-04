import { auth, db } from './database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Global state
let currentUser = null;
let userCart = {}; // { productId: quantity }
let userWishlist = []; // [productId, ...]

// ---------------------
// HEADER & AUTH HANDLING
// ---------------------
document.addEventListener('DOMContentLoaded', async () => {
  const signupLink = document.querySelector('.signup-link');
  const accountLink = document.querySelector('.account-link');
  const logoutBtn = document.querySelector('.logout-btn');
  const cartIcon = document.querySelector('.fa-shopping-cart').parentElement;
  const wishlistIcon = document.querySelector('.fa-heart').parentElement;
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      signupLink.style.display = 'none';
      accountLink.style.display = 'block';
      logoutBtn.style.display = 'block';

      cartIcon.addEventListener('click', () => {
        window.location.href = './pages/userpages/mycart/mycart.html';
      });
      wishlistIcon.addEventListener('click', () => {
        window.location.href = './pages/userpages/wishlist/wishlist.html';
      });

      await fetchUserCart();
      await fetchUserWishlist();
      updateHeaderCounters();
      await loadFeaturedProducts();
    } else {
      signupLink.style.display = 'block';
      accountLink.style.display = 'none';
      logoutBtn.style.display = 'none';

      cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = './pages/userpages/SignUp/SignUp.html';
      });
      wishlistIcon.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = './pages/userpages/SignUp/SignUp.html';
      });
      userCart = {};
      userWishlist = [];
      await loadFeaturedProducts();
    }
  });

  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => location.reload())
      .catch((error) => console.error('Logout Error:', error));
  });

  // ---------------------
  // CATEGORY & SEARCH REDIRECTION
  // ---------------------
  const categoryCards = document.querySelectorAll('.categories .card');
  categoryCards.forEach((card) => {
    card.addEventListener('click', () => {
      const categoryName = card.querySelector('.content h3').textContent.trim();
      window.location.href = `./pages/userpages/Shop/shop.html?category=${encodeURIComponent(
        categoryName
      )}`;
    });
  });
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      const searchTerm = searchInput.value.trim();
      if (searchTerm) {
        window.location.href = `./pages/userpages/Shop/shop.html?search=${encodeURIComponent(
          searchTerm
        )}`;
      }
    });
  }

  // Load featured products after user data is ready
  await loadFeaturedProducts();

  // (Optional) Carousel & scroll animations…
  const track = document.querySelector('.carousel-track');
  const items = document.querySelectorAll('.carousel-item');
  if (items.length > 0) {
    const itemWidth = items[0].clientWidth;
    const totalItems = items.length / 2;
    let index = 0;
    function moveCarousel() {
      index++;
      track.style.transform = `translateX(-${itemWidth * index}px)`;
      if (index === totalItems) {
        setTimeout(() => {
          track.style.transition = 'none';
          track.style.transform = 'translateX(0)';
          index = 0;
          void track.offsetWidth;
          track.style.transition = 'transform 0.5s ease-in-out';
        }, 500);
      }
    }
    setInterval(moveCarousel, 10000);
  }
  const animatedElements = document.querySelectorAll(
    '.fade-in, .slide-in-left, .zoom-in'
  );
  const observerOptions = { threshold: 0.2 };
  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  animatedElements.forEach((el) => observer.observe(el));
});

// ---------------------
// UTILITY FUNCTIONS
// ---------------------
function generateStars(rating) {
  const fullStars = Math.floor(rating || 0);
  const halfStar = (rating || 0) - fullStars >= 0.5;
  let starsHtml = '';
  for (let i = 0; i < fullStars; i++) {
    starsHtml += '<i class="fas fa-star"></i>';
  }
  if (halfStar) {
    starsHtml += '<i class="fas fa-star-half-alt"></i>';
  }
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  for (let i = 0; i < emptyStars; i++) {
    starsHtml += '<i class="far fa-star"></i>';
  }
  return starsHtml;
}

async function fetchUserCart() {
  if (!currentUser) return;
  try {
    const cartSnapshot = await getDocs(
      collection(db, 'users', currentUser.uid, 'cart')
    );
    userCart = {};
    cartSnapshot.forEach((docSnap) => {
      userCart[docSnap.id] = docSnap.data().quantity;
    });
  } catch (error) {
    console.error('Error fetching user cart:', error);
  }
}

async function fetchUserWishlist() {
  if (!currentUser) return;
  try {
    const wishlistSnapshot = await getDocs(
      collection(db, 'users', currentUser.uid, 'wishlist')
    );
    userWishlist = [];
    wishlistSnapshot.forEach((docSnap) => {
      userWishlist.push(docSnap.id);
    });
  } catch (error) {
    console.error('Error fetching user wishlist:', error);
  }
}

function updateHeaderCounters() {
  const cartLink = document.querySelector('.fa-shopping-cart').parentElement;
  let cartBadge = cartLink.querySelector('.cart-badge');
  if (!cartBadge) {
    cartBadge = document.createElement('span');
    cartBadge.classList.add('cart-badge');
    cartBadge.style.background = '#3b82f6';
    cartBadge.style.color = '#fff';
    cartBadge.style.borderRadius = '50%';
    cartBadge.style.padding = '0 6px';
    cartBadge.style.marginLeft = '5px';
    cartBadge.style.minWidth = '20px';
    cartBadge.style.display = 'inline-block';
    cartBadge.style.textAlign = 'center';
    cartLink.appendChild(cartBadge);
  }
  const cartCount = Object.values(userCart).reduce((sum, qty) => sum + qty, 0);
  cartBadge.textContent = cartCount;

  const wishlistLink = document.querySelector('.fa-heart').parentElement;
  let wishlistBadge = wishlistLink.querySelector('.wishlist-badge');
  if (!wishlistBadge) {
    wishlistBadge = document.createElement('span');
    wishlistBadge.classList.add('wishlist-badge');
    wishlistBadge.style.background = '#3b82f6';
    wishlistBadge.style.color = '#fff';
    wishlistBadge.style.borderRadius = '50%';
    wishlistBadge.style.padding = '0 6px';
    wishlistBadge.style.marginLeft = '5px';
    wishlistBadge.style.minWidth = '20px';
    wishlistBadge.style.display = 'inline-block';
    wishlistBadge.style.textAlign = 'center';
    wishlistLink.appendChild(wishlistBadge);
  }
  wishlistBadge.textContent = userWishlist.length;
}

async function updateUserCounters() {
  if (!currentUser) return;
  const cartCount = Object.values(userCart).reduce((sum, qty) => sum + qty, 0);
  const wishlistCount = userWishlist.length;
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      cartCount,
      wishlistCount,
    });
  } catch (error) {
    console.error('Error updating user counters:', error);
  }
}

// ---------------------
// FEATURED PRODUCTS FUNCTIONS
// ---------------------
async function loadFeaturedProducts() {
  try {
    const listingsSnapshot = await getDocs(collection(db, 'listings'));
    const listings = listingsSnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    listings.sort(() => 0.5 - Math.random());
    const featured = listings.slice(0, Math.min(5, listings.length));
    renderFeaturedProducts(featured);
  } catch (error) {
    console.error('Error loading featured products:', error);
  }
}

function renderFeaturedProducts(products) {
  const featuredGrid = document.querySelector('.featured-products .grid');
  if (!featuredGrid) return;
  featuredGrid.innerHTML = '';
  products.forEach((product) => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.id = product.id;
    renderFeaturedCard(card, product);
    attachCardEvents(card, product);
    featuredGrid.appendChild(card);
  });
}

function renderFeaturedCard(card, product) {
  let cartHTML = '';
  if (currentUser && userCart[product.id]) {
    cartHTML = `
      <div class="cart-controls" data-id="${product.id}">
        <button class="decrease">-</button>
        <span class="quantity">${userCart[product.id]}</span>
        <button class="increase">+</button>
        <button class="remove"><i class="fas fa-trash"></i></button>
      </div>
    `;
  } else {
    cartHTML = `<a href="#" class="add-to-cart"><i class="fas fa-shopping-cart"></i></a>`;
  }
  const wishlistClass =
    currentUser && userWishlist.includes(product.id)
      ? 'add-to-wishlist active'
      : 'add-to-wishlist';

  card.innerHTML = `
    <div class="image-container">
      <img src="${product.mainImageUrl}" alt="${product.name}" />
    </div>
    <div class="content">
      <h3 title="${product.name}">${product.name}</h3>
      <p>$${product.price}</p>
      <div class="rating">
        ${generateStars(product.rating)} <span class="count">(${
    product.ratingCount || 0
  })</span>
      </div>
      <div class="buttons">
        ${cartHTML}
        <a href="#" class="${wishlistClass}"><i class="fas fa-heart"></i></a>
      </div>
    </div>
  `;
}

function attachCardEvents(card, product) {
  if (currentUser) {
    if (userCart[product.id]) {
      const cartControls = card.querySelector('.cart-controls');
      cartControls
        .querySelector('.decrease')
        .addEventListener('click', async (e) => {
          e.preventDefault();
          const currentQty = userCart[product.id];
          if (currentQty <= 1) {
            await removeFromCartHomepage(product);
          } else {
            await updateCartItemQuantityHomepage(product, currentQty - 1);
          }
          updateProductCard(product);
        });
      cartControls
        .querySelector('.increase')
        .addEventListener('click', async (e) => {
          e.preventDefault();
          const currentQty = userCart[product.id];
          await updateCartItemQuantityHomepage(product, currentQty + 1);
          updateProductCard(product);
        });
      cartControls
        .querySelector('.remove')
        .addEventListener('click', async (e) => {
          e.preventDefault();
          await removeFromCartHomepage(product);
          updateProductCard(product);
        });
    } else {
      const addToCartBtn = card.querySelector('.add-to-cart');
      addToCartBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await addToCartHomepage(product);
        updateProductCard(product);
      });
    }
    const wishlistBtn = card.querySelector('.add-to-wishlist');
    wishlistBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await toggleWishlistHomepage(product);
      updateProductCard(product);
    });
  } else {
    card.querySelector('.add-to-cart').addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = './pages/userpages/SignUp/SignUp.html';
    });
    card.querySelector('.add-to-wishlist').addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = './pages/userpages/SignUp/SignUp.html';
    });
  }
}

function updateProductCard(product) {
  const card = document.querySelector(
    `.featured-products .card[data-id="${product.id}"]`
  );
  if (card) {
    renderFeaturedCard(card, product);
    attachCardEvents(card, product);
  }
  updateHeaderCounters();
}

// ---------------------
// HOMEPAGE CART & WISHLIST ACTIONS
// ---------------------
async function addToCartHomepage(product) {
  if (!currentUser) {
    window.location.href = './pages/userpages/SignUp/SignUp.html';
    return;
  }
  try {
    const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', product.id);
    await setDoc(cartDocRef, { quantity: 1 });
    userCart[product.id] = 1;
    await updateUserCounters();
    updateHeaderCounters();
  } catch (error) {
    console.error('Error adding product to cart:', error);
  }
}

async function updateCartItemQuantityHomepage(product, newQuantity) {
  try {
    const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', product.id);
    if (newQuantity <= 0) {
      await deleteDoc(cartDocRef);
      delete userCart[product.id];
    } else {
      await setDoc(cartDocRef, { quantity: newQuantity });
      userCart[product.id] = newQuantity;
    }
    await updateUserCounters();
    updateHeaderCounters();
  } catch (error) {
    console.error('Error updating cart quantity:', error);
  }
}

async function removeFromCartHomepage(product) {
  try {
    const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', product.id);
    await deleteDoc(cartDocRef);
    delete userCart[product.id];
    await updateUserCounters();
    updateHeaderCounters();
  } catch (error) {
    console.error('Error removing product from cart:', error);
  }
}

async function toggleWishlistHomepage(product) {
  if (!currentUser) {
    window.location.href = './pages/userpages/SignUp/SignUp.html';
    return;
  }
  try {
    const wishlistDocRef = doc(
      db,
      'users',
      currentUser.uid,
      'wishlist',
      product.id
    );
    if (userWishlist.includes(product.id)) {
      await deleteDoc(wishlistDocRef);
      userWishlist = userWishlist.filter((id) => id !== product.id);
    } else {
      await setDoc(wishlistDocRef, { addedAt: new Date() });
      userWishlist.push(product.id);
    }
    await updateUserCounters();
    updateHeaderCounters();
  } catch (error) {
    console.error('Error toggling wishlist:', error);
  }
}
