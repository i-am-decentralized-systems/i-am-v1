/**
 * Identity Module - Sovereign identity management
 */

import { cryptoService } from '../core/crypto.js';
import { stateManager } from '../core/state.js';
import { chainService } from '../core/chain.js';
import { toast } from '../ui/toast.js';
import { helpers } from '../utils/helpers.js';

export class IdentityModule {
    async init() {
        const state = stateManager.getState();
        
        if (!state.did) {
            await this.generateIdentity();
        }

        this.render();
        this.attachEvents();
    }

    async generateIdentity() {
        toast.info('Generating cryptographic identity...');
        
        const { publicKeyHex, privateKeyHex, did } = await cryptoService.generateKeyPair();
        
        // Generate encryption key for storing private key
        const encryptionKey = await cryptoService.generateEncryptionKey();
        
        // Encrypt private key
        const encryptedPrivateKey = await cryptoService.encrypt(privateKeyHex, encryptionKey);
        
        await stateManager.setState({
            did,
            publicKey: publicKeyHex,
            encryptedPrivateKey,
            encryptionKey
        });

        await chainService.addEvent('init', { did });
        toast.success('Identity created successfully');
    }

    render() {
        const state = stateManager.getState();
        
        document.getElementById('identityDid').textContent = state.did || 'Not initialized';
        document.getElementById('identityPub').textContent = state.publicKey || 'No key generated';
        document.getElementById('didDisplay').textContent = state.did || 'Not initialized';
    }

    attachEvents() {
        document.getElementById('exportIdentity').addEventListener('click', () => this.exportIdentity());
        document.getElementById('importIdentity').addEventListener('click', () => this.importIdentity());
        document.getElementById('verifyChainBtn').addEventListener('click', () => this.verifyChain());
        document.getElementById('clearAll').addEventListener('click', () => this.clearAll());
    }

    async exportIdentity() {
        try {
            const state = await stateManager.exportState();
            helpers.downloadFile(
                JSON.stringify(state, null, 2),
                `i-am-identity-${Date.now()}.json`,
                'application/json'
            );
            toast.success('Identity exported successfully');
        } catch (e) {
            toast.error('Export failed: ' + e.message);
        }
    }

    importIdentity() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (ev) => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    
                    if (!imported.did || !imported.chain || !imported.publicKey) {
                        throw new Error('Invalid identity file format');
                    }

                    // Verify chain before importing
                    const tempState = stateManager.getState();
                    await stateManager.setState(imported, false);
                    
                    const verification = await chainService.verifyChain(imported.chain);
                    if (!verification.valid) {
                        await stateManager.setState(tempState, false);
                        throw new Error('Chain verification failed: ' + verification.error);
                    }

                    await stateManager.save();
                    toast.success('Identity imported and verified successfully');
                    setTimeout(() => location.reload(), 2000);
                    
                } catch (err) {
                    toast.error('Import failed: ' + err.message);
                }
            };
            reader.readAsText(file);
        };
        
        input.click();
    }

    async verifyChain() {
        const button = document.getElementById('verifyChainBtn');
        button.disabled = true;
        button.innerHTML = '<span class="flex items-center gap-2"><div class="spinner"></div><span>Verifying...</span></span>';

        try {
            const result = await chainService.verifyChain();
            
            if (result.valid) {
                toast.success('Chain verified: ' + result.message);
            } else {
                toast.error('Chain verification failed: ' + result.error);
            }
        } catch (e) {
            toast.error('Verification error: ' + e.message);
        } finally {
            button.disabled = false;
            button.innerHTML = '<span class="flex items-center gap-2"><span>✓</span><span>Verify Chain</span></span>';
        }
    }

    clearAll() {
        if (confirm("⚠️ IRREVERSIBLE: Delete all local sovereign state?\n\nThis will permanently erase your identity, chain, and all data.")) {
            if (confirm("Are you absolutely sure? This cannot be undone.")) {
                stateManager.clear();
                toast.info('All data cleared. Reloading...');
                setTimeout(() => location.reload(), 1500);
            }
        }
    }
}

export const identityModule = new IdentityModule();
