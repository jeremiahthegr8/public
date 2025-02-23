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
} from "https://www.gstatic.com/firebasejs/11.3.1/firebase-firestore.js";

// Helper function to fetch additional details for a chat document
async function fetchChatDetails(chatDoc, currentUserUid) {
  const chatData = chatDoc.data();
  const chatId = chatDoc.id;

  // Determine the partner's UID
  const partnerId =
    chatData.buyerId === currentUserUid ? chatData.sellerId : chatData.buyerId;

  // Fetch partner details
  const partnerDoc = await getDoc(doc(db, "users", partnerId));
  const partnerName = partnerDoc.exists()
    ? partnerDoc.data().fullName || "Unknown"
    : "Unknown";
  const partnerPhoto = partnerDoc.exists()
    ? partnerDoc.data().photoURL || "../../assets/images/new/defaultpfp.png"
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

  // Determine who sent the last message
  const lastMessageSender =
    lastMessageData?.senderId === currentUserUid ? "You" : partnerName;

  // Format the updatedAt timestamp
  const updatedAt =
    chatData.updatedAt && chatData.updatedAt.seconds
      ? new Date(chatData.updatedAt.seconds * 1000).toLocaleString()
      : "";

  // Fetch unread message count (only messages sent by the partner)
  const unreadQuery = query(
    messagesRef,
    where("read", "==", false),
    where("senderId", "==", partnerId) // Only count messages from the partner
  );
  const unreadSnapshot = await getDocs(unreadQuery);
  const unreadCount = unreadSnapshot.size;

  return {
    chatId,
    partnerName,
    partnerPhoto,
    productName,
    lastMessage,
    lastMessageSender,
    updatedAt,
    unreadCount,
  };
}

// Render the chat list
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
    chatCard.innerHTML = `
      <img src="${chat.partnerPhoto}" alt="${chat.partnerName}">
      <div class="chat-info">
        <h3>${chat.partnerName}</h3>
        <p><strong>${chat.lastMessageSender}:</strong> ${chat.lastMessage}</p>
        <p class="chat-timestamp">${chat.updatedAt}</p>
      </div>
      ${
        chat.unreadCount > 0
          ? `<span class="unread-count">${chat.unreadCount}</span>`
          : ""
      }
    `;
    chatCard.addEventListener("click", () => {
      // Redirect to the chat page with the chatId as a query parameter
      window.location.href = `../chat/chat.html?chatId=${chat.chatId}`;
    });
    chatListEl.appendChild(chatCard);
  });
}

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user && user.emailVerified) {
    // Set the user’s name in the header
    const headerNameEl = document.getElementById("seller-name");
    if (headerNameEl) {
      headerNameEl.textContent = user.displayName || "User";
    }

    // Query chats for the current user using the "participants" array field
    const chatsRef = collection(db, "chats");
    const chatsQuery = query(
      chatsRef,
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    onSnapshot(chatsQuery, async (snapshot) => {
      // For each chat document, fetch additional details
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
}
