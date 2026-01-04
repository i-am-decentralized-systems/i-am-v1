/**
 * Toast Notification System
 */

export class ToastService {
    constructor() {
        this.container = null;
    }

    init() {
        this.container = document.getElementById('toastContainer');
    }

    show(message, type = 'info', duration = 4000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        toast.setAttribute('aria-live', 'polite');
        
        const icon = this.getIcon(type);
        toast.innerHTML = `
            <span class="text-xl" aria-hidden="true">${icon}</span>
            <span>${this.escapeHtml(message)}</span>
        `;
        
        this.container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    success(message) {
        this.show(message, 'success');
    }

    error(message) {
        this.show(message, 'error');
    }

    warning(message) {
        this.show(message, 'warning');
    }

    info(message) {
        this.show(message, 'info');
    }
}

export const toast = new ToastService();
