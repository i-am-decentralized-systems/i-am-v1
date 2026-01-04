/**
 * Social Module - Social networking features
 */

import { stateManager } from '../core/state.js';
import { chainService } from '../core/chain.js';
import { toast } from '../ui/toast.js';
import { helpers } from '../utils/helpers.js';

export class SocialModule {
    init() {
        this.render();
        this.attachEvents();
    }

    render() {
        const state = stateManager.getState();
        const feed = document.getElementById('socialFeed');

        if (state.posts.length === 0) {
            feed.innerHTML = `
                <div class="card text-center py-8">
                    <span class="text-4xl block mb-2" aria-hidden="true">💬</span>
                    <p class="text-textSecondary">No posts yet. Create your first post!</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = state.posts.slice(0, 50).map(post => `
            <article class="card" role="article">
                <div class="flex items-center gap-2 mb-2">
                    <div class="w-8 h-8 rounded-full bg-neonBlue/30 flex items-center justify-center text-sm font-bold">
                        ${post.displayName ? post.displayName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div class="flex-1">
                        <p class="mono text-xs text-textSecondary">
                            ${helpers.truncate(post.did || state.did, 20)} • 
                            <time datetime="${new Date(post.timestamp).toISOString()}">
                                ${helpers.formatTime(post.timestamp)}
                            </time>
                        </p>
                    </div>
                </div>
                <p class="text-textPrimary whitespace-pre-wrap">${helpers.escapeHtml(post.content)}</p>
            </article>
        `).join('');
    }

    attachEvents() {
        document.getElementById('btnPublishPost').addEventListener('click', () => this.publishPost());
        
        // Allow Enter to submit
        document.getElementById('postContent').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.publishPost();
            }
        });
    }

    async publishPost() {
        const content = document.getElementById('postContent').value.trim();
        const state = stateManager.getState();

        if (!content) {
            toast.warning('Please enter post content');
            return;
        }

        if (!state.did) {
            toast.error('Create identity first');
            return;
        }

        const post = {
            did: state.did,
            displayName: state.profile.displayName,
            content,
            timestamp: Date.now()
        };

        const posts = [post, ...state.posts];
        await stateManager.setState({ posts });
        await chainService.addEvent('post:create', post);

        document.getElementById('postContent').value = '';
        this.render();
        toast.success('Post published successfully');
    }
}

export const socialModule = new SocialModule();
