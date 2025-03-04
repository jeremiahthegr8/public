// main.js

// Import Firebase configuration and Firestore functions
import { app, auth, db, storage, analytics } from './database/config.js';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Import cart and wishlist functions (see below)
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
  async function updateUserCounters() {
    if (!currentUser) return;
    // Query user's cart collection and sum the quantities.
    const cartSnapshot = await getDocs(
      collection(db, 'users', currentUser.uid, 'cart')
    );
    let cartCount = 0;
    cartSnapshot.forEach((docSnap) => {
      cartCount += docSnap.data().quantity;
    });
    // Query wishlist collection; count the number of documents.
    const wishlistSnapshot = await getDocs(
      collection(db, 'users', currentUser.uid, 'wishlist')
    );
    let wishlistCount = wishlistSnapshot.size;
    // Update the user document with these counts.
    await updateDoc(doc(db, 'users', currentUser.uid), {
      cartCount,
      wishlistCount,
    });
    // Update the header icons for both main and sticky headers.
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

  // ========= 2. DROPDOWN & MOBILE MENUS (for both headers) =========

  // Select both main and sticky header toggles using a comma-separated selector.
  const accountToggleElems = document.querySelectorAll(
    '#account-toggle, #account-toggle-sticky'
  );
  const cartToggleElems = document.querySelectorAll(
    '#cart-toggle, #cart-toggle-sticky'
  );

  // Assuming both headers share the same dropdown menus, we can target them once:
  const accountDropdownElems = document.querySelectorAll('.account-dropdown');
  const cartDropdownElems = document.querySelectorAll('.cart-dropdown');

  accountToggleElems.forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      // Toggle the display of all account dropdowns.
      accountDropdownElems.forEach((dropdown) => {
        dropdown.style.display =
          dropdown.style.display === 'block' ? 'none' : 'block';
      });
      // Hide cart dropdowns
      cartDropdownElems.forEach((dropdown) => {
        dropdown.style.display = 'none';
      });
    });
  });

  cartToggleElems.forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      // Toggle the display of all cart dropdowns.
      cartDropdownElems.forEach((dropdown) => {
        dropdown.style.display =
          dropdown.style.display === 'block' ? 'none' : 'block';
      });
      // Hide account dropdowns
      accountDropdownElems.forEach((dropdown) => {
        dropdown.style.display = 'none';
      });
    });
  });

  // Hide dropdowns if clicking outside of them.
  document.addEventListener('click', (e) => {
    // If the click target isn't contained in any account toggle or dropdown, hide account dropdowns.
    if (
      ![...accountToggleElems].some((el) => el.contains(e.target)) &&
      ![...accountDropdownElems].some((el) => el.contains(e.target))
    ) {
      accountDropdownElems.forEach(
        (dropdown) => (dropdown.style.display = 'none')
      );
    }
    // Similarly for cart toggles.
    if (
      ![...cartToggleElems].some((el) => el.contains(e.target)) &&
      ![...cartDropdownElems].some((el) => el.contains(e.target))
    ) {
      cartDropdownElems.forEach(
        (dropdown) => (dropdown.style.display = 'none')
      );
    }
  });

  // Mobile menu code remains unchanged.
  const mobileMenuButton = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  mobileMenuButton.addEventListener('click', () => {
    mobileMenu.style.display =
      mobileMenu.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', (e) => {
    if (
      !mobileMenuButton.contains(e.target) &&
      !mobileMenu.contains(e.target)
    ) {
      mobileMenu.style.display = 'none';
    }
  });

  // Listen for auth state changes.
  auth.onAuthStateChanged((user) => {
    currentUser = user;
    if (currentUser) {
      updateUserCounters();
    }
  });

  // ===================================================
  // 2. HERO SLIDER
  // ===================================================
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

  // ===================================================
  // 3. DROPDOWN & MOBILE MENUS
  // ===================================================
  const accountToggle = document.getElementById('account-toggle');
  const accountDropdown = document.querySelector('.account-dropdown');
  const cartToggle = document.getElementById('cart-toggle');
  const cartDropdown = document.querySelector('.cart-dropdown');

  accountToggle.addEventListener('click', (e) => {
    e.preventDefault();
    accountDropdown.style.display =
      accountDropdown.style.display === 'block' ? 'none' : 'block';
    cartDropdown.style.display = 'none';
  });
  cartToggle.addEventListener('click', (e) => {
    e.preventDefault();
    cartDropdown.style.display =
      cartDropdown.style.display === 'block' ? 'none' : 'block';
    accountDropdown.style.display = 'none';
  });
  document.addEventListener('click', (e) => {
    if (
      !accountToggle.contains(e.target) &&
      !accountDropdown.contains(e.target)
    ) {
      accountDropdown.style.display = 'none';
    }
    if (!cartToggle.contains(e.target) && !cartDropdown.contains(e.target)) {
      cartDropdown.style.display = 'none';
    }
  });

  // ===================================================
  // 4. FETCH ALL LISTINGS FROM FIRESTORE
  // ===================================================
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

  // ===================================================
  // 5. GENERATE RATING STARS (Helper Function)
  // ===================================================
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

  // ===================================================
  // 6. QUICK VIEW MODAL (with Cart & Wishlist Actions)
  // ===================================================
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

    // The modal HTML now includes placeholders for dynamic cart controls and wishlist icon.
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

    // Load product state (cart and wishlist) to update the UI
    updateProductActions(product);

    // Wishlist toggle event listener.
    const wishlistBtn = document.querySelector('.wishlist-btn');
    if (wishlistBtn && currentUser) {
      wishlistBtn.addEventListener('click', async () => {
        await toggleWishlist(db, currentUser, product);
        await updateUserCounters();
        // Immediately update the wishlist icon after toggling.
        updateWishlistIcon(product);
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
      // Show cart controls: decrement, quantity display, increment and remove buttons.
      cartActionArea.innerHTML = `
      <div class="cart-controls">
        <button class="cart-decrement btn btn-secondary" style="margin-right:5px;">-</button>
        <span class="cart-quantity" style="margin:0 8px;">${quantity}</span>
        <button class="cart-increment btn btn-secondary" style="margin-left:5px;">+</button>
        <button class="cart-remove btn btn-danger" style="margin-left:10px;"><i class="fa fa-trash"></i></button>
      </div>
    `;

      // Attach event listeners to each cart control button.
      const decrementBtn = cartActionArea.querySelector('.cart-decrement');
      const incrementBtn = cartActionArea.querySelector('.cart-increment');
      const removeBtn = cartActionArea.querySelector('.cart-remove');

      decrementBtn.addEventListener('click', async () => {
        const newQty = quantity - 1;
        await updateCartItemQuantity(db, currentUser, product, newQty);
        updateProductActions(product);
        updateUserCounters();
      });

      incrementBtn.addEventListener('click', async () => {
        const newQty = quantity + 1;
        await updateCartItemQuantity(db, currentUser, product, newQty);
        updateProductActions(product);
        updateUserCounters();
      });

      removeBtn.addEventListener('click', async () => {
        await removeFromCart(db, currentUser, product);
        updateProductActions(product);
        updateUserCounters();
      });
    } else {
      // If product is not in the cart, show the "Add to Cart" button.
      cartActionArea.innerHTML = `<button class="add-to-cart-btn btn btn-primary">Add to Cart</button>`;
      const addToCartBtn = cartActionArea.querySelector('.add-to-cart-btn');
      addToCartBtn.addEventListener('click', async () => {
        await addToCart(db, currentUser, product);
        updateProductActions(product);
        updateUserCounters();
        // Show a cart notification without reloading the page.
        const cartNotification = document.getElementById('cart-notification');
        cartNotification.style.display = 'block';
        setTimeout(() => {
          cartNotification.style.display = 'none';
        }, 3000);
      });
    }
    // Always update the wishlist icon based on the current state.
    updateWishlistIcon(product);
  }

  // This function updates the wishlist icon to be red (filled) if the product is in the wishlist,
  // or grey (outline) if it is not.
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

  // ===================================================
  // 7. FEATURED PRODUCTS (Render listings)
  // ===================================================
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

  // ===================================================
  // 8. TRENDING PRODUCTS
  // ===================================================
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

  // ===================================================
  // 9. TESTIMONIALS
  // ===================================================
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

  // ===================================================
  // 10. BACK TO TOP BUTTON & CART NOTIFICATION
  // ===================================================
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

  // ===================================================
  // 11. INITIALIZE PAGE DATA
  // ===================================================
  async function initializePageData() {
    allListings = await fetchAllListings();
    allListings = allListings.sort(() => 0.5 - Math.random());
    loadFeaturedProducts(true);
    loadTrendingProducts();
    loadTestimonials();
  }
  initializePageData();

  // ===================================================
  // 12. SCROLL ANIMATIONS FOR PRODUCT CARDS
  // ===================================================
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
