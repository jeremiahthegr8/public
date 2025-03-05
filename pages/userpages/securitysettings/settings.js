import { auth, db } from '../../../database/config.js';
import {
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';
import {
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js';

/* --- Password Change Link Request --- */
const passwordButton = document.getElementById('requestPasswordChange');
const passwordTimer = document.getElementById('passwordTimer');

passwordButton.addEventListener('click', async () => {
  passwordButton.disabled = true;
  const user = auth.currentUser;
  if (user) {
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert('Password change link sent! (Valid for 1 minute)');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      alert('Error sending password reset email. Please try again.');
      passwordButton.disabled = false;
      return;
    }
  }
  let timeLeft = 60;
  passwordTimer.textContent = `(${timeLeft}s)`;
  const timerInterval = setInterval(() => {
    timeLeft--;
    passwordTimer.textContent = `(${timeLeft}s)`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      passwordTimer.textContent = '';
      passwordButton.disabled = false;
    }
  }, 1000);
});

/* --- Recovery Email Update --- */
const recoveryEmailForm = document.getElementById('recoveryEmailForm');
if (recoveryEmailForm) {
  recoveryEmailForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const recoveryEmail = document.getElementById('recoveryEmail').value.trim();
    if (!recoveryEmail) {
      alert('Please enter a recovery email.');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        recoveryEmail,
      });
      alert('Recovery email updated!');
    } catch (error) {
      console.error('Error updating recovery email:', error);
      alert('Error updating recovery email. Please try again.');
    }
  });
}

/* --- Security Notifications & Session Timeout --- */
const securityNotificationsCheckbox = document.getElementById(
  'securityNotifications'
);
const pushNotificationsCheckbox = document.getElementById('pushNotifications');
const sessionTimeoutSelect = document.getElementById('sessionTimeout');

// Listen for changes to notification checkboxes and update Firestore
if (securityNotificationsCheckbox) {
  securityNotificationsCheckbox.addEventListener('change', async (e) => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        securityNotifications: e.target.checked,
      });
    } catch (error) {
      console.error('Error updating security notifications:', error);
    }
  });
}

if (pushNotificationsCheckbox) {
  pushNotificationsCheckbox.addEventListener('change', async (e) => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        pushNotifications: e.target.checked,
      });
    } catch (error) {
      console.error('Error updating push notifications:', error);
    }
  });
}

// Listen for changes in session timeout selection and update Firestore
if (sessionTimeoutSelect) {
  sessionTimeoutSelect.addEventListener('change', async (e) => {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        sessionTimeout: e.target.value,
      });
    } catch (error) {
      console.error('Error updating session timeout:', error);
    }
  });
}

/* --- Delete Account with Password Confirmation --- */
const deleteAccountButton = document.getElementById('deleteAccount');
if (deleteAccountButton) {
  deleteAccountButton.addEventListener('click', async () => {
    const password = prompt(
      'Please enter your password to confirm account deletion:'
    );
    if (!password) {
      alert('Password is required.');
      return;
    }
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, password);
    try {
      // Reauthenticate user
      await reauthenticateWithCredential(user, credential);
      // After reauthentication, delete the Firestore document and then the auth user
      await deleteDoc(doc(db, 'users', user.uid));
      await user.delete();
      alert('Account deleted.');
      window.location.href = '../../../index.html';
    } catch (error) {
      console.error('Error deleting account:', error);
      alert(
        'Error deleting account. Please ensure your password is correct and try again.'
      );
    }
  });
}

/* --- Download Data Action --- */
const downloadDataButton = document.getElementById('downloadData');
if (downloadDataButton) {
  downloadDataButton.addEventListener('click', async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Your data is being prepared for download.');
      } else {
        alert('No user data found.');
      }
    } catch (error) {
      console.error('Error downloading data:', error);
      alert('Error preparing your data. Please try again.');
    }
  });
}

/* --- Active Sessions --- */
// Suggestion: Implement active session tracking by creating a 'sessions' subcollection
// under each user document. On login, store session details (e.g., device, IP, login time).
// In the Active Sessions section, list these sessions and allow the user to revoke them
// by deleting the corresponding session document.

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  if (!user) {
    console.log('User is not signed in. Security settings disabled.');
  }
});
