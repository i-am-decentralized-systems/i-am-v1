/**
 * Files Module - File management with IPFS
 */

import { stateManager } from '../core/state.js';
import { chainService } from '../core/chain.js';
import { ipfsService } from '../services/ipfs.js';
import { toast } from '../ui/toast.js';
import { helpers } from '../utils/helpers.js';

export class FilesModule {
    init() {
        this.render();
        this.attachEvents();
    }

    render() {
        const state = stateManager.getState();
        const filesList = document.getElementById('filesList');

        if (state.files.length === 0) {
            filesList.innerHTML = `
                <div class="text-center text-textSecondary py-8">
                    <span class="text-4xl block mb-2" aria-hidden="true">📁</span>
                    <p>No files uploaded yet</p>
                </div>
            `;
            return;
        }

        filesList.innerHTML = state.files.map(file => `
            <div class="flex items-center justify-between p-3 bg-bgLight rounded hover:bg-panelHover transition-colors" role="article">
                <div class="flex-1">
                    <div class="font-semibold text-textPrimary">${helpers.escapeHtml(file.name)}</div>
                    <div class="text-xs text-textSecondary mt-1">
                        <span>CID: ${helpers.truncate(file.cid, 20)}</span> • 
                        <span>${helpers.formatSize(file.size)}</span> •
                        <time datetime="${new Date(file.timestamp).toISOString()}">
                            ${helpers.formatTime(file.timestamp)}
                        </time>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button class="btn-secondary text-xs px-3 py-1" 
                        data-cid="${file.cid}" 
                        data-action="copy"
                        aria-label="Copy CID for ${file.name}">
                        Copy CID
                    </button>
                    <button class="btn-secondary text-xs px-3 py-1" 
                        data-cid="${file.cid}" 
                        data-action="open"
                        aria-label="Open ${file.name}">
                        Open
                    </button>
                </div>
            </div>
        `).join('');

        // Attach button handlers
        filesList.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cid = e.target.dataset.cid;
                const action = e.target.dataset.action;
                
                if (action === 'copy') {
                    this.copyCID(cid);
                } else if (action === 'open') {
                    this.openFile(cid);
                }
            });
        });
    }

    attachEvents() {
        document.getElementById('btnUploadFile').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileUpload(e);
        });
    }

    async handleFileUpload(event) {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        toast.info(`Uploading ${files.length} file(s) to IPFS...`);

        try {
            const uploadedFiles = [];

            for (const file of files) {
                const cid = await ipfsService.add(file);
                
                const fileData = {
                    id: helpers.generateId(),
                    name: file.name,
                    cid,
                    size: file.size,
                    type: file.type,
                    timestamp: Date.now()
                };

                uploadedFiles.push(fileData);
                await chainService.addEvent('file:upload', fileData);
            }

            const state = stateManager.getState();
            const allFiles = [...state.files, ...uploadedFiles];
            await stateManager.setState({ files: allFiles });

            this.render();
            toast.success(`${files.length} file(s) uploaded successfully`);

            // Reset input
            event.target.value = '';

        } catch (e) {
            toast.error('Upload failed: ' + e.message);
        }
    }

    async copyCID(cid) {
        const copied = await helpers.copyToClipboard(cid);
        if (copied) {
            toast.success('CID copied to clipboard');
        } else {
            toast.error('Failed to copy CID');
        }
    }

    openFile(cid) {
        const mode = ipfsService.getMode();
        let url;

        if (mode === 'kubo') {
            url = `http://127.0.0.1:8080/ipfs/${cid}`;
        } else {
            url = `https://ipfs.io/ipfs/${cid}`;
        }

        window.open(url, '_blank');
        toast.info('Opening file in new tab');
    }
}

export const filesModule = new FilesModule();
