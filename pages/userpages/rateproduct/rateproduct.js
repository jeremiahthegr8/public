// rateproduct.js
import { db, auth } from '../../../database/config.js';
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

// Retrieve URL parameters (passed from order history page)
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get('productId');
const orderId = urlParams.get('orderId');
const urlProductName = urlParams.get('productName');
const urlProductImageUrl = urlParams.get('productImageUrl');
const urlOrderDate = urlParams.get('orderDate');

if (!productId || !orderId) {
  alert('Required parameters missing.');
  window.location.href = '../OrderHistory/Orderhistory.html';
}
console.log(
  'Rate product page loaded with productId:',
  productId,
  'and orderId:',
  orderId
);

// ----------------------
// DOM Elements
// ----------------------
const productImageEl = document.querySelector('.product-info img');
const productNameEl = document.querySelector('.product-details h2');
const productOrderInfoEl = document.querySelector(
  '.product-details p:nth-of-type(1)'
);
const productSellerEl = document.querySelector(
  '.product-details p:nth-of-type(2)'
);

const stars = document.querySelectorAll('.star');
const reviewTextarea = document.querySelector('.review-form textarea');
const issueSelect = document.querySelector('.issue-selection select');
const submitButton = document.querySelector('.submit-button');
const deleteButton = document.querySelector('.delete-button');

// ----------------------
// Global State
// ----------------------
let currentRating = 0;
let productData = null; // will hold product details from "listings"
let existingRatingDocId = null; // if a rating already exists for this order/product
let oldRatingValue = 0; // for aggregate adjustments

// ----------------------
// Helper Functions
// ----------------------

// Simple loader helper (if needed)
function showLoader(element, message = 'Loading…') {
  if (element) {
    element.innerHTML = `<div class="loader">${message}</div>`;
  }
}

// Format a Firestore timestamp into a locale date string.
function formatDate(timestamp) {
  if (!timestamp || !timestamp.seconds) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleDateString();
}

// Pre-fill UI from URL parameters if provided.
function prefillFromUrl() {
  if (urlProductName) {
    console.log('Prefilling product name from URL:', urlProductName);
    productNameEl.textContent = urlProductName;
  }
  if (urlProductImageUrl) {
    console.log('Prefilling product image from URL:', urlProductImageUrl);
    productImageEl.src = urlProductImageUrl;
  }
  if (urlOrderDate) {
    console.log('Prefilling order info from URL:', urlOrderDate);
    productOrderInfoEl.textContent = `Order #${orderId} • Delivered on ${urlOrderDate}`;
  }
}

// Fetch product details from the "listings" collection.
async function fetchProductDetails(productId) {
  console.log('Fetching product details for listing:', productId);
  try {
    const productDocRef = doc(db, 'listings', productId);
    const productSnap = await getDoc(productDocRef);
    if (productSnap.exists()) {
      console.log('Product details fetched:', productSnap.data());
      return productSnap.data();
    } else {
      alert('Product not found.');
      window.location.href = '../OrderHistory/Orderhistory.html';
    }
  } catch (error) {
    console.error('Error fetching product details:', error);
    alert('Error fetching product details.');
  }
}

// Fetch order details from the user's orders subcollection.
async function fetchOrderDetails(orderId) {
  try {
    const userId = auth.currentUser.uid;
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      console.log('Order details fetched:', orderSnap.data());
      return orderSnap.data();
    } else {
      console.error('Order not found.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching order details:', error);
    return null;
  }
}

// Update UI with product details using fresh data (URL values take precedence if provided).
function prefillProductDetails(product) {
  productData = product;
  if (!urlProductImageUrl) {
    productImageEl.src = product.mainImageUrl || '';
  }
  if (!urlProductName) {
    productNameEl.textContent = product.name || 'Unnamed Product';
  }
  productOrderInfoEl.textContent =
    productOrderInfoEl.textContent || `Order #${orderId} • Delivered on [Date]`;
  productSellerEl.textContent = `Sold by: ${
    product.sellerId || 'Unknown Seller'
  }`;
}

// ----------------------
// Star Rating Setup
// ----------------------
function setupStarRating() {
  stars.forEach((star) => {
    star.addEventListener('click', () => {
      const value = parseInt(star.getAttribute('data-value'));
      currentRating = value;
      console.log('User selected star rating:', currentRating);
      stars.forEach((s) => s.classList.remove('active'));
      stars.forEach((s) => {
        if (parseInt(s.getAttribute('data-value')) <= value) {
          s.classList.add('active');
        }
      });
      if (value <= 2) {
        issueSelect.parentElement.classList.add('visible');
      } else {
        issueSelect.parentElement.classList.remove('visible');
      }
    });
  });
}

// ----------------------
// Existing Rating Check
// ----------------------
async function checkExistingRating() {
  try {
    const userId = auth.currentUser.uid;
    const ratingsCentralRef = collection(db, 'ratings');
    const q = query(
      ratingsCentralRef,
      where('orderId', '==', orderId),
      where('userId', '==', userId),
      where('listingId', '==', productId)
    );
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnapshot = querySnapshot.docs[0];
      existingRatingDocId = docSnapshot.id;
      const ratingData = docSnapshot.data();
      oldRatingValue = ratingData.rating;
      currentRating = ratingData.rating;
      console.log('Existing rating found:', ratingData);
      stars.forEach((star) => {
        const starValue = parseInt(star.getAttribute('data-value'));
        if (starValue <= currentRating) {
          star.classList.add('active');
        } else {
          star.classList.remove('active');
        }
      });
      reviewTextarea.value = ratingData.review || '';
      issueSelect.value = ratingData.issue || '';
      if (currentRating <= 2) {
        issueSelect.parentElement.classList.add('visible');
      } else {
        issueSelect.parentElement.classList.remove('visible');
      }
    } else {
      console.log('No existing rating found.');
    }
  } catch (error) {
    console.error('Error checking existing rating:', error);
  }
}

// ----------------------
// Submit / Update Rating
// ----------------------
async function submitRating() {
  if (currentRating === 0) {
    alert('Please select a star rating.');
    return;
  }
  const reviewText = reviewTextarea.value.trim();
  const selectedIssue = issueSelect.value || null;
  const userId = auth.currentUser.uid;
  const sellerId = productData.sellerId || null;
  const ratingData = {
    orderId,
    listingId: productId,
    sellerId,
    userId,
    rating: currentRating,
    review: reviewText,
    issue: selectedIssue,
    updatedAt: serverTimestamp(),
  };
  try {
    if (existingRatingDocId) {
      console.log('Updating existing rating with id:', existingRatingDocId);
      const ratingDocRef = doc(db, 'ratings', existingRatingDocId);
      await updateDoc(ratingDocRef, ratingData);
      console.log('Central rating updated:', ratingData);
      const ratingsListingRef = collection(
        db,
        'listings',
        productId,
        'ratings'
      );
      const q = query(
        ratingsListingRef,
        where('orderId', '==', orderId),
        where('userId', '==', userId)
      );
      const listingSnapshot = await getDocs(q);
      if (!listingSnapshot.empty) {
        const listingDocRef = doc(
          db,
          'listings',
          productId,
          'ratings',
          listingSnapshot.docs[0].id
        );
        await updateDoc(listingDocRef, ratingData);
        console.log('Listing rating updated:', ratingData);
      }
      const currentCount = Number(productData.ratingCount) || 0;
      const currentAvg = Number(productData.rating) || 0;
      const newAvg =
        (currentAvg * currentCount - oldRatingValue + currentRating) /
        currentCount;
      const productRef = doc(db, 'listings', productId);
      await updateDoc(productRef, { rating: newAvg });
      console.log('Listing aggregate rating updated for edit:', {
        newAvg,
        count: currentCount,
      });
      if (sellerId) {
        const sellerRef = doc(db, 'sellers', sellerId);
        const sellerSnap = await getDoc(sellerRef);
        let sellerData = sellerSnap.exists()
          ? sellerSnap.data()
          : { rating: 0, ratingCount: 0 };
        const sellerCurrentAvg = Number(sellerData.rating) || 0;
        const sellerCurrentCount = Number(sellerData.ratingCount) || 0;
        const sellerNewAvg =
          (sellerCurrentAvg * sellerCurrentCount -
            oldRatingValue +
            currentRating) /
          sellerCurrentCount;
        await updateDoc(sellerRef, { rating: sellerNewAvg });
        console.log('Seller aggregate rating updated for edit:', {
          sellerNewAvg,
          sellerCurrentCount,
        });
      }
    } else {
      console.log('Adding new rating.');
      ratingData.createdAt = serverTimestamp();
      const ratingsCentralRef = collection(db, 'ratings');
      const newRatingDoc = await addDoc(ratingsCentralRef, { ...ratingData });
      existingRatingDocId = newRatingDoc.id;
      console.log('New central rating added:', ratingData);
      const ratingsListingRef = collection(
        db,
        'listings',
        productId,
        'ratings'
      );
      await addDoc(ratingsListingRef, { ...ratingData });
      console.log('New listing rating added:', ratingData);
      const currentCount = Number(productData.ratingCount) || 0;
      const currentAvg = Number(productData.rating) || 0;
      const newCount = currentCount + 1;
      const newAvg = (currentAvg * currentCount + currentRating) / newCount;
      const productRef = doc(db, 'listings', productId);
      await updateDoc(productRef, { rating: newAvg, ratingCount: newCount });
      console.log('Listing aggregate rating updated for new rating:', {
        newAvg,
        newCount,
      });
      if (sellerId) {
        const sellerRef = doc(db, 'sellers', sellerId);
        const sellerSnap = await getDoc(sellerRef);
        let sellerData = sellerSnap.exists()
          ? sellerSnap.data()
          : { rating: 0, ratingCount: 0 };
        const sellerCurrentAvg = Number(sellerData.rating) || 0;
        const sellerCurrentCount = Number(sellerData.ratingCount) || 0;
        const sellerNewCount = sellerCurrentCount + 1;
        const sellerNewAvg =
          (sellerCurrentAvg * sellerCurrentCount + currentRating) /
          sellerNewCount;
        await updateDoc(sellerRef, {
          rating: sellerNewAvg,
          ratingCount: sellerNewCount,
        });
        console.log('Seller aggregate rating updated for new rating:', {
          sellerNewAvg,
          sellerNewCount,
        });
      }
    }
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    await updateDoc(orderRef, {
      rating: currentRating,
      review: reviewText,
      complaint: selectedIssue,
      ratedAt: serverTimestamp(),
    });
    console.log('Order document updated with rating details.');
    alert('Thank you for your rating!');
    window.location.href = '../myratinghistory/myratinghistory.html';
  } catch (error) {
    console.error('Error submitting rating:', error);
    alert('Failed to submit rating. Please try again.');
  }
}

// ----------------------
// Delete Rating Functionality
// ----------------------
async function deleteRating() {
  const userId = auth.currentUser.uid;
  try {
    const currentCount = Number(productData.ratingCount) || 0;
    const currentAvg = Number(productData.rating) || 0;
    let newAvg = 0;
    if (currentCount > 1) {
      newAvg = (currentAvg * currentCount - currentRating) / (currentCount - 1);
    }
    const productRef = doc(db, 'listings', productId);
    await updateDoc(productRef, {
      rating: newAvg,
      ratingCount: currentCount - 1,
    });
    console.log('Listing aggregate rating updated after deletion:', {
      newAvg,
      newCount: currentCount - 1,
    });
    const sellerId = productData.sellerId || null;
    if (sellerId) {
      const sellerRef = doc(db, 'sellers', sellerId);
      const sellerSnap = await getDoc(sellerRef);
      let sellerData = sellerSnap.exists()
        ? sellerSnap.data()
        : { rating: 0, ratingCount: 0 };
      const sellerCurrentAvg = Number(sellerData.rating) || 0;
      const sellerCurrentCount = Number(sellerData.ratingCount) || 0;
      let sellerNewAvg = 0;
      if (sellerCurrentCount > 1) {
        sellerNewAvg =
          (sellerCurrentAvg * sellerCurrentCount - currentRating) /
          (sellerCurrentCount - 1);
      }
      await updateDoc(sellerRef, {
        rating: sellerNewAvg,
        ratingCount: sellerCurrentCount - 1,
      });
      console.log('Seller aggregate rating updated after deletion:', {
        sellerNewAvg,
        sellerCurrentCount: sellerCurrentCount - 1,
      });
    }
    if (existingRatingDocId) {
      const centralRatingRef = doc(db, 'ratings', existingRatingDocId);
      await deleteDoc(centralRatingRef);
      console.log('Deleted central rating document.');
    }
    const ratingsListingRef = collection(db, 'listings', productId, 'ratings');
    const q = query(
      ratingsListingRef,
      where('orderId', '==', orderId),
      where('userId', '==', userId)
    );
    const listingSnapshot = await getDocs(q);
    if (!listingSnapshot.empty) {
      const listingRatingDocRef = doc(
        db,
        'listings',
        productId,
        'ratings',
        listingSnapshot.docs[0].id
      );
      await deleteDoc(listingRatingDocRef);
      console.log('Deleted listing rating document.');
    }
    const orderRef = doc(db, 'users', userId, 'orders', orderId);
    await updateDoc(orderRef, {
      rating: null,
      review: null,
      complaint: null,
      ratedAt: null,
    });
    console.log('Order document updated to remove rating details.');
    alert('Your rating has been deleted.');
    window.location.href = '../myratinghistory/myratinghistory.html';
  } catch (error) {
    console.error('Error deleting rating:', error);
    alert('Failed to delete rating. Please try again.');
  }
}

// ----------------------
// Initialization
// ----------------------
// Add the call to loadSidebarRatings() into your initialization routine:
// Make sure to call loadSidebarRatings() in your initialization routine
async function initRatePage() {
  prefillFromUrl();
  showLoader(document.querySelector('.recent-rating'), 'Loading…');
  const product = await fetchProductDetails(productId);
  if (product) {
    prefillProductDetails(product);
  }
  await fetchOrderDetails(orderId);
  await checkExistingRating();
  setupStarRating();
  // NEW: Load up to 3 past ratings with image and product name in the sidebar
  loadSidebarRatings();
}


submitButton.addEventListener('click', (e) => {
  e.preventDefault();
  submitRating();
});

if (deleteButton) {
  deleteButton.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Are you sure you want to delete your rating?')) {
      deleteRating();
    }
  });
}

document.addEventListener('DOMContentLoaded', initRatePage);

async function loadSidebarRatings() {
  try {
    const userId = auth.currentUser.uid;
    const ratingsRef = collection(db, 'ratings');
    // Query the ratings for the current user, ordered by creation time (descending) and limited to 3
    const ratingsQuery = query(
      ratingsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const querySnapshot = await getDocs(ratingsQuery);
    const sidebarList = document.querySelector(
      '.sidebar .sidebar-ratings-list'
    );
    if (sidebarList) {
      sidebarList.innerHTML = ''; // Clear any existing items

      // Iterate over each rating document
      for (const docSnap of querySnapshot.docs) {
        let data = docSnap.data();

        // If product name or image is missing, fetch product details (using listingId which is stored as listingId)
        if (!data.productName || !data.productImageUrl) {
          const productDetails = await fetchProductDetails(data.listingId);
          data.productName = productDetails.name || 'Product Name';
          data.productImageUrl =
            productDetails.mainImageUrl ||
            '../../../assets/images/placeholder.png';
        }

        // Create a new sidebar item using new CSS classes
        const ratingItem = document.createElement('div');
        ratingItem.classList.add('sidebar-rating-item');
        ratingItem.innerHTML = `
          <div class="sidebar-rating-header">
            <img src="${data.productImageUrl}" alt="${
          data.productName
        }" class="sidebar-rating-image">
            <span class="sidebar-rating-productname">${data.productName}</span>
              <div class="sidebar-rating-stars">${renderSidebarStars(
                data.rating
              )}</div>
          </div>
        
          <div class="sidebarratinganddatecontainer">
          <div class="sidebar-rating-text">${
            data.review ? data.review : 'No review provided.'
          }</div>
          <div class="sidebar-rating-date">${formatDate(data.createdAt)}</div>
          </div>
        `;
        sidebarList.appendChild(ratingItem);
      }
    }
  } catch (error) {
    console.error('Error loading sidebar ratings:', error);
  }
}

// Helper function to render stars using new sidebar classes
function renderSidebarStars(rating) {
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    starsHtml += `<span class="sidebar-star ${
      i <= rating ? 'active' : ''
    }">★</span>`;
  }
  return starsHtml;
}

