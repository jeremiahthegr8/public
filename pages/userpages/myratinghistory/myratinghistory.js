import { db, auth } from '../../../database/config.js';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

// Global variables
let loadedReviews = [];
let filterState = {
  searchQuery: '',
  tabRating: 'All', // "All" or "5", "4", etc.
  modalFilters: {
    ratings: [], // e.g., [5, 4]
    categories: [], // e.g., ["Electronics"]
    dateFrom: null, // e.g., "2025-01-01"
    dateTo: null, // e.g., "2025-12-31"
    reviewTypes: [], // e.g., ["text", "photos", "helpful"]
  },
  sortBy: 'recent',
  sortDirection: 'desc',
};
let currentPage = 1;
const itemsPerPage = 5; // Number of reviews per page

// Utility: Format date nicely
function formatDate(timestamp) {
  if (!timestamp || !timestamp.seconds) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
}

// Fetch listing details using productId from "listings" collection
async function fetchListingDetails(productId) {
  console.log('Fetching listing details for productId:', productId);
  try {
    const listingRef = doc(db, 'listings', productId);
    const listingSnap = await getDoc(listingRef);
    if (listingSnap.exists()) {
      console.log('Listing details fetched:', listingSnap.data());
      return listingSnap.data();
    } else {
      console.log('No listing found for productId:', productId);
    }
  } catch (error) {
    console.error('Error fetching listing details:', error);
  }
  return {};
}

// Render reviews with pagination
function renderRatings(reviews) {
  const grid = document.querySelector('.reviews-grid');
  grid.innerHTML = '';
  if (reviews.length === 0) {
    document.querySelector('.empty-state').classList.remove('hidden');
    return;
  } else {
    document.querySelector('.empty-state').classList.add('hidden');
  }
  // Pagination: get current page items
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = reviews.slice(startIdx, startIdx + itemsPerPage);
  paginated.forEach((review) => {
    const {
      rating,
      review: reviewText,
      complaint,
      ratedAt,
      orderId,
      productId,
      productName,
      productImageUrl,
      purchaseDate,
      category,
      helpfulCount = 0,
    } = review;
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
      starsHtml += `<span class="star ${i <= rating ? 'active' : ''}">★</span>`;
    }
    const reviewDate = ratedAt ? formatDate(ratedAt) : 'N/A';
    const purchaseInfo = purchaseDate
      ? `Purchased on ${formatDate(purchaseDate)}`
      : '';
    const reviewCard = document.createElement('div');
    reviewCard.classList.add('review-card');
    reviewCard.innerHTML = `
      <img src="${
        productImageUrl || '../../../assets/images/placeholder.png'
      }" alt="${productName || 'Product'}" class="product-image" />
      <div class="review-details">
        <h3 class="product-name">${productName || 'Product Name'}</h3>
        <p class="purchase-info">${purchaseInfo} • Order #${
      orderId || 'N/A'
    }</p>
        <div class="star-rating">${starsHtml}</div>
        <p class="review-text">${reviewText || ''}</p>
        <p class="review-date">Reviewed on ${reviewDate}</p>
        ${complaint ? `<p class="complaint">Complaint: ${complaint}</p>` : ''}
      </div>
      <div class="review-actions">
        <button class="action-button edit-review" data-order-id="${orderId}" data-product-id="${productId}">Edit</button>
        <button class="action-button delete-review" data-order-id="${orderId}">Delete</button>
        <div class="helpfulness">
          👍 <span>${helpfulCount} people found this helpful</span>
        </div>
      </div>
    `;
    grid.appendChild(reviewCard);
  });
  updatePaginationControls(reviews.length);
  attachReviewActions();
}

// Update pagination controls based on total reviews
function updatePaginationControls(totalItems) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pageNumbersContainer = document.querySelector(
    '.pagination .page-numbers'
  );
  pageNumbersContainer.innerHTML = '';
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.classList.add('page-button');
    if (i === currentPage) btn.classList.add('active');
    btn.textContent = i;
    btn.addEventListener('click', () => {
      currentPage = i;
      applyFilters();
    });
    pageNumbersContainer.appendChild(btn);
  }
  const prevBtn = document.querySelector('.pagination .prev');
  const nextBtn = document.querySelector('.pagination .next');
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      applyFilters();
    }
  };
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      applyFilters();
    }
  };
}

// Update counts in tab controls and filter modal
function updateTabCounts() {
  const allCount = loadedReviews.length;
  document.querySelector(
    '.tab-controls .tab[data-rating="All"] .tab-count'
  ).textContent = allCount;
  for (let i = 1; i <= 5; i++) {
    const count = loadedReviews.filter((r) => r.rating === i).length;
    document.querySelector(
      `.tab-controls .tab[data-rating="${i}"] .tab-count`
    ).textContent = count;
  }
  const modalRatings = document.querySelectorAll(
    '.filter-modal .rating-option'
  );
  modalRatings.forEach((option) => {
    const checkbox = option.querySelector('.filter-checkbox');
    const labelSpan = option.querySelector('.rating-label');
    if (checkbox && labelSpan) {
      const ratingVal = parseInt(checkbox.id.split('-')[1]);
      const count = loadedReviews.filter((r) => r.rating === ratingVal).length;
      labelSpan.textContent = `(${count})`;
    }
  });
}

// Load reviews from user's orders and use items[0] for product info
async function loadRatings() {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('User not signed in; cannot load reviews.');
      document.querySelector('.reviews-grid').innerHTML =
        '<p>Please sign in to view your reviews.</p>';
      return;
    }
    const ordersRef = collection(db, 'users', user.uid, 'orders');
    const ordersSnapshot = await getDocs(ordersRef);
    console.log('Loaded orders:', ordersSnapshot.docs.length);
    let reviews = [];
    const fetchPromises = [];
    ordersSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      console.log('Processing order:', docSnap.id, data);
      if (data.rating != null && data.rating > 0) {
        let itemInfo = {};
        if (data.items && Array.isArray(data.items) && data.items.length > 0) {
          itemInfo = data.items[0];
          console.log('Found item info in order:', docSnap.id, itemInfo);
        } else {
          console.log('No items array in order:', docSnap.id);
        }
        const reviewObj = {
          orderId: docSnap.id,
          productId: itemInfo.id || '', // Using the item info id as product id
          rating: data.rating,
          review: data.review,
          complaint: data.complaint,
          ratedAt: data.ratedAt,
          productName: itemInfo.name || data.productName || null,
          productImageUrl:
            itemInfo.mainImageUrl || data.productImageUrl || null,
          purchaseDate: data.createdAt,
          category: itemInfo.category || data.category || null,
          helpfulCount: data.helpfulCount || 0,
        };
        console.log('Created review object:', reviewObj);
        reviews.push(reviewObj);
        if (!reviewObj.productName || !reviewObj.productImageUrl) {
          const p = fetchListingDetails(reviewObj.productId).then(
            (listingData) => {
              console.log(
                'Fetched listing details for productId:',
                reviewObj.productId,
                listingData
              );
              reviewObj.productName = listingData.name || 'Product Name';
              reviewObj.productImageUrl =
                listingData.mainImageUrl ||
                '../../../assets/images/placeholder.png';
              reviewObj.category = listingData.category || reviewObj.category;
            }
          );
          fetchPromises.push(p);
        }
      }
    });
    await Promise.all(fetchPromises);
    loadedReviews = reviews;
    console.log('Loaded reviews:', loadedReviews);
    updateTabCounts();
    currentPage = 1;
    applyFilters();
  } catch (error) {
    console.error('Error loading ratings:', error);
  }
}

// Apply all filters and sort, then render reviews
function applyFilters() {
  let filtered = [...loadedReviews];
  if (filterState.searchQuery.trim() !== '') {
    const queryLower = filterState.searchQuery.trim().toLowerCase();
    filtered = filtered.filter((review) => {
      const name = review.productName ? review.productName.toLowerCase() : '';
      const text = review.review ? review.review.toLowerCase() : '';
      return name.includes(queryLower) || text.includes(queryLower);
    });
  }
  if (filterState.tabRating !== 'All') {
    const tabRating = parseInt(filterState.tabRating);
    filtered = filtered.filter((review) => review.rating === tabRating);
  }
  if (filterState.modalFilters.ratings.length > 0) {
    filtered = filtered.filter((review) =>
      filterState.modalFilters.ratings.includes(review.rating)
    );
  }
  if (filterState.modalFilters.categories.length > 0) {
    filtered = filtered.filter(
      (review) =>
        review.category &&
        filterState.modalFilters.categories.includes(review.category)
    );
  }
  if (filterState.modalFilters.dateFrom) {
    const fromDate = new Date(filterState.modalFilters.dateFrom);
    filtered = filtered.filter((review) => {
      if (!review.ratedAt) return false;
      const reviewDate = new Date(review.ratedAt.seconds * 1000);
      return reviewDate >= fromDate;
    });
  }
  if (filterState.modalFilters.dateTo) {
    const toDate = new Date(filterState.modalFilters.dateTo);
    filtered = filtered.filter((review) => {
      if (!review.ratedAt) return false;
      const reviewDate = new Date(review.ratedAt.seconds * 1000);
      return reviewDate <= toDate;
    });
  }
  if (filterState.modalFilters.reviewTypes.length > 0) {
    if (filterState.modalFilters.reviewTypes.includes('text')) {
      filtered = filtered.filter(
        (review) => review.review && review.review.trim() !== ''
      );
    }
    if (filterState.modalFilters.reviewTypes.includes('photos')) {
      filtered = filtered.filter(
        (review) =>
          review.productImageUrl &&
          !review.productImageUrl.includes('placeholder')
      );
    }
    if (filterState.modalFilters.reviewTypes.includes('helpful')) {
      filtered = filtered.filter(
        (review) => review.helpfulCount && review.helpfulCount > 0
      );
    }
  }
  filtered.sort((a, b) => {
    if (!a.ratedAt || !b.ratedAt) return 0;
    const dateA = a.ratedAt.seconds;
    const dateB = b.ratedAt.seconds;
    return filterState.sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
  });
  console.log('Filtered reviews count:', filtered.length);
  renderRatings(filtered);
}

// Set up event listeners for search, tabs, sort, and filter modal
function setupFilters() {
  const searchInput = document.querySelector('.search-box input');
  searchInput.addEventListener('input', (e) => {
    filterState.searchQuery = e.target.value;
    currentPage = 1;
    applyFilters();
  });
  document.querySelectorAll('.tab-controls .tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document
        .querySelectorAll('.tab-controls .tab')
        .forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      filterState.tabRating = tab.getAttribute('data-rating');
      currentPage = 1;
      applyFilters();
    });
  });
  const sortToggle = document.getElementById('sort-toggle');
  sortToggle.addEventListener('click', () => {
    if (filterState.sortDirection === 'desc') {
      filterState.sortDirection = 'asc';
      sortToggle.querySelector('span').textContent = 'Sort by: Oldest';
    } else {
      filterState.sortDirection = 'desc';
      sortToggle.querySelector('span').textContent = 'Sort by: Recent';
    }
    applyFilters();
  });
  // Filter modal events
  const filterToggleBtn = document.getElementById('filter-toggle');
  const filterModal = document.getElementById('filter-modal');
  const closeFilter = document.getElementById('close-filter');
  const resetFiltersBtn = document.querySelector('.reset-filters');
  const applyFiltersBtn = document.querySelector('.apply-filters');
  filterToggleBtn.addEventListener('click', () => {
    filterModal.classList.add('visible');
  });
  closeFilter.addEventListener('click', () => {
    filterModal.classList.remove('visible');
  });
  resetFiltersBtn.addEventListener('click', () => {
    filterState.modalFilters = {
      ratings: [],
      categories: [],
      dateFrom: null,
      dateTo: null,
      reviewTypes: [],
    };
    filterModal
      .querySelectorAll('.filter-checkbox')
      .forEach((cb) => (cb.checked = false));
    filterModal
      .querySelectorAll('.date-input')
      .forEach((input) => (input.value = ''));
  });
  applyFiltersBtn.addEventListener('click', () => {
    const modalRatingCheckboxes = filterModal.querySelectorAll(
      'input[id^="rating-"]'
    );
    const selectedRatings = [];
    modalRatingCheckboxes.forEach((cb) => {
      if (cb.checked) {
        const ratingVal = parseInt(cb.id.split('-')[1]);
        selectedRatings.push(ratingVal);
      }
    });
    filterState.modalFilters.ratings = selectedRatings;
    const modalCategoryCheckboxes =
      filterModal.querySelectorAll('input[id^="cat-"]');
    const selectedCategories = [];
    modalCategoryCheckboxes.forEach((cb) => {
      if (cb.checked) {
        const label = filterModal.querySelector(`label[for="${cb.id}"]`);
        if (label) {
          const catText = label.textContent.trim();
          const catName = catText.replace(/\s*\(\d+\)$/, '');
          selectedCategories.push(catName);
        }
      }
    });
    filterState.modalFilters.categories = selectedCategories;
    const dateInputs = filterModal.querySelectorAll('.date-input');
    filterState.modalFilters.dateFrom = dateInputs[0].value || null;
    filterState.modalFilters.dateTo = dateInputs[1].value || null;
    const reviewTypeCheckboxes =
      filterModal.querySelectorAll('input[id^="type-"]');
    const selectedReviewTypes = [];
    reviewTypeCheckboxes.forEach((cb) => {
      if (cb.checked) {
        const type = cb.id.split('-')[1];
        selectedReviewTypes.push(type);
      }
    });
    filterState.modalFilters.reviewTypes = selectedReviewTypes;
    filterModal.classList.remove('visible');
    currentPage = 1;
    applyFilters();
  });
}

// Attach event listeners for Edit and Delete buttons
function attachReviewActions() {
  document.querySelectorAll('.edit-review').forEach((button) => {
    button.addEventListener('click', () => {
      const orderId = button.getAttribute('data-order-id');
      const productId = button.getAttribute('data-product-id');
      console.log('Editing review for order:', orderId, 'product:', productId);
      window.location.href = `../rateproduct/rateproduct.html?orderId=${orderId}&productId=${productId}`;
    });
  });
  document.querySelectorAll('.delete-review').forEach((button) => {
    button.addEventListener('click', () => {
      const orderId = button.getAttribute('data-order-id');
      console.log('Deleting review for order:', orderId);
      if (
        confirm(
          `Are you sure you want to delete your review for Order ${orderId}?`
        )
      ) {
        deleteReview(orderId);
      }
    });
  });
}

// Delete review by updating the corresponding order document
async function deleteReview(orderId) {
  try {
    const userId = auth.currentUser.uid;
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    await updateDoc(orderRef, {
      rating: null,
      review: null,
      complaint: null,
      ratedAt: null,
    });
    console.log('Review deleted for order:', orderId);
    alert('Review deleted.');
    loadRatings();
  } catch (error) {
    console.error('Error deleting review:', error);
    alert('Failed to delete review.');
  }
}

// Listen for auth state changes and load reviews
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('User signed in:', user.uid);
    loadRatings();
    setupFilters();
  } else {
    console.log('User not signed in.');
    document.querySelector('.reviews-grid').innerHTML =
      '<p>Please sign in to view your reviews.</p>';
  }
});
