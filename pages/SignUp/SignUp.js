import { auth, db } from "../../database/config.js";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Utility functions
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);
}

// Function to get user's IP address and geolocation
async function getUserIPAndLocation() {
  try {
    const response = await fetch("https://ipapi.co/json/");
    const data = await response.json();
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name,
    };
  } catch (error) {
    console.error("Error fetching IP and location:", error);
    return {
      ip: "Unknown",
      city: "Unknown",
      region: "Unknown",
      country: "Unknown",
    };
  }
}

// Function to get device and browser information
function getDeviceAndBrowserInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  };
}

// Handle user registration
document
  .querySelector(".register__form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("register-pass").value;
    const confirmPass = document.getElementById("confirm-pass").value;
    const fullName = document.getElementById("full-name").value.trim();
    const age = document.getElementById("age").value;
    const phone = document.getElementById("phone").value.trim();
    const address = document.getElementById("address").value.trim();
    const country = document.getElementById("country").value.trim();
    const city = document.getElementById("city").value.trim();
    const policyAgreement = document.getElementById("policy-agreement").checked;

    if (
      !email ||
      !password ||
      !fullName ||
      !age ||
      !phone ||
      !address ||
      !country ||
      !city
    ) {
      alert("Please fill in all fields.");
      return;
    }
    if (!isValidEmail(email)) {
      alert("Please enter a valid email address.");
      return;
    }
    if (!isValidPassword(password)) {
      alert(
        "Password must be at least 6 characters long and include at least one letter and one number."
      );
      return;
    }
    if (password !== confirmPass) {
      alert("Passwords do not match!");
      return;
    }
    if (!policyAgreement) {
      alert("You must agree to the Terms and Conditions and Privacy Policy.");
      return;
    }

    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Set up actionCodeSettings to point to our unified action page for email verification.
      const actionCodeSettings = {
        url: "https://ecommerce-d50ed.web.app/pages/action/action.html?mode=verifyEmail",
        handleCodeInApp: true,
      };

      // Send email verification
      await sendEmailVerification(user, actionCodeSettings);
      alert(
        "A verification email has been sent. Please check your inbox and click the link to verify your email."
      );

      // Get user's IP and location
      const {
        ip,
        city: userCity,
        region,
        country: userCountry,
      } = await getUserIPAndLocation();
      // Get device and browser info
      const deviceInfo = getDeviceAndBrowserInfo();

      // Save user data in Firestore
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        email: user.email,
        fullName,
        age: parseInt(age),
        phone,
        address,
        country,
        city,
        emailVerified: false, // will update after verification
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        loginHistory: [], // Initialize login history
        consentAndPolicy: {
          accepted: true,
          timestamp: new Date().toISOString(),
        },
        securityFlags: {
          suspiciousActivity: false,
          twoFactorEnabled: false,
        },
        deviceInfo,
        ipAddress: ip,
        geolocation: {
          city: userCity,
          region,
          country: userCountry,
        },
      });

      // Create subcollections
      await setDoc(doc(collection(userRef, "cart")), { items: [] });
      await setDoc(doc(collection(userRef, "wishlist")), { items: [] });
      await setDoc(doc(collection(userRef, "orders")), { orders: [] });
      await setDoc(doc(collection(userRef, "settings")), { preferences: {} });

      // Sign out the user so that they must click the verification link.
      await auth.signOut();

      // Redirect to a page informing the user to check their email.
      window.location.href = "../../index.html";
    } catch (error) {
      console.error("Error signing up:", error);
      alert(error.message);
    }
  });

// Google Sign-up (similar logic applies; omitted here for brevity)
document.getElementById("google-signup").addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const {
      ip,
      city: userCity,
      region,
      country: userCountry,
    } = await getUserIPAndLocation();
    const deviceInfo = getDeviceAndBrowserInfo();

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const fullName = prompt("Enter your full name:", user.displayName || "");
      const phone = prompt("Enter your phone number:", user.phoneNumber || "");
      const age = prompt("Enter your age:", "");
      const country = prompt("Enter your country:", "");
      const city = prompt("Enter your city:", "");
      const address = prompt("Enter your full address:", "");

      await setDoc(userRef, {
        email: user.email,
        fullName,
        phone,
        age: parseInt(age),
        country,
        city,
        address,
        profilePic: user.photoURL || "",
        emailVerified: true, // Google sign-ups are auto verified
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        loginHistory: [],
        consentAndPolicy: {
          accepted: true,
          timestamp: new Date().toISOString(),
        },
        securityFlags: {
          suspiciousActivity: false,
          twoFactorEnabled: false,
        },
        deviceInfo,
        ipAddress: ip,
        geolocation: {
          city: userCity,
          region,
          country: userCountry,
        },
      });

      await setDoc(doc(collection(userRef, "cart")), { items: [] });
      await setDoc(doc(collection(userRef, "wishlist")), { items: [] });
      await setDoc(doc(collection(userRef, "orders")), { orders: [] });
      await setDoc(doc(collection(userRef, "settings")), { preferences: {} });
    }

    alert("Signed up with Google!");
    window.location.href = "../../index.html";
  } catch (error) {
    console.error("Google sign-up error:", error);
    alert(error.message);
  }
});
