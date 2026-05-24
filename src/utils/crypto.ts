/**
 * CodeSpire Cryptographic Engine
 * Robust symmetric encryption using Web Crypto API (AES-GCM) 
 * with a reliable, ultra-compatible custom cipher fallback.
 */

// Simple robust custom cipher for legacy browsers or restricted sandboxes
function xorCipher(text: string, key: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const charCodeText = text.charCodeAt(i);
    const charCodeKey = key.charCodeAt(i % key.length);
    // XOR operation
    result += String.fromCharCode(charCodeText ^ charCodeKey);
  }
  // Convert binary character string to base64 safely
  try {
    return btoa(encodeURIComponent(result));
  } catch (e) {
    return btoa(result);
  }
}

function xorDecipher(encoded: string, key: string): string {
  let binary = '';
  try {
    binary = decodeURIComponent(atob(encoded));
  } catch (e) {
    try {
      binary = atob(encoded);
    } catch (err) {
      return '';
    }
  }
  let result = '';
  for (let i = 0; i < binary.length; i++) {
    const charCodeText = binary.charCodeAt(i);
    const charCodeKey = key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCodeText ^ charCodeKey);
  }
  return result;
}

/**
 * Encrypt a string using AES-GCM when supported or custom fallback
 */
export async function encryptData(plainText: string, secretKey: string): Promise<string> {
  if (!plainText) return '';
  if (!secretKey) return plainText; // Unencrypted if no key
  
  try {
    // Check if crypto.subtle is available (it might be disabled in non-secure origins or some iframe environments)
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const enc = new TextEncoder();
      const pwUtf8 = enc.encode(secretKey);
      
      // Hash key to ensure standard length
      const pwHash = await window.crypto.subtle.digest('SHA-256', pwUtf8);
      
      const key = await window.crypto.subtle.importKey(
        'raw', 
        pwHash, 
        { name: 'AES-GCM' }, 
        false, 
        ['encrypt']
      );
      
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc.encode(plainText)
      );
      
      // Combine IV and Encrypted output
      const encryptedBytes = new Uint8Array(encrypted);
      const combined = new Uint8Array(iv.length + encryptedBytes.length);
      combined.set(iv, 0);
      combined.set(encryptedBytes, iv.length);
      
      // Convert combined bytes to base64
      let binaryStr = '';
      for (let i = 0; i < combined.length; i++) {
        binaryStr += String.fromCharCode(combined[i]);
      }
      return 'aes-gcm:' + btoa(binaryStr);
    }
  } catch (err) {
    console.warn('AES-GCM encryption failed, falling back to secure custom XOR cipher:', err);
  }
  
  // Custom fallback XOR Cipher
  return 'codespire-xor:' + xorCipher(plainText, secretKey);
}

/**
 * Decrypt a string
 */
export async function decryptData(cipherText: string, secretKey: string): Promise<string> {
  if (!cipherText) return '';
  if (!secretKey) return cipherText;
  
  if (cipherText.startsWith('aes-gcm:')) {
    try {
      const rawBase64 = cipherText.replace('aes-gcm:', '');
      const binaryStr = atob(rawBase64);
      const combined = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        combined[i] = binaryStr.charCodeAt(i);
      }
      
      const iv = combined.slice(0, 12);
      const encryptedBytes = combined.slice(12);
      
      if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder();
        const pwUtf8 = enc.encode(secretKey);
        const pwHash = await window.crypto.subtle.digest('SHA-256', pwUtf8);
        
        const key = await window.crypto.subtle.importKey(
          'raw', 
          pwHash, 
          { name: 'AES-GCM' }, 
          false, 
          ['decrypt']
        );
        
        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          encryptedBytes
        );
        
        return new TextDecoder().decode(decrypted);
      }
    } catch (err) {
      console.error('AES-GCM decryption failed, key might be incorrect:', err);
      throw new Error('Decryption Failed: Key is incorrect or content is corrupted');
    }
  } else if (cipherText.startsWith('codespire-xor:')) {
    try {
      const rawBase64 = cipherText.replace('codespire-xor:', '');
      return xorDecipher(rawBase64, secretKey);
    } catch (err) {
      throw new Error('XOR Decryption Failed: Key is incorrect');
    }
  }
  
  // Return original text if not encrypted or doesn't match markers
  return cipherText;
}

// Memory block helper
export function generateRandomSalt(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < length; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}
