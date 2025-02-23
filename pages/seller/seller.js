import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

/* ------------------------------
   Seller Dashboard Functions
------------------------------ */


// Fetch Seller Metrics: total items, total orders, average rating, pending cancellations
async function fetchSellerMetrics(uid) {
  // Query items where sellerId equals the seller's UID
  const itemsQuery = query(
    collection(db, "items"),
    where("sellerId", "==", uid)
  );
  const itemsSnapshot = await getDocs(itemsQuery);
  const totalItems = itemsSnapshot.size;

  // Collect seller item IDs
  const sellerItemIds = [];
  itemsSnapshot.forEach((docSnap) => {
    sellerItemIds.push(docSnap.id);
  });

  // Calculate average rating from reviews for these items
  let sumRatings = 0,
    ratingCount = 0;
  if (sellerItemIds.length > 0) {
    const reviewsQuery = query(
      collection(db, "reviews"),
      where("productId", "in", sellerItemIds)
    );
    const reviewsSnapshot = await getDocs(reviewsQuery);
    reviewsSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.rating) {
        sumRatings += data.rating;
        ratingCount++;
      }
    });
  }
  const averageRating = ratingCount > 0 ? sumRatings / ratingCount : 0;


  const ordersQuery = query(
    collection(db, "orders"),
    where("sellerId", "==", uid)
  );
  const ordersSnapshot = await getDocs(ordersQuery);
  const totalOrders = ordersSnapshot.size;
  let pendingCancels = 0;
  let totalSales = 0;
  ordersSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    if (data.status === "cancelRequested") {
      pendingCancels++;
    }
    if (data.status === "shipped") {
      totalSales += data.totalAmount || 0;
    }
  });

  return {
    totalItems,
    totalOrders,
    averageRating,
    pendingCancels,
    totalSales,
  };
}

// Fetch Seller Reviews
async function fetchSellerReviews(sellerId) {
  const itemsQuery = query(
    collection(db, "items"),
    where("sellerId", "==", sellerId)
  );
  const itemsSnapshot = await getDocs(itemsQuery);
  const sellerItems = [];
  const itemIdToName = {};
  itemsSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    sellerItems.push({ itemId: docSnap.id, ...data });
    itemIdToName[docSnap.id] = data.itemName;
  });
  if (sellerItems.length === 0) return [];
  const sellerItemIds = sellerItems.map((item) => item.itemId);
  const reviewsQuery = query(
    collection(db, "reviews"),
    where("productId", "in", sellerItemIds),
    orderBy("createdAt", "desc")
  );
  const reviewsSnapshot = await getDocs(reviewsQuery);
  const reviews = [];
  reviewsSnapshot.forEach((docSnap) => {
    reviews.push({ id: docSnap.id, ...docSnap.data() });
  });
  reviews.forEach((review) => {
    review.itemName = itemIdToName[review.productId] || "Unknown Item";
  });
  return reviews;
}


// Fetch Recent Orders
async function fetchRecentOrders(uid) {
  const ordersQuery = query(
    collection(db, "orders"),
    where("sellerId", "==", uid),
    orderBy("createdAt", "desc"),
    limit(5)
  );
  const ordersSnapshot = await getDocs(ordersQuery);
  let orders = [];
  ordersSnapshot.forEach((docSnap) => {
    orders.push({ id: docSnap.id, ...docSnap.data() });
  });
  return orders;
}

// Fetch Seller Items
async function fetchSellerItems(uid) {
  const itemsQuery = query(
    collection(db, "items"),
    where("sellerId", "==", uid)
  );
  const itemsSnapshot = await getDocs(itemsQuery);
  let items = [];
  itemsSnapshot.forEach((docSnap) => {
    items.push({ itemId: docSnap.id, ...docSnap.data() });
  });
  return items;
}


// Load Seller Profile Information
async function loadSellerProfile(uid) {
  const sellerDocRef = doc(db, "sellers", uid);
  const sellerSnap = await getDoc(sellerDocRef);
  if (sellerSnap.exists()) {
    const data = sellerSnap.data();

    // Update Seller Profile
    document.querySelector(".profile-picture").src =
       "../../assets/images/new/defaultpfp.png";
    document.getElementById("seller-name").textContent =
      data.businessName || "Seller";
    document.getElementById("seller-bio").textContent =
      data.bio ||
      "Professional seller specializing in handmade crafts and unique gifts.";
    document.getElementById("seller-email").textContent =
      data.businessEmail || "john.doe@example.com";
    document.getElementById("seller-phone").textContent =
      data.businessPhone || "+1 234 567 890";
    document.getElementById("seller-facebook").href = data.facebook || "#";
    document.getElementById("seller-instagram").href = data.instagram || "#";
    document.getElementById("seller-twitter").href = data.xLink || "#";
    document.getElementById("seller-whatsapp").href = data.whatsapp || "#";
    document.getElementById("total-sales").textContent =
      data.totalSales ?? "500+";
    document.getElementById("active-listings").textContent =
      data.activeListings ?? "25";
    document.getElementById("response-time").textContent =
      data.responseTime ?? "1 hour";
    document.getElementById("member-since").textContent =
      data.sellerRegisteredAt?.toDate().toLocaleDateString() || "January 2020";
    document.getElementById("return-policy").textContent =
      data.returnPolicy || "30-day money-back guarantee";
    document.getElementById("shipping-policy").textContent =
      data.shippingPolicy || "Free shipping on orders over $50";
  }
}

// Function that loads the entire seller dashboard content
async function loadSellerDashboard(uid) {
  // Update seller metrics
  const metrics = await fetchSellerMetrics(uid);
  document.getElementById("total-items").textContent = metrics.totalItems;
  document.getElementById("total-orders").textContent = metrics.totalOrders;
  document.getElementById("average-rating").textContent =
    metrics.averageRating.toFixed(1);
  document.getElementById("pending-cancels").textContent =
    metrics.pendingCancels;

    const avgRatingNum = metrics.averageRating.toFixed(1);
    document.getElementById("average-rating").textContent = avgRatingNum;
    // Update seller rating display with stars
    const ratingContainer = document.querySelector(".seller-rating");
    if (ratingContainer) {
      ratingContainer.innerHTML = `${getStarsHtml(
        metrics.averageRating
      )} <span id="seller-rating">${avgRatingNum}/5</span>`;
  }
  
  // Update total sales
  document.getElementById("total-sales").textContent = metrics.totalSales;

  // Make Average Rating clickable
  const averageRatingEl = document.getElementById("average-rating");
  if (averageRatingEl) {
    averageRatingEl.style.cursor = "pointer";
    averageRatingEl.addEventListener("click", () => {
      window.location.href = "../ratingsandreview/ratingsandreview.html";
    });
  }

  // Load and render seller reviews
  const sellerReviews = await fetchSellerReviews(uid);
  const sellerReviewsList = document.getElementById("seller-reviews-list");
  sellerReviewsList.innerHTML = "";
  if (sellerReviews.length === 0) {
    sellerReviewsList.innerHTML = "<p>No reviews for your items yet.</p>";
  } else {
    sellerReviews.forEach((review) => {
      const reviewDate =
        review.createdAt && review.createdAt.seconds
          ? new Date(review.createdAt.seconds * 1000).toLocaleString()
          : "N/A";
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

  // Load recent orders and render
  const orders = await fetchRecentOrders(uid);
  const ordersList = document.getElementById("orders-list");
  ordersList.innerHTML = "";
  if (orders.length === 0) {
    ordersList.innerHTML = "<p>No recent orders found.</p>";
  } else {
    orders.forEach((order) => {
      const orderDate =
        order.createdAt && order.createdAt.seconds
          ? new Date(order.createdAt.seconds * 1000).toLocaleString()
          : "N/A";
      const orderDiv = document.createElement("div");
      orderDiv.classList.add("order-entry");
      orderDiv.innerHTML = `
        <p><strong>Order ID:</strong> ${order.orderId || "N/A"}</p>
        <p><strong>Date:</strong> ${orderDate}</p>
        <p><strong>Status:</strong> ${order.status || "N/A"}</p>
      `;
      ordersList.appendChild(orderDiv);
    });
  }

  // Load seller items and render
  const items = await fetchSellerItems(uid);
  const itemsList = document.getElementById("items-list");
  if (itemsList) {
    itemsList.innerHTML = "";
    if (items.length === 0) {
      itemsList.innerHTML = "<p>No items found.</p>";
    } else {
      items.forEach((item) => {
        const itemDiv = document.createElement("div");
        itemDiv.classList.add("item-entry");
        itemDiv.innerHTML = `
          <div class="item-details">
            <p><strong>${item.itemName || "Unnamed Item"}</strong></p>
            <p>$${item.price || "0.00"}</p>
          </div>
          <div class="item-actions">
            <button class="edit-btn" data-id="${item.itemId}">Edit</button>
            <button class="delete-btn" data-id="${item.itemId}">Delete</button>
          </div>
        `;
        itemsList.appendChild(itemDiv);
      });
    }
  }
}

/* ------------------------------
   Authentication & Initialization
------------------------------ */
onAuthStateChanged(auth, async (user) => {
  if (user && user.emailVerified) {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const isSeller = userSnap.exists() && userSnap.data().isSeller === true;

    if (!isSeller) {
      document.body.innerHTML = `
        <div style="text-align: center; padding: 50px;">
          <h2>You are not registered as a Seller.</h2>
          <p>To sell your products, please register as a seller today.</p>
          <button id="register-seller-btn" style="padding: 10px 20px; font-size: 1.2rem;">Register as Seller Today</button>
        </div>
      `;
      document
        .getElementById("register-seller-btn")
        .addEventListener("click", () => {
          window.location.href = "../registerseller/registerseller.html";
        });
    } else {
      loadSellerProfile(user.uid);
      loadSellerDashboard(user.uid);
    }
  } else {
    window.location.href = "../../index.html";
  }
});

/* ------------------------------
   Event Listeners
------------------------------ */
document.getElementById("logout-btn")?.addEventListener("click", () => {
  signOut(auth)
    .then(() => (window.location.href = "../../index.html"))
    .catch((error) => console.error("Error signing out:", error));
});

document.getElementById("add-item-btn")?.addEventListener("click", () => {
  window.location.href = "../sell/sell.html";
});


/* Helper to convert a numeric rating to stars HTML */
function getStarsHtml(avgRating) {
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
  return starsHtml;
}
