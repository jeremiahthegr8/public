import { auth, db } from "../../database/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Extract product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
console.log("ProductReviews.js - productId:", productId);

const reviewsSection = document.getElementById("reviews-section");
const loadingMessage = document.getElementById("loading-message");
const backBtn = document.getElementById("back-btn");

// Function to render stars based on rating
function renderStars(rating) {
  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(rating)) {
      starsHtml += `<i class="fas fa-star" style="color: gold;"></i>`;
    } else if (i === Math.floor(rating) + 1 && rating % 1 >= 0.5) {
      starsHtml += `<i class="fas fa-star-half-alt" style="color: gold;"></i>`;
    } else {
      starsHtml += `<i class="far fa-star" style="color: gold;"></i>`;
    }
  }
  return starsHtml;
}

// Load all reviews for the product
async function loadAllReviews(productId) {
  if (!productId) {
    reviewsSection.innerHTML = "<p>No product ID provided.</p>";
    return;
  }
  try {
    const reviewsRef = collection(db, "reviews");
    const reviewsQuery = query(
      reviewsRef,
      where("productId", "==", productId),
      orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(reviewsQuery);
    let reviews = [];
    snapshot.forEach((doc) => {
      reviews.push({ id: doc.id, ...doc.data() });
    });

    if (reviews.length === 0) {
      reviewsSection.innerHTML = "<p>No reviews yet.</p>";
      return;
    }

    // Clear loading message
    reviewsSection.innerHTML = "";

    // Loop over all reviews and render them
    reviews.forEach((review) => {
      const reviewCard = document.createElement("div");
      reviewCard.classList.add("review-card");

      const buyerName = review.buyerName || "Anonymous";
      const rating = review.rating || 0;
      const comment = review.comment || "";
      const reviewDate =
        review.createdAt && review.createdAt.seconds
          ? new Date(review.createdAt.seconds * 1000).toLocaleString()
          : "Unknown Date";

      reviewCard.innerHTML = `
        <h3>${buyerName}</h3>
        <div class="stars">${renderStars(rating)}</div>
        <p>${comment}</p>
        <p class="review-date">${reviewDate}</p>
      `;
      reviewsSection.appendChild(reviewCard);
    });
  } catch (error) {
    console.error("Error loading reviews:", error);
    reviewsSection.innerHTML =
      "<p>Error loading reviews. Please try again.</p>";
  }
}

// Back button: return to product details page with product id
backBtn.addEventListener("click", () => {
  window.location.href = `../product/product.html?id=${productId}`;
});

// Ensure user is logged in (optional)
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadAllReviews(productId);
  } else {
    window.location.href = "../../index.html";
  }
});
