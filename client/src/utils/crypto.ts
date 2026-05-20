// =============================================
// E2EE Cryptographic Utilities
// =============================================

// Helper: Convert ArrayBuffer to Base64
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper: Convert Base64 to ArrayBuffer
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// 1. Password-Based Key Derivation (PBKDF2) to encrypt/decrypt the RSA private key
export async function deriveKeyFromPassword(password: string, saltString: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode(saltString),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// 2. Encrypt Private Key (with password-derived key)
// Format returned: "iv:encryptedKey"
export async function encryptPrivateKey(privateKey: CryptoKey, passwordKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    passwordKey,
    exported
  );
  
  const ivB64 = arrayBufferToBase64(iv.buffer);
  const encB64 = arrayBufferToBase64(encrypted);
  return `${ivB64}:${encB64}`;
}

// 3. Decrypt Private Key
export async function decryptPrivateKey(encryptedString: string, passwordKey: CryptoKey): Promise<CryptoKey> {
  const [ivB64, encB64] = encryptedString.split(':');
  const iv = base64ToArrayBuffer(ivB64);
  const encrypted = base64ToArrayBuffer(encB64);
  
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    passwordKey,
    encrypted
  );
  
  return window.crypto.subtle.importKey(
    'pkcs8',
    decrypted,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['decrypt']
  );
}

// 4. Generate RSA Key Pair
export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );
}

// Export Public Key to string
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', key);
  return arrayBufferToBase64(exported);
}

// Import Public Key from string
export async function importPublicKey(spkiBase64: string): Promise<CryptoKey> {
  const binaryDer = base64ToArrayBuffer(spkiBase64);
  return window.crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true,
    ['encrypt']
  );
}

// 5. Hybrid Message Encryption
export async function encryptMessage(text: string, receiverPublicKeyStr: string, senderPublicKeyStr: string) {
  // Generate random AES key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Encrypt message text with AES key
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(text)
  );

  // Export AES key to raw bytes
  const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);

  // Encrypt AES key with receiver's public key
  const receiverPubKey = await importPublicKey(receiverPublicKeyStr);
  const receiverEncryptedKey = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    receiverPubKey,
    exportedAesKey
  );

  // Encrypt AES key with sender's public key (so they can read their own sent messages)
  const senderPubKey = await importPublicKey(senderPublicKeyStr);
  const senderEncryptedKey = await window.crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    senderPubKey,
    exportedAesKey
  );

  return {
    content: arrayBufferToBase64(encryptedContent),
    iv: arrayBufferToBase64(iv.buffer),
    receiverEncryptedKey: arrayBufferToBase64(receiverEncryptedKey),
    senderEncryptedKey: arrayBufferToBase64(senderEncryptedKey)
  };
}

// 6. Hybrid Message Decryption
export async function decryptMessage(
  encryptedContentBase64: string,
  encryptedKeyBase64: string,
  ivBase64: string,
  privateKey: CryptoKey
): Promise<string> {
  try {
    // Decrypt the AES key using our RSA private key
    const encryptedKey = base64ToArrayBuffer(encryptedKeyBase64);
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedKey
    );

    // Import the decrypted AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      rawAesKey,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Decrypt the message content
    const encryptedContent = base64ToArrayBuffer(encryptedContentBase64);
    const iv = base64ToArrayBuffer(ivBase64);
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedContent
    );

    return new TextDecoder().decode(decryptedContent);
  } catch (err) {
    console.error('Failed to decrypt message:', err);
    return '[Encrypted Message — Decryption Failed]';
  }
}
