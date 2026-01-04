/**
 * I-AM - Sovereign Intelligence Network
 * Main Entry Point
 */

import { storageService } from './core/storage.js';
import { stateManager } from './core/state.js';
import { chainService } from './core/chain.js';
import { ipfsService } from './services/ipfs.js';
import { aiService } from './services/ai.js';
import { toast } from './ui/toast.js';
import { router } from './ui/router.js';
import { Starfield } from './ui/starfield.js';
import { debugService } from './utils/debug.js';

// Feature modules
import { identityModule } from './modules/identity.js';
import { profileModule } from './modules/profile.js';
import { socialModule } from './modules/social.js';
import { chatModule } from './modules/chat.js';
import { memoryModule } from './modules/memory.js';
import { editorModule } from './modules/editor.js';
import { deployModule } from './modules/deploy.js';
import { resolverModule } from './modules/resolver.js';
import { filesModule } from './modules/files.js';

class Application {
    constructor() {
        this.initialized = false;
        this.modules = {};
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            // Check secure context
            if (!crypto?.subtle || !isSecureContext) {
                throw new Error('Secure context required (HTTPS or localhost)');
            }

            toast.init();
            toast.info('Initializing sovereign runtime...');

            // Initialize core services
            await storageService.init();
            await stateManager.load();

            // Initialize identity
            await identityModule.init();

            // Initialize services (async, non-blocking)
            this.initServices();

            // Initialize UI
            this.initUI();

            // Initialize feature modules
            this.initModules();

            // Initialize debug mode
            debugService.init();

            // Subscribe to state changes
            stateManager.subscribe((state) => this.onStateChange(state));

            // Initial render
            this.render();

            // Check onboarding
            this.checkOnboarding();

            this.initialized = true;
            toast.success('Sovereign runtime active');
            console.log('I-AM initialized successfully');

        } catch (error) {
            console.error('Initialization error:', error);
            toast.error('Initialization failed: ' + error.message);
            this.handleFatalError(error);
        }
    }

    /**
     * Initialize services asynchronously
     */
    async initServices() {
        // IPFS initialization
        ipfsService.init().then(result => {
            if (result.success) {
                const mode = result.mode === 'kubo' ? 'Kubo (Local)' : 'Helia (Browser)';
                toast.success(`IPFS initialized: ${mode}`);
                this.updateIPFSStatus(result.mode);
            } else {
                toast.warning('IPFS not available');
                this.updateIPFSStatus('none');
            }
        }).catch(err => {
            console.error('IPFS init error:', err);
        });

        // AI initialization (lazy)
        const aiStatusBadge = document.getElementById('aiStatus');
        if (aiStatusBadge) {
            aiStatusBadge.classList.remove('hidden');
        }

        aiService.init().then(result => {
            if (aiStatusBadge) {
                aiStatusBadge.classList.add('hidden');
            }
            
            if (result.success) {
                const mode = result.mode === 'ollama' ? 'Ollama (Local)' : 'GPT-2 (Browser)';
                toast.success(`AI initialized: ${mode}`);
            } else {
                toast.warning('AI not available');
            }
        }).catch(err => {
            console.error('AI init error:', err);
            if (aiStatusBadge) {
                aiStatusBadge.classList.add('hidden');
            }
        });
    }

    /**
     * Initialize UI components
     */
    initUI() {
        // Router
        router.init();
        router.setNavigationHandler((view) => this.onNavigate(view));

        // Starfield animation
        const starfield = new Starfield('starfield');
        starfield.init();

        // Start button
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                router.navigateTo('dashboard');
            });
        }
    }

    /**
     * Initialize feature modules
     */
    initModules() {
        this.modules = {
            profile: profileModule,
            social: socialModule,
            chat: chatModule,
            memory: memoryModule,
            editor: editorModule,
            deploy: deployModule,
            resolver: resolverModule,
            files: filesModule
        };

        // Initialize all modules
        Object.values(this.modules).forEach(module => {
            if (module.init) module.init();
        });
    }

    /**
     * Handle navigation
     */
    onNavigate(view) {
        console.log('Navigated to:', view);
        
        // Lazy load module-specific resources
        if (view === 'code' && !this.modules.editor.editor) {
            this.modules.editor.createEditor();
        }

        // Update view-specific content
        this.render();
    }

    /**
     * Handle state changes
     */
    onStateChange(state) {
        this.render();
    }

    /**
     * Render all dynamic content
     */
    render() {
        const state = stateManager.getState();

        // Update header stats
        document.getElementById('tokenBalance').textContent = `IAM: ${state.tokens}`;
        
        const didDisplay = document.getElementById('didDisplay');
        if (didDisplay) {
            didDisplay.textContent = state.did || 'Not initialized';
        }

        // Update dashboard
        const statusText = document.getElementById('statusText');
        if (statusText) {
            statusText.textContent = 'Active';
        }

        const chainHeight = document.getElementById('chainHeight');
        if (chainHeight) {
            chainHeight.textContent = state.chain.length;
        }

        const totalActions = document.getElementById('totalActions');
        if (totalActions) {
            totalActions.textContent = state.chain.length;
        }

        const postCount = document.getElementById('postCount');
        if (postCount) {
            postCount.textContent = state.posts.length;
        }

        const messageCount = document.getElementById('messageCount');
        if (messageCount) {
            messageCount.textContent = state.messages.length;
        }

        const tokenCount = document.getElementById('tokenCount');
        if (tokenCount) {
            tokenCount.textContent = state.tokens;
        }
    }

    /**
     * Update IPFS status indicator
     */
    updateIPFSStatus(mode) {
        const badge = document.getElementById('ipfsStatus');
        const modeText = document.getElementById('ipfsMode');
        
        if (badge && mode !== 'none') {
            badge.classList.remove('hidden');
            if (modeText) {
                modeText.textContent = mode === 'kubo' ? 'Kubo (Local)' : 'Helia (Browser)';
            }
        }
    }

    /**
     * Check if user has seen onboarding
     */
    checkOnboarding() {
        const seen = localStorage.getItem('iam_onboarding_seen');
        
        if (!seen) {
            router.navigateTo('onboarding');
            localStorage.setItem('iam_onboarding_seen', 'true');
        } else {
            router.navigateTo('dashboard');
        }
    }

    /**
     * Handle fatal errors
     */
    handleFatalError(error) {
        document.body.innerHTML = `
            <div class="flex items-center justify-center h-screen bg-bg text-textPrimary">
                <div class="text-center p-8 max-w-2xl">
                    <span class="text-6xl block mb-4">⚠️</span>
                    <h1 class="text-3xl font-bold mb-4 gradient-text">Initialization Failed</h1>
                    <p class="text-lg text-textSecondary mb-4">${error.message}</p>
                    <p class="text-sm text-textSecondary">Please ensure you are using a secure context (HTTPS or localhost)</p>
                    <button onclick="location.reload()" class="btn-primary mt-6">Reload Application</button>
                </div>
            </div>
        `;
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new Application();
        app.init();
        
        // Expose to window for debugging
        window.IAM = app;
    });
} else {
    const app = new Application();
    app.init();
    window.IAM = app;
}
