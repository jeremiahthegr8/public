import { auth, db } from "../../database/config.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  addDoc,
  serverTimestamp,
  deleteDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

// Get product ID from URL
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
console.log("Extracted productId:", productId);

const productContainer = document.getElementById("product-container");
const relatedProductsContainer = document.getElementById("related-products");

// DOM elements for reviews
const averageRatingContainer = document.getElementById(
  "average-rating-container"
);
const topReviewsContainer = document.getElementById("top-reviews");
const seeAllReviewsLink = document.getElementById("see-all-reviews");

// Fetch and display the product details
async function fetchProduct() {
  if (!productId) {
    productContainer.innerHTML = "<p>No product ID provided.</p>";
    return;
  }
  try {
    const productDocRef = doc(db, "items", productId);
    const productDoc = await getDoc(productDocRef);
    if (!productDoc.exists()) {
      productContainer.innerHTML = "<p>Product not found.</p>";
      return;
    }
    const productData = productDoc.data();
    renderProduct(productData);
    loadRelatedProducts(productData.category);
    loadReviews(productId);
  } catch (error) {
    console.error("Error fetching product:", error);
    productContainer.innerHTML =
      "<p>Error loading product. Please try again later.</p>";
  }
}

function renderProduct(product) {
  const productDiv = document.createElement("div");
  productDiv.classList.add("product-details");

  // Format attributes as a list if available
  let attributesHTML = "";
  if (product.attributes) {
    attributesHTML =
      `<ul class="attributes-list">` +
      Object.entries(product.attributes)
        .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
        .join("") +
      `</ul>`;
  }

  productDiv.innerHTML = `
    <div class="product-image">
      <img src="${product.imageBase64 || "default.jpg"}" alt="${
    product.itemName
  }" loading="lazy">
    </div>
    <div class="product-info">
      <h1>${product.itemName}</h1>
      <p>${product.description}</p>
      ${attributesHTML}
      <p class="price">Price: $${product.price}</p>
      <p class="rating">Rating: ${product.rating || "N/A"}</p>
      <div class="buttons-group">
        <button class="wishlist-btn" data-id="${productId}">
          <i class="fas fa-heart not-in-wishlist"></i>
        </button>
        <div class="cart-buttons" data-id="${productId}">
          <button class="add-to-cart-btn">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>
          <div class="cart-controls" style="display: none;">
            <button class="decrement-btn">-</button>
            <span class="cart-count">0</span>
            <button class="increment-btn">+</button>
            <button class="remove-from-cart-btn">Remove</button>
          </div>
        </div>
        <!-- New Message Seller Button -->
        <button id="message-seller-btn" 
                data-product-id="${productId}" 
                data-seller-id="${product.sellerId}">
          Message Seller
        </button>
      </div>
    </div>
  `;
  productContainer.appendChild(productDiv);

  // Initialize wishlist and cart functionality
  setupWishlistButton(productId);
  setupCartButtons(productId);

  // Ensure the "See All Reviews" link includes the product ID
  seeAllReviewsLink.href = `../buyereview/productReviews.html?id=${productId}`;

  // Setup the Message Seller button listener
  setupMessageSellerButton();
}

// Load related products
async function loadRelatedProducts(category) {
  const q = query(collection(db, "items"), where("category", "==", category));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((docSnap) => {
    if (docSnap.id !== productId) {
      const product = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("related-product");
      div.innerHTML = `
        <img src="${product.imageBase64}" alt="${product.itemName}" />
        <h3>${product.itemName}</h3>
        <p>$${product.price.toFixed(2)}</p>
      `;
      div.addEventListener("click", () => {
        window.location.href = `product.html?id=${docSnap.id}`;
      });
      relatedProductsContainer.appendChild(div);
    }
  });
}

// Load reviews for this product
async function loadReviews(productId) {
  try {
    const reviewsRef = collection(db, "reviews");
    const reviewsQuery = query(
      reviewsRef,
      where("productId", "==", productId),
      orderBy("createdAt", "desc")
    );
    const reviewsSnapshot = await getDocs(reviewsQuery);
    let reviews = [];
    reviewsSnapshot.forEach((docSnap) => {
      reviews.push({ id: docSnap.id, ...docSnap.data() });
    });
    renderReviews(reviews);
  } catch (error) {
    console.error("Error loading reviews:", error);
    averageRatingContainer.innerHTML = "<p>Error loading reviews.</p>";
  }
}

function renderReviews(reviews) {
  if (reviews.length === 0) {
    averageRatingContainer.innerHTML = `<p>No reviews yet.</p>`;
    topReviewsContainer.innerHTML = "";
    return;
  }

  // Calculate average rating
  const totalRating = reviews.reduce(
    (sum, review) => sum + (review.rating || 0),
    0
  );
  const avgRating = totalRating / reviews.length;

  // Render average rating with stars
  let starsHtml = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(avgRating)) {
      starsHtml += `<i class="fas fa-star" style="color: gold;"></i>`;
    } else if (i === Math.floor(avgRating) + 1 && avgRating % 1 >= 0.5) {
      starsHtml += `<i class="fas fa-star-half-alt" style="color: gold;"></i>`;
    } else {
      starsHtml += `<i class="far fa-star" style="color: gold;"></i>`;
    }
  }
  averageRatingContainer.innerHTML = `
    <div class="average-rating">
      <div class="stars">${starsHtml}</div>
      <div class="avg-number">${avgRating.toFixed(1)} / 5 (${
    reviews.length
  } reviews)</div>
    </div>
  `;

  // Render top 3 reviews
  const topReviews = reviews.slice(0, 3);
  let reviewsHtml = "";
  topReviews.forEach((review) => {
    reviewsHtml += `
      <div class="review">
        <p><strong>${review.buyerName || "Anonymous"}</strong> - ${
      review.rating
    }/5</p>
        <p>${review.comment}</p>
      </div>
    `;
  });
  topReviewsContainer.innerHTML = topReviews.length
    ? reviewsHtml
    : "<p>No reviews yet.</p>";
}

// --- Wishlist Functionality ---
function setupWishlistButton(itemId) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const wishlistDocRef = doc(db, "users", user.uid, "wishlist", itemId);
    const wishlistBtn = document.querySelector(
      `.wishlist-btn[data-id="${itemId}"]`
    );
    const heartIcon = wishlistBtn.querySelector("i");

    const wishlistDoc = await getDoc(wishlistDocRef);
    if (wishlistDoc.exists()) {
      heartIcon.classList.remove("not-in-wishlist");
      heartIcon.classList.add("in-wishlist");
    } else {
      heartIcon.classList.remove("in-wishlist");
      heartIcon.classList.add("not-in-wishlist");
    }

    wishlistBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (heartIcon.classList.contains("in-wishlist")) {
        await deleteDoc(wishlistDocRef);
        heartIcon.classList.remove("in-wishlist");
        heartIcon.classList.add("not-in-wishlist");
      } else {
        await setDoc(wishlistDocRef, { itemId });
        heartIcon.classList.remove("not-in-wishlist");
        heartIcon.classList.add("in-wishlist");
      }
    });
  });
}

// --- Cart Functionality ---
function setupCartButtons(itemId) {
  const cartButtons = document.querySelector(
    `.cart-buttons[data-id="${itemId}"]`
  );
  const addToCartBtn = cartButtons.querySelector(".add-to-cart-btn");
  const cartControls = cartButtons.querySelector(".cart-controls");
  const cartCount = cartButtons.querySelector(".cart-count");
  const incrementBtn = cartButtons.querySelector(".increment-btn");
  const decrementBtn = cartButtons.querySelector(".decrement-btn");
  const removeFromCartBtn = cartButtons.querySelector(".remove-from-cart-btn");

  // Load the initial cart state if user is logged in
  if (auth.currentUser) {
    const cartRef = doc(db, "users", auth.currentUser.uid, "cart", itemId);
    getDoc(cartRef)
      .then((docSnap) => {
        if (docSnap.exists()) {
          const quantity = docSnap.data().quantity;
          cartCount.textContent = quantity;
          addToCartBtn.style.display = "none";
          cartControls.style.display = "flex";
        }
      })
      .catch((error) => {
        console.error("Error loading cart count:", error);
      });
  }

  // Add to Cart
  addToCartBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!auth.currentUser) {
      alert("Please log in to add items to your cart.");
      return;
    }
    const cartRef = doc(db, "users", auth.currentUser.uid, "cart", itemId);
    await setDoc(cartRef, { itemId, quantity: 1 });
    cartCount.textContent = 1;
    addToCartBtn.style.display = "none";
    cartControls.style.display = "flex";
  });

  // Increment quantity
  incrementBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const cartRef = doc(db, "users", auth.currentUser.uid, "cart", itemId);
    const docSnap = await getDoc(cartRef);
    const currentCount = docSnap.exists() ? docSnap.data().quantity : 0;
    await setDoc(cartRef, { itemId, quantity: currentCount + 1 });
    cartCount.textContent = currentCount + 1;
  });

  // Decrement quantity
  decrementBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const cartRef = doc(db, "users", auth.currentUser.uid, "cart", itemId);
    const docSnap = await getDoc(cartRef);
    const currentCount = docSnap.exists() ? docSnap.data().quantity : 0;
    if (currentCount > 1) {
      await setDoc(cartRef, { itemId, quantity: currentCount - 1 });
      cartCount.textContent = currentCount - 1;
    } else if (currentCount === 1) {
      await deleteDoc(cartRef);
      cartCount.textContent = 0;
      addToCartBtn.style.display = "block";
      cartControls.style.display = "none";
    }
  });

  // Remove from Cart
  removeFromCartBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    const cartRef = doc(db, "users", auth.currentUser.uid, "cart", itemId);
    await deleteDoc(cartRef);
    cartCount.textContent = 0;
    addToCartBtn.style.display = "block";
    cartControls.style.display = "none";
  });
}

fetchProduct();

// Handle authentication UI
document.addEventListener("DOMContentLoaded", () => {
  const loginLink = document.querySelector(".login-link");
  const signupLink = document.querySelector(".signup-link");
  const accountLink = document.querySelector(".account-link");
  const logoutBtn = document.querySelector(".logout-btn");
  const cartIcon = document.querySelector(".fa-shopping-cart").parentElement;
  const wishlistIcon = document.querySelector(".fa-heart").parentElement;

  onAuthStateChanged(auth, (user) => {
    if (user) {
      loginLink.style.display = "none";
      signupLink.style.display = "none";
      accountLink.style.display = "block";
      logoutBtn.style.display = "block";

      cartIcon.addEventListener("click", () => {
        window.location.href = "../Cart/Cart.html";
      });

      wishlistIcon.addEventListener("click", () => {
        window.location.href = "../wishlist/wishlist.html";
      });
    } else {
      loginLink.style.display = "block";
      signupLink.style.display = "block";
      accountLink.style.display = "none";
      logoutBtn.style.display = "none";

      cartIcon.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "../Login/Login.html";
      });

      wishlistIcon.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "../Login/Login.html";
      });
    }
  });

  // Logout functionality
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();
    signOut(auth)
      .then(() => location.reload())
      .catch((error) => console.error("Logout Error:", error));
  });
});

// Search Redirect from Homepage
document.getElementById("searchBtn").addEventListener("click", () => {
  const query = document.getElementById("searchInput").value.trim();
  if (query) {
    window.location.href = `../search/search.html?query=${encodeURIComponent(
      query
    )}`;
  }
});

// Allow "Enter" key to search
document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const query = e.target.value.trim();
    if (query) {
      window.location.href = `../search/search.html?query=${encodeURIComponent(
        query
      )}`;
    }
  }
});

// Function to open (or create) a chat for the product
async function openChatForProduct(productId, sellerId) {
  try {
    const buyerId = auth.currentUser.uid;

    // Prevent users from messaging themselves
    if (buyerId === sellerId) {
      alert("You cannot message yourself.");
      return;
    }

    // Fetch product details
    const productDoc = await getDoc(doc(db, "items", productId));
    if (!productDoc.exists()) {
      alert("Product not found.");
      return;
    }
    const productData = productDoc.data();

    // Fetch seller details
    const sellerDoc = await getDoc(doc(db, "users", sellerId));
    if (!sellerDoc.exists()) {
      alert("Seller not found.");
      return;
    }

    const chatsRef = collection(db, "chats");

    // Query for an existing chat with this product, buyer, and seller
    const chatQuery = query(
      chatsRef,
      where("productId", "==", productId),
      where("buyerId", "==", buyerId),
      where("sellerId", "==", sellerId)
    );
    const chatSnapshot = await getDocs(chatQuery);

    let chatId;
    if (!chatSnapshot.empty) {
      // Chat already exists; use the first found document
      chatId = chatSnapshot.docs[0].id;
    } else {
      // No existing chat—create a new chat document
      const chatData = {
        productId,
        buyerId,
        sellerId,
        productName: productData.itemName,
        productImage: productData.imageBase64,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        participants: [buyerId, sellerId],
      };
      const docRef = await addDoc(chatsRef, chatData);
      chatId = docRef.id;
    }

    // Redirect to the chat page with the chatId and fromProductPage flag
    window.location.href = `../chatuser/chatuser.html?chatId=${chatId}&fromProductPage=true`;
  } catch (error) {
    console.error("Error opening or creating chat:", error);
    alert("An error occurred while opening the chat. Please try again.");
  }
}

// Attach event listener to the Message Seller button
function setupMessageSellerButton() {
  const messageBtn = document.getElementById("message-seller-btn");
  if (messageBtn) {
    messageBtn.addEventListener("click", () => {
      const productId = messageBtn.getAttribute("data-product-id");
      const sellerId = messageBtn.getAttribute("data-seller-id");
      openChatForProduct(productId, sellerId);
    });
  }
}
