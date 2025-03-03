// cart.js
import {
  doc,
  setDoc,
  deleteDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

export async function addToCart(db, currentUser, listing, userCart) {
  if (!currentUser) return;
  const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
  await setDoc(cartDocRef, { quantity: 1 });
  userCart[listing.id] = 1;
}

export async function updateCartItemQuantity(
  db,
  currentUser,
  listing,
  newQuantity,
  userCart
) {
  if (!currentUser) return;
  const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
  if (newQuantity <= 0) {
    await deleteDoc(cartDocRef);
    delete userCart[listing.id];
  } else {
    await setDoc(cartDocRef, { quantity: newQuantity });
    userCart[listing.id] = newQuantity;
  }
}

export async function removeFromCart(db, currentUser, listing, userCart) {
  if (!currentUser) return;
  const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
  await deleteDoc(cartDocRef);
  delete userCart[listing.id];
}
