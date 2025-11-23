// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title FileStorage
 * @dev Immutable file storage with IPFS integration
 * @notice Files are stored on IPFS, metadata and hashes are on-chain
 */
contract FileStorage is Ownable, ReentrancyGuard, Pausable {

    struct File {
        address uploader;
        string ipfsHash;        // IPFS CID
        string fileName;        // Original file name (encrypted if sensitive)
        uint256 fileSize;       // Size in bytes
        string mimeType;        // File type
        uint256 uploadedAt;
        bool isPublic;          // Public or private (encrypted)
        bytes32[] tags;         // Searchable tags
        address[] sharedWith;   // Addresses with access (for private files)
    }

    // State
    File[] private files;
    mapping(address => uint256[]) private userFiles;
    mapping(bytes32 => uint256[]) private taggedFiles;
    mapping(string => bool) private ipfsHashExists; // Prevent duplicate uploads

    // Economics
    uint256 public uploadFee = 0.002 ether;
    uint256 public maxFileSize = 100 * 1024 * 1024; // 100 MB
    uint256 public maxFilesPerUser = 1000;

    // Events
    event FileUploaded(
        uint256 indexed fileId,
        address indexed uploader,
        string ipfsHash,
        string fileName,
        uint256 fileSize,
        bool isPublic
    );

    event FileShared(
        uint256 indexed fileId,
        address indexed from,
        address indexed to
    );

    event FileTagged(
        uint256 indexed fileId,
        bytes32 indexed tag
    );

    modifier validFile(
        string memory _ipfsHash,
        string memory _fileName,
        uint256 _fileSize
    ) {
        require(bytes(_ipfsHash).length > 0, "Invalid IPFS hash");
        require(bytes(_fileName).length > 0, "Invalid file name");
        require(_fileSize > 0, "Invalid file size");
        require(_fileSize <= maxFileSize, "File too large");
        require(!ipfsHashExists[_ipfsHash], "File already uploaded");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Upload a file to IPFS and register it on-chain
     * @param _ipfsHash IPFS CID of the uploaded file
     * @param _fileName Name of the file
     * @param _fileSize Size of the file in bytes
     * @param _mimeType MIME type of the file
     * @param _isPublic Whether the file is publicly accessible
     * @param _tags Optional tags for categorization
     */
    function uploadFile(
        string memory _ipfsHash,
        string memory _fileName,
        uint256 _fileSize,
        string memory _mimeType,
        bool _isPublic,
        bytes32[] memory _tags
    )
        external
        payable
        nonReentrant
        whenNotPaused
        validFile(_ipfsHash, _fileName, _fileSize)
        returns (uint256)
    {
        require(msg.value >= uploadFee, "Insufficient fee");
        require(userFiles[msg.sender].length < maxFilesPerUser, "User file limit reached");
        require(_tags.length <= 10, "Too many tags");

        File storage newFile = files.push();
        newFile.uploader = msg.sender;
        newFile.ipfsHash = _ipfsHash;
        newFile.fileName = _fileName;
        newFile.fileSize = _fileSize;
        newFile.mimeType = _mimeType;
        newFile.uploadedAt = block.timestamp;
        newFile.isPublic = _isPublic;
        newFile.tags = _tags;

        uint256 fileId = files.length - 1;

        userFiles[msg.sender].push(fileId);
        ipfsHashExists[_ipfsHash] = true;

        // Index by tags
        for (uint256 i = 0; i < _tags.length; i++) {
            taggedFiles[_tags[i]].push(fileId);
            emit FileTagged(fileId, _tags[i]);
        }

        emit FileUploaded(fileId, msg.sender, _ipfsHash, _fileName, _fileSize, _isPublic);

        // Refund excess
        if (msg.value > uploadFee) {
            payable(msg.sender).transfer(msg.value - uploadFee);
        }

        return fileId;
    }

    /**
     * @notice Share a private file with another user
     * @param _fileId ID of the file to share
     * @param _recipient Address to share with
     */
    function shareFile(uint256 _fileId, address _recipient)
        external
        whenNotPaused
    {
        require(_fileId < files.length, "File does not exist");
        require(files[_fileId].uploader == msg.sender, "Not file owner");
        require(!files[_fileId].isPublic, "File is already public");
        require(_recipient != address(0), "Invalid recipient");
        require(_recipient != msg.sender, "Cannot share with yourself");

        // Check if already shared
        for (uint256 i = 0; i < files[_fileId].sharedWith.length; i++) {
            require(files[_fileId].sharedWith[i] != _recipient, "Already shared");
        }

        files[_fileId].sharedWith.push(_recipient);

        emit FileShared(_fileId, msg.sender, _recipient);
    }

    /**
     * @notice Check if a user has access to a file
     * @param _fileId ID of the file
     * @param _user Address to check
     */
    function hasAccess(uint256 _fileId, address _user) public view returns (bool) {
        require(_fileId < files.length, "File does not exist");

        File storage file = files[_fileId];

        // Owner always has access
        if (file.uploader == _user) {
            return true;
        }

        // Public files are accessible to all
        if (file.isPublic) {
            return true;
        }

        // Check shared list
        for (uint256 i = 0; i < file.sharedWith.length; i++) {
            if (file.sharedWith[i] == _user) {
                return true;
            }
        }

        return false;
    }

    // View functions
    function getFile(uint256 _fileId) external view returns (
        address uploader,
        string memory ipfsHash,
        string memory fileName,
        uint256 fileSize,
        string memory mimeType,
        uint256 uploadedAt,
        bool isPublic,
        bytes32[] memory tags
    ) {
        require(_fileId < files.length, "File does not exist");
        require(hasAccess(_fileId, msg.sender), "Access denied");

        File storage file = files[_fileId];
        return (
            file.uploader,
            file.ipfsHash,
            file.fileName,
            file.fileSize,
            file.mimeType,
            file.uploadedAt,
            file.isPublic,
            file.tags
        );
    }

    function getUserFiles(address _user) external view returns (uint256[] memory) {
        return userFiles[_user];
    }

    function getFilesByTag(bytes32 _tag) external view returns (uint256[] memory) {
        return taggedFiles[_tag];
    }

    function getTotalFiles() external view returns (uint256) {
        return files.length;
    }

    function getSharedWith(uint256 _fileId) external view returns (address[] memory) {
        require(_fileId < files.length, "File does not exist");
        require(files[_fileId].uploader == msg.sender, "Not file owner");
        return files[_fileId].sharedWith;
    }

    // Admin functions
    function updateUploadFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 0.1 ether, "Fee too high");
        uploadFee = _newFee;
    }

    function updateMaxFileSize(uint256 _newSize) external onlyOwner {
        require(_newSize >= 1024 * 1024, "Size too small"); // Min 1 MB
        require(_newSize <= 500 * 1024 * 1024, "Size too large"); // Max 500 MB
        maxFileSize = _newSize;
    }

    function updateMaxFilesPerUser(uint256 _newLimit) external onlyOwner {
        require(_newLimit >= 100, "Limit too low");
        maxFilesPerUser = _newLimit;
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
    }

    receive() external payable {}
}
