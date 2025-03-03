// wishlist.js
import {
  doc,
  setDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

export async function toggleWishlist(db, currentUser, listing, userWishlist) {
  if (!currentUser) return;
  const wishlistDocRef = doc(
    db,
    'users',
    currentUser.uid,
    'wishlist',
    listing.id
  );
  if (userWishlist.includes(listing.id)) {
    await deleteDoc(wishlistDocRef);
    const index = userWishlist.indexOf(listing.id);
    if (index > -1) userWishlist.splice(index, 1);
  } else {
    await setDoc(wishlistDocRef, { addedAt: new Date() });
    userWishlist.push(listing.id);
  }
}
