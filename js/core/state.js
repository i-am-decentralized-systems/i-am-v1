/**
 * State Module - Centralized application state management
 */

import { storageService } from './storage.js';
import { cryptoService } from './crypto.js';

const STATE_VERSION = '1.0.0';
const STATE_KEY = 'main_state';

export class StateManager {
    constructor() {
        this.state = {
            version: STATE_VERSION,
            did: null,
            publicKey: null,
            encryptedPrivateKey: null,
            encryptionKey: null, // Stored encrypted or derived from device
            chain: [],
            tokens: 0,
            messages: [],
            profile: {
                displayName: 'Sovereign',
                bio: '',
                website: '',
                avatarCID: null
            },
            posts: [],
            videos: [],
            repositories: [],
            files: [],
            memory: {
                episodic: [],
                semantic: [],
                pda: []
            },
            conversations: [],
            settings: {
                debugMode: false,
                autoSave: true,
                theme: 'dark'
            }
        };
        
        this.listeners = [];
    }

    /**
     * Load state from storage
     */
    async load() {
        try {
            const stored = await storageService.get('state', STATE_KEY);
            if (stored) {
                // Handle version migrations
                if (stored.version !== STATE_VERSION) {
                    console.log('State version mismatch, migrating...');
                    stored.version = STATE_VERSION;
                }
                this.state = { ...this.state, ...stored };
            }
        } catch (e) {
            console.error('Failed to load state:', e);
        }
    }

    /**
     * Save state to storage
     */
    async save() {
        try {
            await storageService.set('state', {
                ...this.state,
                id: STATE_KEY
            });
        } catch (e) {
            console.error('Failed to save state:', e);
            throw e;
        }
    }

    /**
     * Get current state
     */
    getState() {
        return this.state;
    }

    /**
     * Update state
     */
    async setState(updates, shouldSave = true) {
        this.state = { ...this.state, ...updates };
        this.notifyListeners();
        
        if (shouldSave && this.state.settings.autoSave) {
            await this.save();
        }
    }

    /**
     * Subscribe to state changes
     */
    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    /**
     * Notify all listeners
     */
    notifyListeners() {
        this.listeners.forEach(listener => listener(this.state));
    }

    /**
     * Export state for backup
     */
    async exportState() {
        return {
            ...this.state,
            exported: Date.now(),
            version: STATE_VERSION
        };
    }

    /**
     * Import state from backup
     */
    async importState(importedState) {
        // Validate structure
        if (!importedState.did || !importedState.chain) {
            throw new Error('Invalid state format');
        }

        this.state = { ...this.state, ...importedState, version: STATE_VERSION };
        await this.save();
        this.notifyListeners();
    }

    /**
     * Clear all state
     */
    async clear() {
        this.state = {
            version: STATE_VERSION,
            did: null,
            publicKey: null,
            encryptedPrivateKey: null,
            encryptionKey: null,
            chain: [],
            tokens: 0,
            messages: [],
            profile: {
                displayName: 'Sovereign',
                bio: '',
                website: '',
                avatarCID: null
            },
            posts: [],
            videos: [],
            repositories: [],
            files: [],
            memory: {
                episodic: [],
                semantic: [],
                pda: []
            },
            conversations: [],
            settings: {
                debugMode: false,
                autoSave: true,
                theme: 'dark'
            }
        };
        
        await storageService.clearAll();
        this.notifyListeners();
    }
}

export const stateManager = new StateManager();
