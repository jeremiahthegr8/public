import { auth, db } from "../../database/config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDoc,
  doc,
  getDocs,
  limit,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Fetch chat details for the seller
async function fetchChatDetails(chatDoc, currentUserUid) {
  const chatData = chatDoc.data();
  const chatId = chatDoc.id;

  // Determine the buyer's UID (for seller chats, buyerId is stored in the chat)
  const buyerId = chatData.buyerId;

  // Fetch buyer details
  const buyerDoc = await getDoc(doc(db, "users", buyerId));
  const buyerName = buyerDoc.exists()
    ? buyerDoc.data().fullName || "Unknown Buyer"
    : "Unknown Buyer";
  const buyerPhoto = buyerDoc.exists()
    ? buyerDoc.data().photoURL || "../../assets/images/new/defaultpfp.png"
    : "../../assets/images/new/defaultpfp.png";

  // Retrieve product details from the chat document if available.
  // (Assumes that when a chat is created from a product page,
  // the chat document is saved with productName and productImage fields.)
  const productName = chatData.productName || "";
  const productImage = chatData.productImage || null;

  // Fetch the last message
  const messagesRef = collection(db, "chats", chatId, "messages");
  const messagesQuery = query(
    messagesRef,
    orderBy("timestamp", "desc"),
    limit(1)
  );
  const messagesSnapshot = await getDocs(messagesQuery);
  const lastMessageData = messagesSnapshot.docs[0]?.data();
  const lastMessage = lastMessageData?.text || "No messages yet";
  const lastMessageSender = lastMessageData?.senderId || null;

  // Format the updatedAt timestamp
  const updatedAt =
    chatData.updatedAt && chatData.updatedAt.seconds
      ? new Date(chatData.updatedAt.seconds * 1000).toLocaleString()
      : "";

  // Fetch unread message count (only messages sent by the buyer)
  const unreadQuery = query(
    messagesRef,
    where("read", "==", false),
    where("senderId", "==", buyerId)
  );
  const unreadSnapshot = await getDocs(unreadQuery);
  const unreadCount = unreadSnapshot.size;

  return {
    chatId,
    buyerName,
    buyerPhoto,
    productName,
    productImage,
    lastMessage,
    lastMessageSender,
    updatedAt,
    unreadCount,
    buyerId, // for comparison later
  };
}

// Render the chat list for sellers
function renderChatList(chats) {
  const chatListEl = document.getElementById("chat-list");
  chatListEl.innerHTML = "";
  if (chats.length === 0) {
    chatListEl.innerHTML = "<p>No chats available.</p>";
    return;
  }
  chats.forEach((chat) => {
    const chatCard = document.createElement("div");
    chatCard.classList.add("chat-card");

    // Determine prefix based on who sent the last message.
    // On the seller side, current user is the seller.
    // If the last message's sender is not the seller, then it's from the buyer.
    let prefix = "";
    if (chat.lastMessageSender && chat.lastMessageSender !== auth.currentUser.uid) {
      prefix = chat.buyerName + ": ";
    } else {
      prefix = "You: ";
    }


    chatCard.innerHTML = `
      <img src="${chat.buyerPhoto}" alt="${chat.buyerName}">
      <div class="chat-info">
        <h3>${chat.buyerName}</h3>
        <p>${prefix}${chat.lastMessage}</p>
        <p class="chat-timestamp">${chat.updatedAt}</p>
      </div>
      ${
        chat.unreadCount > 0
          ? `<span class="unread-count">${chat.unreadCount}</span>`
          : ""
      }
    `;
    chatCard.addEventListener("click", () => {
      window.location.href = `../chatseller/chatseller.html?chatId=${chat.chatId}`;
    });
    chatListEl.appendChild(chatCard);
  });
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    // Set the seller’s name in the header
    const sellerNameEl = document.getElementById("seller-name");
    if (sellerNameEl) {
      sellerNameEl.textContent = user.displayName || "Seller";
    }

    // Query chats for the current seller
    const chatsRef = collection(db, "chats");
    const chatsQuery = query(
      chatsRef,
      where("sellerId", "==", user.uid),
      orderBy("updatedAt", "desc")
    );

    onSnapshot(chatsQuery, async (snapshot) => {
      const chatDetailsPromises = snapshot.docs.map((doc) =>
        fetchChatDetails(doc, user.uid)
      );
      const chatDetails = await Promise.all(chatDetailsPromises);
      renderChatList(chatDetails);
    });
  } else {
    window.location.href = "../../index.html";
  }
});

// Logout Handler
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth)
      .then(() => (window.location.href = "../../index.html"))
      .catch((error) => console.error("Error signing out:", error));
  });
};
