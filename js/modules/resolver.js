/**
 * Resolver Module - IPFS/IPNS content resolution
 */

import { ipfsService } from '../services/ipfs.js';
import { chainService } from '../core/chain.js';
import { toast } from '../ui/toast.js';
import { helpers } from '../utils/helpers.js';

export class ResolverModule {
    init() {
        this.attachEvents();
    }

    attachEvents() {
        document.getElementById('resolveBtn').addEventListener('click', () => this.resolve());
        
        // Allow Enter to resolve
        document.getElementById('resolveInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.resolve();
            }
        });
    }

    async resolve() {
        const address = document.getElementById('resolveInput').value.trim();
        const output = document.getElementById('resolveResult');
        const button = document.getElementById('resolveBtn');

        if (!address) {
            output.innerHTML = '<div class="text-red-500" role="alert">Please enter an address</div>';
            return;
        }

        output.innerHTML = '<div class="flex items-center gap-3"><div class="spinner"></div><span>Resolving...</span></div>';
        button.disabled = true;

        try {
            const { data, contentType } = await ipfsService.resolve(address);
            
            // Render based on content type
            if (contentType.includes('text/html')) {
                await this.renderHTML(data, output);
            } else if (contentType.startsWith('image/')) {
                await this.renderImage(data, output);
            } else if (contentType.includes('text/')) {
                await this.renderText(data, output);
            } else if (contentType.includes('json')) {
                await this.renderJSON(data, output);
            } else {
                output.innerHTML = `<div class="text-textSecondary">Content loaded (type: ${helpers.escapeHtml(contentType)})</div>`;
            }

            // Record mount
            const baseAddr = address.split('/')[0] + '//' + address.split('/')[2];
            await chainService.addEvent('mount', { address: baseAddr });
            toast.success(`Resolved ${baseAddr}`);

        } catch (e) {
            output.innerHTML = `<div class="text-red-500" role="alert">Error: ${helpers.escapeHtml(e.message)}</div>`;
            toast.error('Resolution failed: ' + e.message);
        } finally {
            button.disabled = false;
        }
    }

    async renderHTML(data, output) {
        const html = await data.text();
        const iframe = document.createElement('iframe');
        iframe.className = 'w-full border border-white/10 rounded-xl';
        iframe.style.height = '80vh';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        iframe.setAttribute('title', 'IPFS content');
        iframe.srcdoc = html;
        
        output.innerHTML = '';
        output.appendChild(iframe);
    }

    async renderImage(data, output) {
        const url = URL.createObjectURL(data);
        const img = document.createElement('img');
        img.src = url;
        img.className = 'max-w-full rounded-xl';
        img.alt = 'IPFS image';
        
        output.innerHTML = '';
        output.appendChild(img);
    }

    async renderText(data, output) {
        const text = await data.text();
        output.innerHTML = `<pre class="text-xs overflow-auto text-textPrimary whitespace-pre-wrap">${helpers.escapeHtml(text)}</pre>`;
    }

    async renderJSON(data, output) {
        const json = await data.text();
        try {
            const parsed = JSON.parse(json);
            output.innerHTML = `<pre class="text-xs overflow-auto text-textPrimary">${helpers.escapeHtml(JSON.stringify(parsed, null, 2))}</pre>`;
        } catch (e) {
            output.innerHTML = `<pre class="text-xs overflow-auto text-textPrimary">${helpers.escapeHtml(json)}</pre>`;
        }
    }
}

export const resolverModule = new ResolverModule();
