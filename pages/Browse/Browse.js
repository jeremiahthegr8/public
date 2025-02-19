import { db } from "../../database/config.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

document
  .getElementById("apply-filters")
  .addEventListener("click", applyFilters);
document.getElementById("search-btn").addEventListener("click", applyFilters);

// Function to update URL with search parameters
function updateURL(params) {
  const url = new URL(window.location);
  Object.keys(params).forEach((key) =>
    url.searchParams.set(key, params[key] || ""),
  );
  window.history.pushState({}, "", url);
}

// Function to fetch and display products based on filters
async function fetchProducts(filters) {
  const resultsContainer = document.getElementById("search-results");
  resultsContainer.innerHTML = "<p>Loading...</p>";

  try {
    let q = query(collection(db, "items"));

    // Apply category filter
    if (filters.category) {
      q = query(q, where("category", "==", filters.category));
    }

    // Apply price range filter
    if (filters.minPrice) {
      q = query(q, where("price", ">=", Number(filters.minPrice)));
    }
    if (filters.maxPrice) {
      q = query(q, where("price", "<=", Number(filters.maxPrice)));
    }

    // Execute query
    const querySnapshot = await getDocs(q);
    resultsContainer.innerHTML = "";

    if (querySnapshot.empty) {
      resultsContainer.innerHTML = "<p>No results found</p>";
      return;
    }

    querySnapshot.forEach((doc) => {
      const item = doc.data();
      resultsContainer.innerHTML += `
        <div class="product-card">
          <img src="${item.imageBase64 || "default.jpg"}" alt="${item.itemName}" />
          <div class="product-details">
            <p class="product-name">${item.itemName}</p>
            <p class="product-price">$${item.price ? item.price.toFixed(2) : "N/A"}</p>
            <p>Delivery: $${item.deliveryFee || "N/A"}</p>
            <p>Ratings: ${item.ratings || "No ratings"}</p>
            <p>${item.tags?.join(", ") || "No tags"}</p>
            <div class="product-actions">
              <button class="wishlist-btn" data-id="${doc.id}">❤️ Wishlist</button>
              <button onclick="addToCart('${doc.id}')">🛒 Add to Cart</button>
            </div>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    resultsContainer.innerHTML = "<p>Failed to load products</p>";
  }
}

// Function to collect filters and apply them
function applyFilters() {
  const filters = {
    search: document.getElementById("search-bar").value.trim(),
    category: document.getElementById("category").value,
    minPrice: document.getElementById("min-price").value,
    maxPrice: document.getElementById("max-price").value,
    ratings: document.getElementById("ratings").value,
  };

  updateURL(filters);
  fetchProducts(filters);
}

// Load filters from URL when page loads
function loadFiltersFromURL() {
  const params = new URLSearchParams(window.location.search);
  document.getElementById("search-bar").value = params.get("search") || "";
  document.getElementById("category").value = params.get("category") || "";
  document.getElementById("min-price").value = params.get("minPrice") || "";
  document.getElementById("max-price").value = params.get("maxPrice") || "";
  document.getElementById("ratings").value = params.get("ratings") || "";

  const filters = Object.fromEntries(params.entries());
  fetchProducts(filters);
}

// Run on page load
window.addEventListener("DOMContentLoaded", loadFiltersFromURL);
