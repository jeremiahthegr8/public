import { auth, db } from "../../database/config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Get chatId and fromProductPage flag from URL
const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get("chatId");
const fromProductPage = urlParams.get("fromProductPage") === "true"; // Check if the chat was opened from the product page

// DOM Elements
const chatMessagesEl = document.getElementById("chat-messages");
const messageInputEl = document.getElementById("message-input");
const sendButtonEl = document.getElementById("send-button");
const partnerNameEl = document.getElementById("partner-name");
const partnerPhotoEl = document.getElementById("partner-photo");
const productReferenceEl = document.getElementById("product-reference"); // Element to display product reference

// Track if the product reference has been sent
let productReferenceSent = false;

// Fetch chat details and render messages
async function loadChat() {
  if (!chatId) {
    window.location.href = "../messages/messages.html";
    return;
  }

  const chatDoc = await getDoc(doc(db, "chats", chatId));
  if (!chatDoc.exists()) {
    window.location.href = "../messages/messages.html";
    return;
  }

  const chatData = chatDoc.data();
  const currentUserUid = auth.currentUser.uid;
  const partnerId =
    chatData.buyerId === currentUserUid ? chatData.sellerId : chatData.buyerId;

  // Fetch partner details
  const partnerDoc = await getDoc(doc(db, "users", partnerId));
  if (partnerDoc.exists()) {
    partnerNameEl.textContent = partnerDoc.data().displayName || "Unknown";
    partnerPhotoEl.src =
      partnerDoc.data().photoURL || "../../assets/images/new/defaultpfp.png";
  }

  // Fetch product details if the chat is associated with a product
  const productId = chatData.productId;
  if (productId && fromProductPage) {
    // Only display product reference if opened from product page
    const productDoc = await getDoc(doc(db, "items", productId));
    if (productDoc.exists()) {
      const productData = productDoc.data();
      // Display the product reference above the input field
      productReferenceEl.innerHTML = `
        <div class="product-reference">
          <img src="${productData.imageBase64}" alt="${productData.itemName}" />
          <p>${productData.itemName}</p>
        </div>
      `;
    }
  }

  // Fetch and render messages
  const messagesRef = collection(db, "chats", chatId, "messages");
  const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));
  onSnapshot(messagesQuery, (snapshot) => {
    chatMessagesEl.innerHTML = "";
    snapshot.forEach((doc) => {
      const message = doc.data();
      const messageEl = document.createElement("div");
      messageEl.classList.add(
        "message",
        message.senderId === currentUserUid ? "sent" : "received"
      );

      // Check if the message references a product
      if (message.product) {
        messageEl.innerHTML = `
          <div class="product-reference">
            <img src="${message.product.image}" alt="${message.product.name}" />
            <p>${message.product.name}</p>
          </div>
          <p>${message.text}</p>
        `;
      } else {
        messageEl.textContent = message.text;
      }

      chatMessagesEl.appendChild(messageEl);
    });
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight; // Scroll to bottom
  });
}

// Mark messages as read when the chat is opened
async function markMessagesAsRead(chatId, currentUserUid) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const unreadQuery = query(
    messagesRef,
    where("read", "==", false),
    where("senderId", "!=", currentUserUid) // Only mark messages from the partner as read
  );
  const unreadSnapshot = await getDocs(unreadQuery);

  unreadSnapshot.forEach(async (doc) => {
    await updateDoc(doc.ref, { read: true });
  });
}

// Send message
sendButtonEl.addEventListener("click", async () => {
  const text = messageInputEl.value.trim();
  if (!text) return;

  const currentUserUid = auth.currentUser.uid;
  const messagesRef = collection(db, "chats", chatId, "messages");

  // Fetch chat details to get the productId
  const chatDoc = await getDoc(doc(db, "chats", chatId));
  const chatData = chatDoc.data();
  const productId = chatData.productId;

  // Fetch product details if the message is referencing a product
  let product = null;
  if (productId && fromProductPage && !productReferenceSent) {
    // Only include product reference if opened from product page and not already sent
    const productDoc = await getDoc(doc(db, "items", productId));
    if (productDoc.exists()) {
      const productData = productDoc.data();
      product = {
        id: productId,
        name: productData.itemName,
        image: productData.imageBase64,
      };
    }
  }

  // Create the message data
  const messageData = {
    text,
    senderId: currentUserUid,
    timestamp: serverTimestamp(),
    read: false,
  };

  // Add product reference if available and not already sent
  if (product && !productReferenceSent) {
    messageData.product = product;
    productReferenceSent = true; // Mark the product reference as sent
    productReferenceEl.style.display = "none"; // Hide the product reference UI
  }

  // Add the message to Firestore
  await addDoc(messagesRef, messageData);
  messageInputEl.value = ""; // Clear input
});

// Initialize chat
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    loadChat();
    markMessagesAsRead(chatId, user.uid); // Mark messages as read
  } else {
    window.location.href = "../../index.html";
  }
});
