# Content Moderation System

## Overview

This platform implements a **multi-layered, decentralized moderation system** that balances free speech with user safety. Unlike centralized platforms that can delete content, our approach gives users control over what they see while preserving the immutability of the blockchain.

## The Challenge

**Blockchain Paradox**: Data on blockchain and IPFS is immutable (cannot be deleted), but we still need to protect users from harmful content.

**Our Solution**: **Client-side filtering + community moderation + user choice**

## How It Works

### Layer 1: AI Content Analysis (Client-Side)

Every message is analyzed **before being displayed** using machine learning:

```typescript
const safetyScore = await analyzeContent(messageText);

if (safetyScore.shouldHide) {
  // Show warning instead of content
  // User can click "Show Anyway" if desired
}
```

**What AI Detects:**
- ✅ Spam (repeated characters, excessive caps, scam phrases)
- ✅ Harassment (threats, aggressive language, personal attacks)
- ✅ Hate speech (slurs, dehumanizing language, extremism)
- ✅ Violence (graphic descriptions, weapon references)
- ✅ Sexual content (explicit material, solicitation)
- ✅ Self-harm content (suicidal ideation, self-injury)
- ✅ Misinformation (conspiracy theories, unverified claims)

**Key Features:**
- **Runs locally** - AI analysis happens on your device
- **Optional API** - Can use OpenAI Moderation API for better accuracy
- **Privacy-preserving** - Your messages aren't sent to third parties
- **Transparent** - Safety scores visible to users (dev mode)

### Layer 2: Community Moderation (On-Chain)

Users can flag harmful content, and the community votes on whether flags are valid:

```solidity
function flagContent(
  uint256 contentId,
  FlagReason reason,
  string evidence
) external returns (uint256 flagId);
```

**Flagging Process:**
1. **User flags content** with evidence (screenshot, explanation)
2. **Community votes** on whether flag is legitimate
3. **Threshold reached?** Content is marked as "flagged"
4. **Appeals allowed** - Flagged users can appeal to community

**Flag Categories:**
- Spam
- Harassment
- Hate Speech
- Violence
- Illegal Content
- Misinformation
- Sexual Content
- Self-Harm

**Reputation System:**
- Good moderators gain reputation
- False flaggers lose reputation
- Minimum reputation required to flag (prevents spam)
- Trusted moderators have more weight

**Important**: Community flags don't delete content - they just mark it. Users decide if they want to hide flagged content.

### Layer 3: User Preferences (Personal Control)

Each user controls their own moderation level:

```typescript
enum ModerationLevel {
  OFF = 0,           // See everything
  LOW = 3,           // Only hide extreme content
  MEDIUM = 5,        // Balanced (recommended)
  HIGH = 7,          // Strict filtering
  MAXIMUM = 10       // Ultra-safe
}
```

**User Can:**
- ✅ Set global filtering level
- ✅ Block specific users
- ✅ Trust specific moderators
- ✅ Choose to hide community-flagged content
- ✅ Always see content behind warnings (optional)

**Preferences Stored On-Chain:**
- Portable across devices
- Verifiable and transparent
- You own your moderation settings

### Layer 4: Hard-Coded Rules (Illegal Content)

Some content is **universally illegal** and must be blocked:

**Illegal Categories:**
- 🚫 CSAM (Child Sexual Abuse Material)
- 🚫 Terrorism recruitment
- 🚫 Human trafficking
- 🚫 Illegal weapons sales
- 🚫 Assassination markets

**How This Works:**
1. **Hash Database**: Known illegal content hashes are maintained
2. **Perceptual Hashing**: New images checked against known illegal content (PhotoDNA, PDQ)
3. **Pre-upload Prevention**: Files checked BEFORE uploading to IPFS
4. **Frontend Enforcement**: Even if uploaded, frontend refuses to display

**Critical Difference:**
- Content may exist on IPFS (we can't delete it)
- But all frontends refuse to display it
- Hash is added to on-chain ban list
- Other developers using our contracts see ban list

```solidity
function banContent(bytes32 ipfsHash, string reason) external onlyOwner {
  isBannedContent[ipfsHash] = true;
  emit ContentBanned(ipfsHash, reason);
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     User's Device                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Message arrives (IPFS hash from blockchain)         │
│           ↓                                             │
│  2. Fetch from IPFS                                     │
│           ↓                                             │
│  3. Check banned list (instant block if illegal)        │
│           ↓                                             │
│  4. Decrypt message (if encrypted)                      │
│           ↓                                             │
│  5. AI Analysis (client-side ML)                        │
│           ↓                                             │
│  6. Check community flags (from blockchain)             │
│           ↓                                             │
│  7. Apply user preferences                              │
│           ↓                                             │
│  8. Display with appropriate warning/hiding             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## User Experience

### Scenario 1: Safe Content
```
User: "Hey, how's the weather?"
AI: ✅ Safe (score: 95/100)
Display: Shows immediately, no warning
```

### Scenario 2: Mildly Concerning
```
User: "This is AMAZING!!! BUY NOW!!!"
AI: ⚠️ Possible spam (score: 65/100)
Display: Shows with small warning banner
Action: User can flag as spam
```

### Scenario 3: Harmful Content
```
User: [hate speech]
AI: 🚫 Hate speech detected (score: 15/100)
Display: Hidden behind warning
Action: "Content Hidden: Contains hate speech. [Show Anyway]"
```

### Scenario 4: Illegal Content
```
User: [attempts to upload CSAM]
System: 🚫 BLOCKED at upload
Display: "This content is illegal and cannot be uploaded"
Action: Hash added to ban list, authorities notified (if required by law)
```

## Moderation Dashboard

Users and moderators get a dashboard showing:

```
┌──────────────────────────────────────┐
│  Moderation Dashboard                │
├──────────────────────────────────────┤
│  Your Reputation: 1,245 ⭐           │
│  Flags Submitted: 23                 │
│  Flags Upheld: 18 (78%)              │
│  Active Appeals: 2                   │
│                                       │
│  Recent Flags:                       │
│  • Message #12345 - Spam (Pending)   │
│  • Message #12340 - Harassment (✅)   │
│  • Message #12330 - Hate (Rejected)  │
│                                       │
│  [Submit Flag] [Review Flags]        │
└──────────────────────────────────────┘
```

## For Developers

### Integrating AI Moderation

```typescript
import { analyzeContent, ModerationLevel } from './lib/contentModeration';

// Analyze message before display
const safetyScore = await analyzeContent(
  messageText,
  ModerationLevel.MEDIUM
);

if (safetyScore.shouldHide) {
  return <ContentWarning score={safetyScore} />;
}

return <Message content={messageText} />;
```

### Using OpenAI Moderation API

```typescript
import { analyzeWithAI } from './lib/contentModeration';

const safetyScore = await analyzeWithAI(messageText);
// More accurate than local analysis
```

### Flagging Content

```typescript
import { ethers } from 'ethers';

const moderationContract = new ethers.Contract(
  MODERATION_ADDRESS,
  MODERATION_ABI,
  signer
);

const tx = await moderationContract.flagContent(
  messageId,
  FlagReason.HARASSMENT,
  evidenceIpfsHash
);

await tx.wait();
```

## Privacy Considerations

**What's Private:**
- ✅ Messages are E2E encrypted
- ✅ AI analysis runs locally
- ✅ Your moderation preferences are yours

**What's Public:**
- 🌐 Community flags are on-chain (transparency)
- 🌐 Banned content hashes are public (safety)
- 🌐 Your flag votes are attributed to you (reputation)

**Trade-off**: Transparency vs. Privacy
- Flags must be public for decentralized moderation
- But you can use pseudonymous addresses
- Your viewing preferences are private (client-side)

## Legal Compliance

### CSAM and Illegal Content

We comply with laws regarding illegal content:

1. **Proactive Prevention**: Hash checks before upload
2. **Reporting**: Integration with NCMEC, IWF, etc.
3. **Take-down**: While we can't delete from IPFS, we:
   - Block in all frontends
   - Add to on-chain ban list
   - Report to authorities
   - Work with IPFS pinning services to de-pin

### GDPR "Right to be Forgotten"

**The Challenge**: Blockchain is immutable

**Our Approach**:
1. Personal data not stored on-chain (only hashes)
2. Messages encrypted (key deletion = effective deletion)
3. IPFS data can be de-pinned (eventually disappears)
4. User can delete encryption keys locally

**Not Perfect**: True immutability conflicts with GDPR. Users must understand this before using.

## Governance

### Who Decides What's Banned?

**Illegal Content**: Multisig owner (5-of-9 trusted entities)
- Law enforcement cooperation
- Child protection organizations
- Tech companies
- Civil liberties groups
- Community representatives

**Flagged Content**: Community voting (decentralized)
- Anyone can flag
- Community votes on validity
- Appeals process available

**Future**: DAO governance
- Token holders vote on policies
- Fully decentralized decision-making

## Best Practices

### For Users

1. **Set Appropriate Level**: Start with Medium, adjust as needed
2. **Report Harmful Content**: Help protect the community
3. **Don't Abuse Flags**: False flags hurt your reputation
4. **Block Liberally**: Your blocklist is private and powerful
5. **Trust But Verify**: Even AI makes mistakes - use judgment

### For Developers

1. **Never Skip Checks**: Always check banned list
2. **Fail Secure**: If moderation fails, hide content
3. **Be Transparent**: Show users why content is hidden
4. **Respect Preferences**: Honor user's moderation level
5. **Update Hash List**: Regularly sync banned content hashes

### For Moderators

1. **Provide Evidence**: Always include context for flags
2. **Be Objective**: Personal disagreement ≠ violation
3. **Follow Guidelines**: Stick to defined categories
4. **Participate in Appeals**: Good moderators review both sides
5. **Build Reputation**: Consistent, fair moderation earns trust

## Comparison with Traditional Platforms

| Feature | Traditional Platform | Our Platform |
|---------|---------------------|--------------|
| **Who decides?** | Company employees | You + Community |
| **Can content be deleted?** | Yes, permanently | No (immutable) |
| **Transparency?** | Opaque algorithms | Open source, visible scores |
| **Appeals?** | Limited, slow | Community-driven, on-chain |
| **Censorship resistance?** | No | Yes |
| **Harmful content protection?** | Yes | Yes (via filtering) |
| **User control?** | Minimal | Maximum |

## Future Enhancements

### Phase 1 (Current)
- [x] Client-side AI analysis
- [x] Community flagging
- [x] User preferences
- [x] Banned content list

### Phase 2 (Planned)
- [ ] Advanced ML models (transformer-based)
- [ ] Real-time perceptual hashing
- [ ] DAO governance for bans
- [ ] Integration with content verification oracles
- [ ] Mobile-optimized moderation

### Phase 3 (Future)
- [ ] Federated moderation (trusted communities)
- [ ] Zero-knowledge proof of safety (prove content is safe without revealing it)
- [ ] Cross-chain moderation reputation
- [ ] AI-powered appeals system

## FAQ

**Q: Can someone post illegal content?**
A: They could upload to IPFS directly, but our frontend prevents it and won't display it. All frontends using our contracts see the ban list.

**Q: What if AI wrongly flags my content?**
A: You can appeal to the community. Good appeals with evidence will be upheld.

**Q: Can I turn off moderation entirely?**
A: Yes, set level to "OFF". But illegal content is always blocked (legal requirement).

**Q: Who pays for AI moderation?**
A: Client-side analysis is free (runs on your device). Optional APIs require user's API key.

**Q: Is my moderation history public?**
A: Your flag submissions are on-chain (for reputation). Your viewing preferences are private.

**Q: Can governments censor content?**
A: They can't delete from blockchain, but they could:
- Add to ban list (if they control multisig)
- Block IPFS gateways in their country
- Require frontends to filter in their jurisdiction

**Q: How is this different from Reddit/Twitter moderation?**
A:
- **Decentralized**: Community decides, not a company
- **Transparent**: All moderation decisions on-chain
- **Immutable**: Content can't be deleted, only filtered
- **User-controlled**: You choose your moderation level
- **Portable**: Your preferences follow you

## Support Resources

If you see harmful content about self-harm or other crises:

### Crisis Resources
- **988 Suicide & Crisis Lifeline**: Call/text 988
- **Crisis Text Line**: Text HOME to 741741
- **International**: https://www.iasp.info/resources/Crisis_Centres/

### Reporting Illegal Content
- **CSAM**: https://report.cybertip.org/ (NCMEC)
- **Terrorism**: https://www.fbi.gov/tips
- **Human Trafficking**: 1-888-373-7888

---

**Remember**: This system preserves both freedom and safety. You control what you see, the community protects each other, and no single entity can censor the truth.
