// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title MessageRegistry
 * @dev Stores immutable message metadata with IPFS hashes
 * @notice Messages are encrypted off-chain and stored on IPFS, only hashes are on-chain
 */
contract MessageRegistry is Ownable, ReentrancyGuard, Pausable {

    struct Message {
        address sender;
        address recipient;
        string ipfsHash;        // IPFS CID of encrypted message
        uint256 timestamp;
        bool isGroupMessage;
        bytes32 channelId;      // For group chats
        uint256 replyToId;      // For threading (0 if not a reply)
    }

    struct Channel {
        string name;
        address creator;
        uint256 createdAt;
        bool isPrivate;
        mapping(address => bool) members;
        address[] memberList;
    }

    // State variables
    Message[] private messages;
    mapping(bytes32 => Channel) public channels;
    mapping(address => uint256[]) private userSentMessages;
    mapping(address => uint256[]) private userReceivedMessages;
    mapping(bytes32 => uint256[]) private channelMessages;

    // Anti-spam and economics
    uint256 public messageFee = 0.001 ether; // Small fee to prevent spam
    uint256 public minTimeBetweenMessages = 1; // seconds
    mapping(address => uint256) private lastMessageTime;

    // Events
    event MessageSent(
        uint256 indexed messageId,
        address indexed sender,
        address indexed recipient,
        string ipfsHash,
        uint256 timestamp
    );

    event GroupMessageSent(
        uint256 indexed messageId,
        address indexed sender,
        bytes32 indexed channelId,
        string ipfsHash,
        uint256 timestamp
    );

    event ChannelCreated(
        bytes32 indexed channelId,
        string name,
        address indexed creator,
        bool isPrivate
    );

    event MemberAdded(bytes32 indexed channelId, address indexed member);
    event MemberRemoved(bytes32 indexed channelId, address indexed member);
    event FeeUpdated(uint256 newFee);
    event FundsWithdrawn(address indexed owner, uint256 amount);

    // Modifiers
    modifier rateLimited() {
        require(
            block.timestamp >= lastMessageTime[msg.sender] + minTimeBetweenMessages,
            "Rate limit exceeded"
        );
        lastMessageTime[msg.sender] = block.timestamp;
        _;
    }

    modifier validIPFSHash(string memory _ipfsHash) {
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        require(bytes(_ipfsHash).length <= 100, "IPFS hash too long");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Send a direct message to another user
     * @param _recipient Address of the message recipient
     * @param _ipfsHash IPFS CID of the encrypted message content
     * @param _replyToId ID of message being replied to (0 if not a reply)
     */
    function sendMessage(
        address _recipient,
        string memory _ipfsHash,
        uint256 _replyToId
    )
        external
        payable
        nonReentrant
        whenNotPaused
        rateLimited
        validIPFSHash(_ipfsHash)
        returns (uint256)
    {
        require(_recipient != address(0), "Invalid recipient");
        require(_recipient != msg.sender, "Cannot message yourself");
        require(msg.value >= messageFee, "Insufficient fee");

        // Validate reply reference
        if (_replyToId > 0) {
            require(_replyToId < messages.length, "Invalid reply reference");
        }

        Message memory newMessage = Message({
            sender: msg.sender,
            recipient: _recipient,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            isGroupMessage: false,
            channelId: bytes32(0),
            replyToId: _replyToId
        });

        messages.push(newMessage);
        uint256 messageId = messages.length - 1;

        userSentMessages[msg.sender].push(messageId);
        userReceivedMessages[_recipient].push(messageId);

        emit MessageSent(messageId, msg.sender, _recipient, _ipfsHash, block.timestamp);

        // Refund excess payment
        if (msg.value > messageFee) {
            payable(msg.sender).transfer(msg.value - messageFee);
        }

        return messageId;
    }

    /**
     * @notice Send a message to a channel/group
     * @param _channelId ID of the channel
     * @param _ipfsHash IPFS CID of the encrypted message
     * @param _replyToId ID of message being replied to (0 if not a reply)
     */
    function sendGroupMessage(
        bytes32 _channelId,
        string memory _ipfsHash,
        uint256 _replyToId
    )
        external
        payable
        nonReentrant
        whenNotPaused
        rateLimited
        validIPFSHash(_ipfsHash)
        returns (uint256)
    {
        require(channels[_channelId].createdAt > 0, "Channel does not exist");
        require(
            channels[_channelId].members[msg.sender] || !channels[_channelId].isPrivate,
            "Not a channel member"
        );
        require(msg.value >= messageFee, "Insufficient fee");

        Message memory newMessage = Message({
            sender: msg.sender,
            recipient: address(0),
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            isGroupMessage: true,
            channelId: _channelId,
            replyToId: _replyToId
        });

        messages.push(newMessage);
        uint256 messageId = messages.length - 1;

        userSentMessages[msg.sender].push(messageId);
        channelMessages[_channelId].push(messageId);

        emit GroupMessageSent(messageId, msg.sender, _channelId, _ipfsHash, block.timestamp);

        if (msg.value > messageFee) {
            payable(msg.sender).transfer(msg.value - messageFee);
        }

        return messageId;
    }

    /**
     * @notice Create a new channel/group
     * @param _name Channel name
     * @param _isPrivate Whether the channel requires membership
     */
    function createChannel(string memory _name, bool _isPrivate)
        external
        returns (bytes32)
    {
        require(bytes(_name).length > 0 && bytes(_name).length <= 50, "Invalid channel name");

        bytes32 channelId = keccak256(abi.encodePacked(_name, msg.sender, block.timestamp));
        require(channels[channelId].createdAt == 0, "Channel ID collision");

        Channel storage newChannel = channels[channelId];
        newChannel.name = _name;
        newChannel.creator = msg.sender;
        newChannel.createdAt = block.timestamp;
        newChannel.isPrivate = _isPrivate;
        newChannel.members[msg.sender] = true;
        newChannel.memberList.push(msg.sender);

        emit ChannelCreated(channelId, _name, msg.sender, _isPrivate);

        return channelId;
    }

    /**
     * @notice Add a member to a private channel
     * @param _channelId ID of the channel
     * @param _member Address to add
     */
    function addChannelMember(bytes32 _channelId, address _member) external {
        require(channels[_channelId].creator == msg.sender, "Only creator can add members");
        require(!channels[_channelId].members[_member], "Already a member");

        channels[_channelId].members[_member] = true;
        channels[_channelId].memberList.push(_member);

        emit MemberAdded(_channelId, _member);
    }

    /**
     * @notice Remove a member from a channel
     * @param _channelId ID of the channel
     * @param _member Address to remove
     */
    function removeChannelMember(bytes32 _channelId, address _member) external {
        require(channels[_channelId].creator == msg.sender, "Only creator can remove members");
        require(channels[_channelId].members[_member], "Not a member");
        require(_member != msg.sender, "Cannot remove yourself");

        channels[_channelId].members[_member] = false;

        emit MemberRemoved(_channelId, _member);
    }

    // View functions
    function getMessage(uint256 _messageId) external view returns (Message memory) {
        require(_messageId < messages.length, "Message does not exist");
        return messages[_messageId];
    }

    function getUserSentMessages(address _user) external view returns (uint256[] memory) {
        return userSentMessages[_user];
    }

    function getUserReceivedMessages(address _user) external view returns (uint256[] memory) {
        return userReceivedMessages[_user];
    }

    function getChannelMessages(bytes32 _channelId) external view returns (uint256[] memory) {
        return channelMessages[_channelId];
    }

    function getChannelMembers(bytes32 _channelId) external view returns (address[] memory) {
        return channels[_channelId].memberList;
    }

    function isChannelMember(bytes32 _channelId, address _user) external view returns (bool) {
        return channels[_channelId].members[_user];
    }

    function getTotalMessages() external view returns (uint256) {
        return messages.length;
    }

    // Admin functions
    function updateMessageFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 0.01 ether, "Fee too high");
        messageFee = _newFee;
        emit FeeUpdated(_newFee);
    }

    function updateRateLimit(uint256 _seconds) external onlyOwner {
        require(_seconds <= 60, "Rate limit too long");
        minTimeBetweenMessages = _seconds;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");

        payable(owner()).transfer(balance);
        emit FundsWithdrawn(owner(), balance);
    }

    // Emergency function to recover stuck funds
    receive() external payable {}
}
