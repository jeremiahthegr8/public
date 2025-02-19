import { auth, db } from "../../database/config.js";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  doc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate password strength
function isValidPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);
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

    // Validate inputs
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
        "Password must be at least 6 characters long and include at least one letter and one number.",
      );
      return;
    }
    if (password !== confirmPass) {
      alert("Passwords do not match!");
      return;
    }

    try {
      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // Create a document in "users/{userId}"
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, {
        email: user.email,
        fullName,
        age: parseInt(age),
        phone,
        address,
        country,
        city,
        createdAt: new Date(),
      });

      // Create subcollections inside "users/{userId}"
      await setDoc(doc(collection(userRef, "cart")), { items: [] });
      await setDoc(doc(collection(userRef, "wishlist")), { items: [] });
      await setDoc(doc(collection(userRef, "orders")), { orders: [] });
      await setDoc(doc(collection(userRef, "settings")), { preferences: {} });

      alert("Account created successfully!");
      window.location.href = "../../index.html"; // Redirect to home page
    } catch (error) {
      console.error("Error signing up:", error);
      alert(error.message);
    }
  });

//Google Sign-up
document.getElementById("google-signup").addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Reference to user document in Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      // Ask user for missing details
      const fullName = prompt("Enter your full name:", user.displayName || "");
      const phone = prompt("Enter your phone number:", user.phoneNumber || "");
      const age = prompt("Enter your age:", "");
      const country = prompt("Enter your country:", "");
      const city = prompt("Enter your city:", "");
      const address = prompt("Enter your full address:", "");

      // Save user profile data in Firestore
      await setDoc(userRef, {
        email: user.email,
        fullName,
        phone,
        age: parseInt(age),
        country,
        city,
        address,
        profilePic: user.photoURL || "",
        createdAt: new Date(),
      });

      // Create subcollections inside "users/{userId}"
      await setDoc(doc(collection(userRef, "cart")), { items: [] });
      await setDoc(doc(collection(userRef, "wishlist")), { items: [] });
      await setDoc(doc(collection(userRef, "orders")), { orders: [] });
      await setDoc(doc(collection(userRef, "settings")), { preferences: {} });
    }

    alert("Signed up with Google!");
    window.location.href = "../../index.html"; // Redirect to home page
  } catch (error) {
    console.error("Google sign-up error:", error);
    alert(error.message);
  }
});
