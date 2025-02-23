import { auth, db } from "../../database/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

const form = document.getElementById("seller-registration-form");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "../../index.html";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect registration details
    const businessName = document.getElementById("business-name").value.trim();
    const businessEmail = document
      .getElementById("business-email")
      .value.trim();
    const businessPhone = document
      .getElementById("business-phone")
      .value.trim();
    const businessAddress = document
      .getElementById("business-address")
      .value.trim();
    const profilePhoto = document.getElementById("profile-photo").value.trim();
    const returnPolicy = document.getElementById("return-policy").value;
    const shippingPolicy = document
      .getElementById("shipping-policy")
      .value.trim();
    const paymentOptionElements = document.getElementsByName("payment-option");
    let paymentOption = "";
    for (let radio of paymentOptionElements) {
      if (radio.checked) {
        paymentOption = radio.value;
        break;
      }
    }
    // New social links fields
    const facebook = document.getElementById("facebook").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();
    const xLink = document.getElementById("x").value.trim();
    const termsAgreement = document.getElementById("terms-agreement").checked;

    if (!termsAgreement) {
      alert("You must agree to the Seller Terms and Conditions.");
      return;
    }

    try {
      // Use the user's UID as the seller's ID
      const sellerId = user.uid;
      // Create a seller document in the "sellers" collection
      const sellerDocRef = doc(db, "sellers", sellerId);
      await setDoc(sellerDocRef, {
        sellerId: sellerId,
        userId: user.uid, // Link to the user's UID
        businessName: businessName || null,
        businessEmail: businessEmail || null,
        businessPhone: businessPhone || null,
        businessAddress: businessAddress || null,
        profilePhoto: profilePhoto || user.photoURL || "default-profile.png",
        returnPolicy: returnPolicy || null,
        shippingPolicy: shippingPolicy || null,
        paymentOption: paymentOption || null,
        facebook: facebook || null,
        whatsapp: whatsapp || null,
        xLink: xLink || null,
        totalSales: 0,
        activeListings: 0,
        averageRating: 0,
        sellerRegisteredAt: serverTimestamp(),
      });

      // Mark the user as a seller in the "users" collection
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        isSeller: true,
        sellerId: sellerId,
      });

      alert("You are now registered as a seller!");
      window.location.href = "../seller/seller.html";
    } catch (error) {
      console.error("Error registering as seller:", error);
      alert("Registration failed. Please try again.");
    }
  });
});
