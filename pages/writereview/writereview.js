import { auth, db } from "../../database/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";


// Extract product ID from URL using the correct parameter name
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("itemId");
console.log("WriteReview.js - Extracted productId:", productId);

const productIdInput = document.getElementById("product-id");
if (productIdInput) {
  productIdInput.value = productId;
}

// DOM element for the review form and back button
const reviewForm = document.getElementById("review-form");
const backBtn = document.getElementById("back-btn");

// Listen for auth state changes to ensure user is logged in
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "../../index.html";
  }
});

// Handle review form submission
reviewForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const rating = document.getElementById("rating").value;
  const comment = document.getElementById("comment").value.trim();

  if (!rating || !comment) {
    alert("Please provide both a rating and a comment.");
    return;
  }

  const reviewData = {
    buyerId: auth.currentUser.uid,
    productId,
    rating: parseInt(rating),
    comment,
    createdAt: serverTimestamp(),
  };

  try {
    // Add review to the "reviews" collection
    await addDoc(collection(db, "reviews"), reviewData);
    alert("Review submitted successfully!");
    // Redirect back to the product page after submission
    window.location.href = `../OrderHistory/Orderhistory.html?id=${productId}`;
  } catch (error) {
    console.error("Error submitting review:", error);
    alert("Failed to submit review. Please try again.");
  }
});

// Back button: return to product details page
backBtn.addEventListener("click", () => {
  window.location.href = `../OrderHistory/Orderhistory.html?id=${productId}`;
});
