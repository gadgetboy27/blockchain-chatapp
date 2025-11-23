/**
 * IPFS Integration Module
 * Handles file uploads to IPFS using Pinata or Web3.Storage
 */

import { create } from 'ipfs-http-client';

// Types
export interface IPFSUploadResult {
  hash: string;
  size: number;
  url: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  hash?: string;
}

/**
 * Upload data to IPFS via Pinata
 * @param data - Data to upload (string, Buffer, or File)
 * @param metadata - Optional metadata
 */
export async function uploadToPinata(
  data: string | Buffer | Blob,
  metadata?: Record<string, any>
): Promise<IPFSUploadResult> {
  const PINATA_API_KEY = process.env.NEXT_PUBLIC_PINATA_API_KEY;
  const PINATA_SECRET_KEY = process.env.NEXT_PUBLIC_PINATA_SECRET_KEY;

  if (!PINATA_API_KEY || !PINATA_SECRET_KEY) {
    throw new Error('Pinata API credentials not configured');
  }

  const formData = new FormData();

  if (data instanceof Blob) {
    formData.append('file', data);
  } else if (typeof data === 'string') {
    const blob = new Blob([data], { type: 'text/plain' });
    formData.append('file', blob);
  } else {
    const blob = new Blob([data]);
    formData.append('file', blob);
  }

  if (metadata) {
    formData.append('pinataMetadata', JSON.stringify(metadata));
  }

  const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_SECRET_KEY,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${response.statusText}`);
  }

  const result = await response.json();

  return {
    hash: result.IpfsHash,
    size: result.PinSize,
    url: `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`,
  };
}

/**
 * Upload to Web3.Storage (alternative to Pinata)
 */
export async function uploadToWeb3Storage(
  data: string | Buffer | Blob,
  filename: string = 'upload'
): Promise<IPFSUploadResult> {
  const WEB3_STORAGE_TOKEN = process.env.NEXT_PUBLIC_WEB3_STORAGE_TOKEN;

  if (!WEB3_STORAGE_TOKEN) {
    throw new Error('Web3.Storage token not configured');
  }

  const { Web3Storage, File } = await import('web3.storage');
  const client = new Web3Storage({ token: WEB3_STORAGE_TOKEN });

  let file: File;
  if (data instanceof Blob) {
    file = new File([data], filename);
  } else if (typeof data === 'string') {
    file = new File([data], filename, { type: 'text/plain' });
  } else {
    file = new File([data], filename);
  }

  const cid = await client.put([file], {
    wrapWithDirectory: false,
  });

  return {
    hash: cid,
    size: file.size,
    url: `https://${cid}.ipfs.w3s.link/${filename}`,
  };
}

/**
 * Upload using local IPFS node (for development)
 */
export async function uploadToLocalIPFS(
  data: string | Buffer
): Promise<IPFSUploadResult> {
  const ipfs = create({
    host: 'localhost',
    port: 5001,
    protocol: 'http',
  });

  const result = await ipfs.add(data);

  return {
    hash: result.path,
    size: result.size,
    url: `http://localhost:8080/ipfs/${result.path}`,
  };
}

/**
 * Main upload function - tries multiple gateways
 */
export async function uploadToIPFS(
  data: string | Buffer | Blob,
  options?: {
    filename?: string;
    metadata?: Record<string, any>;
    preferredGateway?: 'pinata' | 'web3storage' | 'local';
  }
): Promise<IPFSUploadResult> {
  const { filename = 'upload', metadata, preferredGateway = 'pinata' } = options || {};

  try {
    switch (preferredGateway) {
      case 'pinata':
        return await uploadToPinata(data, metadata);
      case 'web3storage':
        return await uploadToWeb3Storage(data, filename);
      case 'local':
        if (typeof data === 'string' || Buffer.isBuffer(data)) {
          return await uploadToLocalIPFS(data);
        }
        throw new Error('Local IPFS only supports string or Buffer');
      default:
        throw new Error('Invalid gateway');
    }
  } catch (error) {
    console.error(`Failed to upload to ${preferredGateway}:`, error);

    // Fallback to other gateways
    if (preferredGateway !== 'pinata') {
      try {
        return await uploadToPinata(data, metadata);
      } catch (fallbackError) {
        console.error('Pinata fallback failed:', fallbackError);
      }
    }

    throw error;
  }
}

/**
 * Fetch data from IPFS
 */
export async function fetchFromIPFS(hash: string): Promise<string> {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${hash}`,
    `https://ipfs.io/ipfs/${hash}`,
    `https://cloudflare-ipfs.com/ipfs/${hash}`,
  ];

  for (const gateway of gateways) {
    try {
      const response = await fetch(gateway, {
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.warn(`Failed to fetch from ${gateway}:`, error);
    }
  }

  throw new Error(`Failed to fetch ${hash} from all IPFS gateways`);
}

/**
 * Upload encrypted message to IPFS
 */
export async function uploadEncryptedMessage(
  encryptedMessage: string,
  metadata?: {
    sender: string;
    recipient: string;
    timestamp: number;
  }
): Promise<IPFSUploadResult> {
  const messageData = {
    encrypted: encryptedMessage,
    metadata,
    version: '1.0',
  };

  return uploadToIPFS(JSON.stringify(messageData), {
    metadata: {
      name: 'encrypted-message',
      keyvalues: metadata,
    },
  });
}

/**
 * Upload file with progress tracking
 */
export async function uploadFileWithProgress(
  file: File,
  onProgress?: (percentage: number) => void
): Promise<IPFSUploadResult> {
  // For large files, you might want to chunk and track progress
  // This is a simplified version
  if (onProgress) {
    onProgress(0);
  }

  const result = await uploadToIPFS(file, {
    filename: file.name,
    metadata: {
      name: file.name,
      type: file.type,
      size: file.size,
    },
  });

  if (onProgress) {
    onProgress(100);
  }

  return result;
}

/**
 * Validate IPFS hash format
 */
export function isValidIPFSHash(hash: string): boolean {
  // CIDv0: starts with Qm, 46 characters
  // CIDv1: starts with b, longer
  const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  const cidv1Regex = /^b[a-z2-7]{58,}$/;

  return cidv0Regex.test(hash) || cidv1Regex.test(hash);
}

/**
 * Get IPFS gateway URL
 */
export function getIPFSUrl(hash: string, gateway: string = 'pinata'): string {
  if (!isValidIPFSHash(hash)) {
    throw new Error('Invalid IPFS hash');
  }

  switch (gateway) {
    case 'pinata':
      return `https://gateway.pinata.cloud/ipfs/${hash}`;
    case 'ipfs':
      return `https://ipfs.io/ipfs/${hash}`;
    case 'cloudflare':
      return `https://cloudflare-ipfs.com/ipfs/${hash}`;
    default:
      return `https://ipfs.io/ipfs/${hash}`;
  }
}
