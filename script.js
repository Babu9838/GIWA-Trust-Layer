// এই ভার্সনটা সবচেয়ে সহজ কাজ করে দেখায়:
// একটা wallet address দিলে GIWA Sepolia টেস্টনেট থেকে তার ETH ব্যালেন্স দেখাবে।
//
// পরে যখন আপনার নিজের "credential" স্মার্ট কন্ট্রাক্ট (Dojang-এর মতো) ডিপ্লয় হবে,
// তখন এই একই ফাইলের মধ্যে সেই কন্ট্রাক্ট থেকে ডেটা পড়ার কোড যোগ করবেন।
// আপাতত শুধু চেইনের সাথে সংযোগ কাজ করছে কিনা সেটা যাচাই করাই লক্ষ্য।

async function checkAddress(address) {
  const output = document.getElementById("output");

  if (!ethers.isAddress(address)) {
    output.textContent = "❌ সঠিক wallet address দিন (0x দিয়ে শুরু, ৪২ ক্যারেক্টার)।";
    return;
  }

  output.textContent = "⏳ চেইন থেকে তথ্য আনা হচ্ছে...";

  try {
    const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
    const balance = await provider.getBalance(address);
    const balanceInEth = ethers.formatEther(balance);

    output.innerHTML = `
      <p><strong>Address:</strong> ${address}</p>
      <p><strong>ETH Balance (GIWA Sepolia):</strong> ${balanceInEth} ETH</p>
    `;
  } catch (err) {
    console.error(err);
    output.textContent = "কিছু একটা সমস্যা হয়েছে, browser console চেক করুন।";
  }
}

// "Connect Wallet" বাটনে ক্লিক করলে ব্রাউজারে ইনস্টল করা wallet (MetaMask, Brave Wallet ইত্যাদি)
// থেকে ইউজারের address চেয়ে নেওয়া হয়, তারপর সেটা দিয়ে অটোমেটিক checkAddress() চালানো হয়।
async function connectWallet() {
  const output = document.getElementById("output");

  // window.ethereum তখনই থাকে যখন ব্রাউজারে কোনো wallet extension ইনস্টল করা থাকে
  if (typeof window.ethereum === "undefined") {
    output.textContent = "❌ কোনো wallet extension পাওয়া যায়নি। MetaMask বা Brave Wallet ইনস্টল করুন।";
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const address = accounts[0];

    document.getElementById("addressInput").value = address;
    checkAddress(address);
  } catch (err) {
    console.error(err);
    output.textContent = "wallet connect করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।";
  }
}

document.getElementById("connectBtn").addEventListener("click", connectWallet);

document.getElementById("searchBtn").addEventListener("click", () => {
  const address = document.getElementById("addressInput").value.trim();
  checkAddress(address);
});

document.getElementById("addressInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    document.getElementById("searchBtn").click();
  }
});