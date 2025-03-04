// Hero Slider
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

// Auto-play slider
let autoSlideInterval = setInterval(nextSlide, 5000);

// Pause auto-play on hover
heroSlider.addEventListener('mouseenter', () =>
  clearInterval(autoSlideInterval)
);
heroSlider.addEventListener('mouseleave', () => {
  autoSlideInterval = setInterval(nextSlide, 5000);
});

// Dropdown Menus
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

// Close dropdowns when clicking outside
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

// Mobile Menu Toggle
const mobileMenuButton = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

mobileMenuButton.addEventListener('click', () => {
  mobileMenu.style.display =
    mobileMenu.style.display === 'block' ? 'none' : 'block';
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
  if (!mobileMenuButton.contains(e.target) && !mobileMenu.contains(e.target)) {
    mobileMenu.style.display = 'none';
  }
});

// Product Filter Tabs
const filterTabs = document.querySelectorAll('.filter-tabs li');
const productsGrid = document.getElementById('products-grid');

filterTabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    filterTabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const filter = tab.getAttribute('data-filter');
    // Simulate filtering (replace with actual filtering logic)
    productsGrid.innerHTML = `<p>Filtering by: ${filter}</p>`;
  });
});

// Load More Products
const loadMoreButton = document.getElementById('load-more-btn');

loadMoreButton.addEventListener('click', () => {
  // Simulate loading more products (replace with actual logic)
  const newProducts = Array.from(
    { length: 4 },
    (_, i) => `
        <div class="product-card">
            <img src="../../assets/images/air-jordan-shoe-nike-sneakers-adidas-yeezy-jordan-9d493e6896549a636419ee58d67ba6c0.png" alt="Product ${i + 1}">
            <h3>Product ${i + 1}</h3>
            <p>$49.99</p>
        </div>
    `
  ).join('');
  productsGrid.insertAdjacentHTML('beforeend', newProducts);
});

// Back to Top Button
const backToTopButton = document.getElementById('back-to-top');

window.addEventListener('scroll', () => {
  if (window.scrollY > 300) {
    backToTopButton.style.display = 'block';
  } else {
    backToTopButton.style.display = 'none';
  }
});

backToTopButton.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Quick View Modal
const quickViewModal = document.getElementById('quick-view-modal');
const closeQuickView = document.getElementById('close-quick-view');

document.querySelectorAll('.product-card').forEach((product) => {
  product.addEventListener('click', () => {
    quickViewModal.style.display = 'flex';
    // Load product details into modal (replace with actual logic)
    document.getElementById('quick-view-content').innerHTML = `
            <div class="product-details">
                <img src="../../assets/images/boot.png">
                <h3>Product Name</h3>
                <p>$49.99</p>
                <p>Product description goes here.</p>
            </div>
        `;
  });
});

closeQuickView.addEventListener('click', () => {
  quickViewModal.style.display = 'none';
});

// Cart Notification
const cartNotification = document.getElementById('cart-notification');

document.querySelectorAll('.add-to-cart').forEach((button) => {
  button.addEventListener('click', () => {
    cartNotification.style.display = 'block';
    setTimeout(() => {
      cartNotification.style.display = 'none';
    }, 3000);
  });
});
