// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title UserProfile
 * @dev Decentralized user identity and reputation system
 */
contract UserProfile is Ownable, ReentrancyGuard {

    struct Profile {
        string username;        // Unique username
        string displayName;     // Display name
        string avatarIPFS;      // IPFS hash of avatar image
        string bioIPFS;         // IPFS hash of encrypted bio
        uint256 createdAt;
        uint256 reputation;     // Reputation score
        bool isVerified;        // Verified status
        address[] trustedBy;    // Users who trust this profile
    }

    // State
    mapping(address => Profile) private profiles;
    mapping(string => address) private usernameToAddress;
    mapping(address => bool) public hasProfile;

    address[] private allUsers;

    // Reputation tracking
    mapping(address => mapping(address => bool)) public hasTrusted;
    mapping(address => mapping(address => int256)) public reputationGiven;

    // Registration fee (to prevent spam)
    uint256 public registrationFee = 0.001 ether;

    // Events
    event ProfileCreated(address indexed user, string username, uint256 timestamp);
    event ProfileUpdated(address indexed user);
    event UsernameChanged(address indexed user, string oldUsername, string newUsername);
    event ReputationGiven(address indexed from, address indexed to, int256 amount);
    event TrustAdded(address indexed from, address indexed to);
    event TrustRemoved(address indexed from, address indexed to);
    event Verified(address indexed user);

    modifier hasNoProfile() {
        require(!hasProfile[msg.sender], "Profile already exists");
        _;
    }

    modifier onlyWithProfile() {
        require(hasProfile[msg.sender], "No profile found");
        _;
    }

    modifier validUsername(string memory _username) {
        require(bytes(_username).length >= 3, "Username too short");
        require(bytes(_username).length <= 20, "Username too long");
        require(usernameToAddress[_username] == address(0), "Username taken");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Create a new user profile
     * @param _username Unique username (3-20 characters)
     * @param _displayName Display name
     * @param _avatarIPFS IPFS hash of avatar
     * @param _bioIPFS IPFS hash of bio
     */
    function createProfile(
        string memory _username,
        string memory _displayName,
        string memory _avatarIPFS,
        string memory _bioIPFS
    )
        external
        payable
        nonReentrant
        hasNoProfile
        validUsername(_username)
    {
        require(msg.value >= registrationFee, "Insufficient registration fee");
        require(bytes(_displayName).length > 0, "Display name required");

        Profile storage newProfile = profiles[msg.sender];
        newProfile.username = _username;
        newProfile.displayName = _displayName;
        newProfile.avatarIPFS = _avatarIPFS;
        newProfile.bioIPFS = _bioIPFS;
        newProfile.createdAt = block.timestamp;
        newProfile.reputation = 0;
        newProfile.isVerified = false;

        usernameToAddress[_username] = msg.sender;
        hasProfile[msg.sender] = true;
        allUsers.push(msg.sender);

        emit ProfileCreated(msg.sender, _username, block.timestamp);

        // Refund excess
        if (msg.value > registrationFee) {
            payable(msg.sender).transfer(msg.value - registrationFee);
        }
    }

    /**
     * @notice Update profile information
     */
    function updateProfile(
        string memory _displayName,
        string memory _avatarIPFS,
        string memory _bioIPFS
    )
        external
        onlyWithProfile
    {
        require(bytes(_displayName).length > 0, "Display name required");

        Profile storage profile = profiles[msg.sender];
        profile.displayName = _displayName;
        profile.avatarIPFS = _avatarIPFS;
        profile.bioIPFS = _bioIPFS;

        emit ProfileUpdated(msg.sender);
    }

    /**
     * @notice Change username (one-time operation to prevent abuse)
     */
    function changeUsername(string memory _newUsername)
        external
        onlyWithProfile
        validUsername(_newUsername)
    {
        string memory oldUsername = profiles[msg.sender].username;

        // Clear old username mapping
        delete usernameToAddress[oldUsername];

        // Set new username
        profiles[msg.sender].username = _newUsername;
        usernameToAddress[_newUsername] = msg.sender;

        emit UsernameChanged(msg.sender, oldUsername, _newUsername);
    }

    /**
     * @notice Give reputation to another user (+1 or -1)
     * @param _user Address to give reputation to
     * @param _amount Amount (1 or -1)
     */
    function giveReputation(address _user, int256 _amount)
        external
        onlyWithProfile
    {
        require(hasProfile[_user], "Target user has no profile");
        require(_user != msg.sender, "Cannot give reputation to yourself");
        require(_amount == 1 || _amount == -1, "Amount must be 1 or -1");

        // Remove previous reputation if exists
        int256 previousAmount = reputationGiven[msg.sender][_user];
        if (previousAmount != 0) {
            profiles[_user].reputation = uint256(int256(profiles[_user].reputation) - previousAmount);
        }

        // Add new reputation
        profiles[_user].reputation = uint256(int256(profiles[_user].reputation) + _amount);
        reputationGiven[msg.sender][_user] = _amount;

        emit ReputationGiven(msg.sender, _user, _amount);
    }

    /**
     * @notice Add a user to your trust list
     */
    function addTrust(address _user) external onlyWithProfile {
        require(hasProfile[_user], "Target user has no profile");
        require(_user != msg.sender, "Cannot trust yourself");
        require(!hasTrusted[msg.sender][_user], "Already trusted");

        hasTrusted[msg.sender][_user] = true;
        profiles[_user].trustedBy.push(msg.sender);

        emit TrustAdded(msg.sender, _user);
    }

    /**
     * @notice Remove a user from your trust list
     */
    function removeTrust(address _user) external onlyWithProfile {
        require(hasTrusted[msg.sender][_user], "Not trusted");

        hasTrusted[msg.sender][_user] = false;

        emit TrustRemoved(msg.sender, _user);
    }

    // View functions
    function getProfile(address _user) external view returns (
        string memory username,
        string memory displayName,
        string memory avatarIPFS,
        string memory bioIPFS,
        uint256 createdAt,
        uint256 reputation,
        bool isVerified,
        uint256 trustCount
    ) {
        require(hasProfile[_user], "Profile does not exist");

        Profile storage profile = profiles[_user];
        return (
            profile.username,
            profile.displayName,
            profile.avatarIPFS,
            profile.bioIPFS,
            profile.createdAt,
            profile.reputation,
            profile.isVerified,
            profile.trustedBy.length
        );
    }

    function getProfileByUsername(string memory _username) external view returns (address) {
        return usernameToAddress[_username];
    }

    function getTrustedBy(address _user) external view returns (address[] memory) {
        require(hasProfile[_user], "Profile does not exist");
        return profiles[_user].trustedBy;
    }

    function getTotalUsers() external view returns (uint256) {
        return allUsers.length;
    }

    function getAllUsers() external view returns (address[] memory) {
        return allUsers;
    }

    // Admin functions
    function verifyUser(address _user) external onlyOwner {
        require(hasProfile[_user], "Profile does not exist");
        profiles[_user].isVerified = true;
        emit Verified(_user);
    }

    function updateRegistrationFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 0.01 ether, "Fee too high");
        registrationFee = _newFee;
    }

    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        payable(owner()).transfer(balance);
    }

    receive() external payable {}
}
