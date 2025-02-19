import { auth, db } from "./database/config.js"; // Import Firebase modules
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getFirestore,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

firebase
  .auth()
  .setPersistence(firebase.auth.Auth.Persistence.NONE)
  .then(() => {
    console.log("Auth persistence disabled");
  });


// Fetch and display featured products
async function fetchFeaturedProducts() {
  const productsContainer = document.querySelector(".product-grid");
  if (!productsContainer) {
    console.error("Products container not found.");
    return;
  }
  productsContainer.innerHTML = ""; // Clear previous content

  try {
    const querySnapshot = await getDocs(collection(db, "items"));
    const products = [];

    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });

    if (products.length === 0) {
      productsContainer.innerHTML = "<p>No items available.</p>";
      return;
    }

    // Shuffle and select 5 random products
    const featuredProducts = products
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);

    featuredProducts.forEach((item) => {
      const productCard = document.createElement("div");
      productCard.classList.add("product-card");

      productCard.innerHTML = `
        <div class="product-image">
          <img src="${item.imageBase64 || "default.jpg"}" alt="${
        item.itemName
      }">
        </div>
        <p class="product-name">${item.itemName}</p>
        <p class="product-price">$${
          item.price ? item.price.toFixed(2) : "N/A"
        }</p>
        <div class="product-actions">
          <button class="wishlist-btn" data-id="${item.id}">
            <i class="fas fa-heart not-in-wishlist"></i>
          </button>
          <button class="buy-now-btn" onclick="addToCart('${
            item.id
          }')">Buy Now</button>
        </div>
      `;

      //redirect to product page
      productCard.addEventListener("click", () => {
        window.location.href = `./pages/product/product.html?id=${item.id}`;
      });

      productsContainer.appendChild(productCard);
    });

    setupWishlistButtons();
  } catch (error) {
    console.error("Error fetching items:", error);
  }
}

// Wishlist functionality
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
      }

      // Toggle wishlist on click
      button.addEventListener("click", async () => {
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

// Refresh products every 2 minutes
setInterval(fetchFeaturedProducts, 120000);
document.addEventListener("DOMContentLoaded", fetchFeaturedProducts);

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
        window.location.href = "./pages/cart/mycart.html";
      });

      wishlistIcon.addEventListener("click", () => {
        window.location.href = "./pages/wishlist/wishlist.html";
      });
    } else {
      loginLink.style.display = "block";
      signupLink.style.display = "block";
      accountLink.style.display = "none";
      logoutBtn.style.display = "none";

      cartIcon.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "./pages/Login/Login.html";
      });

      wishlistIcon.addEventListener("click", (e) => {
        e.preventDefault();
        window.location.href = "./pages/Login/Login.html";
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

async function fetchProductsByCategory() {
  const categoriesContainer = document.getElementById("categories-container");
  if (!categoriesContainer) {
    console.error("Categories container not found.");
    return;
  }

  categoriesContainer.innerHTML = ""; // Clear previous content

  // Map category names to their hero banners
  const categoryBanners = {
    Sports: `
      <section class="seventytwo" style="background-image: url('./assets/images/new/backtwo.jpg')">
        <div class="content">
          <h2 class="text-4xl font-bold mb-4">Explore the Latest Football Gear</h2>
          <p class="text-lg mb-8">
            Get ready for the game with our top-quality football gear. From jerseys to boots, we have everything you need to perform your best on the field.
          </p>
        </div>
      </section>
    `,
    Electronics: `
      <section class="seventytwo" style="background-image: url('./assets/images/new/backelectronics.avif')">
        <div class="content">
          <h2 class="text-4xl font-bold mb-4">Discover the Best Electronics</h2>
          <p class="text-lg mb-8">
            Upgrade your tech with our latest gadgets, home appliances, and accessories.
          </p>
        </div>
      </section>
    `,
    Fashion: `
      <section class="seventytwo" style="background-image: url('./assets/images/new/backclothes.jpg')">
        <div class="content">
          <h2 class="text-4xl font-bold mb-4">Stay Stylish with the Latest Fashion</h2>
          <p class="text-lg mb-8">
            Explore the latest trends in clothing, shoes, and accessories to suit your style.
          </p>
        </div>
      </section>
    `,
    Books: `
      <section class="seventytwo" style="background-image: url('./assets/images/new/backbooks.jpg')">
        <div class="content">
          <h2 class="text-4xl font-bold mb-4">Dive into a World of Books</h2>
          <p class="text-lg mb-8">
            Discover new stories, adventures, and knowledge with our wide selection of books.
          </p>
        </div>
      </section>
    `,
    Toys: `
      <section class="seventytwo" style="background-image: url('./assets/images/new/backtoys.jpg')">
        <div class="content">
          <h2 class="text-4xl font-bold mb-4">Fun and Games for Everyone</h2>
          <p class="text-lg mb-8">
            Find the perfect toy for your child or the child at heart with our collection of games and toys.
          </p>
        </div>
      </section>
    `,
  };

  try {
    const querySnapshot = await getDocs(collection(db, "items"));
    const itemsByCategory = {};

    querySnapshot.forEach((doc) => {
      const item = doc.data();
      if (!itemsByCategory[item.category]) {
        itemsByCategory[item.category] = [];
      }
      if (itemsByCategory[item.category].length < 5) {
        itemsByCategory[item.category].push({ id: doc.id, ...item });
      }
    });

    for (const category in itemsByCategory) {
      // Insert hero banner if it exists for the category
      if (categoryBanners[category]) {
        categoriesContainer.insertAdjacentHTML(
          "beforeend",
          categoryBanners[category]
        );
      }

      // Create category product section
      const categorySection = document.createElement("section");
      categorySection.classList.add("featured-products");
      categorySection.innerHTML = `
        <h2 class="section-title">${category}</h2>
        <div class="product-grid">
          ${itemsByCategory[category]
            .map(
              (item) => `
                <div class="product-card">
                  <div class="product-image">
                    <img src="${item.imageBase64 || "default.jpg"}" alt="${
                item.itemName
              }">
                  </div>
                  <p class="product-name">${item.itemName}</p>
                  <p class="product-price">$${
                    item.price ? item.price.toFixed(2) : "N/A"
                  }</p>
                  <div class="product-actions">
                    <button class="wishlist-btn" data-id="${item.id}">
                      <i class="fas fa-heart not-in-wishlist"></i>
                    </button>
                    <button class="buy-now-btn" onclick="addToCart('${
                      item.id
                    }')">Buy Now</button>
                  </div>
                </div>
              `
            )
            .join("")}
        </div>
      `;

      // Redirect to product page on click
      categorySection.addEventListener("click", (e) => {
        const productCard = e.target.closest(".product-card");
        if (productCard) {
          const itemId = itemsByCategory[category][
            Array.from(categorySection.querySelectorAll(".product-card")).indexOf(
              productCard
            )
          ].id;
          window.location.href = `./pages/product/product.html?id=${itemId}`;
        }
      });

      categoriesContainer.appendChild(categorySection);
    }

    setupWishlistButtons();
  } catch (error) {
    console.error("Error fetching category-based products:", error);
  }
}

// Search Redirect from Homepage
document.getElementById("searchBtn").addEventListener("click", () => {
  const query = document.getElementById("searchInput").value.trim();
  if (query) {
    window.location.href = `./pages/search/search.html?query=${encodeURIComponent(
      query
    )}`;
  }
});

// Allow "Enter" key to search
document.getElementById("searchInput").addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const query = e.target.value.trim();
    if (query) {
      window.location.href = `./pages/search/search.html?query=${encodeURIComponent(
        query
      )}`;
    }
  }
});

//Refresh products every 2 minutes
setInterval(fetchProductsByCategory, 120000);
document.addEventListener("DOMContentLoaded", fetchProductsByCategory);
