/**
 * Deploy Module - IPFS deployment functionality
 */

import { stateManager } from '../core/state.js';
import { chainService } from '../core/chain.js';
import { ipfsService } from '../services/ipfs.js';
import { toast } from '../ui/toast.js';
import { helpers } from '../utils/helpers.js';

export class DeployModule {
    init() {
        this.render();
        this.attachEvents();
    }

    render() {
        const state = stateManager.getState();
        
        const stateSize = JSON.stringify(state).length;
        document.getElementById('stateSize').textContent = helpers.formatSize(stateSize);
        document.getElementById('chainEvents').textContent = state.chain.length;
    }

    attachEvents() {
        document.getElementById('pinToIPFS').addEventListener('click', () => this.pinToIPFS());
        document.getElementById('exportForDeploy').addEventListener('click', () => this.exportZip());
    }

    async pinToIPFS() {
        if (ipfsService.getMode() === 'none') {
            toast.error('No IPFS service available');
            return;
        }

        const button = document.getElementById('pinToIPFS');
        button.disabled = true;
        button.innerHTML = '<div class="flex items-center gap-2"><div class="spinner"></div><span>Pinning...</span></div>';

        try {
            const state = await stateManager.exportState();
            
            // Create deployment manifest
            const manifest = {
                type: 'runtime',
                version: '1.0.0',
                entry: 'index.html',
                signedBy: state.did,
                timestamp: Date.now(),
                chain: state.chain.length,
                tokens: state.tokens,
                integrity: await this.generateIntegrityHash(state)
            };

            // Bundle manifest with current HTML
            const bundle = '<!-- I-AM Deployment Manifest -->\n' +
                          JSON.stringify(manifest, null, 2) +
                          '\n\n<!-- Runtime -->\n' +
                          document.documentElement.outerHTML;

            const cid = await ipfsService.add(bundle);
            
            document.getElementById('appCid').innerHTML = `
                <span class="text-neonGreen">${cid}</span>
                <button id="copyCid" class="btn-secondary text-xs px-2 py-1 ml-2" 
                    data-cid="${cid}" aria-label="Copy CID">Copy</button>
            `;

            document.getElementById('copyCid').addEventListener('click', async (e) => {
                const copied = await helpers.copyToClipboard(e.target.dataset.cid);
                if (copied) toast.success('CID copied to clipboard');
            });

            await chainService.addEvent('deploy:ipfs', { cid, manifest });
            
            toast.success(`Pinned successfully! ipfs://${cid}`);

        } catch (e) {
            toast.error('Pin failed: ' + e.message);
        } finally {
            button.disabled = false;
            button.innerHTML = '<span class="flex items-center gap-2"><span>📌</span><span>Pin Current State</span></span>';
        }
    }

    async generateIntegrityHash(state) {
        const data = JSON.stringify(state);
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async exportZip() {
        try {
            if (!window.JSZip) {
                toast.error('JSZip not loaded');
                return;
            }

            const zip = new JSZip();
            const state = await stateManager.exportState();
            
            // Add index.html
            zip.file('index.html', document.documentElement.outerHTML);
            
            // Add state.json
            zip.file('state.json', JSON.stringify(state, null, 2));
            
            // Add README
            zip.file('README.md', this.generateReadme(state));

            const blob = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `i-am-runtime-${Date.now()}.zip`;
            a.click();
            URL.revokeObjectURL(url);
            
            toast.success('ZIP exported successfully');

        } catch (e) {
            toast.error('Export failed: ' + e.message);
        }
    }

    generateReadme(state) {
        return `# I-AM Runtime Export

**DID:** ${state.did}
**Export Date:** ${new Date().toISOString()}
**Chain Height:** ${state.chain.length}
**IAM Tokens:** ${state.tokens}

## Contents

- \`index.html\` - Complete runtime application
- \`state.json\` - Encrypted state and chain data

## Deployment

### Local
1. Open \`index.html\` in a browser
2. Import \`state.json\` via Identity > Import State

### IPFS
1. Use \`ipfs add -r .\` to add directory
2. Access via \`ipfs://[CID]/index.html\`

### Web Server
1. Host all files on any static web server
2. Ensure HTTPS for secure context

## Security

- Private keys are encrypted at rest
- All signatures are Ed25519
- Chain is cryptographically verified

---

*Powered by I-AM • Sovereign Intelligence Network*
`;
    }
}

export const deployModule = new DeployModule();
