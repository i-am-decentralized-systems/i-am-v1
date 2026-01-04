/**
 * Debug Utilities - Developer mode features
 */

import { stateManager } from '../core/state.js';
import { chainService } from '../core/chain.js';
import { toast } from '../ui/toast.js';

export class DebugService {
    constructor() {
        this.panel = null;
        this.isOpen = false;
        this.logs = [];
    }

    init() {
        // Create debug panel
        this.createPanel();
        
        // Keyboard shortcut: Ctrl+Shift+D
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                this.toggle();
            }
        });

        // Intercept console logs
        this.interceptConsole();
    }

    createPanel() {
        const panel = document.createElement('div');
        panel.id = 'debugPanel';
        panel.className = 'fixed inset-y-0 right-0 w-96 bg-panel border-l border-white/10 transform translate-x-full transition-transform duration-300 z-50 overflow-y-auto';
        panel.setAttribute('role', 'complementary');
        panel.setAttribute('aria-label', 'Debug Panel');
        
        panel.innerHTML = `
            <div class="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 class="text-xl font-bold gradient-text">Developer Mode</h2>
                <button id="closeDebug" class="btn-secondary text-sm px-3 py-1" aria-label="Close debug panel">✕</button>
            </div>
            <div class="p-4 space-y-4">
                <section aria-labelledby="state-inspector-heading">
                    <h3 id="state-inspector-heading" class="font-semibold text-neonBlue mb-2">State Inspector</h3>
                    <button id="debugViewState" class="btn-secondary w-full mb-2">View Full State</button>
                    <button id="debugVerifyChain" class="btn-secondary w-full mb-2">Verify Chain</button>
                    <button id="debugExportState" class="btn-secondary w-full">Export State (JSON)</button>
                </section>

                <section aria-labelledby="chain-stats-heading">
                    <h3 id="chain-stats-heading" class="font-semibold text-neonGreen mb-2">Chain Statistics</h3>
                    <div id="debugChainStats" class="bg-bgLight p-3 rounded text-xs mono"></div>
                </section>

                <section aria-labelledby="console-logs-heading">
                    <h3 id="console-logs-heading" class="font-semibold text-neonOrange mb-2">Console Logs</h3>
                    <div id="debugConsole" class="bg-bgLight p-3 rounded text-xs mono h-64 overflow-y-auto"></div>
                    <button id="debugClearLogs" class="btn-secondary w-full mt-2 text-sm">Clear Logs</button>
                </section>

                <section aria-labelledby="storage-info-heading">
                    <h3 id="storage-info-heading" class="font-semibold text-neonYellow mb-2">Storage Info</h3>
                    <div id="debugStorage" class="bg-bgLight p-3 rounded text-xs mono"></div>
                </section>
            </div>
        `;

        document.body.appendChild(panel);
        this.panel = panel;

        // Event listeners
        document.getElementById('closeDebug').addEventListener('click', () => this.close());
        document.getElementById('debugViewState').addEventListener('click', () => this.viewState());
        document.getElementById('debugVerifyChain').addEventListener('click', () => this.verifyChain());
        document.getElementById('debugExportState').addEventListener('click', () => this.exportState());
        document.getElementById('debugClearLogs').addEventListener('click', () => this.clearLogs());
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    open() {
        this.panel.classList.remove('translate-x-full');
        this.isOpen = true;
        this.updateStats();
        toast.info('Debug mode activated (Ctrl+Shift+D to close)');
    }

    close() {
        this.panel.classList.add('translate-x-full');
        this.isOpen = false;
    }

    updateStats() {
        const stats = chainService.getStats();
        const statsHtml = `
            <div>Total Events: ${stats.totalEvents}</div>
            <div>First Event: ${stats.firstEvent ? new Date(stats.firstEvent).toLocaleString() : 'N/A'}</div>
            <div>Last Event: ${stats.lastEvent ? new Date(stats.lastEvent).toLocaleString() : 'N/A'}</div>
            <div class="mt-2">Events by Type:</div>
            ${Object.entries(stats.byType).map(([type, count]) => 
                `<div class="ml-2">- ${type}: ${count}</div>`
            ).join('')}
        `;
        document.getElementById('debugChainStats').innerHTML = statsHtml;

        // Update storage info
        const state = stateManager.getState();
        const stateSize = JSON.stringify(state).length;
        const storageHtml = `
            <div>State Size: ${(stateSize / 1024).toFixed(2)} KB</div>
            <div>Posts: ${state.posts.length}</div>
            <div>Videos: ${state.videos.length}</div>
            <div>Files: ${state.files.length}</div>
            <div>Memories: ${Object.values(state.memory).flat().length}</div>
        `;
        document.getElementById('debugStorage').innerHTML = storageHtml;
    }

    viewState() {
        const state = stateManager.getState();
        console.log('Current State:', state);
        toast.info('State logged to console');
    }

    async verifyChain() {
        toast.info('Verifying chain...');
        const result = await chainService.verifyChain();
        
        if (result.valid) {
            toast.success('Chain verified: ' + result.message);
        } else {
            toast.error('Chain verification failed: ' + result.error);
        }
        
        console.log('Chain Verification:', result);
    }

    async exportState() {
        const state = await stateManager.exportState();
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `i-am-state-${Date.now()}.json`;
        a.click();
        toast.success('State exported');
    }

    interceptConsole() {
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;

        console.log = (...args) => {
            this.addLog('log', args);
            originalLog.apply(console, args);
        };

        console.error = (...args) => {
            this.addLog('error', args);
            originalError.apply(console, args);
        };

        console.warn = (...args) => {
            this.addLog('warn', args);
            originalWarn.apply(console, args);
        };
    }

    addLog(type, args) {
        const timestamp = new Date().toLocaleTimeString();
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        
        this.logs.push({ type, timestamp, message });
        
        // Keep only last 100 logs
        if (this.logs.length > 100) {
            this.logs.shift();
        }

        this.updateConsole();
    }

    updateConsole() {
        const consoleEl = document.getElementById('debugConsole');
        if (!consoleEl) return;

        const colors = {
            log: '#9ca3af',
            error: '#ff5555',
            warn: '#ff9500'
        };

        consoleEl.innerHTML = this.logs.map(log => 
            `<div style="color: ${colors[log.type]}">[${log.timestamp}] ${this.escapeHtml(log.message)}</div>`
        ).join('');
        
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    clearLogs() {
        this.logs = [];
        this.updateConsole();
        toast.info('Logs cleared');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

export const debugService = new DebugService();
