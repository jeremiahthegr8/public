// main.js

// Import Firebase configuration and Firestore functions
import { app, auth, db, storage, analytics } from './database/config.js';
import {
  collection,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

document.addEventListener('DOMContentLoaded', () => {
  // Global variables for listings and pagination
  let allListings = [];
  let currentPage = 0;
  const productsPerPage = 8;

  // Fake testimonials data (since you don't have testimonials in Firebase)
  const fakeTestimonials = [
    { message: 'I love Elegance! Great quality and service.', author: 'Alice' },
    { message: 'Fantastic shopping experience.', author: 'Bob' },
    {
      message: 'Highly recommend Elegance for premium products.',
      author: 'Charlie',
    },
  ];

  // ========= HERO SLIDER =========
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

  // ========= DROPDOWN MENUS =========
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

  // ========= MOBILE MENU =========
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

  // ========= FETCH ALL LISTINGS FROM FIRESTORE =========
  async function fetchAllListings() {
    try {
      const listingsSnapshot = await getDocs(collection(db, 'listings'));
      const listings = listingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return listings;
    } catch (error) {
      console.error('Error fetching listings:', error);
      return [];
    }
  }

  // Enhanced product card creation functions

  // Function to load featured products with enhanced styling
  function loadFeaturedProducts(reset = false) {
    if (reset) {
      currentPage = 0;
      productsGrid.innerHTML = '';
    }

    const startIndex = currentPage * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const listingsToDisplay = allListings.slice(startIndex, endIndex);

    listingsToDisplay.forEach((product, index) => {
      // Create enhanced product card
      const card = document.createElement('div');
      card.className = 'product-card';

      // New code: use the rating from the listing data
      const rating = product.rating; // Ensure each product in Firestore includes a "rating" field
      const ratingStars = generateRatingStars(rating);

      // Add badge to some products (every 3rd product)
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

  // Function to load trending products with special styling
  function loadTrendingProducts() {
    const trendingContainer = document.getElementById('trending-products');
    trendingContainer.innerHTML = '';

    // Randomly select 4 trending products from allListings
    const trendingItems = [...allListings]
      .sort(() => 0.5 - Math.random())
      .slice(0, 4);

    trendingItems.forEach((product) => {
      const card = document.createElement('div');
      card.className = 'product-card';

      // Generate random sales count for trending items
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

  // Helper function to generate rating stars
  function generateRatingStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    let starsHTML = '';

    // Add full stars
    for (let i = 0; i < fullStars; i++) {
      starsHTML += '<i class="fas fa-star"></i>';
    }

    // Add half star if needed
    if (hasHalfStar) {
      starsHTML += '<i class="fas fa-star-half-alt"></i>';
    }

    // Add empty stars
    for (let i = 0; i < emptyStars; i++) {
      starsHTML += '<i class="far fa-star"></i>';
    }

    return starsHTML;
  }
function showQuickView(product) {
  quickViewModal.style.display = 'flex';

  // Use the product's actual rating
  const rating = product.rating || 0;
  const ratingStars = generateRatingStars(rating);

  // Build tags HTML if available
  const tagsHTML =
    product.tags && product.tags.length > 0
      ? `<div class="product-tags">${product.tags
          .map((tag) => `<span class="tag">${tag}</span>`)
          .join('')}</div>`
      : '';

  // Format stock availability based on quantity
  const quantity = parseInt(product.quantity) || 0;
  const stockStatus =
    quantity > 0
      ? `<span class="in-stock">In Stock (${quantity} available)</span>`
      : '<span class="out-of-stock">Out of Stock</span>';

  // Build thumbnails HTML (limit to 4 thumbnails)
  let thumbnailsHTML = '';
  if (product.additionalImageUrls && product.additionalImageUrls.length > 0) {
    thumbnailsHTML = product.additionalImageUrls
      .slice(0, 4)
      .map((url) => `<img src="${url}" alt="Thumbnail" class="thumbnail" />`)
      .join('');
  }

  // Use a two-column flex layout so that images appear on the left and details on the right.
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
        <div class="product-actions" style="margin-top: var(--spacing-md);">
          <button class="add-to-cart-btn btn btn-primary">Add to Cart</button>
          <button class="wishlist-btn btn btn-outline"><i class="far fa-heart"></i></button>
        </div>
      </div>
    </div>
  `;

  // Add event listeners for thumbnails: clicking a thumbnail updates the main image.
  const thumbnails = document.querySelectorAll('.thumbnail');
  const mainImage = document.querySelector('.main-image');

  thumbnails.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      mainImage.src = thumb.src;
    });
  });

  // Add event listener for the add-to-cart button to trigger cart notification.
  document.querySelector('.add-to-cart-btn')?.addEventListener('click', () => {
    cartNotification.style.display = 'block';
    setTimeout(() => {
      cartNotification.style.display = 'none';
    }, 3000);
  });
}

  // Call this function after loading products
  document.addEventListener('DOMContentLoaded', () => {
    // Your existing code...

    // Add this to your initialization
    const originalInitPageData = initializePageData;

    // Override with enhanced version
    window.initializePageData = async function () {
      await originalInitPageData();
      addScrollAnimations();
    };
  });

  // ========= FEATURED PRODUCTS =========
  const filterTabs = document.querySelectorAll('.filter-tabs li');
  const productsGrid = document.getElementById('products-grid');

  // ========= TESTIMONIALS =========
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
      dot.className = 'dot' + (index === 0 ? ' active' : '');
      dot.addEventListener('click', () => {
        const slides =
          testimonialsSlider.querySelectorAll('.testimonial-slide');
        slides.forEach((s, i) => {
          s.classList.toggle('active', i === index);
        });
        const dots = testimonialDots.querySelectorAll('.dot');
        dots.forEach((d, i) => {
          d.classList.toggle('active', i === index);
        });
      });
      testimonialDots.appendChild(dot);
    });
  }

  // ========= QUICK VIEW MODAL =========
  const quickViewModal = document.getElementById('quick-view-modal');
  const closeQuickView = document.getElementById('close-quick-view');


  closeQuickView.addEventListener('click', () => {
    quickViewModal.style.display = 'none';
  });

  // ========= BACK TO TOP BUTTON =========
  const backToTopButton = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    backToTopButton.style.display = window.scrollY > 300 ? 'block' : 'none';
  });
  backToTopButton.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ========= CART NOTIFICATION =========
  const cartNotification = document.getElementById('cart-notification');
  document.querySelectorAll('.add-to-cart').forEach((button) => {
    button.addEventListener('click', () => {
      cartNotification.style.display = 'block';
      setTimeout(() => {
        cartNotification.style.display = 'none';
      }, 3000);
    });
  });

  // ========= INITIALIZE PAGE DATA =========
  async function initializePageData() {
    // Fetch all listings from Firestore and store in a global array
    allListings = await fetchAllListings();
    // Shuffle listings to ensure randomness
    allListings = allListings.sort(() => 0.5 - Math.random());
    loadFeaturedProducts(true);
    loadTrendingProducts();
    loadTestimonials();
  }

  initializePageData();

  // ========= FILTER TABS (Optional) =========
  filterTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      filterTabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      // For demo purposes, reshuffle listings for "all" products when a filter is clicked
      allListings = allListings.sort(() => 0.5 - Math.random());
      loadFeaturedProducts(true);
    });
  });
});
