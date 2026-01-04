/**
 * Router - Tab-based navigation system
 */

export class Router {
    constructor() {
        this.currentView = 'onboarding';
        this.views = {};
        this.onNavigate = null;
    }

    init() {
        // Get all tab buttons
        document.querySelectorAll('.tab').forEach(button => {
            button.addEventListener('click', () => {
                this.navigateTo(button.dataset.tab);
            });
        });

        // Get all view containers
        document.querySelectorAll('[id^="view-"]').forEach(view => {
            const viewName = view.id.replace('view-', '');
            this.views[viewName] = view;
        });
    }

    navigateTo(viewName) {
        // Hide all views
        Object.values(this.views).forEach(view => {
            view.classList.add('hidden');
        });

        // Show target view
        if (this.views[viewName]) {
            this.views[viewName].classList.remove('hidden');
            this.currentView = viewName;

            // Update active tab
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            const activeTab = document.querySelector(`[data-tab="${viewName}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
            }

            // Trigger navigation callback
            if (this.onNavigate) {
                this.onNavigate(viewName);
            }
        }
    }

    getCurrentView() {
        return this.currentView;
    }

    setNavigationHandler(handler) {
        this.onNavigate = handler;
    }
}

export const router = new Router();
