/**
 * Chain Module - Cryptographic event chain (blockchain-like)
 */

import { cryptoService } from './crypto.js';
import { stateManager } from './state.js';

export class ChainService {
    /**
     * Add event to chain
     */
    async addEvent(type, payload) {
        const state = stateManager.getState();
        
        if (!state.did) {
            return { error: 'No identity initialized' };
        }

        const chain = state.chain;
        const previousHash = chain.length > 0 ? chain[chain.length - 1].hash : 'genesis';
        
        const event = {
            type,
            payload,
            prev: previousHash,
            timestamp: Date.now()
        };

        const eventBody = JSON.stringify(event);
        const hash = await cryptoService.sha256(eventBody);
        
        // Decrypt private key for signing
        const privateKey = await this.getPrivateKey();
        const signature = await cryptoService.sign(hash, privateKey);

        const signedEvent = {
            ...event,
            hash,
            signature
        };

        chain.push(signedEvent);
        
        // Award token for activity (except init)
        if (type !== 'init') {
            await stateManager.setState({
                chain,
                tokens: state.tokens + 1
            });
        } else {
            await stateManager.setState({ chain });
        }

        return { ok: true, event: signedEvent };
    }

    /**
     * Verify entire chain integrity
     */
    async verifyChain(chain = null) {
        const state = stateManager.getState();
        const chainToVerify = chain || state.chain;
        
        if (chainToVerify.length === 0) {
            return { valid: true, message: 'Empty chain' };
        }

        for (let i = 0; i < chainToVerify.length; i++) {
            const event = chainToVerify[i];
            const expectedPrev = i === 0 ? 'genesis' : chainToVerify[i - 1].hash;

            // Check previous hash link
            if (event.prev !== expectedPrev) {
                return {
                    valid: false,
                    error: `Chain break at index ${i}: prev hash mismatch`,
                    index: i
                };
            }

            // Recompute hash
            const eventBody = JSON.stringify({
                type: event.type,
                payload: event.payload,
                prev: event.prev,
                timestamp: event.timestamp
            });
            const computedHash = await cryptoService.sha256(eventBody);

            if (event.hash !== computedHash) {
                return {
                    valid: false,
                    error: `Chain break at index ${i}: hash mismatch`,
                    index: i
                };
            }

            // Verify signature
            const signatureValid = await cryptoService.verify(
                event.signature,
                event.hash,
                state.publicKey
            );

            if (!signatureValid) {
                return {
                    valid: false,
                    error: `Chain break at index ${i}: invalid signature`,
                    index: i
                };
            }
        }

        return { valid: true, message: 'Chain verified successfully' };
    }

    /**
     * Get chain statistics
     */
    getStats() {
        const state = stateManager.getState();
        const chain = state.chain;

        const stats = {
            totalEvents: chain.length,
            byType: {},
            firstEvent: chain.length > 0 ? chain[0].timestamp : null,
            lastEvent: chain.length > 0 ? chain[chain.length - 1].timestamp : null
        };

        chain.forEach(event => {
            stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
        });

        return stats;
    }

    /**
     * Get private key (decrypted)
     */
    async getPrivateKey() {
        const state = stateManager.getState();
        
        if (!state.encryptedPrivateKey) {
            throw new Error('No private key available');
        }

        // Decrypt using device-derived key
        const decrypted = await cryptoService.decrypt(
            state.encryptedPrivateKey,
            state.encryptionKey
        );
        
        return decrypted;
    }
}

export const chainService = new ChainService();
