// Edit this file to configure the app. You shouldn't need to touch script.js or index.html
// unless you're changing behavior.

const CONFIG = {
  // GIWA Sepolia testnet RPC endpoint
  RPC_URL: "https://sepolia-rpc.giwa.io",

  // Blockscout explorer API base for GIWA Sepolia (used for transaction history)
  EXPLORER_API_BASE: "https://sepolia-explorer.giwa.io/api/v2",

  // --- EAS / Dojang-style credentials ---
  // Fill these in once you've deployed contracts/script/Deploy.s.sol from the main repo.
  // See: https://docs.giwa.io/network-information/contracts
  EAS_CONTRACT_ADDRESS: "0x0000000000000000000000000000000000000000",

  EAS_ABI: [
    "function getAttestation(bytes32 uid) view returns (tuple(bytes32 uid, bytes32 schema, uint64 time, uint64 expirationTime, uint64 revocationTime, bytes32 refUID, address recipient, address attester, bool revocable, bytes data))",
  ],

  // List of attestation UIDs to check against a looked-up address.
  // TODO (later upgrade): replace this with a real EAS GraphQL indexer query
  // filtered by recipient == address, so you don't have to list UIDs manually.
  CREDENTIAL_UIDS: [
    // "0xyour_attestation_uid_here",
  ],

  // --- up.id (GIWA ID) name resolution ---
  // Fill in once you have the real resolver contract address + ABI from GIWA's docs.
  // Left blank/placeholder for now — the app will gracefully show "Not set" if this
  // isn't configured or the call fails.
  UP_ID_RESOLVER_ADDRESS: "0x0000000000000000000000000000000000000000",
  UP_ID_RESOLVER_ABI: [
    "function getName(address addr) view returns (string)",
  ],
};
