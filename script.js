// ==========================================================================
// GIWA Trust Layer — main app logic
// Features: balance lookup, verified credentials, up.id name, trust score,
// transaction history, QR code, and wallet connect.
// ==========================================================================

const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);

// --- DOM helpers -----------------------------------------------------------

function setStatus(message, isError = false) {
  const el = document.getElementById("statusText");
  el.textContent = message;
  el.classList.toggle("error", isError);
}

function show(id) {
  document.getElementById(id).classList.remove("hidden");
}

function hide(id) {
  document.getElementById(id).classList.add("hidden");
}

// --- Feature: ETH balance ----------------------------------------------------

async function getBalance(address) {
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

// --- Feature: credentials (EAS / Dojang-style attestations) -----------------

function decodeCredentialData(dataHex) {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const [subject, credentialType, level, issuedAt] = abiCoder.decode(
    ["address", "string", "uint8", "uint64"],
    dataHex
  );
  return {
    subject,
    credentialType,
    level: Number(level),
    issuedAt: Number(issuedAt),
  };
}

async function getCredential(uid) {
  const eas = new ethers.Contract(CONFIG.EAS_CONTRACT_ADDRESS, CONFIG.EAS_ABI, provider);
  const attestation = await eas.getAttestation(uid);

  if (!attestation || attestation.uid === ethers.ZeroHash) {
    return null;
  }

  const decoded = decodeCredentialData(attestation.data);

  return {
    uid: attestation.uid,
    issuer: attestation.attester,
    revoked: attestation.revocationTime > 0n,
    ...decoded,
  };
}

async function getCredentialsForAddress(address) {
  // Not yet configured — skip silently instead of throwing errors at the user.
  if (CONFIG.EAS_CONTRACT_ADDRESS === ethers.ZeroAddress || CONFIG.CREDENTIAL_UIDS.length === 0) {
    return [];
  }

  const results = await Promise.all(CONFIG.CREDENTIAL_UIDS.map((uid) => getCredential(uid)));

  return results.filter(
    (c) => c !== null && c.subject.toLowerCase() === address.toLowerCase()
  );
}

function computeTrustScore(credentials) {
  return credentials.filter((c) => !c.revoked).reduce((total, c) => total + c.level, 0);
}

function renderCredentials(credentials) {
  const list = document.getElementById("credentialList");
  list.innerHTML = "";

  if (credentials.length === 0) {
    show("noCredentials");
    hide("verifiedBadge");
    return;
  }
  hide("noCredentials");

  const hasActiveCredential = credentials.some((c) => !c.revoked);
  if (hasActiveCredential) {
    show("verifiedBadge");
  }

  for (const c of credentials) {
    const li = document.createElement("li");
    li.className = c.revoked ? "revoked" : "";
    li.textContent = `${c.credentialType} — level ${c.level}${c.revoked ? " (revoked)" : ""}`;
    list.appendChild(li);
  }
}

// --- Feature: up.id name resolution -----------------------------------------

async function resolveUpIdName(address) {
  if (CONFIG.UP_ID_RESOLVER_ADDRESS === ethers.ZeroAddress) {
    return null;
  }

  try {
    const resolver = new ethers.Contract(
      CONFIG.UP_ID_RESOLVER_ADDRESS,
      CONFIG.UP_ID_RESOLVER_ABI,
      provider
    );
    const name = await resolver.getName(address);
    return name || null;
  } catch (err) {
    // Resolver not deployed yet, or address has no name set — fail quietly.
    console.warn("up.id lookup failed:", err.message);
    return null;
  }
}

// --- Feature: transaction history (via Blockscout explorer API) ------------

async function getRecentTransactions(address) {
  const url = `${CONFIG.EXPLORER_API_BASE}/addresses/${address}/transactions`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    return (data.items || []).slice(0, 5);
  } catch (err) {
    console.warn("Transaction history lookup failed:", err.message);
    return [];
  }
}

function renderTransactions(transactions) {
  const list = document.getElementById("txList");
  list.innerHTML = "";

  if (transactions.length === 0) {
    show("noTx");
    return;
  }
  hide("noTx");

  for (const tx of transactions) {
    const li = document.createElement("li");
    const shortHash = `${tx.hash.slice(0, 10)}...${tx.hash.slice(-6)}`;
    li.innerHTML = `<span class="tx-hash">${shortHash}</span> — ${tx.method || "transfer"}`;
    list.appendChild(li);
  }
}

// --- Feature: QR code --------------------------------------------------------

function renderQrCode(address) {
  const profileUrl = `${window.location.origin}${window.location.pathname}?address=${address}`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(profileUrl)}`;
  document.getElementById("qrCode").src = qrImageUrl;
}

// --- Main lookup flow --------------------------------------------------------

async function checkAddress(address) {
  if (!ethers.isAddress(address)) {
    setStatus("Please enter a valid wallet address (starts with 0x, 42 characters).", true);
    hide("output");
    return;
  }

  hide("output");
  setStatus("Fetching data from GIWA Sepolia...");

  try {
    const [balance, credentials, upIdName, transactions] = await Promise.all([
      getBalance(address),
      getCredentialsForAddress(address),
      resolveUpIdName(address),
      getRecentTransactions(address),
    ]);

    document.getElementById("addressText").textContent = address;
    document.getElementById("upIdName").textContent = upIdName || "Not set";
    document.getElementById("balanceText").textContent = `${balance} ETH`;
    document.getElementById("scoreText").textContent = computeTrustScore(credentials);

    renderCredentials(credentials);
    renderTransactions(transactions);
    renderQrCode(address);

    show("output");
    setStatus("");
  } catch (err) {
    console.error(err);
    setStatus("Something went wrong. Check the browser console for details.", true);
  }
}

// --- Wallet connect -----------------------------------------------------------

async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    setStatus("No wallet extension found. Please install MetaMask or Brave Wallet.", true);
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const address = accounts[0];

    document.getElementById("addressInput").value = address;
    checkAddress(address);
  } catch (err) {
    console.error(err);
    setStatus("Wallet connection failed. Please try again.", true);
  }
}

// --- Event listeners ------------------------------------------------------

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

// Auto-fill from ?address= query param, if present (useful for the QR code link).
const params = new URLSearchParams(window.location.search);
const addressFromUrl = params.get("address");
if (addressFromUrl) {
  document.getElementById("addressInput").value = addressFromUrl;
  checkAddress(addressFromUrl);
}