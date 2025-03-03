// Import Firebase modules for authentication and Firestore operations
import { auth, db } from '../../../database/config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  signOut,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

// ============================
// Utility Functions
// ============================

// Validate Email format
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Validate password: minimum 8 characters, at least one letter and one number
function isValidPassword(password) {
  return /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/.test(password);
}

// Check that the password and its confirmation match
function samePassword() {
  const password = document.getElementById('SignUpPassword').value;
  const confirmPassword = document.getElementById('ConfirmPassword').value;
  if (password !== confirmPassword) {
    alert('Passwords do not match.');
    return false;
  }
  return true;
}

// Retrieve user's IP and geolocation using ipapi.co
async function getUserIPAndLocation() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name,
    };
  } catch (error) {
    alert('Error fetching IP and location.');
    return {
      ip: 'Unknown',
      city: 'Unknown',
      region: 'Unknown',
      country: 'Unknown',
    };
  }
}

// Get device and browser information
function getDeviceAndBrowserInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
  };
}

// ============================
// HANDLE USER REGISTRATION
// ============================
document.querySelector('.SignUpForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const FullName = document.getElementById('FullName').value.trim();
  const email = document.getElementById('SignUpEmail').value.trim();
  const password = document.getElementById('SignUpPassword').value.trim();
  const confirmPassword = document
    .getElementById('ConfirmPassword')
    .value.trim();
  const DateOfBirth = document.getElementById('DateOfBirth').value.trim();
  const PhoneNumber = document.getElementById('PhoneNumber').value.trim();
  const Address = document.getElementById('Address').value.trim();
  const City = document.getElementById('City').value.trim();
  const Country = document.getElementById('Country').value.trim();
  const termsAndConditions = document.getElementById('Agreementbox').checked;

  if (!FullName || !email || !password) {
    alert('Please fill in all fields.');
    return;
  }
  if (!validateEmail(email)) {
    alert('Please enter a valid email address.');
    return;
  }
  if (!isValidPassword(password)) {
    alert(
      'Password must be at least 8 characters long and contain at least one letter and one number.'
    );
    return;
  }
  if (!samePassword()) {
    return;
  }
  if (!termsAndConditions) {
    alert('Please accept the terms and conditions.');
    return;
  }

  try {
    // Check if the email is already registered in Firestore's "users" collection
    const usersRef = collection(db, 'users');
    const emailQuery = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(emailQuery);
    if (!querySnapshot.empty) {
      alert('This email is already in use. Please use a different email.');
      return;
    }

    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = userCredential.user;

    // Gather additional user data
    const locationData = await getUserIPAndLocation();
    const deviceInfo = getDeviceAndBrowserInfo();

    // Create user document in Firestore (including sellerStatus)
    const userDoc = doc(db, 'users', user.uid);
    await setDoc(userDoc, {
      uid: user.uid,
      FullName,
      email,
      ip: locationData.ip,
      city: locationData.city,
      region: locationData.region,
      country: locationData.country,
      address: Address,
      phoneNumber: PhoneNumber,
      userCity: City,
      Country: Country,
      dateOfBirth: DateOfBirth,
      userAgent: deviceInfo.userAgent,
      platform: deviceInfo.platform,
      language: deviceInfo.language,
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      loginHistory: [],
      consentAndPolicy: {
        termsAndConditions: true,
        privacyPolicy: true,
        cookiePolicy: true,
        timestamp: new Date().toISOString(),
      },
      sellerStatus: false, // Seller status created here
      deviceInfo: deviceInfo,
      ipAddress: locationData.ip,
      geolocation: {
        city: locationData.city,
        region: locationData.region,
        country: locationData.country,
      },
      securityFlags: {
        suspiciousActivity: false,
        twoFactorAuth: false,
        timestamp: new Date().toISOString(),
      },
      emailVerification: {
        isVerified: false,
        timestamp: new Date().toISOString(),
      },
    });

    // Configure email verification settings
    const actionCodeSettings = {
      url: 'https://ecommerce-d50ed.web.app/pages/action/action.html?mode=verifyEmail',
      handleCodeInApp: true,
    };

    // Send verification email
    await sendEmailVerification(user, actionCodeSettings);
    alert(
      'A verification email has been sent. Please verify your email before logging in.'
    );

    // Create default subcollections for the user
    await setDoc(doc(db, 'users', user.uid, 'cart', 'default'), { items: [] });
    await setDoc(doc(db, 'users', user.uid, 'wishlist', 'default'), {
      items: [],
    });
    await setDoc(doc(db, 'users', user.uid, 'orders', 'default'), {
      orders: [],
    });
    await setDoc(doc(db, 'users', user.uid, 'settings', 'default'), {
      preferences: {},
    });

    // Sign out to enforce email verification before next login
    await signOut(auth);

    // Automatically switch to the login tab
    document.getElementById('signInButton').click();
  } catch (error) {
    alert('Error signing up: ' + error.message);
  }
});

// ============================
// HANDLE GOOGLE SIGN UP
// ============================
document.getElementById('GoogleSignUp').addEventListener('click', async () => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    if (userCredential.additionalUserInfo.isNewUser) {
      const locationData = await getUserIPAndLocation();
      const deviceInfo = getDeviceAndBrowserInfo();
      const userDoc = doc(db, 'users', user.uid);
      await setDoc(userDoc, {
        uid: user.uid,
        FullName: user.displayName || '',
        email: user.email || '',
        ip: locationData.ip,
        city: locationData.city,
        region: locationData.region,
        country: locationData.country,
        userAgent: deviceInfo.userAgent,
        platform: deviceInfo.platform,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        sellerStatus: false, // Seller status created here too
      });
      // Create default subcollections for the user
      await setDoc(doc(db, 'users', user.uid, 'cart', 'default'), {
        items: [],
      });
      await setDoc(doc(db, 'users', user.uid, 'wishlist', 'default'), {
        items: [],
      });
      await setDoc(doc(db, 'users', user.uid, 'orders', 'default'), {
        orders: [],
      });
      await setDoc(doc(db, 'users', user.uid, 'settings', 'default'), {
        preferences: {},
      });
    }

    window.location.href = '../../../index.html';
  } catch (error) {
    alert('Error signing up with Google: ' + error.message);
  }
});

// ============================
// HANDLE USER SIGN IN
// ============================
document
  .querySelector('.sign-in-container form')
  .addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document
      .querySelector(".sign-in-container input[type='email']")
      .value.trim();
    const password = document
      .querySelector(".sign-in-container input[type='password']")
      .value.trim();

    if (!email || !password) {
      alert('Please fill in all fields.');
      return;
    }
    if (!validateEmail(email)) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      if (!user.emailVerified) {
        alert('Please verify your email before logging in.');
        await signOut(auth);
        return;
      }

      // Update user's last login and login history in Firestore
      const userDoc = doc(db, 'users', user.uid);
      const userSnapshot = await getDoc(userDoc);
      const userData = userSnapshot.exists() ? userSnapshot.data() : {};
      await setDoc(userDoc, {
        ...userData,
        lastLogin: new Date().toISOString(),
        loginHistory: [
          ...(userData.loginHistory || []),
          new Date().toISOString(),
        ],
      });

      window.location.href = '../../../index.html';
    } catch (error) {
      alert('Invalid email or password. Please try again.');
    }
  });

// ============================
// OVERLAY TOGGLE FUNCTIONALITY
// ============================
const signUpButton = document.getElementById('signUpButton');
const signInButton = document.getElementById('signInButton');
const signUpButtonSmall = document.getElementById('signUpButtonSmall');
const signInButtonSmall = document.getElementById('signInButtonSmall');
const container = document.getElementById('container');

// Toggle overlay class on container to switch forms
signUpButton.addEventListener('click', () => {
  container.classList.add('right-panel-active');
});
signUpButtonSmall.addEventListener('click', (e) => {
  e.preventDefault();
  container.classList.add('right-panel-active');
});
signInButton.addEventListener('click', () => {
  container.classList.remove('right-panel-active');
});
signInButtonSmall.addEventListener('click', (e) => {
  e.preventDefault();
  container.classList.remove('right-panel-active');
});

// Toggle form displays based on the overlay state
function toggleForms() {
  const signInForm = document.querySelector('.sign-in-container');
  const signUpForm = document.querySelector('.sign-up-container');
  if (container.classList.contains('right-panel-active')) {
    signInForm.style.display = 'none';
    signUpForm.style.display = 'block';
  } else {
    signInForm.style.display = 'block';
    signUpForm.style.display = 'none';
  }
}

signUpButton.addEventListener('click', toggleForms);
signInButton.addEventListener('click', toggleForms);
signUpButtonSmall.addEventListener('click', toggleForms);
signInButtonSmall.addEventListener('click', toggleForms);

// Initial call to set the correct form display
toggleForms();
