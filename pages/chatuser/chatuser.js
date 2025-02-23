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
  updateDoc,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Get chatId from URL and fromProductPage flag
const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get("chatId");
const fromProductPage = urlParams.get("fromProductPage") === "true";

// DOM Elements
const chatMessagesEl = document.getElementById("chat-messages");
const messageInputEl = document.getElementById("message-input");
const sendButtonEl = document.getElementById("send-button");
const partnerNameEl = document.getElementById("partner-name");
const sellerNameEl = document.getElementById("seller-name");
const partnerPhotoEl = document.getElementById("partner-photo");
const sellerDetailsOverlayEl = document.getElementById(
  "seller-details-overlay"
);
const backButtonEl = document.getElementById("back-button");
const closeSellerDetailsEl = document.getElementById("close-seller-details");
const productReferenceContainer = document.getElementById("product-reference");

// Global variable to hold the product reference details for this session
let productReferenceData = null;
// Local flag to track if the product reference has been attached in this session
let localProductReferenceSent = false;

// Function to mark messages as read
async function markMessagesAsRead(chatId, sellerId) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const unreadQuery = query(
    messagesRef,
    where("read", "==", false),
    where("senderId", "==", sellerId)
  );
  const unreadSnapshot = await getDocs(unreadQuery);
  unreadSnapshot.forEach(async (doc) => {
    await updateDoc(doc.ref, { read: true });
  });
}

// Load chat details and messages
async function loadChat() {
  if (!chatId) {
    window.location.href = "../messages/messages-user.html";
    return;
  }

  const chatDoc = await getDoc(doc(db, "chats", chatId));
  if (!chatDoc.exists()) {
    window.location.href = "../messages/messages-user.html";
    return;
  }

  const chatData = chatDoc.data();

  // If the chat is opened from a product page and product details are available,
  // store and display the product reference.
  if (fromProductPage && chatData.productName && chatData.productImage) {
    productReferenceData = {
      productName: chatData.productName,
      productImage: chatData.productImage,
    };
    productReferenceContainer.innerHTML = `
      <div class="product-reference">
        <img src="${productReferenceData.productImage}" alt="${productReferenceData.productName}" />
        <p>${productReferenceData.productName}</p>
      </div>
    `;
    // Reset the local flag for this session.
    localProductReferenceSent = false;
  }

  const currentUserUid = auth.currentUser.uid;
  const sellerId = chatData.sellerId;

  // Mark messages as read when the chat is opened
  await markMessagesAsRead(chatId, sellerId);

  // Fetch seller details from the "sellers" collection
  const sellerDoc = await getDoc(doc(db, "sellers", sellerId));
  if (sellerDoc.exists()) {
    const sellerData = sellerDoc.data();

    document.querySelector(".profile-picture").src =
      sellerData.profilePhoto &&
      sellerData.profilePhoto !== "default-profile.png"
        ? sellerData.profilePhoto
        : "../../assets/images/new/defaultpfp.png";

    document.getElementById("seller-name").textContent =
      sellerData.businessName || "Seller";
    document.getElementById("partner-name").textContent =
      sellerData.businessName || "Seller";

    document.getElementById("seller-bio").textContent =
      sellerData.bio ||
      "Professional seller specializing in handmade crafts and unique gifts.";

    document.getElementById("seller-email").textContent =
      sellerData.businessEmail || "No email provided";
    document.getElementById("seller-phone").textContent =
      sellerData.businessPhone || "No phone provided";

    document.getElementById("seller-facebook").href =
      sellerData.facebook || "#";
    document.getElementById("seller-instagram").href =
      sellerData.instagram || "#";
    document.getElementById("seller-twitter").href = sellerData.xLink || "#";
    document.getElementById("seller-whatsapp").href =
      sellerData.whatsapp || "#";

    document.getElementById("total-sales").textContent =
      sellerData.totalSales !== undefined ? sellerData.totalSales : "500+";
    document.getElementById("active-listings").textContent =
      sellerData.activeListings !== undefined
        ? sellerData.activeListings
        : "25";
    document.getElementById("response-time").textContent =
      sellerData.responseTime || "1 hour";
    document.getElementById("member-since").textContent =
      sellerData.sellerRegisteredAt
        ? sellerData.sellerRegisteredAt.toDate().toLocaleDateString()
        : "January 2020";
    document.getElementById("return-policy").textContent =
      sellerData.returnPolicy || "30-day";
    document.getElementById("shipping-policy").textContent =
      sellerData.shippingPolicy || "over 30$";

    document.getElementById("seller-rating").textContent =
      typeof sellerData.averageRating === "number"
        ? sellerData.averageRating.toFixed(1) + "/5"
        : "N/A";
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
      if (message.productReference) {
        messageEl.innerHTML = `
          <div class="product-reference">
            <img src="${message.productReference.productImage}" alt="${message.productReference.productName}" />
            <p>${message.productReference.productName}</p>
          </div>
          <p>${message.text}</p>
        `;
      } else {
        messageEl.textContent = message.text;
      }
      chatMessagesEl.appendChild(messageEl);
    });
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  });
}

// Send message handler
sendButtonEl.addEventListener("click", async () => {
  const text = messageInputEl.value.trim();
  if (!text) return;

  const currentUserUid = auth.currentUser.uid;
  const messagesRef = collection(db, "chats", chatId, "messages");

  // Create the basic message data
  let messageData = {
    text,
    senderId: currentUserUid,
    timestamp: serverTimestamp(),
    read: false,
  };

  // If the chat was opened from the product page and the product reference has not yet been sent in this session,
  // attach it to this first message.
  if (fromProductPage && productReferenceData && !localProductReferenceSent) {
    messageData.productReference = productReferenceData;
    localProductReferenceSent = true;
    // Hide the product reference UI so subsequent messages don't show it.
    productReferenceContainer.innerHTML = "";
  }

  await addDoc(messagesRef, messageData);
  messageInputEl.value = "";
});

// Toggle seller details slide-over
partnerPhotoEl.addEventListener("click", () => {
  sellerDetailsOverlayEl.classList.add("open");
});
partnerNameEl.addEventListener("click", () => {
  sellerDetailsOverlayEl.classList.add("open");
});
closeSellerDetailsEl.addEventListener("click", () => {
  sellerDetailsOverlayEl.classList.remove("open");
});

// Back button functionality
backButtonEl.addEventListener("click", () => {
  window.location.href = "../messageuser/messageuser.html";
});

// Initialize chat when authenticated
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    loadChat();
  } else {
    window.location.href = "../../index.html";
  }
});
