import { auth, db } from "../../database/config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Function to load and display seller details
function loadSellerProfile() {
  // Retrieve seller document from the "users" collection
  const userRef = doc(db, "users", auth.currentUser.uid);
  getDoc(userRef)
    .then((userSnap) => {
      if (userSnap.exists()) {
        const data = userSnap.data();
        
        // Update Seller Header
        const profilePictureEl = document.querySelector(".profile-picture");
        profilePictureEl.src = data.profilePhoto || "../../assets/images/new/defaultpfp.png";
        
        const sellerNameEl = document.querySelector(".seller-header h1");
        sellerNameEl.textContent = data.displayName || "John Doe";
        
        const sellerBioEl = document.querySelector(".seller-bio");
        sellerBioEl.textContent = data.bio || "Professional seller specializing in handmade crafts and unique gifts.";
        
        // Update Seller Rating (if available; otherwise, use a default)
        const ratingEl = document.querySelector(".seller-rating .rating");
        ratingEl.textContent = data.averageRating ? `${data.averageRating}/5` : "4.5/5 (120 reviews)";
        
        // Update Contact Information
        const contactInfoEl = document.querySelector(".contact-info");
        contactInfoEl.innerHTML = `
          <h2>Contact Information</h2>
          <p>Email: ${data.businessEmail || "john.doe@example.com"}</p>
          <p>Phone: ${data.contact || "+1 234 567 890"}</p>
          <div class="social-links">
            <a href="${data.facebook || "https://facebook.com/johndoe"}">Facebook</a>
            <a href="${data.instagram || "https://instagram.com/johndoe"}">Instagram</a>
          </div>
        `;
        
        // Update Seller Stats
        const sellerStatsEl = document.querySelector(".seller-stats");
        sellerStatsEl.innerHTML = `
          <h2>Seller Stats</h2>
          <p>Total Sales: ${data.totalSales ?? "500+"}</p>
          <p>Active Listings: ${data.activeListings ?? "25"}</p>
          <p>Response Time: ${data.responseTime ?? "1 hour"}</p>
          <p>Member Since: ${data.memberSince ?? "January 2020"}</p>
        `;
        
        // Update Seller Policies
        const sellerPoliciesEl = document.querySelector(".seller-policies");
        sellerPoliciesEl.innerHTML = `
          <h2>Policies</h2>
          <p>Returns: ${data.returnPolicy || "30-day money-back guarantee"}</p>
          <p>Shipping: ${data.shippingPolicy || "Free shipping on orders over $50"}</p>
        `;
        
        // (Optional) Update Featured Products if you wish to load listings
        // For now, if no featured products are stored, you can leave it as default HTML.
      }
    })
    .catch((error) => {
      console.error("Error fetching seller profile:", error);
    });
}

// Set up authentication state listener
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    loadSellerProfile();
  } else {
    window.location.href = "../../index.html";
  }
});

// Logout Handler
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth)
      .then(() => window.location.href = "../../index.html")
      .catch((error) => console.error("Error signing out:", error));
  });
}

// Edit Profile Button Handler
const editProfileBtn = document.getElementById("edit-profile-btn");
if (editProfileBtn) {
  editProfileBtn.addEventListener("click", () => {
    // Redirect to an edit page; adjust URL as needed
    window.location.href = "./sellerbio-edit.html";
  });
};
