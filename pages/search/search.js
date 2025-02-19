import { auth, db } from "../../database/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// DOM Elements
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const resultsContainer = document.getElementById("resultsContainer");
const categorySelect = document.getElementById("categorySelect");
const subcategorySelect = document.getElementById("subcategorySelect");
const attributesContainer = document.getElementById("attributesContainer");


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
        window.location.href = "../cart/mycart.html";
      });

      wishlistIcon.addEventListener("click", () => {
        window.location.href = "../src/pages/wishlist/wishlist.html";
      });
    } else {
      loginLink.style.display = "block";
      signupLink.style.display = "block";
      accountLink.style.display = "none";
      logoutBtn.style.display = "none";

      cartIcon.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "../src/pages/Login/Login.html";
      });

      wishlistIcon.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "../src/pages/Login/Login.html";
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

// Create and append the suggestions container inside the search form
const suggestionsContainer = document.createElement("div");
suggestionsContainer.id = "suggestionsContainer";
searchForm.appendChild(suggestionsContainer);

// Category and Subcategory Data
const categoryData = {
  electronics: {
    subcategories: ["Laptop", "Phone", "TV", "Tablet", "Camera", "Accessories"],
    attributes: ["Brand", "RAM", "Storage", "Processor", "Condition"],
  },
  fashion: {
    subcategories: ["Men", "Women", "Kids"],
    attributes: ["Size", "Color", "Brand", "Material"],
  },
};

// Populate Category Select
for (const category in categoryData) {
  const option = document.createElement("option");
  option.value = category;
  option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
  categorySelect.appendChild(option);
}

// Handle Category Change (Populate Subcategories & Attributes)
categorySelect.addEventListener("change", () => {
  const selectedCategory = categorySelect.value;
  subcategorySelect.innerHTML = `<option value="">All Subcategories</option>`;
  if (selectedCategory && categoryData[selectedCategory]) {
    categoryData[selectedCategory].subcategories.forEach((sub) => {
      const option = document.createElement("option");
      option.value = sub;
      option.textContent = sub;
      subcategorySelect.appendChild(option);
    });
    // Show Attributes
    attributesContainer.innerHTML = "";
    categoryData[selectedCategory].attributes.forEach((attr) => {
      const label = document.createElement("label");
      label.textContent = attr;
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = `Enter ${attr}`;
      input.name = attr.toLowerCase().replace(/\s+/g, "-");
      attributesContainer.appendChild(label);
      attributesContainer.appendChild(input);
    });
  } else {
    attributesContainer.innerHTML = "";
  }
});

// --- DEBOUNCED SUGGESTIONS FUNCTIONALITY ---
let debounceTimer;
searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const value = e.target.value.trim();
    if (value.length < 2) {
      suggestionsContainer.innerHTML = "";
      return;
    }
    try {
      const itemsRef = collection(db, "items");
      const querySnapshot = await getDocs(itemsRef);
      let suggestions = [];
      querySnapshot.forEach((doc) => {
        const item = doc.data();
        if (item.itemName.toLowerCase().includes(value.toLowerCase())) {
          suggestions.push(item.itemName);
        }
      });
      // Remove duplicates and limit suggestions to 5
      suggestions = [...new Set(suggestions)].slice(0, 5);
      renderSuggestions(suggestions);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      suggestionsContainer.innerHTML = "<p>Error loading suggestions.</p>";
    }
  }, 500); // 300ms debounce delay
});

function renderSuggestions(suggestions) {
  suggestionsContainer.innerHTML = "";
  suggestions.forEach((suggestion) => {
    const div = document.createElement("div");
    div.textContent = suggestion;
    div.addEventListener("click", () => {
      searchInput.value = suggestion;
      suggestionsContainer.innerHTML = "";
      searchForm.dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      );
    });
    suggestionsContainer.appendChild(div);
  });
}

// --- OPTIMIZED SEARCH FORM SUBMISSION ---
searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  suggestionsContainer.innerHTML = "";
  const searchQuery = searchInput.value.trim().toLowerCase();
  const selectedCategory = categorySelect.value;
  const selectedSubcategory = subcategorySelect.value;
  const minPrice = parseFloat(document.getElementById("minPrice")?.value) || 0;
  const maxPrice =
    parseFloat(document.getElementById("maxPrice")?.value) || Infinity;
  const condition = document.getElementById("conditionFilter")?.value;
  const deliveryOption = document.getElementById("deliveryFilter")?.value;
  const minRating =
    parseFloat(document.getElementById("minRating")?.value) || 0;

  resultsContainer.innerHTML = "Searching...";
  try {
    let queryRef = collection(db, "items");
    if (selectedCategory) {
      queryRef = query(queryRef, where("category", "==", selectedCategory));
    }
    if (selectedSubcategory) {
      queryRef = query(
        queryRef,
        where("subcategory", "==", selectedSubcategory),
      );
    }
    if (minPrice > 0 || maxPrice < Infinity) {
      queryRef = query(
        queryRef,
        where("price", ">=", minPrice),
        where("price", "<=", maxPrice),
      );
    }

    const querySnapshot = await getDocs(queryRef);
    let results = [];
    querySnapshot.forEach((docSnap) => {
      const item = docSnap.data();
      const matchesSearch = searchQuery
        ? item.itemName.toLowerCase().includes(searchQuery) ||
          item.description.toLowerCase().includes(searchQuery) ||
          (item.tags && item.tags.some((tag) => tag.includes(searchQuery)))
        : true;
      const matchesCondition = condition
        ? item.attributes?.Condition === condition
        : true;
      const matchesDelivery = deliveryOption
        ? item.deliveryOption === deliveryOption
        : true;
      const matchesRating = item.rating ? item.rating >= minRating : true;

      if (
        matchesSearch &&
        matchesCondition &&
        matchesDelivery &&
        matchesRating
      ) {
        results.push({ id: docSnap.id, ...item });
      }
    });
    displayResults(results);
  } catch (error) {
    console.error("Error fetching items:", error);
    resultsContainer.innerHTML =
      "<p>Error fetching results. Please try again.</p>";
  }
});

function displayResults(items) {
  resultsContainer.innerHTML = "";
  if (items.length === 0) {
    resultsContainer.innerHTML = "<p>No items found.</p>";
    return;
  }
  items.forEach((item) => {
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("result-item");

    // Format attributes as comma-separated values
    const attributes = item.attributes
      ? Object.entries(item.attributes)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ")
      : "No attributes";

    itemDiv.innerHTML = `
      <img src="${item.imageBase64 || "default.jpg"}" alt="${
        item.itemName
      }" loading="lazy" />
      <div class="result-details">
        <h3>${item.itemName}</h3>
        <p>${item.description}</p>
        <div class="result-attributes">
          <span>${attributes}</span>
        </div>
        <p>Price: $${item.price}</p>
        <p>Rating: ${item.rating || "N/A"}</p>
      </div>
      <div class="buttons-group">
        <button class="wishlist-btn" data-id="${item.id}">
          <i class="fas fa-heart not-in-wishlist"></i>
        </button>
        <div class="cart-buttons" data-id="${item.id}">
          <!-- Add to Cart Button (Initially Visible) -->
          <button class="add-to-cart-btn">
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>
          <!-- Cart Controls (Initially Hidden) -->
          <div class="cart-controls" style="display: none;">
            <button class="decrement-btn">-</button>
            <span class="cart-count">0</span>
            <button class="increment-btn">+</button>
            <button class="remove-from-cart-btn">Remove</button>
          </div>
        </div>
      </div>
    `;

    // Clicking outside buttons navigates to item page
    itemDiv.addEventListener("click", (e) => {
      if (!e.target.closest(".buttons-group")) {
        window.location.href = `../product/product.html?id=${item.id}`;
      }
    });

    resultsContainer.appendChild(itemDiv);
  });

  // Initialize wishlist and cart functionality for the rendered items
  setupWishlistButtons();
  setupCartButtons();
}

function setupCartButtons() {
  document.querySelectorAll(".cart-buttons").forEach((cartButtons) => {
    const itemId = cartButtons.getAttribute("data-id");
    const addToCartBtn = cartButtons.querySelector(".add-to-cart-btn");
    const cartControls = cartButtons.querySelector(".cart-controls");
    const cartCount = cartButtons.querySelector(".cart-count");
    const incrementBtn = cartButtons.querySelector(".increment-btn");
    const decrementBtn = cartButtons.querySelector(".decrement-btn");
    const removeFromCartBtn = cartButtons.querySelector(
      ".remove-from-cart-btn",
    );

    // Load initial cart count if user is logged in
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

    // Add to Cart Button
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

    // Increment Button
    incrementBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const cartRef = doc(db, "users", auth.currentUser.uid, "cart", itemId);
      const docSnap = await getDoc(cartRef);
      const currentCount = docSnap.exists() ? docSnap.data().quantity : 0;
      await setDoc(cartRef, { itemId, quantity: currentCount + 1 });
      cartCount.textContent = currentCount + 1;
    });

    // Decrement Button
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

    // Remove from Cart Button
    removeFromCartBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const cartRef = doc(db, "users", auth.currentUser.uid, "cart", itemId);
      await deleteDoc(cartRef);
      cartCount.textContent = 0;
      addToCartBtn.style.display = "block";
      cartControls.style.display = "none";
    });
  });
}

function setupWishlistButtons() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const userWishlistRef = collection(db, "users", user.uid, "wishlist");
    document.querySelectorAll(".wishlist-btn").forEach(async (button) => {
      const itemId = button.getAttribute("data-id");
      const heartIcon = button.querySelector("i");
      const wishlistDocRef = doc(userWishlistRef, itemId);
      const wishlistDoc = await getDoc(wishlistDocRef);
      if (wishlistDoc.exists()) {
        heartIcon.classList.remove("not-in-wishlist");
        heartIcon.classList.add("in-wishlist");
      } else {
        heartIcon.classList.remove("in-wishlist");
        heartIcon.classList.add("not-in-wishlist");
      }
      button.addEventListener("click", async (e) => {
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
  });
}

// --- FETCH ALL ITEMS (Default Display) ---
async function fetchAllItems() {
  resultsContainer.innerHTML = "Loading items...";
  try {
    const itemsRef = collection(db, "items");
    const querySnapshot = await getDocs(itemsRef);
    let results = [];
    querySnapshot.forEach((docSnap) => {
      results.push({ id: docSnap.id, ...docSnap.data() });
    });
    displayResults(results);
  } catch (error) {
    console.error("Error fetching all items:", error);
    resultsContainer.innerHTML =
      "<p>Error fetching items. Please try again.</p>";
  }
}

// --- INITIALIZE PAGE BASED ON URL PARAMETER ---
document.addEventListener("DOMContentLoaded", () => {
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get("query");
  if (queryParam) {
    searchInput.value = queryParam;
    searchForm.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );
  } else {
    fetchAllItems();
  }
});
