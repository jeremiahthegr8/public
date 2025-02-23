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

// Fetch chat details for the normal user
async function fetchChatDetails(chatDoc, currentUserUid) {
  const chatData = chatDoc.data();
  const chatId = chatDoc.id;

  // Determine the seller's UID
  const sellerId = chatData.sellerId;

  // Fetch seller details
  const sellerDoc = await getDoc(doc(db, "users", sellerId));
  const businessName = sellerDoc.exists()
    ? sellerDoc.data().businessName || "Unknown Business"
    : "Unknown Business";
  const sellerPhoto = sellerDoc.exists()
    ? sellerDoc.data().photoURL || "../../assets/images/new/defaultpfp.png"
    : "../../assets/images/new/defaultpfp.png";

  // Fetch product details
  const productDoc = await getDoc(doc(db, "items", chatData.productId));
  const productName = productDoc.exists()
    ? productDoc.data().itemName || "Product"
    : "Product";

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

  // Fetch unread message count (only messages sent by the seller)
  const unreadQuery = query(
    messagesRef,
    where("read", "==", false),
    where("senderId", "==", sellerId)
  );
  const unreadSnapshot = await getDocs(unreadQuery);
  const unreadCount = unreadSnapshot.size;

  return {
    chatId,
    businessName,
    sellerPhoto,
    productName,
    lastMessage,
    lastMessageSender,
    updatedAt,
    unreadCount,
  };
}

// Render the chat list for normal users
function renderChatList(chats) {
  const chatListEl = document.getElementById("chat-list");
  chatListEl.innerHTML = "";
  if (chats.length === 0) {
    chatListEl.innerHTML = "<p>No chats available.</p>";
    return;
  }
  // Get current user's UID for comparison
  const currentUserId = auth.currentUser.uid;
  chats.forEach((chat) => {
    const chatCard = document.createElement("div");
    chatCard.classList.add("chat-card");

    // Determine prefix: "You:" if the last message was sent by the current user,
    // otherwise "Seller:" (since on the normal user's side, messages from the seller come from the seller)
    let prefix = "";
    if (chat.lastMessageSender === currentUserId) {
      prefix = "You: ";
    } else {
      prefix = "Seller: ";
    }

    chatCard.innerHTML = `
      <img src="${chat.sellerPhoto}" alt="${chat.businessName}">
      <div class="chat-info">
        <h3>${chat.businessName}</h3>
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
      window.location.href = `../chatuser/chatuser.html?chatId=${chat.chatId}`;
    });
    chatListEl.appendChild(chatCard);
  });
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    // Set the user’s name in the header
    const userNameEl = document.getElementById("user-name");
    if (userNameEl) {
      userNameEl.textContent = user.displayName || "User";
    }

    // Query chats for the current user
    const chatsRef = collection(db, "chats");
    const chatsQuery = query(
      chatsRef,
      where("buyerId", "==", user.uid),
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
