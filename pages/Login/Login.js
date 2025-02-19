import { auth } from "../../database/config.js";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";

// Select input fields
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("register-pass");
const loginButton = document.querySelector(".register__button");
const googleButton = document.getElementById("google-signup");

// Function to log in user
const signIn = async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    alert("Please enter your email and password.");
    return;
  }

  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    console.log("User logged in:", userCredential.user);

    sessionStorage.setItem("userLoggedIn", "true"); // Store login marker
    window.location.href = "../../index.html"; // Redirect to home page
  } catch (error) {
    console.error("Login error:", error);
    alert("Login failed: " + error.message);
  }
};

// Attach login function to form submission
loginButton.addEventListener("click", (event) => {
  event.preventDefault();
  signIn();
});

const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    alert("Google Login Successful!");
    console.log("User logged in with Google:", result.user);

    sessionStorage.setItem("userLoggedIn", "true"); // Store login marker
    window.location.href = "../../index.html"; // Redirect to home
  } catch (error) {
    console.error("Google Login error:", error);
    alert("Google Login failed: " + error.message);
  }
};

// Attach Google sign-in function
googleButton.addEventListener("click", (event) => {
  event.preventDefault();
  signInWithGoogle();
});
