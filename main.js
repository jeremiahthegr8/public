import { auth, db } from './database/config.js'; // Import Firebase modules
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getFirestore,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// Handle authentication UI
document.addEventListener('DOMContentLoaded', () => {
  const signupLink = document.querySelector('.signup-link');
  const accountLink = document.querySelector('.account-link');
  const logoutBtn = document.querySelector('.logout-btn');
  const cartIcon = document.querySelector('.fa-shopping-cart').parentElement;
  const wishlistIcon = document.querySelector('.fa-heart').parentElement;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      signupLink.style.display = 'none';
      accountLink.style.display = 'block';
      logoutBtn.style.display = 'block';

      cartIcon.addEventListener('click', () => {
        window.location.href = './pages/cart/mycart.html';
      });

      wishlistIcon.addEventListener('click', () => {
        window.location.href = './pages/wishlist/wishlist.html';
      });
    } else {
      signupLink.style.display = 'block';
      accountLink.style.display = 'none';
      logoutBtn.style.display = 'none';

      cartIcon.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = './pages/SignUp/SignUp.html';
      });

      wishlistIcon.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = './pages/SignUp/SignUp.html';
      });
    }
  });

  // Logout functionality
  logoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => location.reload())
      .catch((error) => console.error('Logout Error:', error));
  });
});

const track = document.querySelector('.carousel-track');
const items = document.querySelectorAll('.carousel-item');
const itemWidth = items[0].clientWidth;
const totalItems = items.length / 2; // number of unique images
let index = 0;

function moveCarousel() {
  index++;
  track.style.transform = `translateX(-${itemWidth * index}px)`;
  if (index === totalItems) {
    setTimeout(() => {
      track.style.transition = 'none';
      track.style.transform = 'translateX(0)';
      index = 0;
      // Force reflow to re-enable the transition
      void track.offsetWidth;
      track.style.transition = 'transform 0.5s ease-in-out';
    }, 500);
  }
}

setInterval(moveCarousel, 10000);
document.addEventListener('DOMContentLoaded', () => {
  // Select all elements you want to animate on scroll.
  const animatedElements = document.querySelectorAll(
    '.fade-in, .slide-in-left, .zoom-in'
  );

  const observerOptions = {
    threshold: 0.2, // Adjust this to control when the animation triggers
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Optional: remove observer after triggering
      }
    });
  }, observerOptions);

  animatedElements.forEach((el) => {
    observer.observe(el);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  // Target section headers in Categories, Featured Products, and Latest News
  const headerElements = document.querySelectorAll(
    '.categories h2, .featured-products h2, .latest-news h2'
  );

  const observerOptions = { threshold: 0.2 };

  const headerObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Optional: stop observing after activation
      }
    });
  }, observerOptions);

  headerElements.forEach((header) => headerObserver.observe(header));
});