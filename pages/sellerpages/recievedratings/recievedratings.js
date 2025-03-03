import { auth, db } from '../../database/config.js';
import {
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  increment,
} from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// DOM Elements
const feedbackListEl = document.querySelector('.feedback-list');
const tabButtons = document.querySelectorAll('.feedback-tabs .tab');
const sortSelect = document.getElementById('sort-select');
const sortingOptionsEl = document.getElementById('sorting-options');
const logoutBtn = document.getElementById('logout-btn');

let allFeedback = [];

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = '../../index.html';
  } else {
    loadFeedback(user.uid);
    attachTabListeners();
    attachSortListener();
  }
});

// Load feedback (ratings and complaints) for the seller
function loadFeedback(sellerId) {
  const feedbackRef = collection(db, 'feedback');
  const feedbackQuery = query(
    feedbackRef,
    where('sellerId', '==', sellerId),
    orderBy('createdAt', 'desc')
  );

  onSnapshot(feedbackQuery, (snapshot) => {
    allFeedback = [];
    feedbackListEl.innerHTML = '';

    if (snapshot.empty) {
      feedbackListEl.innerHTML = `
        <div class="no-feedback">
          <i class="fas fa-comments"></i>
          <p>No feedback found.</p>
        </div>`;
      return;
    }

    snapshot.forEach((docSnap) => {
      const feedback = docSnap.data();
      feedback.id = docSnap.id;
      allFeedback.push(feedback);
    });

    // Apply filter based on currently active tab
    const activeTab = document.querySelector('.feedback-tabs .tab.active');
    const typeFilter = activeTab ? activeTab.getAttribute('data-type') : 'all';
    filterFeedback(typeFilter);
  });
}

// Filter feedback by type and apply sorting for ratings
function filterFeedback(typeFilter) {
  let filtered = [];
  if (typeFilter === 'all') {
    filtered = allFeedback;
  } else {
    filtered = allFeedback.filter((fb) => fb.type.toLowerCase() === typeFilter);
  }

  // If the active tab is "rating", apply additional sorting based on dropdown
  if (typeFilter === 'rating') {
    const sortOption = sortSelect.value;
    if (sortOption === 'recent') {
      filtered.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
    } else if (sortOption === 'oldest') {
      filtered.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds);
    } else if (sortOption === 'highest') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sortOption === 'lowest') {
      filtered.sort((a, b) => a.rating - b.rating);
    }
  }

  renderFeedback(filtered);
}

// Render feedback items in the DOM
function renderFeedback(feedbackArray) {
  feedbackListEl.innerHTML = '';
  if (feedbackArray.length === 0) {
    feedbackListEl.innerHTML = `
      <div class="no-feedback">
        <i class="fas fa-comments"></i>
        <p>No feedback found.</p>
      </div>`;
    return;
  }

  feedbackArray.forEach((fb) => {
    const card = document.createElement('div');
    card.classList.add('feedback-card');

    // Format date if available
    const dateStr = fb.createdAt
      ? new Date(fb.createdAt.seconds * 1000).toLocaleDateString()
      : '';

    let html = `<h3>${fb.type === 'rating' ? 'Rating' : 'Complaint'} from ${
      fb.buyerInfo?.fullName || 'Anonymous'
    }</h3>`;
    if (fb.type === 'rating') {
      html += `<p><strong>Rating:</strong> ${fb.rating} / 5</p>`;
    }
    html += `<p><strong>Comment:</strong> ${fb.comment || 'No comment'}</p>`;
    html += `<p><strong>Date:</strong> ${dateStr}</p>`;
    card.innerHTML = html;

    feedbackListEl.appendChild(card);
  });
}

// Attach tab event listeners
function attachTabListeners() {
  tabButtons.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabButtons.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const typeFilter = tab.getAttribute('data-type');
      // Show sorting options only for "Ratings"
      if (typeFilter === 'rating') {
        sortingOptionsEl.style.display = 'block';
      } else {
        sortingOptionsEl.style.display = 'none';
      }
      filterFeedback(typeFilter);
    });
  });
}

// Attach sorting listener (only applicable when Ratings tab is active)
function attachSortListener() {
  sortSelect.addEventListener('change', () => {
    const activeTab = document.querySelector('.feedback-tabs .tab.active');
    const typeFilter = activeTab ? activeTab.getAttribute('data-type') : 'all';
    if (typeFilter === 'rating') {
      filterFeedback('rating');
    }
  });
}

// Logout handler
logoutBtn.addEventListener('click', () => {
  signOut(auth)
    .then(() => (window.location.href = '../../index.html'))
    .catch((err) => console.error('Error signing out:', err));
});
