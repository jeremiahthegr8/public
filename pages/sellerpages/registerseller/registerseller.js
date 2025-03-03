import { db, storage, auth } from '../../../database/config.js';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-storage.js';

// Wait until DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  let currentTab = 0;
  const tabs = document.getElementsByClassName('tab');

  // Show the current tab
  function showTab(n) {
    for (let i = 0; i < tabs.length; i++) {
      tabs[i].classList.remove('active');
    }
    tabs[n].classList.add('active');
    document.getElementById('prevBtn').disabled = n === 0;
    document.getElementById('nextBtn').textContent =
      n === tabs.length - 1 ? 'Submit' : 'Next';
  }

  // Navigate between tabs
  window.nextPrev = function (n) {
    // Validate the current tab before moving forward
    if (n === 1 && !validateForm()) return;
    currentTab += n;
    // If we've reached the end of the form, submit it.
    if (currentTab >= tabs.length) {
      submitForm();
      return;
    }
    showTab(currentTab);
  };

  // Validate form inputs on the current tab
  function validateForm() {
    const currentTabEl = tabs[currentTab];
    if (!currentTabEl) {
      alert('Form tab not found.');
      return false;
    }
    const inputs = currentTabEl.querySelectorAll('input, select, textarea');
    let valid = true;
    inputs.forEach((input) => {
      if (input.hasAttribute('required') && !input.value) {
        input.style.border = '1px solid red';
        valid = false;
      } else if (input.id === 'email' && !validateEmail(input.value)) {
        input.style.border = '1px solid red';
        valid = false;
      } else if (input.id === 'phone' && !validatePhone(input.value)) {
        input.style.border = '1px solid red';
        valid = false;
      } else {
        input.style.border = '';
      }
    });
    return valid;
  }

  // Validate email format
  function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  // Validate phone number format (example: 10-digit phone number)
  function validatePhone(phone) {
    const regex = /^\d{10}$/;
    return regex.test(phone);
  }

  // Upload a file to Firebase Storage
  async function uploadFile(file, folder) {
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File size exceeds the limit of 5MB.');
    }
    const fileName = Date.now() + '_' + file.name;
    const storageRef = ref(storage, `${folder}/${fileName}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  // Sanitize user input to prevent XSS
  function sanitizeInput(input) {
    return input.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Submit the form
  async function submitForm() {
    // get date and change to dd/mm/yyyy format
    const date = new Date();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const today = `${day}/${month}/${year}`;

    // Gather form data
    const data = {
      fullName: sanitizeInput(document.getElementById('fullName').value),
      businessName: sanitizeInput(
        document.getElementById('businessName').value
      ),
      email: sanitizeInput(document.getElementById('email').value),
      phone: sanitizeInput(document.getElementById('phone').value),
      country: sanitizeInput(document.getElementById('country').value),
      address: sanitizeInput(document.getElementById('address').value),
      businessType: sanitizeInput(
        document.getElementById('businessType').value
      ),
      memberSince: today,
      mobileMoney: sanitizeInput(document.getElementById('mobileMoney').value),
      instagram: sanitizeInput(document.getElementById('instagram').value),
      x: sanitizeInput(document.getElementById('x').value),
      facebook: sanitizeInput(document.getElementById('facebook').value),
      storeName: sanitizeInput(document.getElementById('storeName').value),
      storeDescription: sanitizeInput(
        document.getElementById('storeDescription').value
      ),
      category: sanitizeInput(document.getElementById('category').value),
      shippingPolicy: sanitizeInput(
        document.getElementById('shippingPolicy').value || ''
      ),
      totalRevenue: 0,
      rating: 0,
      numberOfListings: 0,
      numberInStock: 0,
      receivedOrders: 0,
      // Initially false; we'll update it to true upon successful registration.
      sellerStatus: false,
      createdAt: new Date(),
    };

    // Upload profile picture and store logo if provided
    const profilePicInput = document.getElementById('profilePic');
    const storeLogoInput = document.getElementById('storeLogo');

    try {
      if (profilePicInput.files && profilePicInput.files[0]) {
        data.profilePicUrl = await uploadFile(
          profilePicInput.files[0],
          'sellerProfilePics'
        );
      }
      if (storeLogoInput.files && storeLogoInput.files[0]) {
        data.storeLogoUrl = await uploadFile(
          storeLogoInput.files[0],
          'sellerStoreLogos'
        );
      }

      // Check if a seller with the same email already exists
      const sellersRef = collection(db, 'sellers');
      const q = query(sellersRef, where('email', '==', data.email));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        alert('A seller with this email already exists.');
        return;
      }

      // Now update sellerStatus to true since the seller is registering
      data.sellerStatus = true;

      // Add seller data to Firestore sellers collection
      const docRef = await addDoc(sellersRef, data);

      // Also update the user's document (if the seller is also a registered user)
      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        // Update with both sellerStatus true and the seller ID from Firestore
        await updateDoc(userDocRef, {
          sellerStatus: true,
          sellerID: docRef.id,
        });
      }

      alert('Registration successful! Your Seller ID: ' + docRef.id);
      window.location.href = '../bussinessprofile/bussinessprofile.html';
    } catch (error) {
      alert('Registration failed. Please try again later. ' + error.message);
    }
  }

  // Initialize the form by showing the first tab
  showTab(currentTab);
});
