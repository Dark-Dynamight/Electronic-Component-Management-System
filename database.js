// Database Manager for ElectroManage
class DatabaseManager {
    constructor() {
        this.dbName = 'ElectroManageDB';
        this.version = 3;
        this.db = null;
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.createStores(db);
            };
        });
    }

    // Create object stores
    createStores(db) {
        // Users store
        if (!db.objectStoreNames.contains('users')) {
            const usersStore = db.createObjectStore('users', { keyPath: 'email' });
            usersStore.createIndex('name', 'name', { unique: false });
        }

        // Components store
        if (!db.objectStoreNames.contains('components')) {
            const componentsStore = db.createObjectStore('components', { keyPath: 'id' });
            componentsStore.createIndex('category', 'category', { unique: false });
            componentsStore.createIndex('name', 'name', { unique: false });
            componentsStore.createIndex('stock', 'stock', { unique: false });
        }

        // Cart store
        if (!db.objectStoreNames.contains('cart')) {
            const cartStore = db.createObjectStore('cart', { keyPath: 'id' });
            cartStore.createIndex('componentId', 'componentId', { unique: false });
        }

        // Settings store
        if (!db.objectStoreNames.contains('settings')) {
            const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
        }

        // Transactions store (for order history)
        if (!db.objectStoreNames.contains('transactions')) {
            const transactionsStore = db.createObjectStore('transactions', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            transactionsStore.createIndex('date', 'date', { unique: false });
        }
    }

    // Generic CRUD operations
    async add(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(data);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async getAll(storeName, indexName = null, query = null) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const target = indexName ? store.index(indexName) : store;
            const request = target.getAll(query);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async update(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    async delete(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(key);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // Specific component operations
    async addComponent(component) {
        if (!component.id) {
            component.id = this.generateId();
        }
        component.createdAt = new Date().toISOString();
        component.updatedAt = component.createdAt;
        return this.add('components', component);
    }

    async getComponent(id) {
        return this.get('components', id);
    }

    async getAllComponents() {
        return this.getAll('components');
    }

    async getComponentsByCategory(category) {
        return this.getAll('components', 'category', category);
    }

    async searchComponents(query) {
        const allComponents = await this.getAllComponents();
        const searchTerm = query.toLowerCase();
        
        return allComponents.filter(comp => 
            comp.name.toLowerCase().includes(searchTerm) ||
            (comp.description && comp.description.toLowerCase().includes(searchTerm)) ||
            comp.category.toLowerCase().includes(searchTerm)
        );
    }

    async updateComponent(id, updates) {
        const component = await this.getComponent(id);
        if (component) {
            Object.assign(component, updates, { updatedAt: new Date().toISOString() });
            return this.update('components', component);
        }
        throw new Error('Component not found');
    }

    async updateStock(id, quantityChange) {
        const component = await this.getComponent(id);
        if (component) {
            const newStock = component.stock + quantityChange;
            if (newStock < 0) throw new Error('Insufficient stock');
            
            component.stock = newStock;
            component.updatedAt = new Date().toISOString();
            return this.update('components', component);
        }
        throw new Error('Component not found');
    }

    // Cart operations
    async addToCart(componentId, quantity = 1) {
        const component = await this.getComponent(componentId);
        if (!component) throw new Error('Component not found');
        
        if (component.stock < quantity) {
            throw new Error('Insufficient stock');
        }

        const cartItem = {
            id: componentId,
            componentId: componentId,
            name: component.name,
            price: component.cost,
            quantity: quantity,
            maxQuantity: component.stock,
            addedAt: new Date().toISOString()
        };

        return this.add('cart', cartItem);
    }

    async getCartItems() {
        return this.getAll('cart');
    }

    async updateCartItem(componentId, quantity) {
        if (quantity <= 0) {
            return this.removeFromCart(componentId);
        }

        const component = await this.getComponent(componentId);
        if (!component) throw new Error('Component not found');
        
        if (component.stock < quantity) {
            throw new Error('Insufficient stock');
        }

        const cartItem = await this.get('cart', componentId);
        if (cartItem) {
            cartItem.quantity = quantity;
            cartItem.maxQuantity = component.stock;
            return this.update('cart', cartItem);
        }
        throw new Error('Cart item not found');
    }

    async removeFromCart(componentId) {
        return this.delete('cart', componentId);
    }

    async clearCart() {
        const cartItems = await this.getCartItems();
        const deletePromises = cartItems.map(item => this.delete('cart', item.id));
        return Promise.all(deletePromises);
    }

    // User operations
    async addUser(user) {
        // Hash password before storing (in a real app, use proper hashing)
        user.createdAt = new Date().toISOString();
        return this.add('users', user);
    }

    async getUser(email) {
        return this.get('users', email);
    }

    async validateUser(email, password) {
        const user = await this.getUser(email);
        if (user && user.password === password) { // In real app, use proper password hashing
            return { email: user.email, name: user.name };
        }
        return null;
    }

    // Settings operations
    async getSetting(key) {
        const setting = await this.get('settings', key);
        return setting ? setting.value : null;
    }

    async setSetting(key, value) {
        return this.update('settings', { key, value, updatedAt: new Date().toISOString() });
    }

    // Transaction operations (for order history)
    async addTransaction(transaction) {
        transaction.date = new Date().toISOString();
        transaction.id = this.generateId();
        return this.add('transactions', transaction);
    }

    async getTransactionHistory() {
        return this.getAll('transactions', 'date');
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Backup and restore
    async exportData() {
        const data = {
            components: await this.getAllComponents(),
            settings: await this.getAll('settings'),
            transactions: await this.getTransactionHistory(),
            exportDate: new Date().toISOString(),
            version: this.version
        };
        return data;
    }

    async importData(data) {
        // Clear existing data
        const stores = ['components', 'settings', 'transactions', 'cart'];
        
        for (const storeName of stores) {
            const items = await this.getAll(storeName);
            for (const item of items) {
                await this.delete(storeName, item.id || item.key);
            }
        }

        // Import new data
        if (data.components) {
            for (const component of data.components) {
                await this.addComponent(component);
            }
        }

        if (data.settings) {
            for (const setting of data.settings) {
                await this.setSetting(setting.key, setting.value);
            }
        }

        return true;
    }

    // Statistics and reporting
    async getInventoryStats() {
        const components = await this.getAllComponents();
        
        const totalComponents = components.length;
        const totalValue = components.reduce((sum, comp) => sum + (comp.stock * comp.cost), 0);
        const lowStockThreshold = parseInt(await this.getSetting('lowStockThreshold')) || 5;
        const lowStockItems = components.filter(comp => comp.stock < lowStockThreshold).length;
        const categories = new Set(components.map(comp => comp.category)).size;

        return {
            totalComponents,
            totalValue,
            lowStockItems,
            categories,
            lowStockThreshold
        };
    }

    async getCategoryBreakdown() {
        const components = await this.getAllComponents();
        const breakdown = {};

        components.forEach(comp => {
            if (!breakdown[comp.category]) {
                breakdown[comp.category] = {
                    count: 0,
                    value: 0,
                    items: []
                };
            }
            breakdown[comp.category].count++;
            breakdown[comp.category].value += comp.stock * comp.cost;
            breakdown[comp.category].items.push(comp);
        });

        return breakdown;
    }
}

// Create global database instance
const dbManager = new DatabaseManager();

// Initialize database and add demo data
async function initializeDatabase() {
    try {
        await dbManager.init();
        
        // Check if we need to add demo data
        const components = await dbManager.getAllComponents();
        if (components.length === 0) {
            await addDemoData();
        }

        console.log('Database initialized successfully');
        return dbManager;
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    }
}

// Add demo data
async function addDemoData() {
    const demoComponents = [
        {
            name: 'Arduino Uno R3',
            category: 'Microcontrollers',
            stock: 12,
            cost: 22.90,
            description: 'ATmega328P microcontroller board'
        },
        {
            name: 'Raspberry Pi 4 Model B',
            category: 'Microcontrollers',
            stock: 8,
            cost: 35.00,
            description: '4GB RAM version'
        },
        {
            name: 'DHT22 Temperature Sensor',
            category: 'Sensors',
            stock: 24,
            cost: 9.50,
            description: 'Digital temperature and humidity sensor'
        },
        {
            name: 'HC-SR04 Ultrasonic Sensor',
            category: 'Sensors',
            stock: 15,
            cost: 3.50,
            description: 'Ultrasonic distance measurement sensor'
        }
    ];

    for (const component of demoComponents) {
        await dbManager.addComponent(component);
    }

    // Add default settings
    await dbManager.setSetting('currency', 'INR');
    await dbManager.setSetting('lowStockThreshold', 5);
    await dbManager.setSetting('autoSync', false);

    console.log('Demo data added successfully');
}

export { dbManager, initializeDatabase };