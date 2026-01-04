/**
 * Chat Module - AI chat interface
 */

import { stateManager } from '../core/state.js';
import { chainService } from '../core/chain.js';
import { aiService } from '../services/ai.js';
import { toast } from '../ui/toast.js';
import { helpers } from '../utils/helpers.js';

export class ChatModule {
    init() {
        this.render();
        this.attachEvents();
        this.updateAIMode();
    }

    render() {
        const state = stateManager.getState();
        const chatLog = document.getElementById('chatLog');

        if (state.messages.length === 0) {
            chatLog.innerHTML = `
                <div class="text-center text-textSecondary py-8">
                    <span class="text-4xl block mb-2" aria-hidden="true">💬</span>
                    <p>Start a conversation with your local AI...</p>
                    <p class="text-sm mt-2">Your conversations stay completely private</p>
                </div>
            `;
            return;
        }

        chatLog.innerHTML = state.messages.map(msg => {
            const isUser = msg.role === 'user';
            return `
                <div class="p-4 rounded-xl ${isUser ? 'bg-neonBlue/15 border-neonBlue/30' : 'bg-neonGreen/15 border-neonGreen/30'} border animate-fade-in" role="article">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="${isUser ? 'text-neonBlue' : 'text-neonGreen'} text-xl" aria-hidden="true">
                            ${isUser ? '👤' : '🤖'}
                        </span>
                        <strong class="${isUser ? 'text-neonBlue' : 'text-neonGreen'}">${msg.role.toUpperCase()}</strong>
                    </div>
                    <div class="whitespace-pre-wrap text-textPrimary">${helpers.escapeHtml(msg.text)}</div>
                </div>
            `;
        }).join('');

        // Scroll to bottom
        chatLog.scrollTop = chatLog.scrollHeight;
    }

    attachEvents() {
        document.getElementById('sendChat').addEventListener('click', () => this.sendMessage());
        
        document.getElementById('chatInput').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
    }

    updateAIMode() {
        const mode = aiService.getMode();
        const modeName = mode === 'ollama' ? 'Ollama (Local)' : 
                        mode === 'transformers' ? 'GPT-2 (Browser)' : 
                        'No AI Available';
        
        document.getElementById('aiModeName').textContent = modeName;
    }

    async sendMessage() {
        const input = document.getElementById('chatInput');
        const text = input.value.trim();
        
        if (!text) return;

        const sendBtn = document.getElementById('sendChat');
        input.value = '';
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<div class="spinner"></div>';

        const state = stateManager.getState();
        const messages = [...state.messages, { role: 'user', text }];
        
        await stateManager.setState({ messages });
        await chainService.addEvent('chat:user', { text });
        this.render();

        try {
            let aiResponse = '';
            const conversationHistory = messages.slice(-10);

            if (aiService.getMode() === 'ollama') {
                // Streaming response
                const aiMessages = [...messages, { role: 'assistant', text: '' }];
                await stateManager.setState({ messages: aiMessages }, false);
                
                aiResponse = await aiService.chat(conversationHistory, (token) => {
                    const currentMessages = stateManager.getState().messages;
                    currentMessages[currentMessages.length - 1].text += token;
                    stateManager.setState({ messages: currentMessages }, false);
                    this.render();
                });
                
                // Final state update
                const finalMessages = stateManager.getState().messages;
                await stateManager.setState({ messages: finalMessages });
            } else {
                // Non-streaming response
                const tempMessages = [...messages, { role: 'assistant', text: '...' }];
                await stateManager.setState({ messages: tempMessages }, false);
                this.render();
                
                aiResponse = await aiService.chat(conversationHistory);
                
                const finalMessages = [...messages, { role: 'assistant', text: aiResponse }];
                await stateManager.setState({ messages: finalMessages });
            }

            await chainService.addEvent('chat:ai', { text: aiResponse });
            this.render();
            
        } catch (e) {
            toast.error('AI error: ' + e.message);
            const errorMessages = [...messages, { 
                role: 'assistant', 
                text: `Error: ${e.message}` 
            }];
            await stateManager.setState({ messages: errorMessages });
            this.render();
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span class="flex items-center gap-2"><span>Send</span><span>→</span></span>';
        }
    }
}

export const chatModule = new ChatModule();
