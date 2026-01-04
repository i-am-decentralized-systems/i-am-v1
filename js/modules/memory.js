/**
 * Memory Module - Enhanced memory system with embeddings and search
 */

import { stateManager } from '../core/state.js';
import { chainService } from '../core/chain.js';
import { toast } from '../ui/toast.js';
import { helpers } from '../utils/helpers.js';

export class MemoryModule {
    constructor() {
        this.embeddingCache = new Map();
    }

    init() {
        this.render();
        this.attachEvents();
    }

    render() {
        const state = stateManager.getState();
        
        ['episodic', 'semantic', 'pda'].forEach(type => {
            const container = document.getElementById(`${type}List`);
            const memories = state.memory[type];

            if (memories.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-textSecondary py-4 text-sm">
                        No ${type} memories yet
                    </div>
                `;
                return;
            }

            container.innerHTML = memories.slice(-20).reverse().map(memory => `
                <div class="bg-bgLight p-3 rounded text-sm" role="article">
                    <p class="text-textPrimary mb-1">${helpers.escapeHtml(memory.content)}</p>
                    <div class="flex items-center justify-between text-xs text-textSecondary">
                        <time datetime="${new Date(memory.timestamp).toISOString()}">
                            ${helpers.formatTime(memory.timestamp)}
                        </time>
                        ${memory.embedding ? '<span class="text-neonBlue">✓ Embedded</span>' : ''}
                    </div>
                </div>
            `).join('');
        });
    }

    attachEvents() {
        document.getElementById('btnAddMemory').addEventListener('click', () => this.addMemory());
        
        // Search functionality
        const searchInput = document.createElement('input');
        searchInput.id = 'memorySearch';
        searchInput.className = 'input-field w-full mb-4';
        searchInput.placeholder = 'Search memories...';
        searchInput.setAttribute('aria-label', 'Search memories');
        
        const memorySection = document.querySelector('#view-memory .card');
        if (memorySection) {
            memorySection.insertBefore(searchInput, memorySection.firstChild);
            searchInput.addEventListener('input', helpers.debounce((e) => {
                this.searchMemories(e.target.value);
            }, 300));
        }
    }

    async addMemory() {
        const content = document.getElementById('memoryContent').value.trim();
        const type = document.getElementById('memoryType').value;

        if (!content) {
            toast.warning('Please enter memory content');
            return;
        }

        const memory = {
            content,
            type,
            timestamp: Date.now(),
            embedding: await this.generateEmbedding(content),
            metadata: {
                source: 'manual',
                wordCount: content.split(/\s+/).length
            }
        };

        const state = stateManager.getState();
        state.memory[type].push(memory);
        
        await stateManager.setState({ memory: state.memory });
        await chainService.addEvent(`memory:${type}`, memory);

        document.getElementById('memoryContent').value = '';
        this.render();
        toast.success('Memory stored successfully');
    }

    /**
     * Generate simple text embedding using character frequencies
     * In production, use a proper embedding model
     */
    async generateEmbedding(text) {
        if (this.embeddingCache.has(text)) {
            return this.embeddingCache.get(text);
        }

        // Simple frequency-based embedding (128 dimensions)
        const embedding = new Array(128).fill(0);
        const normalized = text.toLowerCase();
        
        for (let i = 0; i < normalized.length; i++) {
            const charCode = normalized.charCodeAt(i);
            const index = charCode % 128;
            embedding[index] += 1;
        }

        // Normalize
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        const normalizedEmbedding = embedding.map(val => val / (magnitude || 1));

        this.embeddingCache.set(text, normalizedEmbedding);
        return normalizedEmbedding;
    }

    /**
     * Calculate cosine similarity between two embeddings
     */
    cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length) return 0;
        
        let dotProduct = 0;
        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
        }
        return dotProduct;
    }

    /**
     * Search memories using semantic similarity
     */
    async searchMemories(query) {
        if (!query.trim()) {
            this.render();
            return;
        }

        const state = stateManager.getState();
        const queryEmbedding = await this.generateEmbedding(query);
        const allMemories = [];

        // Collect all memories with similarity scores
        ['episodic', 'semantic', 'pda'].forEach(type => {
            state.memory[type].forEach(memory => {
                if (memory.embedding) {
                    const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding);
                    allMemories.push({ ...memory, type, similarity });
                } else {
                    // Fallback to simple text search
                    if (memory.content.toLowerCase().includes(query.toLowerCase())) {
                        allMemories.push({ ...memory, type, similarity: 0.5 });
                    }
                }
            });
        });

        // Sort by similarity
        allMemories.sort((a, b) => b.similarity - a.similarity);

        // Render search results
        this.renderSearchResults(allMemories.slice(0, 20), query);
    }

    renderSearchResults(results, query) {
        ['episodic', 'semantic', 'pda'].forEach(type => {
            const container = document.getElementById(`${type}List`);
            const typeResults = results.filter(r => r.type === type);

            if (typeResults.length === 0) {
                container.innerHTML = `
                    <div class="text-center text-textSecondary py-4 text-sm">
                        No matches for "${helpers.escapeHtml(query)}"
                    </div>
                `;
                return;
            }

            container.innerHTML = typeResults.map(memory => `
                <div class="bg-bgLight p-3 rounded text-sm border-l-2 border-neonBlue" role="article">
                    <p class="text-textPrimary mb-1">${helpers.escapeHtml(memory.content)}</p>
                    <div class="flex items-center justify-between text-xs text-textSecondary">
                        <time datetime="${new Date(memory.timestamp).toISOString()}">
                            ${helpers.formatTime(memory.timestamp)}
                        </time>
                        <span class="text-neonBlue">Similarity: ${(memory.similarity * 100).toFixed(0)}%</span>
                    </div>
                </div>
            `).join('');
        });
    }
}

export const memoryModule = new MemoryModule();
