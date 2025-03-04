// wishlist.js
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

export async function toggleWishlist(db, currentUser, listing) {
  if (!currentUser) return;
  const wishlistDocRef = doc(
    db,
    'users',
    currentUser.uid,
    'wishlist',
    listing.id
  );
  const docSnap = await getDoc(wishlistDocRef);
  if (docSnap.exists()) {
    // Remove the item from wishlist
    await deleteDoc(wishlistDocRef);
  } else {
    // Add the item to wishlist with timestamp
    await setDoc(wishlistDocRef, { addedAt: new Date() });
  }
}
