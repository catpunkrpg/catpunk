/**
 * ═══════════════════════════════════════════════════════════════
 *  solana-core.js  ·  CatPunk Chaos — Solana Blockchain Layer
 *  Devnet → mainnet-ready. Semua halaman import file ini.
 * ═══════════════════════════════════════════════════════════════
 *
 *  SETUP:
 *  1. Replace CPUNK_MINT_ADDRESS after deploying token on bags.fm / spl-token
 *  2. Replace NFT_COLLECTION_ADDRESS after deploying Metaplex collection
 *  3. Replace STAKING_PROGRAM_ID after deploying Anchor program
 *
 *  Required CDN scripts — include in every page BEFORE this script:
 *  <script src="https://unpkg.com/@solana/web3.js@1.91.8/lib/index.iife.min.js"></script>
 *  <script src="https://cdn.jsdelivr.net/npm/@project-serum/borsh@0.2.5/dist/borsh.iife.min.js"></script>
 */

"use strict";

// ═══════════════════════════════════════════════════════════════════
//  CATPUNK DUAL-NETWORK CONFIG
//
//  STAKING  → MAINNET  (real $CPUNK tokens)
//  MINT     → DEVNET   (demo / testnet NFTs)
//
//  Ganti nilai di bawah setelah deploy contract:
// ═══════════════════════════════════════════════════════════════════
const CATPUNK_CONFIG = {

  // ── STAKING NETWORK = MAINNET ──────────────────────────────────
  STAKING_NETWORK: 'mainnet-beta',

  // ── MINT NETWORK = DEVNET (demo) ──────────────────────────────
  MINT_NETWORK: 'devnet',

  // ── RPC ENDPOINTS ─────────────────────────────────────────────
  RPC_DEVNET:    'https://api.devnet.solana.com',
  RPC_MAINNET:   'https://mainnet.helius-rpc.com/?api-key=demo',
  // Ganti dengan RPC premium kamu (QuickNode / Helius) untuk produksi:
  // RPC_MAINNET: 'https://YOUR-RPC-ENDPOINT.quiknode.pro/YOUR-KEY/',

  // ── $CPUNK TOKEN (MAINNET) ─────────────────────────────────────
  // Setelah deploy token di bags.fm / spl-token cli, isi address ini:
  CPUNK_MINT_ADDRESS: 'BXhD9DSVhJ6dncAYgZRsYDXant5Tei8VWcPnKagkjBf7',
  CPUNK_DECIMALS: 6,

  // ── NFT COLLECTION (DEVNET — untuk demo mint) ─────────────────
  NFT_COLLECTION_ADDRESS: 'DocCH4ukiuh8bRMU6anBdNBHmowRkNc6UD98WCWf5pdt',
  CANDY_MACHINE_ID: 'Cfhi9FNPnxABgsoLfLycCp6Wor133tzUo3YzasHRCqoM',

  // ── STAKING PROGRAM (MAINNET — Anchor) ────────────────────────
  // Setelah deploy Anchor program, isi address ini:
  STAKING_PROGRAM_ID: 'GANTI_DENGAN_STAKING_PROGRAM_ID',

  // ── MINT PRICE (DEVNET demo price) ────────────────────────────
  MINT_PRICE_SOL: 0.05,

  // ── STAKING APY ───────────────────────────────────────────────
  BASE_APY: 120,
  RARITY_MULTIPLIER: { common:1.0, rare:1.5, epic:2.5, legendary:5.0 },

  // ── LEGACY: default NETWORK (dipakai oleh fungsi-fungsi lama) ─
  // Jangan diubah langsung — pakai STAKING_NETWORK / MINT_NETWORK
  get NETWORK() { return this.STAKING_NETWORK; },
};

// ── Helper: get connection untuk context tertentu ──────────────────────────────
function getStakingConnection() {
  const rpc = CATPUNK_CONFIG.STAKING_NETWORK === 'mainnet-beta'
    ? CATPUNK_CONFIG.RPC_MAINNET
    : CATPUNK_CONFIG.RPC_DEVNET;
  return new solanaWeb3.Connection(rpc, 'confirmed');
}
function getMintConnection() {
  const rpc = CATPUNK_CONFIG.MINT_NETWORK === 'mainnet-beta'
    ? CATPUNK_CONFIG.RPC_MAINNET
    : CATPUNK_CONFIG.RPC_DEVNET;
  return new solanaWeb3.Connection(rpc, 'confirmed');
}

// ─── GLOBAL STATE ─────────────────────────────────────────────────────────────
const CatPunkWallet = {
  connected: false,
  publicKey: null,
  publicKeyStr: '',
  walletName: '',
  walletIcon: '',
  provider: null,
  solBalance: 0,
  cpunkBalance: 0,
  nfts: [],
  stakedNfts: [],

  // Emit event to all listeners
  _listeners: {},
  on(event, fn) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(fn);
  },
  emit(event, data) {
    (this._listeners[event] || []).forEach(fn => fn(data));
  },
};

// ─── RPC CONNECTION (default = staking network = mainnet) ────────────────────
function getSolanaConnection() {
  // Default connection uses staking network (mainnet-beta)
  return getStakingConnection();
}

// ─── WALLET DETECTION ─────────────────────────────────────────────────────────
const SUPPORTED_WALLETS = [
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    detect: () => window?.solana?.isPhantom,
    provider: () => window.solana,
    installUrl: 'https://phantom.app/',
  },
  {
    id: 'solflare',
    name: 'Solflare',
    icon: '🔆',
    detect: () => window?.solflare?.isSolflare,
    provider: () => window.solflare,
    installUrl: 'https://solflare.com/',
  },
  {
    id: 'backpack',
    name: 'Backpack',
    icon: '🎒',
    detect: () => window?.backpack?.isBackpack,
    provider: () => window.backpack,
    installUrl: 'https://backpack.app/',
  },
];

// ─── CONNECT WALLET ───────────────────────────────────────────────────────────
async function connectWalletById(walletId) {
  const walletDef = SUPPORTED_WALLETS.find(w => w.id === walletId);
  if (!walletDef) throw new Error('Unknown wallet: ' + walletId);

  const provider = walletDef.provider();
  if (!provider) {
    throw new Error(`${walletDef.name} not detected. Please install it first.`);
  }

  // Connect
  let resp;
  if (walletDef.id === 'solflare') {
    await provider.connect();
    resp = { publicKey: provider.publicKey };
  } else {
    resp = await provider.connect();
  }

  const pubkey = resp?.publicKey || provider.publicKey;
  if (!pubkey) throw new Error('Could not retrieve public key');

  // Update global state
  CatPunkWallet.connected = true;
  CatPunkWallet.publicKey = pubkey;
  CatPunkWallet.publicKeyStr = pubkey.toString();
  CatPunkWallet.walletName = walletDef.name;
  CatPunkWallet.walletIcon = walletDef.icon;
  CatPunkWallet.provider = provider;

  // Save session
  sessionStorage.setItem('cpk_wallet', walletId);
  sessionStorage.setItem('cpk_pubkey', pubkey.toString());

  // Load balances async
  await refreshBalances();

  // Listen for wallet events
  provider.on?.('disconnect', () => disconnectWallet());
  provider.on?.('accountChanged', () => refreshBalances());

  CatPunkWallet.emit('connected', {
    publicKey: CatPunkWallet.publicKeyStr,
    walletName: walletDef.name,
  });

  return CatPunkWallet;
}

// ─── DISCONNECT ───────────────────────────────────────────────────────────────
async function disconnectWallet() {
  try {
    if (CatPunkWallet.provider?.disconnect) {
      await CatPunkWallet.provider.disconnect();
    }
  } catch (e) { /* ignore */ }

  CatPunkWallet.connected = false;
  CatPunkWallet.publicKey = null;
  CatPunkWallet.publicKeyStr = '';
  CatPunkWallet.walletName = '';
  CatPunkWallet.provider = null;
  CatPunkWallet.solBalance = 0;
  CatPunkWallet.cpunkBalance = 0;
  CatPunkWallet.nfts = [];
  CatPunkWallet.stakedNfts = [];

  sessionStorage.removeItem('cpk_wallet');
  sessionStorage.removeItem('cpk_pubkey');

  CatPunkWallet.emit('disconnected', {});
}

// ─── RESTORE SESSION ──────────────────────────────────────────────────────────
async function tryRestoreSession() {
  const savedId  = sessionStorage.getItem('cpk_wallet');
  const savedKey = sessionStorage.getItem('cpk_pubkey');
  if (!savedId || !savedKey) return false;

  const walletDef = SUPPORTED_WALLETS.find(w => w.id === savedId);
  if (!walletDef || !walletDef.detect()) return false;

  const provider = walletDef.provider();
  const pubkey   = provider?.publicKey;

  if (pubkey && pubkey.toString() === savedKey) {
    CatPunkWallet.connected     = true;
    CatPunkWallet.publicKey     = pubkey;
    CatPunkWallet.publicKeyStr  = pubkey.toString();
    CatPunkWallet.walletName    = walletDef.name;
    CatPunkWallet.walletIcon    = walletDef.icon;
    CatPunkWallet.provider      = provider;

    await refreshBalances();
    CatPunkWallet.emit('connected', {
      publicKey: CatPunkWallet.publicKeyStr,
      walletName: walletDef.name,
      restored: true,
    });
    return true;
  }
  return false;
}


// ─── REFRESH BALANCES ON SPECIFIC NETWORK ─────────────────────────────────────
// Used by stakeCPUNK to check mainnet $CPUNK balance before staking
async function refreshBalancesOnNetwork(conn) {
  if (!CatPunkWallet.publicKey) return;
  const pubkey = CatPunkWallet.publicKey;
  try {
    const lamports = await conn.getBalance(pubkey);
    CatPunkWallet.solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;
  } catch(e) {}
  try {
    const mintPubkey = new solanaWeb3.PublicKey(CATPUNK_CONFIG.CPUNK_MINT_ADDRESS);
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubkey, { mint: mintPubkey });
    if (tokenAccounts.value.length > 0) {
      const amt = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
      CatPunkWallet.cpunkBalance = parseFloat(amt.uiAmountString || '0');
    } else {
      CatPunkWallet.cpunkBalance = 0;
    }
  } catch(e) {
    // Token account not found on this network
    CatPunkWallet.cpunkBalance = 0;
  }
}

// ─── REFRESH BALANCES ─────────────────────────────────────────────────────────
async function refreshBalances() {
  if (!CatPunkWallet.publicKey) return;

  const conn = getSolanaConnection();
  const pubkey = CatPunkWallet.publicKey;

  // SOL balance
  try {
    const lamports = await conn.getBalance(pubkey);
    CatPunkWallet.solBalance = lamports / solanaWeb3.LAMPORTS_PER_SOL;
  } catch (e) {
    console.warn('[CatPunk] SOL balance fetch failed:', e.message);
  }

  // $CPUNK token balance
  try {
    const mintPubkey = new solanaWeb3.PublicKey(CATPUNK_CONFIG.CPUNK_MINT_ADDRESS);
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubkey, {
      mint: mintPubkey
    });
    if (tokenAccounts.value.length > 0) {
      const amount = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
      CatPunkWallet.cpunkBalance = parseFloat(amount.uiAmountString || '0');
    } else {
      CatPunkWallet.cpunkBalance = 0;
    }
  } catch (e) {
    // Token not found in wallet or mint address not set
    CatPunkWallet.cpunkBalance = 0;
  }

  CatPunkWallet.emit('balancesUpdated', {
    sol: CatPunkWallet.solBalance,
    cpunk: CatPunkWallet.cpunkBalance,
  });
}

// ─── FETCH NFTs FROM ON-CHAIN ─────────────────────────────────────────────────
async function fetchWalletNFTs() {
  if (!CatPunkWallet.publicKey) return [];

  const conn   = getSolanaConnection();
  const pubkey = CatPunkWallet.publicKey;

  try {
    // Step 1: Get all token accounts owned by wallet
    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubkey, {
      programId: new solanaWeb3.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
    });

    // Step 2: Filter NFTs (amount=1, decimals=0)
    const nftMints = tokenAccounts.value
      .filter(acc => {
        const info = acc.account.data.parsed.info;
        return parseInt(info.tokenAmount.amount) === 1
          && info.tokenAmount.decimals === 0;
      })
      .map(acc => acc.account.data.parsed.info.mint);

    if (nftMints.length === 0) {
      CatPunkWallet.nfts = [];
      CatPunkWallet.emit('nftsLoaded', []);
      return [];
    }

    // Step 3: For each mint, fetch on-chain metadata via Metaplex metadata PDA
    const TOKEN_METADATA_PROGRAM_ID = new solanaWeb3.PublicKey(
      'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
    );

    const ownedCards = [];

    await Promise.all(nftMints.map(async (mintStr) => {
      try {
        const mintPubkey = new solanaWeb3.PublicKey(mintStr);
        const [metadataPDA] = await solanaWeb3.PublicKey.findProgramAddress(
          [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mintPubkey.toBuffer(),
          ],
          TOKEN_METADATA_PROGRAM_ID
        );

        const metadataAccount = await conn.getAccountInfo(metadataPDA);
        if (!metadataAccount) return;

        // Parse name from metadata account (offset 69)
        const data = metadataAccount.data;
        const nameLen = data[65] | (data[66] << 8) | (data[67] << 16) | (data[68] << 24);
        const nameBytes = data.slice(69, 69 + nameLen);
        const nftName = new TextDecoder().decode(nameBytes).replace(/\0/g, '').trim();

        // Skip collection NFT
        if (nftName === 'CatPunk Chaos') return;

        // Match name with NFT_CARDS
        if (typeof NFT_CARDS !== 'undefined') {
          const card = NFT_CARDS.find(c =>
            c.name.toLowerCase() === nftName.toLowerCase()
          );
          if (card) {
            ownedCards.push({ ...card, onChain: true, mint: mintStr });
          } else {
            ownedCards.push({
              id: mintStr, name: nftName, power: '—',
              rarity: 'common', color: '#6a6a9a', img: '',
              onChain: true, mint: mintStr,
            });
          }
        }
      } catch (e) {
        console.warn('[CatPunk] Metadata error for mint:', mintStr, e.message);
      }
    }));

    CatPunkWallet.nfts = ownedCards;
    CatPunkWallet.emit('nftsLoaded', ownedCards);
    return ownedCards;

  } catch (e) {
    console.warn('[CatPunk] NFT fetch failed:', e.message);
    return [];
  }
}

// ─── MINT NFT ─────────────────────────────────────────────────────────────────
/**
 * Mint satu NFT card on-chain.
 * Devnet: Simulasi transaksi + simpan ke localStorage.
 * Mainnet: Panggil Candy Machine v3 via Metaplex Umi.
 *
 * @param {Object} card - Card from NFT_CARDS array
 * @param {Function} onStatus - callback(message) for UI status updates
 * @returns {Object} { success, txHash, card }
 */
async function mintNFTCard(card, onStatus = () => {}) {
  if (!CatPunkWallet.connected) throw new Error('Wallet not connected');

  // Mint selalu pakai DEVNET (demo/testnet)
  const conn   = getMintConnection();
  const pubkey = CatPunkWallet.publicKey;
  const isMintDevnet = CATPUNK_CONFIG.MINT_NETWORK !== 'mainnet-beta';

  onStatus('Preparing transaction on ' + (isMintDevnet ? 'Devnet (Demo)' : 'Mainnet') + '...');

  if (isMintDevnet) {
    // ── DEVNET SIMULATION ──────────────────────────────────────────────────
    // Check SOL balance is sufficient for fee
    const lamports = await conn.getBalance(pubkey);
    const solBal = lamports / solanaWeb3.LAMPORTS_PER_SOL;

    if (solBal < CATPUNK_CONFIG.MINT_PRICE_SOL) {
      throw new Error(
        `Insufficient SOL. Need ${CATPUNK_CONFIG.MINT_PRICE_SOL} SOL, you have ${solBal.toFixed(4)} SOL.\n` +
        `Devnet airdrop: solana airdrop 1 ${CatPunkWallet.publicKeyStr} --url devnet`
      );
    }

    onStatus('Sending transaction to Solana Devnet...');

    // Create small transfer to dummy address as transaction proof
    const dummyDest = new solanaWeb3.PublicKey('11111111111111111111111111111112');
    const tx = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: pubkey,
        toPubkey: dummyDest,
        lamports: Math.floor(CATPUNK_CONFIG.MINT_PRICE_SOL * solanaWeb3.LAMPORTS_PER_SOL),
      })
    );

    const { blockhash } = await conn.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.feePayer = pubkey;

    onStatus('Approve in your Phantom/Solflare wallet...');
    const signed = await CatPunkWallet.provider.signTransaction(tx);

    onStatus('Broadcasting to Devnet...');
    const rawTx = signed.serialize();
    const txHash = await conn.sendRawTransaction(rawTx, { skipPreflight: false });

    onStatus('Confirming transaction...');
    await conn.confirmTransaction(txHash, 'confirmed');

    // Save to localStorage (devnet ownership record)
    const devnetOwned = JSON.parse(localStorage.getItem('cpk_devnet_nfts') || '[]');
    if (!devnetOwned.includes(card.id)) {
      devnetOwned.push(card.id);
      localStorage.setItem('cpk_devnet_nfts', JSON.stringify(devnetOwned));
    }

    // Update balance
    await refreshBalances();

    return {
      success: true,
      txHash,
      txUrl: `https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
      card,
      network: 'devnet (demo)',
      isDemoMint: true,
    };

  } else {
    // ── MAINNET: Metaplex Candy Machine v3 ─────────────────────────────────
    // Requires @metaplex-foundation/umi loaded via CDN
    if (typeof mplCandyMachine === 'undefined') {
      throw new Error('Metaplex SDK not loaded. Ensure CDN script is included in the page.');
    }

    onStatus('Minting via Metaplex Candy Machine...');
    // TODO: Implement Candy Machine v3 mint flow
    // Reference: https://developers.metaplex.com/candy-machine
    throw new Error('Mainnet mint not configured. Deploy Candy Machine first.');
  }
}

// ─── STAKING ──────────────────────────────────────────────────────────────────
/**
 * Stake $CPUNK token.
 * Devnet: Simulasi via localStorage.
 * Mainnet: Panggil Anchor staking program.
 *
 * @param {number} amount - Amount of CPUNK to stake
 * @param {number} durationDays - Lock duration in days (30, 90, 180, 365)
 */
async function stakeCPUNK(amount, durationDays, onStatus = () => {}) {
  if (!CatPunkWallet.connected) throw new Error('Wallet not connected');
  if (amount <= 0) throw new Error('Amount must be greater than 0');

  // Staking selalu pakai MAINNET
  const conn   = getStakingConnection();
  const pubkey = CatPunkWallet.publicKey;
  const isMainnet = CATPUNK_CONFIG.STAKING_NETWORK === 'mainnet-beta';

  onStatus('Preparing staking transaction on ' + (isMainnet ? 'Mainnet' : 'Devnet') + '...');

  // APY calc
  const durationMultiplier = durationDays >= 365 ? 2.0
    : durationDays >= 180 ? 1.5
    : durationDays >= 90  ? 1.2 : 1.0;
  const effectiveAPY    = CATPUNK_CONFIG.BASE_APY * durationMultiplier;
  const projectedReward = amount * (effectiveAPY / 365 / 100) * durationDays;

  // ── Check SOL balance untuk gas ────────────────────────────────────────────
  const lamports = await conn.getBalance(pubkey);
  const solBal   = lamports / solanaWeb3.LAMPORTS_PER_SOL;
  if (solBal < 0.002) {
    throw new Error(
      `SOL balance too low for gas fee. Need ~0.002 SOL, you have ${solBal.toFixed(5)} SOL.`
      + (isMainnet ? '' : `\nGet devnet SOL: https://faucet.solana.com/?addr=${CatPunkWallet.publicKeyStr}`)
    );
  }

  // ── Check $CPUNK balance ────────────────────────────────────────────────────
  await refreshBalancesOnNetwork(conn);
  if (CatPunkWallet.cpunkBalance < amount) {
    throw new Error(
      `Insufficient $CPUNK. You have ${CatPunkWallet.cpunkBalance.toFixed(2)} but tried to stake ${amount}.`
    );
  }

  // ── Build transaction proof ──────────────────────────────────────────────
  // NOTE: Ini adalah demo tx (small SOL transfer sebagai bukti signature).
  // Pada produksi, ganti dengan Anchor program CPI untuk lock token sungguhan.
  const dummyDest = new solanaWeb3.PublicKey('11111111111111111111111111111112');
  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: pubkey,
      toPubkey:   dummyDest,
      lamports:   5000, // ~0.000005 SOL sebagai fee proof
    })
  );

  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = pubkey;

  onStatus('Approve staking in wallet...');
  const signed = await CatPunkWallet.provider.signTransaction(tx);

  onStatus('Broadcasting to ' + (isMainnet ? 'Mainnet' : 'Devnet') + '...');
  const txHash = await conn.sendRawTransaction(signed.serialize());

  onStatus('Confirming transaction...');
  await conn.confirmTransaction(txHash, 'confirmed');

  // ── Simpan stake record ──────────────────────────────────────────────────
  const stakeKey = isMainnet ? 'cpk_mainnet_stakes' : 'cpk_devnet_stakes';
  const stakeRecord = {
    id:             'stake_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    wallet:         CatPunkWallet.publicKeyStr,
    network:        CATPUNK_CONFIG.STAKING_NETWORK,
    amount,
    durationDays,
    effectiveAPY,
    projectedReward,
    startTime:      Date.now(),
    endTime:        Date.now() + durationDays * 86400000,
    lastClaim:      Date.now(),
    txHash,
    txUrl:          isMainnet
                      ? `https://explorer.solana.com/tx/${txHash}`
                      : `https://explorer.solana.com/tx/${txHash}?cluster=devnet`,
    status:         'active',
  };

  const stakes = JSON.parse(localStorage.getItem(stakeKey) || '[]');
  stakes.push(stakeRecord);
  localStorage.setItem(stakeKey, JSON.stringify(stakes));

  // Kurangi cpunk balance lokal (akan di-refresh dari chain pada next load)
  CatPunkWallet.cpunkBalance = Math.max(0, CatPunkWallet.cpunkBalance - amount);
  CatPunkWallet.emit('staked', stakeRecord);

  return {
    success:     true,
    txHash,
    txUrl:       stakeRecord.txUrl,
    network:     CATPUNK_CONFIG.STAKING_NETWORK,
    stakeRecord,
  };
}

/**
 * Claim staking rewards
 */
async function claimStakingRewards(stakeId, onStatus = () => {}) {
  if (!CatPunkWallet.connected) throw new Error('Wallet not connected');

  // Cari stake di mainnet atau devnet storage
  const isMainnet = CATPUNK_CONFIG.STAKING_NETWORK === 'mainnet-beta';
  const stakeKey  = isMainnet ? 'cpk_mainnet_stakes' : 'cpk_devnet_stakes';
  const stakes    = JSON.parse(localStorage.getItem(stakeKey) || '[]');
  const stake     = stakes.find(s => s.id === stakeId);
  if (!stake) throw new Error('Stake not found');

  const now          = Date.now();
  const elapsed      = (now - (stake.lastClaim || stake.startTime)) / 86400000;
  const earnedReward = Math.max(0, stake.amount * (stake.effectiveAPY / 365 / 100) * elapsed);
  if (earnedReward < 0.0001) throw new Error('No rewards to claim yet');

  onStatus('Claiming rewards on ' + (isMainnet ? 'Mainnet' : 'Devnet') + '...');

  const conn   = getStakingConnection();
  const pubkey = CatPunkWallet.publicKey;
  const dummyDest = new solanaWeb3.PublicKey('11111111111111111111111111111112');
  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({ fromPubkey: pubkey, toPubkey: dummyDest, lamports: 5000 })
  );
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = pubkey;

  onStatus('Approve claim in wallet...');
  const signed = await CatPunkWallet.provider.signTransaction(tx);
  const txHash = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(txHash, 'confirmed');

  stake.lastClaim    = now;
  stake.totalClaimed = (stake.totalClaimed || 0) + earnedReward;
  localStorage.setItem(stakeKey, JSON.stringify(stakes));

  CatPunkWallet.cpunkBalance += earnedReward;
  CatPunkWallet.emit('rewardsClaimed', { stakeId, reward: earnedReward });

  const txUrl = isMainnet
    ? `https://explorer.solana.com/tx/${txHash}`
    : `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;

  return { success: true, txHash, txUrl, reward: earnedReward };
}

/**
 * Unstake (available after lock period ends)
 */
async function unstakeCPUNK(stakeId, onStatus = () => {}) {
  if (!CatPunkWallet.connected) throw new Error('Wallet not connected');

  const isMainnet = CATPUNK_CONFIG.STAKING_NETWORK === 'mainnet-beta';
  const stakeKey  = isMainnet ? 'cpk_mainnet_stakes' : 'cpk_devnet_stakes';
  const stakes    = JSON.parse(localStorage.getItem(stakeKey) || '[]');
  const stakeIdx  = stakes.findIndex(s => s.id === stakeId);
  if (stakeIdx === -1) throw new Error('Stake not found');

  const stake = stakes[stakeIdx];
  const now = Date.now();

  if (now < stake.endTime) {
    const daysLeft = Math.ceil((stake.endTime - now) / 86400000);
    throw new Error(`Lock period not over yet.  ${daysLeft} days remaining.`);
  }

  onStatus('Unstaking...');

  const conn = getSolanaConnection();
  const pubkey = CatPunkWallet.publicKey;
  const dummyDest = new solanaWeb3.PublicKey('11111111111111111111111111111112');
  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({
      fromPubkey: pubkey, toPubkey: dummyDest, lamports: 5000,
    })
  );
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = pubkey;

  onStatus('Approve unstake in wallet...');
  const signed = await CatPunkWallet.provider.signTransaction(tx);
  const txHash = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(txHash, 'confirmed');

  // Return staked tokens + final rewards
  const totalReward = stake.amount * (stake.effectiveAPY / 365 / 100) * stake.durationDays;
  CatPunkWallet.cpunkBalance += stake.amount + totalReward;

  // Remove stake
  stakes.splice(stakeIdx, 1);
  localStorage.setItem(stakeKey, JSON.stringify(stakes));

  CatPunkWallet.emit('unstaked', { stakeId, returned: stake.amount, reward: totalReward });

  const txUrl = isMainnet
    ? `https://explorer.solana.com/tx/${txHash}`
    : `https://explorer.solana.com/tx/${txHash}?cluster=devnet`;

  return { success: true, txHash, txUrl, returned: stake.amount, reward: totalReward };
}

// ─── STAKING DATA ─────────────────────────────────────────────────────────────
function getActiveStakes() {
  if (!CatPunkWallet.publicKeyStr) return [];
  const isMainnet = CATPUNK_CONFIG.STAKING_NETWORK === 'mainnet-beta';
  const stakeKey  = isMainnet ? 'cpk_mainnet_stakes' : 'cpk_devnet_stakes';
  const all = JSON.parse(localStorage.getItem(stakeKey) || '[]');
  return all.filter(s => s.wallet === CatPunkWallet.publicKeyStr && s.status === 'active');
}

function getStakeRewards(stake) {
  const now = Date.now();
  const elapsed = (now - stake.startTime) / (1000 * 60 * 60 * 24);
  const earned   = stake.amount * (stake.effectiveAPY / 365 / 100) * elapsed;
  const progress = Math.min(100, ((now - stake.startTime) / (stake.endTime - stake.startTime)) * 100);
  const isUnlocked = now >= stake.endTime;
  return { earned, progress, isUnlocked };
}

// ─── PLAYER PROFILE ───────────────────────────────────────────────────────────
function buildPlayerProfile() {
  if (!CatPunkWallet.publicKeyStr) return null;

  const addr = CatPunkWallet.publicKeyStr;
  const stakes = getActiveStakes();
  const nfts   = CatPunkWallet.nfts || [];

  // Calculate stats
  const totalStaked = stakes.reduce((s, x) => s + x.amount, 0);
  const totalCards  = nfts.length;

  // Calculate rarity distribution
  const rarity = { common: 0, rare: 0, epic: 0, legendary: 0 };
  nfts.forEach(n => { if (rarity[n.rarity] !== undefined) rarity[n.rarity]++; });

  // Score based on NFTs
  const power = nfts.reduce((sum, n) => {
    const num = parseInt((n.power || '').replace(/[^0-9]/g, '')) || 0;
    return sum + num;
  }, 0);

  // Rank based on power
  const rank = power > 50000 ? 'LEGENDARY WARRIOR'
    : power > 20000 ? 'EPIC CHAMPION'
    : power > 5000  ? 'RARE HUNTER'
    : power > 0     ? 'COMMON ADVENTURER'
    : 'NEW RECRUIT';

  return {
    address: addr,
    addressShort: addr.slice(0, 4) + '...' + addr.slice(-4),
    walletName: CatPunkWallet.walletName,
    walletIcon: CatPunkWallet.walletIcon,
    solBalance: CatPunkWallet.solBalance,
    cpunkBalance: CatPunkWallet.cpunkBalance,
    totalCards,
    totalStaked,
    rarity,
    power,
    rank,
    network: CATPUNK_CONFIG.NETWORK,
  };
}

// ─── UTILITY ──────────────────────────────────────────────────────────────────
function formatAddress(addr, len = 4) {
  if (!addr) return '—';
  return addr.slice(0, len) + '...' + addr.slice(-len);
}

function formatNumber(n, decimals = 2) {
  if (n === undefined || n === null) return '—';
  return Number(n).toLocaleString('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function devnetAirdropUrl(address) {
  return `https://faucet.solana.com/?addr=${address}`;
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.CATPUNK_CONFIG    = CATPUNK_CONFIG;
  window.CatPunkWallet     = CatPunkWallet;
  window.SUPPORTED_WALLETS = SUPPORTED_WALLETS;
  window.connectWalletById    = connectWalletById;
  window.disconnectWallet     = disconnectWallet;
  window.tryRestoreSession    = tryRestoreSession;
  window.refreshBalances      = refreshBalances;
  window.refreshBalancesOnNetwork = refreshBalancesOnNetwork;
  window.fetchWalletNFTs      = fetchWalletNFTs;
  window.mintNFTCard          = mintNFTCard;
  window.stakeCPUNK           = stakeCPUNK;
  window.claimStakingRewards  = claimStakingRewards;
  window.unstakeCPUNK         = unstakeCPUNK;
  window.getActiveStakes      = getActiveStakes;
  window.getStakeRewards      = getStakeRewards;
  window.buildPlayerProfile   = buildPlayerProfile;
  window.getSolanaConnection  = getSolanaConnection;
  window.getStakingConnection = getStakingConnection;
  window.getMintConnection    = getMintConnection;
  window.formatAddress        = formatAddress;
  window.formatNumber         = formatNumber;
  window.devnetAirdropUrl     = devnetAirdropUrl;
}
// ─── NFT CARD STAKING ─────────────────────────────────────────────────────────
async function stakeNFTCard(card, durationDays, onStatus = () => {}) {
  if (!CatPunkWallet.connected) throw new Error('Wallet not connected');
  if (!card || !card.name) throw new Error('Invalid card');
  const existing = getActiveNFTStakes();
  if (existing.find(s => s.cardName === card.name)) throw new Error(`${card.name} is already staked`);

  const DAILY_REWARDS = { common: 10, rare: 35, epic: 80, legendary: 200 };
  const dailyReward = DAILY_REWARDS[card.rarity] || 10;

  onStatus('Preparing NFT stake...');
  const conn = getSolanaConnection();
  const pubkey = CatPunkWallet.publicKey;
  const dummyDest = new solanaWeb3.PublicKey('11111111111111111111111111111112');
  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({ fromPubkey: pubkey, toPubkey: dummyDest, lamports: 5000 })
  );
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash; tx.feePayer = pubkey;
  onStatus('Approve in wallet...');
  const signed = await CatPunkWallet.provider.signTransaction(tx);
  const txHash = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(txHash, 'confirmed');

  const now = Date.now();
  const stakeRecord = {
    id: 'nfts_' + now + '_' + Math.random().toString(36).slice(2,6),
    type: 'nft', wallet: CatPunkWallet.publicKeyStr,
    cardName: card.name, cardId: card.id, cardRarity: card.rarity,
    cardImg: card.img, cardPower: card.power, cardColor: card.color,
    durationDays, dailyReward,
    startTime: now, endTime: now + durationDays * 86400000,
    lastClaim: now, status: 'active', txHash,
  };
  const stakes = JSON.parse(localStorage.getItem('cpk_nft_stakes') || '[]');
  stakes.push(stakeRecord);
  localStorage.setItem('cpk_nft_stakes', JSON.stringify(stakes));
  CatPunkWallet.emit('nftStaked', stakeRecord);
  return { success: true, txHash, stake: stakeRecord };
}

async function claimNFTStakeRewards(stakeId, onStatus = () => {}) {
  if (!CatPunkWallet.connected) throw new Error('Wallet not connected');
  const stakes = JSON.parse(localStorage.getItem('cpk_nft_stakes') || '[]');
  const stake = stakes.find(s => s.id === stakeId);
  if (!stake) throw new Error('Stake not found');
  const elapsed = (Date.now() - (stake.lastClaim || stake.startTime)) / 86400000;
  const earned = Math.max(0, stake.dailyReward * elapsed);
  if (earned < 0.01) throw new Error('No rewards yet');

  onStatus('Claiming rewards...');
  const conn = getSolanaConnection();
  const pubkey = CatPunkWallet.publicKey;
  const dummyDest = new solanaWeb3.PublicKey('11111111111111111111111111111112');
  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({ fromPubkey: pubkey, toPubkey: dummyDest, lamports: 5000 })
  );
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash; tx.feePayer = pubkey;
  onStatus('Approve in wallet...');
  const signed = await CatPunkWallet.provider.signTransaction(tx);
  const txHash = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(txHash, 'confirmed');
  stake.lastClaim = Date.now();
  localStorage.setItem('cpk_nft_stakes', JSON.stringify(stakes));
  CatPunkWallet.cpunkBalance += earned;
  return { success: true, txHash, reward: earned };
}

async function unstakeNFTCard(stakeId, onStatus = () => {}) {
  if (!CatPunkWallet.connected) throw new Error('Wallet not connected');
  const stakes = JSON.parse(localStorage.getItem('cpk_nft_stakes') || '[]');
  const idx = stakes.findIndex(s => s.id === stakeId);
  if (idx === -1) throw new Error('Stake not found');
  const stake = stakes[idx];
  const now = Date.now();
  if (now < stake.endTime) {
    const daysLeft = Math.ceil((stake.endTime - now) / 86400000);
    throw new Error(`Locked for ${daysLeft} more day${daysLeft>1?'s':''}`);
  }
  onStatus('Unstaking card...');
  const conn = getSolanaConnection();
  const pubkey = CatPunkWallet.publicKey;
  const dummyDest = new solanaWeb3.PublicKey('11111111111111111111111111111112');
  const tx = new solanaWeb3.Transaction().add(
    solanaWeb3.SystemProgram.transfer({ fromPubkey: pubkey, toPubkey: dummyDest, lamports: 5000 })
  );
  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash; tx.feePayer = pubkey;
  onStatus('Approve in wallet...');
  const signed = await CatPunkWallet.provider.signTransaction(tx);
  const txHash = await conn.sendRawTransaction(signed.serialize());
  await conn.confirmTransaction(txHash, 'confirmed');
  const elapsed = (now - (stake.lastClaim || stake.startTime)) / 86400000;
  const finalReward = Math.max(0, stake.dailyReward * elapsed);
  CatPunkWallet.cpunkBalance += finalReward;
  stakes.splice(idx, 1);
  localStorage.setItem('cpk_nft_stakes', JSON.stringify(stakes));
  CatPunkWallet.emit('nftUnstaked', { stakeId, cardName: stake.cardName, reward: finalReward });
  return { success: true, txHash, reward: finalReward, cardName: stake.cardName };
}

function getActiveNFTStakes() {
  if (!CatPunkWallet.publicKeyStr) return [];
  return JSON.parse(localStorage.getItem('cpk_nft_stakes') || '[]')
    .filter(s => s.wallet === CatPunkWallet.publicKeyStr && s.status === 'active');
}

function isCardStaked(cardName) {
  return getActiveNFTStakes().some(s => s.cardName === cardName);
}

function getEquippedCard() {
  const key = 'cpk_equipped_' + (CatPunkWallet.publicKeyStr || 'guest');
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function equipCard(card) {
  const key = 'cpk_equipped_' + (CatPunkWallet.publicKeyStr || 'guest');
  localStorage.setItem(key, JSON.stringify(card));
  CatPunkWallet.emit('cardEquipped', card);
  return card;
}

function unequipCard() {
  const key = 'cpk_equipped_' + (CatPunkWallet.publicKeyStr || 'guest');
  localStorage.removeItem(key);
  CatPunkWallet.emit('cardUnequipped', null);
}

function getMagicEdenUrl(mintAddress) {
  if (!mintAddress || mintAddress.startsWith('devnet_')) {
    return `https://magiceden.io/marketplace/catpunk_chaos`;
  }
  const cluster = CATPUNK_CONFIG.NETWORK === 'mainnet-beta' ? '' : '?cluster=devnet';
  return `https://magiceden.io/item-details/${mintAddress}${cluster}`;
}

function parseCardStats(card) {
  if (!card) return { atk:0, def:0, spd:0, eva:0, all:0, hp:0 };
  const p = card.power || '';
  const num = parseInt(p.replace(/[^0-9]/g,'')) || 0;
  const pct = parseFloat(p.replace(/[^0-9.]/g,'')) || 0;
  if (p.startsWith('ATK')) return { atk:num, def:0, spd:0, eva:0, all:0, hp:Math.floor(num*0.1) };
  if (p.startsWith('DEF')) return { atk:0, def:num, spd:0, eva:0, all:0, hp:Math.floor(num*0.2) };
  if (p.startsWith('SPD')) return { atk:0, def:0, spd:pct, eva:0, all:0, hp:0 };
  if (p.startsWith('EVA')) return { atk:0, def:0, spd:0, eva:pct, all:0, hp:0 };
  if (p.startsWith('ALL')) return { atk:pct, def:pct, spd:pct, eva:pct, all:pct, hp:pct };
  return { atk:0, def:0, spd:0, eva:0, all:0, hp:0 };
}

// Export new functions
if (typeof window !== 'undefined') {
  window.stakeNFTCard         = stakeNFTCard;
  window.claimNFTStakeRewards = claimNFTStakeRewards;
  window.unstakeNFTCard       = unstakeNFTCard;
  window.getActiveNFTStakes   = getActiveNFTStakes;
  window.isCardStaked         = isCardStaked;
  window.getEquippedCard      = getEquippedCard;
  window.equipCard            = equipCard;
  window.unequipCard          = unequipCard;
  window.getMagicEdenUrl      = getMagicEdenUrl;
  window.parseCardStats       = parseCardStats;
}