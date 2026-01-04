/**
 * IPFS Service - Unified IPFS adapter for Kubo (local) and Helia (browser)
 */

export class IPFSService {
    constructor() {
        this.mode = 'none';
        this.client = null;
    }

    /**
     * Initialize IPFS - try Kubo first, fallback to Helia
     */
    async init() {
        // Try local Kubo node first
        const kuboAvailable = await this.tryKubo();
        if (kuboAvailable) {
            return { mode: 'kubo', success: true };
        }

        // Fallback to browser-based Helia
        const heliaAvailable = await this.tryHelia();
        if (heliaAvailable) {
            return { mode: 'helia', success: true };
        }

        return { mode: 'none', success: false };
    }

    /**
     * Try connecting to local Kubo node
     */
    async tryKubo() {
        try {
            const response = await fetch('http://127.0.0.1:5001/api/v0/version', {
                cache: 'no-store',
                signal: AbortSignal.timeout(3000)
            });

            if (response.ok) {
                this.mode = 'kubo';
                this.client = {
                    apiUrl: 'http://127.0.0.1:5001',
                    gateway: 'http://127.0.0.1:8080'
                };
                return true;
            }
        } catch (e) {
            console.log('Kubo not available, trying Helia...');
        }
        return false;
    }

    /**
     * Initialize browser-based Helia
     */
    async tryHelia() {
        try {
            if (!window.heliaModules) {
                console.error('Helia modules not loaded');
                return false;
            }

            const helia = await window.heliaModules.createHelia();
            const fs = window.heliaModules.unixfs(helia);

            this.mode = 'helia';
            this.client = { helia, fs };
            return true;
        } catch (e) {
            console.error('Helia initialization failed:', e);
            return false;
        }
    }

    /**
     * Add content to IPFS
     */
    async add(data) {
        if (this.mode === 'none') {
            throw new Error('IPFS not initialized');
        }

        if (this.mode === 'kubo') {
            return await this.addToKubo(data);
        } else if (this.mode === 'helia') {
            return await this.addToHelia(data);
        }
    }

    /**
     * Add to Kubo node
     */
    async addToKubo(data) {
        const formData = new FormData();
        const blob = data instanceof Blob ? data : new Blob([data]);
        formData.append('file', blob, 'data');

        const response = await fetch(`${this.client.apiUrl}/api/v0/add?pin=true`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Kubo add failed: ${response.status}`);
        }

        const result = await response.json();
        return result.Hash;
    }

    /**
     * Add to Helia
     */
    async addToHelia(data) {
        const encoder = new TextEncoder();
        const bytes = typeof data === 'string' ? encoder.encode(data) : 
                     data instanceof Uint8Array ? data : 
                     new Uint8Array(await data.arrayBuffer());

        const cid = await this.client.fs.addBytes(bytes);
        return cid.toString();
    }

    /**
     * Resolve IPFS/IPNS address
     */
    async resolve(address) {
        let gatewayUrl;

        if (address.startsWith('ipfs://')) {
            const parts = address.slice(7).split('/');
            const cid = parts[0];
            const path = parts.slice(1).join('/');

            if (this.mode === 'kubo') {
                gatewayUrl = `${this.client.gateway}/ipfs/${cid}/${path}`;
            } else {
                gatewayUrl = `https://ipfs.io/ipfs/${cid}/${path}`;
            }
        } else if (address.startsWith('ipns://')) {
            const parts = address.slice(7).split('/');
            const name = parts[0];
            const path = parts.slice(1).join('/');

            if (this.mode === 'kubo') {
                gatewayUrl = `${this.client.gateway}/ipns/${name}/${path}`;
            } else {
                gatewayUrl = `https://ipfs.io/ipns/${name}/${path}`;
            }
        } else {
            throw new Error('Invalid IPFS/IPNS address');
        }

        const response = await fetch(gatewayUrl);
        if (!response.ok) {
            throw new Error(`Resolution failed: ${response.status}`);
        }

        return {
            data: await response.blob(),
            contentType: response.headers.get('content-type') || 'application/octet-stream'
        };
    }

    /**
     * Get current mode
     */
    getMode() {
        return this.mode;
    }
}

export const ipfsService = new IPFSService();
