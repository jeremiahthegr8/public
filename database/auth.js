import { auth, db } from "./config.js";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

// Sign Up Function
async function signUp() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Save user in Firestore
    await setDoc(doc(db, "users", user.uid), {
      email: user.email,
      createdAt: new Date(),
    });

    alert("Account created successfully!");
    window.location.href = "account.html"; // Redirect
  } catch (error) {
    alert(error.message);
  }
}

window.signUp = signUp;
