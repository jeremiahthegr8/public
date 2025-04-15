import { app, auth, db, storage, analytics } from './database/config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  increment,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Import cart and wishlist functions
import { addToCart, updateCartItemQuantity, removeFromCart } from './carts.js';
import { toggleWishlist } from './components/wishlist.js';

document.addEventListener('DOMContentLoaded', () => {
  // Global variables for listings and pagination
  let allListings = [];
  let currentPage = 0;
  const productsPerPage = 8;

  // Fake testimonials data
  const fakeTestimonials = [
    { message: 'I love Elegance! Great quality and service.', author: 'Alice' },
    { message: 'Fantastic shopping experience.', author: 'Bob' },
    {
      message: 'Highly recommend Elegance for premium products.',
      author: 'Charlie',
    },
  ];

  // Current authenticated user
  let currentUser = null;

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
          <a href="./pages/userpages/account/account.html" id="account-link">
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
          <a href="./pages/userpages/account/account.html" id="account-link-sticky">
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
          <a href="./pages/userpages/SignUp/SignUp.html" id="account-link">
            <i class="fas fa-sign-in-alt"></i>
            <span>Sign In</span>
          </a>
        `;
      }
      if (containerSticky) {
        containerSticky.innerHTML = `
          <a href="./pages/userpages/SignUp/SignUp.html" id="account-link-sticky">
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

  // ========= 3. HERO SLIDER =========
  const heroSlider = document.getElementById('hero-slider');
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.dot');
  const prevSlideButton = document.getElementById('prev-slide');
  const nextSlideButton = document.getElementById('next-slide');
  let currentSlide = 0;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }
  function nextSlide() {
    currentSlide = (currentSlide + 1) % slides.length;
    showSlide(currentSlide);
  }
  function prevSlide() {
    currentSlide = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(currentSlide);
  }
  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      currentSlide = index;
      showSlide(currentSlide);
    });
  });
  prevSlideButton.addEventListener('click', prevSlide);
  nextSlideButton.addEventListener('click', nextSlide);
  let autoSlideInterval = setInterval(nextSlide, 5000);
  heroSlider.addEventListener('mouseenter', () =>
    clearInterval(autoSlideInterval)
  );
  heroSlider.addEventListener('mouseleave', () => {
    autoSlideInterval = setInterval(nextSlide, 5000);
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

  // ========= 5. FETCH ALL LISTINGS FROM FIRESTORE =========
  async function fetchAllListings() {
    try {
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      const listings = listingsSnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      return listings;
    } catch (error) {
      console.error('Error fetching listings:', error);
      return [];
    }
  }

  // ========= 6. GENERATE RATING STARS (Helper Function) =========
  function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    let starsHTML = '';
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="fas fa-star"></i>';
    }
    if (hasHalfStar) {
      starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<i class="far fa-star"></i>';
    }
    return starsHTML;
  }

  // ========= 7. QUICK VIEW MODAL (with Cart & Wishlist Actions) =========
  const quickViewModal = document.getElementById('quick-view-modal');
  const closeQuickView = document.getElementById('close-quick-view');
  closeQuickView.addEventListener('click', () => {
    quickViewModal.style.display = 'none';
  });

  function showQuickView(product) {
    quickViewModal.style.display = 'flex';
    const rating = product.rating || 0;
    const ratingStars = generateRatingStars(rating);
    const tagsHTML =
      product.tags && product.tags.length > 0
        ? `<div class="product-tags">${product.tags
            .map((tag) => `<span class="tag">${tag}</span>`)
            .join('')}</div>`
        : '';
    const quantity = parseInt(product.quantity) || 0;
    const stockStatus =
      quantity > 0
        ? `<span class="in-stock">In Stock (${quantity} available)</span>`
        : '<span class="out-of-stock">Out of Stock</span>';
    let thumbnailsHTML = '';
    if (product.additionalImageUrls && product.additionalImageUrls.length > 0) {
      thumbnailsHTML = product.additionalImageUrls
        .slice(0, 4)
        .map((url) => `<img src="${url}" alt="Thumbnail" class="thumbnail" />`)
        .join('');
    }

    document.getElementById('quick-view-content').innerHTML = `
      <div class="quick-view-container" style="display: flex; flex-direction: row; gap: 20px; max-height: 90vh;">
        <!-- Left Column: Image Gallery -->
        <div class="quick-view-gallery" style="flex: 1; display: flex; flex-direction: column;">
          <div class="main-image-container" style="flex: 1; display: flex; justify-content: center; align-items: center; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
            <img src="${product.mainImageUrl}" alt="${
      product.name
    }" class="main-image" style="max-width: 100%; max-height: 100%; object-fit: contain;">
          </div>
          ${
            thumbnailsHTML
              ? `<div class="thumbnail-gallery" style="display: flex; justify-content: center; gap: 10px; margin-top: var(--spacing-sm);">
                  ${thumbnailsHTML}
                </div>`
              : ''
          }
        </div>
        <!-- Right Column: Product Info -->
        <div class="quick-view-info" style="flex: 1; display: flex; flex-direction: column; justify-content: space-between; overflow-y: auto; max-height: 90vh;">
          <div>
            <h3>${product.name}</h3>
            ${tagsHTML}
            <div class="product-meta">
              <div class="rating">${ratingStars}</div>
              <span>(${product.ratingCount || 0} reviews)</span>
            </div>
            <div class="product-category">
              <span>${product.category || ''}</span>
              ${
                product.subcategory
                  ? ` > <span>${product.subcategory}</span>`
                  : ''
              }
            </div>
            <div class="product-price">
              <p class="current-price">$${product.price}</p>
            </div>
            <div class="availability">${stockStatus}</div>
            ${
              product.attributes && product.attributes.Model
                ? `<div class="product-model">Model: ${product.attributes.Model}</div>`
                : ''
            }
            <div class="product-description">
              <p>${
                product.description ||
                'No description available for this product.'
              }</p>
            </div>
          </div>
          <!-- Product Actions: Cart controls on the left, Wishlist toggle on the right -->
          <div class="product-actions" style="margin-top: var(--spacing-md); display: flex; align-items: center; justify-content: space-between;">
            <div class="cart-action-area">
              <!-- This area will be dynamically updated to show either Add to Cart or cart controls -->
            </div>
            <button class="wishlist-btn btn btn-outline">
              <i class="wishlist-icon far fa-heart"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Setup thumbnail click to update main image.
    const thumbnails = document.querySelectorAll('.thumbnail');
    const mainImage = document.querySelector('.main-image');
    thumbnails.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        mainImage.src = thumb.src;
      });
    });

    // Load product state (cart and wishlist) to update the UI.
    updateProductActions(product);

    // Wishlist toggle event listener.
    const wishlistBtn = document.querySelector('.wishlist-btn');
    if (wishlistBtn && currentUser) {
      wishlistBtn.addEventListener('click', async () => {
      console.log('Wishlist button clicked for product:', product.id);
      try {
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
        console.log(
        `Product ${product.id} is ${
          wasAdded ? 'not in' : 'already in'
        } the wishlist. Toggling...`
        );

        await toggleWishlist(db, currentUser, product);
        console.log(
        `Product ${product.id} ${
          wasAdded ? 'added to' : 'removed from'
        } wishlist.`
        );

        // Update aggregated wishlist counter: increment if added, decrement if removed
        await updateDoc(doc(db, 'users', currentUser.uid), {
        wishlistCount: increment(wasAdded ? 1 : -1),
        });
        console.log(
        `Wishlist counter ${
          wasAdded ? 'incremented' : 'decremented'
        } for user: ${currentUser.uid}`
        );

        await updateUserCounters();
        console.log('User counters updated.');

        updateWishlistIcon(product);
        console.log('Wishlist icon updated.');
      } catch (error) {
        console.error('Error toggling wishlist:', error);
      }
      });
    }
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

        const cartDocRef = doc(
          db,
          'users',
          currentUser.uid,
          'cart',
          product.id
        );
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

  // This is for removeBtn click event.
  const removeBtn = document.querySelector('.cart-remove');
  if (removeBtn) {
    removeBtn.addEventListener('click', async () => {
      const cartDocRef = doc(
        db,
        'users',
        currentUser.uid,
        'cart',
        product.id
      );
      await removeFromCart(db, currentUser, product);
      await updateDoc(doc(db, 'users', currentUser.uid), {
        cartCount: increment(-quantity),
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

  // ========= 7. FEATURED PRODUCTS (Render listings) =========
  const filterTabs = document.querySelectorAll('.filter-tabs li');
  const productsGrid = document.getElementById('products-grid');

  function loadFeaturedProducts(reset = false) {
    if (reset) {
      currentPage = 0;
      productsGrid.innerHTML = '';
    }
    const startIndex = currentPage * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const listingsToDisplay = allListings.slice(startIndex, endIndex);
    listingsToDisplay.forEach((product, index) => {
      const card = document.createElement('div');
      card.className = 'product-card';
      const rating = product.rating;
      const ratingStars = generateRatingStars(rating);
      const badgeHTML =
        index % 3 === 0
          ? `<span class="badge ${index % 6 === 0 ? 'sale' : 'new'}">${
              index % 6 === 0 ? 'Sale' : 'New'
            }</span>`
          : '';
      card.innerHTML = `
        ${badgeHTML}
        <div class="product-image">
          <img src="${product.mainImageUrl}" alt="${product.name}">
        </div>
        <div class="product-content">
          <h3>${product.name}</h3>
          <p>$${product.price}</p>
          <div class="rating">${ratingStars}</div>
        </div>
        <div class="quick-view">Quick View</div>
      `;
      card.addEventListener('click', () => showQuickView(product));
      productsGrid.appendChild(card);
    });
    currentPage++;
  }

  // ========= 8. TRENDING PRODUCTS =========
  function loadTrendingProducts() {
    const trendingContainer = document.getElementById('trending-products');
    trendingContainer.innerHTML = '';
    const trendingItems = [...allListings]
      .sort(() => 0.5 - Math.random())
      .slice(0, 4);
    trendingItems.forEach((product) => {
      const card = document.createElement('div');
      card.className = 'product-card';
      const salesCount = Math.floor(Math.random() * 200) + 100;
      card.innerHTML = `
        <span class="badge trending">Trending</span>
        <div class="product-image">
          <img src="${product.mainImageUrl}" alt="${product.name}">
        </div>
        <div class="product-content">
          <h3>${product.name}</h3>
          <p>$${product.price}</p>
          <small>${salesCount} sold this week</small>
        </div>
        <div class="quick-view">Quick View</div>
      `;
      card.addEventListener('click', () => showQuickView(product));
      trendingContainer.appendChild(card);
    });
  }

  // ========= 9. TESTIMONIALS =========
  function loadTestimonials() {
    const testimonialsSlider = document.getElementById('testimonials-slider');
    const testimonialDots = document.getElementById('testimonial-dots');
    testimonialsSlider.innerHTML = '';
    testimonialDots.innerHTML = '';
    fakeTestimonials.forEach((testimonial, index) => {
      const slide = document.createElement('div');
      slide.className = 'testimonial-slide';
      slide.innerHTML = `
        <p>"${testimonial.message}"</p>
        <h4>${testimonial.author}</h4>
      `;
      if (index === 0) slide.classList.add('active');
      testimonialsSlider.appendChild(slide);
      const dot = document.createElement('span');
      dot.className = 'dot';
      if (index === 0) dot.classList.add('active');
      dot.addEventListener('click', () => {
        updateTestimonial(index);
      });
      testimonialDots.appendChild(dot);
    });
    let currentIndex = 0;
    function updateTestimonial(newIndex) {
      const slides = testimonialsSlider.querySelectorAll('.testimonial-slide');
      const dots = testimonialDots.querySelectorAll('.dot');
      slides[currentIndex].classList.remove('active');
      dots[currentIndex].classList.remove('active');
      currentIndex = newIndex;
      slides[currentIndex].classList.add('active');
      dots[currentIndex].classList.add('active');
    }
    setInterval(() => {
      const slides = testimonialsSlider.querySelectorAll('.testimonial-slide');
      let nextIndex = (currentIndex + 1) % slides.length;
      updateTestimonial(nextIndex);
    }, 5000);
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

  // ========= 11. INITIALIZE PAGE DATA =========
  async function initializePageData() {
    allListings = await fetchAllListings();
    allListings = allListings.sort(() => 0.5 - Math.random());
    loadFeaturedProducts(true);
    loadTrendingProducts();
    loadTestimonials();
  }
  initializePageData();

  // ========= 12. SCROLL ANIMATIONS FOR PRODUCT CARDS =========
  function addScrollAnimations() {
    const productCards = document.querySelectorAll('.product-card');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    productCards.forEach((card) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(card);
    });
  }
  window.addEventListener('load', addScrollAnimations);
});
