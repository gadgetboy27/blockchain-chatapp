# Blockchain ChatApp - Decentralized Immutable Messaging Platform

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Solidity](https://img.shields.io/badge/Solidity-0.8.24-brightgreen.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.1-black.svg)
![Hardhat](https://img.shields.io/badge/Hardhat-2.19-yellow.svg)

A fully decentralized, censorship-resistant messaging and file-sharing platform built on Ethereum/Polygon with IPFS storage and end-to-end encryption.

## Features

### Core Capabilities
- **Truly Immutable**: Messages and files stored on IPFS with hashes on blockchain
- **Censorship-Resistant**: No central authority can delete or modify your data
- **End-to-End Encrypted**: Messages encrypted before leaving your device
- **Low-Cost**: Deployed on Polygon for ~$0.001 per message
- **Pay-Per-Use**: Small fees prevent spam while keeping platform accessible
- **Permanent Storage**: Data exists as long as IPFS/blockchain networks exist

### Technical Features
- Smart contracts with security best practices (ReentrancyGuard, Pausable, AccessControl)
- IPFS integration for decentralized file storage (Pinata, Web3.Storage)
- TweetNaCl-based E2E encryption
- Blockchain-based user profiles and reputation system
- Group channels (public and private)
- File sharing with access control
- **Multi-layered content moderation** (AI + Community + User Control)
- Rate limiting and anti-spam mechanisms
- Modern React/Next.js frontend with RainbowKit wallet integration

### Content Moderation System ⭐ NEW
Unlike centralized platforms, we **cannot delete** content from blockchain/IPFS. Instead, we use a revolutionary approach:

- **AI-Powered Analysis**: Client-side ML detects harmful content before display
- **Community Moderation**: Decentralized flagging and voting system
- **User Control**: Everyone sets their own filtering preferences (stored on-chain)
- **Hard Limits**: Illegal content (CSAM, terrorism) blocked universally
- **Transparent**: All moderation decisions visible and appealable
- **Preserves Free Speech**: Content stays immutable, users choose what they see

📖 **[Read Full Moderation Documentation](./docs/MODERATION_SYSTEM.md)**

## Architecture

### Smart Contracts (Solidity 0.8.24)
1. **MessageRegistry.sol** - Stores message metadata and IPFS hashes
   - Direct messaging
   - Group/channel messaging
   - Message threading (replies)
   - Rate limiting
   - Fee collection

2. **UserProfile.sol** - Decentralized identity system
   - Unique usernames
   - Reputation/trust system
   - Profile metadata (avatar, bio stored on IPFS)
   - Verification system

3. **FileStorage.sol** - Immutable file storage
   - IPFS hash registration
   - Access control (public/private files)
   - File sharing
   - Tag-based organization

4. **ContentModeration.sol** - Decentralized content moderation
   - Community-based flagging system
   - Democratic voting on flags
   - Appeal process
   - Reputation for moderators
   - User-controlled preferences
   - Banned content registry (illegal material)

### Frontend (Next.js 14 + TypeScript)
- **Web3 Integration**: Wagmi + RainbowKit for wallet connectivity
- **IPFS**: Pinata/Web3.Storage clients for file uploads
- **Encryption**: TweetNaCl for E2E encryption
- **UI**: TailwindCSS with custom components
- **State Management**: Zustand + React Query

### Storage Layer
- **Blockchain**: Polygon (mainnet) / Mumbai (testnet) - stores metadata & hashes
- **IPFS**: Distributed file storage - stores actual message content and files
- **Local**: Encrypted keys stored in browser localStorage

## Security Features

### Smart Contract Security
- ✅ OpenZeppelin security contracts (ReentrancyGuard, Pausable, Ownable)
- ✅ Input validation on all user inputs
- ✅ Rate limiting to prevent spam
- ✅ Access control modifiers
- ✅ Checks-Effects-Interactions pattern
- ✅ Gas optimization
- ✅ Emergency pause functionality
- ✅ No reliance on block.timestamp for critical logic
- ✅ Safe math operations (Solidity 0.8+)

### Frontend Security
- ✅ End-to-end encryption (NaCl box)
- ✅ Secure key storage (encrypted with password)
- ✅ Input sanitization
- ✅ XSS protection
- ✅ IPFS hash validation
- ✅ Transaction signing validation

### Privacy Features
- ✅ Messages encrypted client-side
- ✅ Only hashes stored on-chain
- ✅ Anonymous messaging option
- ✅ Private file sharing

## Installation & Setup

### Prerequisites
- Node.js >= 18.0.0
- MetaMask or compatible Web3 wallet
- IPFS API access (Pinata or Web3.Storage)

### 1. Clone and Install
```bash
git clone <repository-url>
cd blockchain-chatapp
npm install
cd chatsite && npm install && cd ..
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Blockchain
PRIVATE_KEY=your_deployer_private_key
POLYGONSCAN_API_KEY=your_polygonscan_api
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# IPFS
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret
WEB3_STORAGE_TOKEN=your_web3storage_token

# Frontend
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
NEXT_PUBLIC_ENABLE_TESTNETS=true
```

### 3. Compile Contracts
```bash
npm run compile
```

### 4. Run Tests
```bash
npm test
```

### 5. Deploy Contracts

**Local Development:**
```bash
# Terminal 1: Start local node
npm run node

# Terminal 2: Deploy
npm run deploy:local
```

**Testnet (Mumbai):**
```bash
npm run deploy:testnet
```

**Mainnet (Polygon):**
```bash
npm run deploy:mainnet
```

### 6. Start Frontend
```bash
npm run frontend
```

Visit `http://localhost:3000`

## Usage Guide

### For Users

#### 1. Connect Wallet
- Click "Connect Wallet"
- Choose your wallet (MetaMask recommended)
- Approve connection

#### 2. Create Profile
- Click "Create Profile"
- Enter username (3-20 characters, unique)
- Set display name and optional avatar
- Pay small registration fee (~$0.001 on Polygon)

#### 3. Send Messages
- Select recipient or create channel
- Type message (encrypted automatically)
- Pay message fee (~$0.001)
- Message is uploaded to IPFS and hash stored on-chain

#### 4. Upload Files
- Click "Upload File"
- Select file (max 100MB by default)
- Choose public or private
- Add optional tags
- Pay upload fee (~$0.002)

#### 5. Join Channels
- Browse public channels
- Request access to private channels
- Participate in group discussions

### For Developers

#### Smart Contract Interaction
```typescript
import { ethers } from 'ethers';
import { MessageRegistry__factory } from './typechain';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

const messageRegistry = MessageRegistry__factory.connect(
  contractAddress,
  signer
);

// Send a message
const ipfsHash = 'QmXyz...'; // Upload message to IPFS first
const fee = await messageRegistry.messageFee();
const tx = await messageRegistry.sendMessage(
  recipientAddress,
  ipfsHash,
  0, // replyToId
  { value: fee }
);
await tx.wait();
```

#### IPFS Upload
```typescript
import { uploadToIPFS } from './lib/ipfs';

const result = await uploadToIPFS('Hello, decentralized world!');
console.log(result.hash); // QmXyz...
console.log(result.url);  // https://ipfs.io/ipfs/QmXyz...
```

#### Encryption
```typescript
import { generateKeyPair, encryptMessage, decryptMessage } from './lib/encryption';

// Generate keys
const senderKeys = generateKeyPair();
const recipientKeys = generateKeyPair();

// Encrypt message
const encrypted = encryptMessage(
  'Secret message',
  recipientKeys.publicKey,
  senderKeys.secretKey
);

// Decrypt message
const decrypted = decryptMessage(
  encrypted,
  senderKeys.publicKey,
  recipientKeys.secretKey
);
```

## Cost Analysis

### One-Time Costs
- Profile creation: ~$0.001 (0.001 MATIC)

### Per-Action Costs (Polygon Mainnet)
- Send message: ~$0.001 (0.001 MATIC)
- Upload file: ~$0.002 (0.002 MATIC)
- Create channel: ~$0.0015 (0.0015 MATIC)
- Add channel member: ~$0.0008 (0.0008 MATIC)

*Costs are estimates based on current gas prices and may vary*

## Gas Optimization

The contracts include several gas optimization techniques:
- Packed structs for efficient storage
- Minimal on-chain data (only hashes)
- Efficient loops and mappings
- Event-driven architecture for indexing
- Batch operations where possible

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run coverage

# Run with gas reporting
REPORT_GAS=true npm test
```

## Security Auditing

### Recommended Checklist
- [ ] Third-party smart contract audit (Trail of Bits, OpenZeppelin, etc.)
- [ ] Formal verification of critical functions
- [ ] Bug bounty program
- [ ] Testnet deployment and community testing
- [ ] Frontend security audit
- [ ] IPFS gateway redundancy setup

### Known Limitations
- IPFS availability depends on pinning services or nodes
- Blockchain finality time (~5-10 seconds on Polygon)
- Frontend keys stored in browser (user must back up)
- Gas price volatility may affect costs

## Deployment Networks

### Supported Networks
- **Polygon Mainnet** (Recommended for production)
  - Chain ID: 137
  - Low fees, fast confirmation
  - High security and decentralization

- **Polygon Mumbai** (Testnet)
  - Chain ID: 80001
  - Free test MATIC from faucets

- **Localhost** (Development)
  - Chain ID: 31337
  - Hardhat local network

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

### Code Style
- Solidity: Follow [Solidity Style Guide](https://docs.soliditylang.org/en/latest/style-guide.html)
- TypeScript: ESLint + Prettier configuration included
- Run `npm run lint` before committing

## License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

## Roadmap

### Phase 1: MVP (Current)
- [x] Core smart contracts
- [x] IPFS integration
- [x] E2E encryption
- [x] Basic UI

### Phase 2: Enhancement
- [ ] Mobile app (React Native)
- [ ] Voice/video calling (WebRTC + IPFS)
- [ ] NFT profile pictures
- [ ] DAO governance

### Phase 3: Scale
- [ ] Layer 2 optimization
- [ ] Cross-chain messaging
- [ ] Decentralized indexing (The Graph)
- [ ] AI-powered moderation

### Phase 4: Ecosystem
- [ ] Plugin architecture
- [ ] Third-party integrations
- [ ] Developer SDK
- [ ] Grant program

## FAQ

**Q: How is this different from centralized chat apps?**
A: Your messages and files are stored on IPFS (decentralized) with hashes on blockchain. No company can read, delete, or censor your data.

**Q: What happens if IPFS goes down?**
A: IPFS is a distributed network. As long as at least one node pins your data, it's accessible. We recommend using multiple pinning services (Pinata, Web3.Storage, Filebase).

**Q: Can messages be deleted?**
A: No. Once on blockchain and IPFS, data is immutable. This is by design for censorship resistance.

**Q: How are keys managed?**
A: Encryption keys are derived from your wallet signature and stored encrypted in your browser. You should back them up securely.

**Q: What if I lose my keys?**
A: You cannot decrypt past messages. This is the tradeoff for true E2E encryption. Future: Social recovery mechanisms.

**Q: Is this truly decentralized?**
A: Yes. Smart contracts are on Polygon (decentralized). Data is on IPFS (decentralized). Frontend can be hosted on IPFS. No central server.

**Q: How do you prevent spam?**
A: Small per-message fee + rate limiting. Economic incentive prevents mass spam while keeping costs low for legitimate users.

## Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/blockchain-chatapp/issues)
- **Discord**: [Join our community](https://discord.gg/yourserver)
- **Email**: support@example.com

## Acknowledgments

- [OpenZeppelin](https://openzeppelin.com/) for secure contract libraries
- [IPFS](https://ipfs.io/) for distributed storage
- [Polygon](https://polygon.technology/) for scalable blockchain
- [RainbowKit](https://www.rainbowkit.com/) for wallet UX
- [TweetNaCl](https://github.com/dchest/tweetnacl-js) for encryption

## Warning

This software is provided as-is. Always do your own research and audit before using in production with real funds. Blockchain transactions are irreversible.

---

**Built with ❤️ for a decentralized future**
