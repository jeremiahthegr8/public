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

// Get chatId from URL
const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get("chatId");

// DOM Elements
const chatMessagesEl = document.getElementById("chat-messages");
const messageInputEl = document.getElementById("message-input");
const sendButtonEl = document.getElementById("send-button");
const partnerNameEl = document.getElementById("partner-name");
const partnerPhotoEl = document.getElementById("partner-photo");
const backButtonEl = document.getElementById("back-button");

// Load chat details and messages
async function loadChat() {
  if (!chatId) {
    window.location.href = "../messages/messages-seller.html";
    return;
  }

  const chatDoc = await getDoc(doc(db, "chats", chatId));
  if (!chatDoc.exists()) {
    window.location.href = "../messages/messages-seller.html";
    return;
  }

  const chatData = chatDoc.data();
  const currentUserUid = auth.currentUser.uid;
  const buyerId = chatData.buyerId;

  // Fetch buyer details
  const buyerDoc = await getDoc(doc(db, "users", buyerId));
  if (buyerDoc.exists()) {
    partnerNameEl.textContent = buyerDoc.data().fullName || "Buyer";
    partnerPhotoEl.src =
      buyerDoc.data().photoURL || "../../assets/images/new/defaultpfp.png";
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

      // If the message includes a product reference, render it.
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
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight; // Scroll to bottom
  });

  // Mark messages as read
  markMessagesAsRead(chatId, currentUserUid);
}

// Mark messages as read
async function markMessagesAsRead(chatId, currentUserUid) {
  const messagesRef = collection(db, "chats", chatId, "messages");
  const unreadQuery = query(
    messagesRef,
    where("read", "==", false),
    where("senderId", "!=", currentUserUid)
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

  const messageData = {
    text,
    senderId: currentUserUid,
    timestamp: serverTimestamp(),
    read: false,
  };

  await addDoc(messagesRef, messageData);
  messageInputEl.value = ""; // Clear input
});

// Initialize chat
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    loadChat();
  } else {
    window.location.href = "../../index.html";
  }
});

// Back button functionality
backButtonEl.addEventListener("click", () => {
  window.location.href = "../messageseller/messageseller.html";
});
