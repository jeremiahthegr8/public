import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
} from 'https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js';

export async function addToCart(db, currentUser, listing) {
  if (!currentUser) return;
  const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
  const docSnap = await getDoc(cartDocRef);
  if (docSnap.exists()) {
    // If the item is already in the cart, increment the quantity
    const currentQty = docSnap.data().quantity || 0;
    await setDoc(cartDocRef, { quantity: currentQty + 1 });
  } else {
    // Otherwise, add the item with quantity 1
    await setDoc(cartDocRef, { quantity: 1 });
  }
}

export async function updateCartItemQuantity(
  db,
  currentUser,
  listing,
  newQuantity
) {
  if (!currentUser) return;
  const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
  if (newQuantity <= 0) {
    await deleteDoc(cartDocRef);
  } else {
    await setDoc(cartDocRef, { quantity: newQuantity });
  }
}

export async function removeFromCart(db, currentUser, listing) {
  if (!currentUser) return;
  const cartDocRef = doc(db, 'users', currentUser.uid, 'cart', listing.id);
  await deleteDoc(cartDocRef);
}
