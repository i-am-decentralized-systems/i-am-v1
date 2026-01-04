/**
 * Crypto Module - Ed25519 cryptography utilities
 * Handles key generation, signing, verification, and encryption
 */

const ED_PREFIX = new Uint8Array([0xed, 0x01]);
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export class CryptoService {
    constructor() {
        this.encoder = new TextEncoder();
        this.decoder = new TextDecoder();
    }

    /**
     * Convert bytes to hex string
     */
    hex(bytes) {
        return [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Convert hex string to bytes
     */
    bytes(hexString) {
        return Uint8Array.from(hexString.match(/.{2}/g).map(b => parseInt(b, 16)));
    }

    /**
     * Base58 encoding for DID
     */
    base58Encode(bytes) {
        let n = BigInt('0x' + this.hex(bytes));
        let result = '';
        while (n > 0n) {
            let remainder = n % 58n;
            n /= 58n;
            result = BASE58[Number(remainder)] + result;
        }
        return 'z' + (result || '1');
    }

    /**
     * SHA-256 hash
     */
    async sha256(data) {
        const bytes = typeof data === 'string' ? this.encoder.encode(data) : data;
        return this.hex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
    }

    /**
     * Generate Ed25519 keypair
     */
    async generateKeyPair() {
        const keypair = await crypto.subtle.generateKey(
            { name: 'Ed25519' },
            true,
            ['sign', 'verify']
        );

        const publicKey = new Uint8Array(await crypto.subtle.exportKey('raw', keypair.publicKey));
        const privateKey = new Uint8Array(await crypto.subtle.exportKey('pkcs8', keypair.privateKey));

        const publicKeyHex = this.hex(publicKey);
        const privateKeyHex = this.hex(privateKey);
        const did = 'did:key:' + this.base58Encode(new Uint8Array([...ED_PREFIX, ...publicKey]));

        return { publicKeyHex, privateKeyHex, did };
    }

    /**
     * Sign a message
     */
    async sign(messageHash, privateKeyHex) {
        const key = await crypto.subtle.importKey(
            'pkcs8',
            this.bytes(privateKeyHex),
            { name: 'Ed25519' },
            false,
            ['sign']
        );
        const signature = await crypto.subtle.sign(
            'Ed25519',
            key,
            this.encoder.encode(messageHash)
        );
        return this.hex(new Uint8Array(signature));
    }

    /**
     * Verify a signature
     */
    async verify(signatureHex, messageHash, publicKeyHex) {
        try {
            const key = await crypto.subtle.importKey(
                'raw',
                this.bytes(publicKeyHex),
                { name: 'Ed25519' },
                false,
                ['verify']
            );
            return await crypto.subtle.verify(
                'Ed25519',
                key,
                this.bytes(signatureHex),
                this.encoder.encode(messageHash)
            );
        } catch (e) {
            console.error('Verification error:', e);
            return false;
        }
    }

    /**
     * Encrypt data using AES-GCM with a password-derived key
     */
    async encrypt(data, password) {
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(12));

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            this.encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        const dataBytes = typeof data === 'string' ? this.encoder.encode(data) : data;
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            dataBytes
        );

        // Combine salt + iv + encrypted data
        const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
        result.set(salt, 0);
        result.set(iv, salt.length);
        result.set(new Uint8Array(encrypted), salt.length + iv.length);

        return this.hex(result);
    }

    /**
     * Decrypt data using AES-GCM with a password-derived key
     */
    async decrypt(encryptedHex, password) {
        const encryptedBytes = this.bytes(encryptedHex);
        const salt = encryptedBytes.slice(0, 16);
        const iv = encryptedBytes.slice(16, 28);
        const data = encryptedBytes.slice(28);

        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            this.encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        return this.decoder.decode(decrypted);
    }

    /**
     * Generate a random encryption key from device entropy
     */
    async generateEncryptionKey() {
        const entropy = crypto.getRandomValues(new Uint8Array(32));
        return this.hex(entropy);
    }
}

export const cryptoService = new CryptoService();
