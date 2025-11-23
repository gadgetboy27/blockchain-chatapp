/**
 * End-to-End Encryption Module
 * Uses TweetNaCl for secure message encryption
 */

import nacl from 'tweetnacl';
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export interface EncryptedMessage {
  ciphertext: string;
  nonce: string;
  ephemeralPublicKey?: string;
}

/**
 * Generate a new encryption key pair
 */
export function generateKeyPair(): KeyPair {
  const keyPair = nacl.box.keyPair();

  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Derive key pair from Ethereum private key (deterministic)
 * @param ethereumPrivateKey - 32-byte private key from wallet
 */
export function deriveKeyPairFromEthereum(ethereumPrivateKey: Uint8Array): KeyPair {
  // Use the Ethereum private key as the seed for box keypair
  const keyPair = nacl.box.keyPair.fromSecretKey(
    nacl.hash(ethereumPrivateKey).slice(0, 32)
  );

  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey),
  };
}

/**
 * Encrypt a message for a recipient
 * @param message - Plain text message
 * @param recipientPublicKey - Recipient's public key (base64)
 * @param senderSecretKey - Sender's secret key (base64)
 */
export function encryptMessage(
  message: string,
  recipientPublicKey: string,
  senderSecretKey: string
): EncryptedMessage {
  const messageUint8 = decodeUTF8(message);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const recipientPubKey = decodeBase64(recipientPublicKey);
  const senderSecKey = decodeBase64(senderSecretKey);

  const encrypted = nacl.box(
    messageUint8,
    nonce,
    recipientPubKey,
    senderSecKey
  );

  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Decrypt a message
 * @param encryptedMessage - Encrypted message object
 * @param senderPublicKey - Sender's public key (base64)
 * @param recipientSecretKey - Recipient's secret key (base64)
 */
export function decryptMessage(
  encryptedMessage: EncryptedMessage,
  senderPublicKey: string,
  recipientSecretKey: string
): string {
  const ciphertext = decodeBase64(encryptedMessage.ciphertext);
  const nonce = decodeBase64(encryptedMessage.nonce);
  const senderPubKey = decodeBase64(senderPublicKey);
  const recipientSecKey = decodeBase64(recipientSecretKey);

  const decrypted = nacl.box.open(
    ciphertext,
    nonce,
    senderPubKey,
    recipientSecKey
  );

  if (!decrypted) {
    throw new Error('Failed to decrypt message');
  }

  return encodeUTF8(decrypted);
}

/**
 * Encrypt message using anonymous encryption (no sender authentication)
 * Useful for anonymous messages or when sender identity shouldn't be revealed
 */
export function encryptAnonymous(
  message: string,
  recipientPublicKey: string
): EncryptedMessage {
  const messageUint8 = decodeUTF8(message);
  const recipientPubKey = decodeBase64(recipientPublicKey);

  // Generate ephemeral key pair
  const ephemeralKeyPair = nacl.box.keyPair();
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  const encrypted = nacl.box(
    messageUint8,
    nonce,
    recipientPubKey,
    ephemeralKeyPair.secretKey
  );

  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
    ephemeralPublicKey: encodeBase64(ephemeralKeyPair.publicKey),
  };
}

/**
 * Decrypt anonymous message
 */
export function decryptAnonymous(
  encryptedMessage: EncryptedMessage,
  recipientSecretKey: string
): string {
  if (!encryptedMessage.ephemeralPublicKey) {
    throw new Error('Missing ephemeral public key');
  }

  const ciphertext = decodeBase64(encryptedMessage.ciphertext);
  const nonce = decodeBase64(encryptedMessage.nonce);
  const ephemeralPubKey = decodeBase64(encryptedMessage.ephemeralPublicKey);
  const recipientSecKey = decodeBase64(recipientSecretKey);

  const decrypted = nacl.box.open(
    ciphertext,
    nonce,
    ephemeralPubKey,
    recipientSecKey
  );

  if (!decrypted) {
    throw new Error('Failed to decrypt anonymous message');
  }

  return encodeUTF8(decrypted);
}

/**
 * Symmetric encryption for file encryption (using secret key)
 */
export function encryptFile(
  data: Uint8Array,
  password: string
): { encrypted: Uint8Array; nonce: Uint8Array } {
  // Derive key from password
  const key = nacl.hash(decodeUTF8(password)).slice(0, nacl.secretbox.keyLength);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  const encrypted = nacl.secretbox(data, nonce, key);

  return { encrypted, nonce };
}

/**
 * Decrypt file
 */
export function decryptFile(
  encrypted: Uint8Array,
  nonce: Uint8Array,
  password: string
): Uint8Array {
  const key = nacl.hash(decodeUTF8(password)).slice(0, nacl.secretbox.keyLength);

  const decrypted = nacl.secretbox.open(encrypted, nonce, key);

  if (!decrypted) {
    throw new Error('Failed to decrypt file');
  }

  return decrypted;
}

/**
 * Sign a message (for authentication/verification)
 */
export function signMessage(message: string, secretKey: string): string {
  const messageUint8 = decodeUTF8(message);
  const secKey = decodeBase64(secretKey);

  // Convert box secret key to sign secret key
  const signKeyPair = nacl.sign.keyPair.fromSeed(secKey.slice(0, 32));
  const signature = nacl.sign.detached(messageUint8, signKeyPair.secretKey);

  return encodeBase64(signature);
}

/**
 * Verify a message signature
 */
export function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  const messageUint8 = decodeUTF8(message);
  const sig = decodeBase64(signature);
  const pubKey = decodeBase64(publicKey);

  // Convert box public key to sign public key (this is a simplification)
  // In production, you'd want separate signing keys
  return nacl.sign.detached.verify(messageUint8, sig, pubKey);
}

/**
 * Generate a shared secret between two parties
 */
export function computeSharedSecret(
  theirPublicKey: string,
  mySecretKey: string
): string {
  const theirPubKey = decodeBase64(theirPublicKey);
  const mySecKey = decodeBase64(mySecretKey);

  const sharedSecret = nacl.box.before(theirPubKey, mySecKey);

  return encodeBase64(sharedSecret);
}

/**
 * Encrypt with pre-computed shared secret (faster for multiple messages)
 */
export function encryptWithSharedSecret(
  message: string,
  sharedSecret: string
): EncryptedMessage {
  const messageUint8 = decodeUTF8(message);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const secret = decodeBase64(sharedSecret);

  const encrypted = nacl.box.after(messageUint8, nonce, secret);

  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  };
}

/**
 * Decrypt with pre-computed shared secret
 */
export function decryptWithSharedSecret(
  encryptedMessage: EncryptedMessage,
  sharedSecret: string
): string {
  const ciphertext = decodeBase64(encryptedMessage.ciphertext);
  const nonce = decodeBase64(encryptedMessage.nonce);
  const secret = decodeBase64(sharedSecret);

  const decrypted = nacl.box.open.after(ciphertext, nonce, secret);

  if (!decrypted) {
    throw new Error('Failed to decrypt message');
  }

  return encodeUTF8(decrypted);
}

/**
 * Store keys securely in browser (encrypted with user password)
 */
export function encryptKeysForStorage(
  keyPair: KeyPair,
  password: string
): string {
  const data = JSON.stringify(keyPair);
  const key = nacl.hash(decodeUTF8(password)).slice(0, nacl.secretbox.keyLength);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);

  const encrypted = nacl.secretbox(decodeUTF8(data), nonce, key);

  return JSON.stringify({
    encrypted: encodeBase64(encrypted),
    nonce: encodeBase64(nonce),
  });
}

/**
 * Retrieve keys from encrypted storage
 */
export function decryptKeysFromStorage(
  encryptedData: string,
  password: string
): KeyPair {
  const { encrypted, nonce } = JSON.parse(encryptedData);
  const key = nacl.hash(decodeUTF8(password)).slice(0, nacl.secretbox.keyLength);

  const decrypted = nacl.secretbox.open(
    decodeBase64(encrypted),
    decodeBase64(nonce),
    key
  );

  if (!decrypted) {
    throw new Error('Failed to decrypt keys - wrong password?');
  }

  return JSON.parse(encodeUTF8(decrypted));
}

// Browser-compatible storage helpers
export const KeyStorage = {
  save(address: string, keyPair: KeyPair, password: string): void {
    const encrypted = encryptKeysForStorage(keyPair, password);
    localStorage.setItem(`encrypted_keys_${address}`, encrypted);
  },

  load(address: string, password: string): KeyPair | null {
    const encrypted = localStorage.getItem(`encrypted_keys_${address}`);
    if (!encrypted) return null;

    try {
      return decryptKeysFromStorage(encrypted, password);
    } catch {
      return null;
    }
  },

  remove(address: string): void {
    localStorage.removeItem(`encrypted_keys_${address}`);
  },
};
