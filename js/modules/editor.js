/**
 * Editor Module - Code editor with syntax highlighting
 */

import { stateManager } from '../core/state.js';
import { chainService } from '../core/chain.js';
import { ipfsService } from '../services/ipfs.js';
import { toast } from '../ui/toast.js';
import { helpers } from '../utils/helpers.js';

export class EditorModule {
    constructor() {
        this.currentFile = null;
        this.editor = null;
    }

    init() {
        this.createEditor();
        this.render();
        this.attachEvents();
    }

    createEditor() {
        const editorContainer = document.getElementById('codeEditorContainer');
        if (!editorContainer) return;

        // Create simple code editor with textarea
        // In production, integrate Monaco Editor or CodeMirror
        editorContainer.innerHTML = `
            <div class="flex flex-col h-full">
                <div class="flex items-center justify-between p-2 bg-panel border-b border-white/10">
                    <div class="flex items-center gap-2">
                        <input id="editorFileName" type="text" placeholder="filename.js" 
                            class="input-field px-3 py-1 text-sm w-48" aria-label="File name">
                        <select id="editorLanguage" class="input-field px-3 py-1 text-sm" aria-label="Language">
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                            <option value="python">Python</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="json">JSON</option>
                            <option value="markdown">Markdown</option>
                        </select>
                    </div>
                    <div class="flex gap-2">
                        <button id="btnSaveFile" class="btn-primary text-sm px-4 py-1">
                            <span class="flex items-center gap-1">
                                <span>💾</span>
                                <span>Save</span>
                            </span>
                        </button>
                        <button id="btnSaveToIPFS" class="btn-secondary text-sm px-4 py-1">
                            <span class="flex items-center gap-1">
                                <span>🌐</span>
                                <span>Save to IPFS</span>
                            </span>
                        </button>
                    </div>
                </div>
                <textarea id="codeEditor" 
                    class="flex-1 w-full p-4 bg-bgLight text-textPrimary mono text-sm resize-none focus:outline-none"
                    placeholder="// Start coding..."
                    spellcheck="false"
                    aria-label="Code editor"></textarea>
                <div class="flex items-center justify-between p-2 bg-panel border-t border-white/10 text-xs text-textSecondary">
                    <span id="editorStatus">Ready</span>
                    <span id="editorInfo">Lines: 0 | Characters: 0</span>
                </div>
            </div>
        `;

        this.editor = document.getElementById('codeEditor');
        
        // Update info on input
        this.editor.addEventListener('input', () => this.updateEditorInfo());
        
        // Tab key support
        this.editor.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = this.editor.selectionStart;
                const end = this.editor.selectionEnd;
                this.editor.value = this.editor.value.substring(0, start) + '    ' + 
                                   this.editor.value.substring(end);
                this.editor.selectionStart = this.editor.selectionEnd = start + 4;
            }
        });
    }

    updateEditorInfo() {
        const content = this.editor.value;
        const lines = content.split('\n').length;
        const chars = content.length;
        document.getElementById('editorInfo').textContent = 
            `Lines: ${lines} | Characters: ${chars}`;
    }

    render() {
        const state = stateManager.getState();
        const reposList = document.getElementById('repositoriesList');

        if (state.repositories.length === 0) {
            reposList.innerHTML = `
                <div class="card text-center py-8">
                    <span class="text-4xl block mb-2" aria-hidden="true">💻</span>
                    <p class="text-textSecondary">No repositories yet. Create one to start coding!</p>
                </div>
            `;
            return;
        }

        reposList.innerHTML = state.repositories.map(repo => `
            <article class="card cursor-pointer hover:border-neonBlue/50" data-repo-id="${repo.id}" role="button" tabindex="0">
                <div class="flex items-start justify-between mb-2">
                    <div>
                        <h3 class="font-semibold text-neonBlue">${helpers.escapeHtml(repo.name)}</h3>
                        <p class="text-sm text-textSecondary mt-1">${helpers.escapeHtml(repo.description || 'No description')}</p>
                    </div>
                    <span class="badge bg-neonGreen/20 text-neonGreen border border-neonGreen/30">
                        ${repo.files?.length || 0} files
                    </span>
                </div>
                <div class="flex items-center gap-2 text-xs text-textSecondary">
                    <time datetime="${new Date(repo.timestamp).toISOString()}">
                        Created: ${helpers.formatTime(repo.timestamp)}
                    </time>
                </div>
            </article>
        `).join('');

        // Add click handlers
        document.querySelectorAll('[data-repo-id]').forEach(el => {
            el.addEventListener('click', () => {
                const repoId = el.dataset.repoId;
                this.openRepository(repoId);
            });
        });
    }

    attachEvents() {
        document.getElementById('btnCreateRepo').addEventListener('click', () => this.createRepository());
        document.getElementById('btnSaveFile')?.addEventListener('click', () => this.saveFile());
        document.getElementById('btnSaveToIPFS')?.addEventListener('click', () => this.saveToIPFS());
    }

    async createRepository() {
        const name = document.getElementById('repoName').value.trim();
        const description = document.getElementById('repoDescription').value.trim();

        if (!name) {
            toast.warning('Please enter repository name');
            return;
        }

        const repo = {
            id: helpers.generateId(),
            name,
            description,
            files: [],
            timestamp: Date.now()
        };

        const state = stateManager.getState();
        const repositories = [...state.repositories, repo];
        
        await stateManager.setState({ repositories });
        await chainService.addEvent('repo:create', repo);

        document.getElementById('repoName').value = '';
        document.getElementById('repoDescription').value = '';
        
        this.render();
        toast.success('Repository created: ' + name);
    }

    openRepository(repoId) {
        const state = stateManager.getState();
        const repo = state.repositories.find(r => r.id === repoId);
        
        if (!repo) return;

        this.currentFile = { repoId, repo };
        toast.info('Opened repository: ' + repo.name);
        
        // Navigate to code view if not already there
        document.querySelector('[data-tab="code"]').click();
    }

    async saveFile() {
        const fileName = document.getElementById('editorFileName').value.trim();
        const content = this.editor.value;
        const language = document.getElementById('editorLanguage').value;

        if (!fileName) {
            toast.warning('Please enter a file name');
            return;
        }

        if (!this.currentFile) {
            toast.warning('Please select a repository first');
            return;
        }

        const file = {
            id: helpers.generateId(),
            name: fileName,
            content,
            language,
            timestamp: Date.now()
        };

        const state = stateManager.getState();
        const repositories = state.repositories.map(repo => {
            if (repo.id === this.currentFile.repoId) {
                return {
                    ...repo,
                    files: [...(repo.files || []), file]
                };
            }
            return repo;
        });

        await stateManager.setState({ repositories });
        await chainService.addEvent('file:save', file);

        document.getElementById('editorStatus').textContent = 'Saved';
        toast.success('File saved: ' + fileName);
        
        setTimeout(() => {
            document.getElementById('editorStatus').textContent = 'Ready';
        }, 2000);
    }

    async saveToIPFS() {
        const fileName = document.getElementById('editorFileName').value.trim();
        const content = this.editor.value;

        if (!fileName || !content) {
            toast.warning('Please provide file name and content');
            return;
        }

        try {
            toast.info('Uploading to IPFS...');
            const cid = await ipfsService.add(content);
            
            await chainService.addEvent('file:ipfs', { fileName, cid });
            
            toast.success(`File uploaded to IPFS: ${cid}`);
            
            // Copy CID to clipboard
            if (await helpers.copyToClipboard(cid)) {
                toast.info('CID copied to clipboard');
            }
        } catch (e) {
            toast.error('IPFS upload failed: ' + e.message);
        }
    }
}

export const editorModule = new EditorModule();
