import { db, auth } from '../../../database/config.js';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

// DOM elements
const ratingsListEl = document.querySelector('.ratings-list');
const loaderEl = document.querySelector('.loader');

// Loader helper functions
function showLoader(message = 'Loading ratings…') {
  if (loaderEl) {
    loaderEl.innerHTML = `<div class="loader-message">${message}</div>`;
  }
}

function clearLoader() {
  if (loaderEl) {
    loaderEl.innerHTML = '';
  }
}

// Helper to render stars for a given rating (1-5)
// Active stars are gold, others are gray.
function renderStars(rating) {
  let starsHtml = '';
  for (let i = 1; i <= 5; i++) {
    starsHtml += `<span class="${
      i <= rating ? 'star active' : 'star'
    }">★</span>`;
  }
  return starsHtml;
}

// Helper to format Firestore timestamps into a human-readable string.
function formatDate(timestamp) {
  if (!timestamp || !timestamp.seconds) return 'N/A';
  return new Date(timestamp.seconds * 1000).toLocaleString();
}

// Render a professional rating card that includes only relevant details.
function renderRatingItem(ratingData, orderDetails) {
  const card = document.createElement('div');
  card.classList.add('rating-card');

  // Get product details from orderDetails (fallbacks provided if missing)
  const productName = orderDetails.name || 'Item Name Not Available';
  const productImage = orderDetails.mainImageUrl || 'default-placeholder.png';
  const productCategory = orderDetails.category || 'Category Not Available';

  // Prepare review text and issue if provided
  const reviewText = ratingData.review
    ? ratingData.review
    : 'No review provided.';
  const issueText = ratingData.issue
    ? `<p class="rating-issue"><strong>Issue:</strong> ${ratingData.issue}</p>`
    : '';

  // Build the card HTML
  card.innerHTML = `
    <div class="rating-card-header">
      <img src="${productImage}" alt="${productName}" class="product-image">
      <div class="product-info">
        <h3 class="product-name">${productName}</h3>
        <p class="product-category">Category: ${productCategory}</p>
        <p class="order-id">Order ID: ${ratingData.orderId}</p>
      </div>
    </div>
    <div class="rating-card-body">
      <div class="rating-stars">${renderStars(ratingData.rating)}</div>
      <p class="rating-review">${reviewText}</p>
      ${issueText}
    </div>
    <div class="rating-card-footer">
      <span class="created-at">Rated on: ${formatDate(
        ratingData.createdAt
      )}</span>
    </div>
  `;
  return card;
}

// Load seller ratings by querying the "ratings" collection based on the sellerID.
async function loadSellerRatings(sellerId) {
  try {
    console.log('Loading ratings for sellerId:', sellerId);
    showLoader('Loading ratings…');
    const ratingsRef = collection(db, 'ratings');
    console.log('Querying ratings where sellerId ==', sellerId);

    // Create query: filter by sellerId and order by creation date (latest first)
    const ratingsQuery = query(
      ratingsRef,
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(ratingsQuery);
    console.log(
      'Query completed. Number of ratings found:',
      querySnapshot.size
    );
    clearLoader();

    if (querySnapshot.empty) {
      console.log('No ratings found for sellerId:', sellerId);
      ratingsListEl.innerHTML = '<p>No ratings received yet.</p>';
    } else {
      ratingsListEl.innerHTML = '';
      // Process each rating document sequentially to fetch associated order details.
      for (const docSnap of querySnapshot.docs) {
        console.log('Processing rating document:', docSnap.id, docSnap.data());
        const ratingData = docSnap.data();
        let orderDetails = {};
        try {
          // Fetch order details from the global orders collection using the orderId.
          const orderDocRef = doc(db, 'orders', ratingData.orderId);
          const orderSnap = await getDoc(orderDocRef);
          if (orderSnap.exists()) {
            const orderData = orderSnap.data();
            // Assume orderData.items is an array and use the first item.
            if (orderData.items && orderData.items.length > 0) {
              orderDetails = orderData.items[0];
              console.log(
                'Order details found for orderId:',
                ratingData.orderId,
                orderDetails
              );
            } else {
              console.warn(
                'No items found in order for orderId:',
                ratingData.orderId
              );
            }
          } else {
            console.warn('No order found for orderId:', ratingData.orderId);
          }
        } catch (err) {
          console.error(
            'Error fetching order details for orderId:',
            ratingData.orderId,
            err
          );
        }
        // Create and append the rating card.
        const ratingCard = renderRatingItem(ratingData, orderDetails);
        ratingsListEl.appendChild(ratingCard);
      }
    }
  } catch (error) {
    console.error('Error loading seller ratings:', error);
    clearLoader();
    ratingsListEl.innerHTML =
      '<p>Error loading ratings. Please try again later.</p>';
  }
}

// Authenticate the user and then retrieve the sellerID from their profile.
// The sellerID is stored in the user document at users/{uid} under the "sellerID" field.
onAuthStateChanged(auth, async (user) => {
  if (user) {
    console.log('User authenticated. User ID:', user.uid);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const sellerId = userData.sellerID;
        if (!sellerId) {
          console.error("No sellerID found in user's document.");
          ratingsListEl.innerHTML =
            '<p>Your profile is missing a seller id. Please update your profile.</p>';
        } else {
          console.log('Seller ID retrieved:', sellerId);
          loadSellerRatings(sellerId);
        }
      } else {
        console.error('User document not found for uid:', user.uid);
        ratingsListEl.innerHTML = '<p>User profile not found.</p>';
      }
    } catch (error) {
      console.error('Error retrieving user profile:', error);
      ratingsListEl.innerHTML = '<p>Error retrieving your profile details.</p>';
    }
  } else {
    console.log('User not authenticated. Redirecting to login.');
    window.location.href = '../Login/Login.html';
  }
});
