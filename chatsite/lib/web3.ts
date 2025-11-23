/**
 * Web3 Configuration and Contract Interactions
 */

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, polygonMumbai, localhost } from 'wagmi/chains';
import { Contract, BrowserProvider } from 'ethers';

// Contract ABIs (simplified - import from artifacts in production)
export const MESSAGE_REGISTRY_ABI = [
  'function sendMessage(address recipient, string ipfsHash, uint256 replyToId) payable returns (uint256)',
  'function sendGroupMessage(bytes32 channelId, string ipfsHash, uint256 replyToId) payable returns (uint256)',
  'function createChannel(string name, bool isPrivate) returns (bytes32)',
  'function addChannelMember(bytes32 channelId, address member)',
  'function getMessage(uint256 messageId) view returns (tuple(address sender, address recipient, string ipfsHash, uint256 timestamp, bool isGroupMessage, bytes32 channelId, uint256 replyToId))',
  'function getUserSentMessages(address user) view returns (uint256[])',
  'function getUserReceivedMessages(address user) view returns (uint256[])',
  'function getChannelMessages(bytes32 channelId) view returns (uint256[])',
  'function messageFee() view returns (uint256)',
  'function getTotalMessages() view returns (uint256)',
  'event MessageSent(uint256 indexed messageId, address indexed sender, address indexed recipient, string ipfsHash, uint256 timestamp)',
  'event GroupMessageSent(uint256 indexed messageId, address indexed sender, bytes32 indexed channelId, string ipfsHash, uint256 timestamp)',
];

export const USER_PROFILE_ABI = [
  'function createProfile(string username, string displayName, string avatarIPFS, string bioIPFS) payable',
  'function updateProfile(string displayName, string avatarIPFS, string bioIPFS)',
  'function getProfile(address user) view returns (tuple(string username, string displayName, string avatarIPFS, string bioIPFS, uint256 createdAt, uint256 reputation, bool isVerified, uint256 trustCount))',
  'function hasProfile(address user) view returns (bool)',
  'function giveReputation(address user, int256 amount)',
  'function addTrust(address user)',
  'function registrationFee() view returns (uint256)',
  'event ProfileCreated(address indexed user, string username, uint256 timestamp)',
];

export const FILE_STORAGE_ABI = [
  'function uploadFile(string ipfsHash, string fileName, uint256 fileSize, string mimeType, bool isPublic, bytes32[] tags) payable returns (uint256)',
  'function shareFile(uint256 fileId, address recipient)',
  'function getFile(uint256 fileId) view returns (tuple(address uploader, string ipfsHash, string fileName, uint256 fileSize, string mimeType, uint256 uploadedAt, bool isPublic, bytes32[] tags))',
  'function getUserFiles(address user) view returns (uint256[])',
  'function hasAccess(uint256 fileId, address user) view returns (bool)',
  'function uploadFee() view returns (uint256)',
  'event FileUploaded(uint256 indexed fileId, address indexed uploader, string ipfsHash, string fileName, uint256 fileSize, bool isPublic)',
];

// Contract addresses (will be populated from deployment)
export const CONTRACTS = {
  MessageRegistry: process.env.NEXT_PUBLIC_MESSAGE_REGISTRY_ADDRESS || '',
  UserProfile: process.env.NEXT_PUBLIC_USER_PROFILE_ADDRESS || '',
  FileStorage: process.env.NEXT_PUBLIC_FILE_STORAGE_ADDRESS || '',
};

// Wagmi configuration
export const config = getDefaultConfig({
  appName: 'Blockchain ChatApp',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    polygon,
    polygonMumbai,
    ...(process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true' ? [localhost] : []),
  ],
  ssr: true,
});

/**
 * Get contract instance
 */
export function getContract(
  contractName: keyof typeof CONTRACTS,
  provider: BrowserProvider
): Contract {
  const address = CONTRACTS[contractName];
  if (!address) {
    throw new Error(`Contract ${contractName} address not configured`);
  }

  let abi: any[];
  switch (contractName) {
    case 'MessageRegistry':
      abi = MESSAGE_REGISTRY_ABI;
      break;
    case 'UserProfile':
      abi = USER_PROFILE_ABI;
      break;
    case 'FileStorage':
      abi = FILE_STORAGE_ABI;
      break;
    default:
      throw new Error(`Unknown contract: ${contractName}`);
  }

  return new Contract(address, abi, provider);
}

/**
 * Format blockchain error messages for users
 */
export function formatError(error: any): string {
  if (error.code === 'ACTION_REJECTED') {
    return 'Transaction was rejected';
  }

  if (error.message?.includes('insufficient funds')) {
    return 'Insufficient funds for transaction';
  }

  if (error.data?.message) {
    return error.data.message;
  }

  if (error.reason) {
    return error.reason;
  }

  return error.message || 'Transaction failed';
}

/**
 * Wait for transaction with timeout
 */
export async function waitForTransaction(
  tx: any,
  confirmations: number = 1,
  timeout: number = 60000
): Promise<any> {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Transaction timeout')), timeout)
  );

  const txPromise = tx.wait(confirmations);

  return Promise.race([txPromise, timeoutPromise]);
}
