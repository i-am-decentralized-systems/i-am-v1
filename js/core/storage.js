/**
 * Storage Module - IndexedDB wrapper for persistent storage
 * Handles all data persistence with versioning and migrations
 */

export class StorageService {
    constructor() {
        this.db = null;
        this.dbName = 'iam_unified';
        this.version = 2;
        this.stores = [
            'state',
            'posts',
            'videos',
            'repositories',
            'files',
            'memory',
            'conversations',
            'metadata'
        ];
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;

                // Create stores if they don't exist
                this.stores.forEach(storeName => {
                    if (!db.objectStoreNames.contains(storeName)) {
                        const store = db.createObjectStore(storeName, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        
                        // Add indexes for common queries
                        if (storeName === 'memory') {
                            store.createIndex('type', 'type', { unique: false });
                            store.createIndex('timestamp', 'timestamp', { unique: false });
                        }
                        if (storeName === 'posts') {
                            store.createIndex('timestamp', 'timestamp', { unique: false });
                        }
                    }
                });

                // Handle migrations
                this.handleMigrations(db, oldVersion);
            };
        });
    }

    /**
     * Handle database migrations
     */
    handleMigrations(db, oldVersion) {
        if (oldVersion < 2) {
            // Migration from v1 to v2: Add metadata store
            console.log('Migrating database from v1 to v2');
        }
    }

    /**
     * Store data
     */
    async set(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get data by key
     */
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all data from a store
     */
    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete data by key
     */
    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear entire store
     */
    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Query by index
     */
    async queryByIndex(storeName, indexName, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Clear all data (full wipe)
     */
    async clearAll() {
        const promises = this.stores.map(store => this.clear(store));
        await Promise.all(promises);
    }
}

export const storageService = new StorageService();
