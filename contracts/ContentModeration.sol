// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ContentModeration
 * @dev Decentralized community-based content moderation
 * @notice Data stays immutable on IPFS, but community can flag harmful content
 * Users control their own moderation preferences (client-side filtering)
 */
contract ContentModeration is Ownable, ReentrancyGuard {

    enum FlagReason {
        SPAM,
        HARASSMENT,
        HATE_SPEECH,
        VIOLENCE,
        ILLEGAL_CONTENT,
        MISINFORMATION,
        SEXUAL_CONTENT,
        SELF_HARM,
        OTHER
    }

    enum FlagStatus {
        PENDING,
        UPHELD,
        REJECTED,
        APPEALED
    }

    struct Flag {
        uint256 contentId;      // Message or file ID
        address flagger;
        FlagReason reason;
        string evidence;        // IPFS hash with evidence/explanation
        uint256 timestamp;
        FlagStatus status;
        uint256 supportCount;   // Number of users who agree
        uint256 rejectCount;    // Number who disagree
    }

    struct ModerationPolicy {
        bool enableCommunityModeration;
        uint256 minReputationToFlag;
        uint256 flagThreshold;      // Flags needed to hide content
        uint256 appealThreshold;    // Support needed for appeal
        bytes32[] bannedContentHashes; // Known illegal content (IPFS hashes)
    }

    struct Appeal {
        uint256 flagId;
        address appellant;
        string justification;   // IPFS hash
        uint256 supportCount;
        uint256 timestamp;
        bool resolved;
    }

    // State
    Flag[] public flags;
    Appeal[] public appeals;
    ModerationPolicy public policy;

    mapping(uint256 => uint256[]) public contentFlags;  // contentId => flag IDs
    mapping(uint256 => mapping(address => bool)) public hasVoted; // flagId => voter => voted
    mapping(address => uint256) public moderatorReputation;
    mapping(bytes32 => bool) public isBannedContent; // IPFS hash => banned
    mapping(address => bool) public isTrustedModerator;

    // User preferences (stored on-chain for portability)
    mapping(address => UserModerationPreferences) public userPreferences;

    struct UserModerationPreferences {
        uint256 sensitivityLevel;   // 0 = see everything, 10 = maximum filtering
        bool hideSpam;
        bool hideHarassment;
        bool hideHateSpeech;
        bool hideViolence;
        bool hideIllegalContent;    // Always true (hard-coded client-side)
        bool hideSexualContent;
        bool trustCommunityFlags;   // Follow community moderation decisions
        address[] trustedModerators; // Only show content flagged by these users
        address[] blockedUsers;     // Never show content from these users
    }

    // Events
    event ContentFlagged(
        uint256 indexed flagId,
        uint256 indexed contentId,
        address indexed flagger,
        FlagReason reason
    );

    event FlagVoted(
        uint256 indexed flagId,
        address indexed voter,
        bool support
    );

    event FlagStatusChanged(
        uint256 indexed flagId,
        FlagStatus newStatus
    );

    event AppealCreated(
        uint256 indexed appealId,
        uint256 indexed flagId,
        address indexed appellant
    );

    event ContentBanned(bytes32 indexed contentHash, string reason);
    event ModeratorTrusted(address indexed moderator);
    event ModeratorUntrusted(address indexed moderator);

    constructor() Ownable(msg.sender) {
        // Initialize default policy
        policy.enableCommunityModeration = true;
        policy.minReputationToFlag = 10; // Need some reputation to flag
        policy.flagThreshold = 10;       // 10 flags to hide content
        policy.appealThreshold = 20;     // 20 supporters to overturn
    }

    /**
     * @notice Flag content for moderation review
     * @param _contentId ID of message or file
     * @param _reason Category of violation
     * @param _evidence IPFS hash with screenshots/explanation
     */
    function flagContent(
        uint256 _contentId,
        FlagReason _reason,
        string memory _evidence
    ) external returns (uint256) {
        require(
            moderatorReputation[msg.sender] >= policy.minReputationToFlag,
            "Insufficient reputation to flag"
        );
        require(bytes(_evidence).length > 0, "Evidence required");

        Flag memory newFlag = Flag({
            contentId: _contentId,
            flagger: msg.sender,
            reason: _reason,
            evidence: _evidence,
            timestamp: block.timestamp,
            status: FlagStatus.PENDING,
            supportCount: 1, // Flagger automatically supports
            rejectCount: 0
        });

        flags.push(newFlag);
        uint256 flagId = flags.length - 1;

        contentFlags[_contentId].push(flagId);
        hasVoted[flagId][msg.sender] = true;

        emit ContentFlagged(flagId, _contentId, msg.sender, _reason);

        // Auto-update status if threshold reached
        _checkFlagThreshold(flagId);

        return flagId;
    }

    /**
     * @notice Vote on a flag (support or reject)
     * @param _flagId ID of the flag
     * @param _support True to support, false to reject
     */
    function voteOnFlag(uint256 _flagId, bool _support) external {
        require(_flagId < flags.length, "Invalid flag ID");
        require(!hasVoted[_flagId][msg.sender], "Already voted");
        require(flags[_flagId].status == FlagStatus.PENDING, "Flag not pending");

        hasVoted[_flagId][msg.sender] = true;

        if (_support) {
            flags[_flagId].supportCount++;
        } else {
            flags[_flagId].rejectCount++;
        }

        // Increase moderator reputation for participation
        moderatorReputation[msg.sender]++;

        emit FlagVoted(_flagId, msg.sender, _support);

        _checkFlagThreshold(_flagId);
    }

    /**
     * @notice Appeal a flag decision
     * @param _flagId ID of the flag to appeal
     * @param _justification IPFS hash with appeal reasoning
     */
    function appealFlag(
        uint256 _flagId,
        string memory _justification
    ) external returns (uint256) {
        require(_flagId < flags.length, "Invalid flag ID");
        require(flags[_flagId].status == FlagStatus.UPHELD, "Can only appeal upheld flags");
        require(bytes(_justification).length > 0, "Justification required");

        Appeal memory newAppeal = Appeal({
            flagId: _flagId,
            appellant: msg.sender,
            justification: _justification,
            supportCount: 0,
            timestamp: block.timestamp,
            resolved: false
        });

        appeals.push(newAppeal);
        uint256 appealId = appeals.length - 1;

        flags[_flagId].status = FlagStatus.APPEALED;

        emit AppealCreated(appealId, _flagId, msg.sender);
        emit FlagStatusChanged(_flagId, FlagStatus.APPEALED);

        return appealId;
    }

    /**
     * @notice Support an appeal
     * @param _appealId ID of the appeal
     */
    function supportAppeal(uint256 _appealId) external {
        require(_appealId < appeals.length, "Invalid appeal ID");
        require(!appeals[_appealId].resolved, "Appeal already resolved");

        appeals[_appealId].supportCount++;

        // If threshold reached, overturn the flag
        if (appeals[_appealId].supportCount >= policy.appealThreshold) {
            uint256 flagId = appeals[_appealId].flagId;
            flags[flagId].status = FlagStatus.REJECTED;
            appeals[_appealId].resolved = true;

            emit FlagStatusChanged(flagId, FlagStatus.REJECTED);
        }
    }

    /**
     * @notice Set user moderation preferences
     * @param _preferences User's moderation settings
     */
    function setModerationPreferences(
        UserModerationPreferences memory _preferences
    ) external {
        require(_preferences.sensitivityLevel <= 10, "Invalid sensitivity level");

        // Always enforce illegal content filtering (safety override)
        _preferences.hideIllegalContent = true;

        userPreferences[msg.sender] = _preferences;
    }

    /**
     * @notice Block a user (personal blocklist)
     * @param _user Address to block
     */
    function blockUser(address _user) external {
        require(_user != msg.sender, "Cannot block yourself");

        userPreferences[msg.sender].blockedUsers.push(_user);
    }

    /**
     * @notice Get flags for specific content
     * @param _contentId ID of content
     */
    function getContentFlags(uint256 _contentId) external view returns (uint256[] memory) {
        return contentFlags[_contentId];
    }

    /**
     * @notice Check if content should be hidden based on flags
     * @param _contentId ID of content
     */
    function isContentFlagged(uint256 _contentId) external view returns (bool, uint256) {
        uint256[] memory flagIds = contentFlags[_contentId];
        uint256 upheldCount = 0;

        for (uint256 i = 0; i < flagIds.length; i++) {
            if (flags[flagIds[i]].status == FlagStatus.UPHELD) {
                upheldCount++;
            }
        }

        return (upheldCount >= policy.flagThreshold, upheldCount);
    }

    /**
     * @notice Get user's moderation preferences
     */
    function getUserPreferences(address _user)
        external
        view
        returns (UserModerationPreferences memory)
    {
        return userPreferences[_user];
    }

    // Admin functions - Only for extreme cases (illegal content)

    /**
     * @notice Ban content by IPFS hash (for known illegal content)
     * @dev This is for CSAM, terrorism recruitment, etc. - clear illegal content
     * @param _ipfsHash IPFS hash to ban
     * @param _reason Explanation (stored in events)
     */
    function banContent(bytes32 _ipfsHash, string memory _reason) external onlyOwner {
        isBannedContent[_ipfsHash] = true;
        policy.bannedContentHashes.push(_ipfsHash);

        emit ContentBanned(_ipfsHash, _reason);
    }

    /**
     * @notice Designate trusted moderator (for bootstrapping)
     * @param _moderator Address to trust
     */
    function trustModerator(address _moderator) external onlyOwner {
        isTrustedModerator[_moderator] = true;
        moderatorReputation[_moderator] += 100; // Boost reputation

        emit ModeratorTrusted(_moderator);
    }

    /**
     * @notice Update moderation policy
     */
    function updatePolicy(
        uint256 _minReputation,
        uint256 _flagThreshold,
        uint256 _appealThreshold
    ) external onlyOwner {
        require(_flagThreshold > 0, "Invalid threshold");
        require(_appealThreshold > 0, "Invalid threshold");

        policy.minReputationToFlag = _minReputation;
        policy.flagThreshold = _flagThreshold;
        policy.appealThreshold = _appealThreshold;
    }

    /**
     * @notice Check if content hash is banned
     */
    function isContentBanned(bytes32 _ipfsHash) external view returns (bool) {
        return isBannedContent[_ipfsHash];
    }

    /**
     * @notice Get all banned content hashes
     */
    function getBannedContentHashes() external view returns (bytes32[] memory) {
        return policy.bannedContentHashes;
    }

    /**
     * @notice Internal function to check if flag threshold reached
     */
    function _checkFlagThreshold(uint256 _flagId) internal {
        Flag storage flag = flags[_flagId];

        if (flag.supportCount >= policy.flagThreshold && flag.status == FlagStatus.PENDING) {
            flag.status = FlagStatus.UPHELD;

            // Reward flagger with reputation
            moderatorReputation[flag.flagger] += 10;

            emit FlagStatusChanged(_flagId, FlagStatus.UPHELD);
        } else if (flag.rejectCount >= policy.flagThreshold && flag.status == FlagStatus.PENDING) {
            flag.status = FlagStatus.REJECTED;

            // Penalize false flagger
            if (moderatorReputation[flag.flagger] >= 5) {
                moderatorReputation[flag.flagger] -= 5;
            }

            emit FlagStatusChanged(_flagId, FlagStatus.REJECTED);
        }
    }
}
