/**
 * Profile Module - User profile management
 */

import { stateManager } from '../core/state.js';
import { chainService } from '../core/chain.js';
import { ipfsService } from '../services/ipfs.js';
import { toast } from '../ui/toast.js';

export class ProfileModule {
    init() {
        this.render();
        this.attachEvents();
    }

    render() {
        const state = stateManager.getState();
        const profile = state.profile;

        document.getElementById('profileDisplayName').value = profile.displayName || '';
        document.getElementById('profileBio').value = profile.bio || '';
        document.getElementById('profileWebsite').value = profile.website || '';
        
        const initial = profile.displayName ? profile.displayName.charAt(0).toUpperCase() : '?';
        document.getElementById('profileAvatarDisplay').textContent = initial;
        
        // Update stats
        document.getElementById('profilePostsCount').textContent = state.posts.length;
        document.getElementById('profileFollowingCount').textContent = 0; // Placeholder
        document.getElementById('profileFollowersCount').textContent = 0; // Placeholder
    }

    attachEvents() {
        document.getElementById('btnSaveProfile').addEventListener('click', () => this.saveProfile());
        document.getElementById('btnUploadAvatar').addEventListener('click', () => this.uploadAvatar());
        
        const avatarInput = document.getElementById('avatarFileInput');
        avatarInput.addEventListener('change', (e) => this.handleAvatarUpload(e));
    }

    async saveProfile() {
        const displayName = document.getElementById('profileDisplayName').value;
        const bio = document.getElementById('profileBio').value;
        const website = document.getElementById('profileWebsite').value;

        const state = stateManager.getState();
        const updatedProfile = {
            ...state.profile,
            displayName,
            bio,
            website
        };

        await stateManager.setState({ profile: updatedProfile });
        await chainService.addEvent('profile:update', updatedProfile);
        
        this.render();
        toast.success('Profile saved successfully');
    }

    uploadAvatar() {
        document.getElementById('avatarFileInput').click();
    }

    async handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        try {
            toast.info('Uploading avatar to IPFS...');
            const cid = await ipfsService.add(file);
            
            const state = stateManager.getState();
            const updatedProfile = {
                ...state.profile,
                avatarCID: cid
            };

            await stateManager.setState({ profile: updatedProfile });
            await chainService.addEvent('profile:avatar', { cid });
            
            toast.success('Avatar uploaded: ' + cid);
            this.render();
        } catch (e) {
            toast.error('Avatar upload failed: ' + e.message);
        }
    }
}

export const profileModule = new ProfileModule();
