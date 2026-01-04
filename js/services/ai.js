/**
 * AI Service - Unified AI adapter for Ollama (local) and Transformers.js (browser)
 */

export class AIService {
    constructor() {
        this.mode = 'none';
        this.client = null;
        this.loading = false;
    }

    /**
     * Initialize AI - try Ollama first, fallback to Transformers.js
     */
    async init() {
        // Try local Ollama first
        const ollamaAvailable = await this.tryOllama();
        if (ollamaAvailable) {
            return { mode: 'ollama', success: true };
        }

        // Fallback to browser-based Transformers.js
        const transformersAvailable = await this.tryTransformers();
        if (transformersAvailable) {
            return { mode: 'transformers', success: true };
        }

        return { mode: 'none', success: false };
    }

    /**
     * Try connecting to local Ollama
     */
    async tryOllama() {
        try {
            const response = await fetch('http://localhost:11434/api/tags', {
                cache: 'no-store',
                signal: AbortSignal.timeout(3000)
            });

            if (response.ok) {
                this.mode = 'ollama';
                this.client = { url: 'http://localhost:11434' };
                return true;
            }
        } catch (e) {
            console.log('Ollama not available, trying Transformers.js...');
        }
        return false;
    }

    /**
     * Initialize browser-based Transformers.js
     */
    async tryTransformers() {
        try {
            if (!window.transformersReady) {
                console.error('Transformers.js not loaded');
                return false;
            }

            this.loading = true;
            this.client = await window.transformersReady;
            this.mode = 'transformers';
            this.loading = false;
            return true;
        } catch (e) {
            console.error('Transformers.js initialization failed:', e);
            this.loading = false;
            return false;
        }
    }

    /**
     * Chat with AI
     */
    async chat(messages, onToken = null) {
        if (this.mode === 'none') {
            throw new Error('No AI service available');
        }

        if (this.mode === 'ollama') {
            return await this.chatOllama(messages, onToken);
        } else if (this.mode === 'transformers') {
            return await this.chatTransformers(messages, onToken);
        }
    }

    /**
     * Chat with Ollama
     */
    async chatOllama(messages, onToken) {
        const response = await fetch(`${this.client.url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.1:8b',
                messages: messages.map(m => ({
                    role: m.role === 'assistant' ? 'assistant' : 'user',
                    content: m.text
                })),
                stream: true
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const lines = decoder.decode(value).trim().split('\n');
            for (const line of lines) {
                try {
                    const json = JSON.parse(line);
                    if (json.message?.content) {
                        fullResponse += json.message.content;
                        if (onToken) onToken(json.message.content);
                    }
                } catch (e) {
                    // Skip invalid JSON lines
                }
            }
        }

        return fullResponse;
    }

    /**
     * Chat with Transformers.js
     */
    async chatTransformers(messages, onToken) {
        if (!this.client) {
            throw new Error('Model not loaded');
        }

        const prompt = messages.map(m => `${m.role}: ${m.text}`).join('\n') + '\nassistant:';
        const result = await this.client(prompt, {
            max_new_tokens: 150,
            temperature: 0.7,
            do_sample: true
        });

        const response = result[0].generated_text.split('assistant:').pop().trim();
        if (onToken) onToken(response);
        return response;
    }

    /**
     * Get current mode
     */
    getMode() {
        return this.mode;
    }

    /**
     * Check if loading
     */
    isLoading() {
        return this.loading;
    }
}

export const aiService = new AIService();
