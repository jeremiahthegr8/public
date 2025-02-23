import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// ------------------------------
// Fetch Seller Metrics
// ------------------------------
async function fetchSellerMetrics(uid) {
  // Query items where sellerId equals the seller's UID
  const itemsQuery = query(
    collection(db, "items"),
    where("sellerId", "==", uid)
  );
  const itemsSnapshot = await getDocs(itemsQuery);

  // Collect seller item IDs
  const sellerItemIds = [];
  itemsSnapshot.forEach((doc) => {
    sellerItemIds.push(doc.id);
  });

  // Calculate average rating from reviews for these items
  let sumRatings = 0,
    ratingCount = 0;
  if (sellerItemIds.length > 0) {
    // If more than 10 item IDs, you'll need to batch queries.
    const reviewsQuery = query(
      collection(db, "reviews"),
      where("productId", "in", sellerItemIds)
    );
    const reviewsSnapshot = await getDocs(reviewsQuery);
    reviewsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.rating) {
        sumRatings += data.rating;
        ratingCount++;
      }
    });
  }
  const averageRating = ratingCount > 0 ? sumRatings / ratingCount : 0;

  return {
    averageRating,
  };
}

// ------------------------------
// Fetch Reviews for Seller's Items
// ------------------------------
async function fetchSellerReviews(sellerId) {
  // Fetch seller items
  const itemsQuery = query(
    collection(db, "items"),
    where("sellerId", "==", sellerId)
  );
  const itemsSnapshot = await getDocs(itemsQuery);
  const sellerItems = [];
  const itemIdToName = {};
  itemsSnapshot.forEach((doc) => {
    const data = doc.data();
    sellerItems.push({ itemId: doc.id, ...data });
    itemIdToName[doc.id] = data.itemName;
  });

  if (sellerItems.length === 0) return [];

  // Create an array of seller item IDs.
  const sellerItemIds = sellerItems.map((item) => item.itemId);

  // Query reviews where productId is one of the seller's item IDs
  const reviewsQuery = query(
    collection(db, "reviews"),
    where("productId", "in", sellerItemIds),
    orderBy("createdAt", "desc")
  );
  const reviewsSnapshot = await getDocs(reviewsQuery);
  const reviews = [];
  reviewsSnapshot.forEach((doc) => {
    reviews.push({ id: doc.id, ...doc.data() });
  });

  // Attach itemName to each review using the mapping
  reviews.forEach((review) => {
    review.itemName = itemIdToName[review.productId] || "Unknown Item";
  });

  return reviews;
}

// ------------------------------
// Auth State Listener and Data Loading
// ------------------------------
onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    // Set seller name in the header
    const sellerNameEl = document.getElementById("seller-name");
    if (sellerNameEl) {
      sellerNameEl.textContent = user.displayName || "Seller";
    }

    // Update seller metrics (average rating)
    const metrics = await fetchSellerMetrics(user.uid);
    const avgRatingEl = document.getElementById("average-rating");
    avgRatingEl.textContent = metrics.averageRating.toFixed(1);

    // Make the Average Rating clickable (if desired)
    if (avgRatingEl) {
      avgRatingEl.style.cursor = "pointer";
      avgRatingEl.addEventListener("click", () => {
        window.location.href = "../ratingsandreview/ratingsandreview.html";
      });
    }

    // Fetch and display reviews for seller's items
    const sellerReviews = await fetchSellerReviews(user.uid);
    const sellerReviewsList = document.getElementById("seller-reviews-list");
    sellerReviewsList.innerHTML = ""; // Clear any placeholder text

    if (sellerReviews.length === 0) {
      sellerReviewsList.innerHTML = "<p>No reviews for your items yet.</p>";
    } else {
      sellerReviews.forEach((review) => {
        // Format review creation date if available
        const reviewDate =
          review.createdAt && review.createdAt.seconds
            ? new Date(review.createdAt.seconds * 1000).toLocaleString()
            : "N/A";
        // Create an element for each review
        const reviewDiv = document.createElement("div");
        reviewDiv.classList.add("seller-review");
        reviewDiv.innerHTML = `
          <p><strong>Item:</strong> ${review.itemName}</p>
          <p><strong>Rating:</strong> ${review.rating}/5</p>
          <p><strong>Comment:</strong> ${review.comment}</p>
          <p><strong>Date:</strong> ${reviewDate}</p>
        `;
        sellerReviewsList.appendChild(reviewDiv);
      });
    }
  } else {
    window.location.href = "../../index.html";
  }
});

// ------------------------------
// Logout Handler
// ------------------------------
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        window.location.href = "../../index.html";
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  });
}
