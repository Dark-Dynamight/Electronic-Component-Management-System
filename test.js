// Data management
let components = JSON.parse(localStorage.getItem('electronicComponents')) || [];
let cart = JSON.parse(localStorage.getItem('componentCart')) || [];
let currentCategory = 'all';
let searchQuery = '';
let currentPage = 'dashboard';
let currency = localStorage.getItem('currency') || 'INR';
let lowStockThreshold = parseInt(localStorage.getItem('lowStockThreshold')) || 5;
let githubToken = localStorage.getItem('githubToken') || '';
let autoSync = localStorage.getItem('autoSync') !== 'false'; // Default to true
let gistId = localStorage.getItem('gistId') || '';

// Currency symbols mapping
const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'INR': '₹'
};

// DOM Elements
const componentsBody = document.getElementById('componentsBody');
const componentsBody2 = document.getElementById('componentsBody2');
const componentsTable = document.getElementById('componentsTable');
const componentsTable2 = document.getElementById('componentsTable2');
const emptyState = document.getElementById('emptyState');
const emptyState2 = document.getElementById('emptyState2');
const modal = document.getElementById('componentModal');
const checkoutModal = document.getElementById('checkoutModal');
const form = document.getElementById('componentForm');
const modalTitle = document.getElementById('modalTitle');
const componentIdInput = document.getElementById('componentId');
const categoryItems = document.querySelectorAll('.categories li');
const searchInput = document.getElementById('searchInput');
const currentCategoryHeader = document.getElementById('currentCategory');
const cartItemsContainer = document.getElementById('cartItems');
const cartTotalEl = document.getElementById('cartTotal');
const cartCountEl = document.querySelector('.cart-count');
const cartIcon = document.getElementById('cartIcon');
const navLinks = document.querySelectorAll('.nav-link');
const pageSections = document.querySelectorAll('.page-section');
const checkoutSummary = document.getElementById('checkoutSummary');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');
const currencySelect = document.getElementById('currencySelect');
const currencySymbol = document.getElementById('currencySymbol');
const lowStockThresholdInput = document.getElementById('lowStockThreshold');
const exportDataBtn = document.getElementById('exportData');
const importFileInput = document.getElementById('importFile');
const resetDataBtn = document.getElementById('resetDataBtn');
const githubTokenSettings = document.getElementById('githubTokenSettings');
const saveGithubToken = document.getElementById('saveGithubToken');
const autoSyncCheckbox = document.getElementById('autoSync');
const manualSyncBtn = document.getElementById('manualSyncBtn');

// Stats elements
const totalComponentsEl = document.getElementById('totalComponents');
const totalValueEl = document.getElementById('totalValue');
const lowStockItemsEl = document.getElementById('lowStockItems');
const totalCategoriesEl = document.getElementById('totalCategories');

// Initialize the app
function init() {
    // Load saved settings
    if (localStorage.getItem('currency')) {
        currencySelect.value = localStorage.getItem('currency');
    }
    
    if (localStorage.getItem('lowStockThreshold')) {
        lowStockThresholdInput.value = localStorage.getItem('lowStockThreshold');
    }
    
    // Load GitHub token if exists
    if (githubToken) {
        githubTokenSettings.value = githubToken;
    }
    
    // Set auto sync checkbox
    autoSyncCheckbox.checked = autoSync;
    
    updateCurrencySymbol();
    loadComponents();
    updateCart();
    updateStats();
    setupEventListeners();
    
    // Add some sample data if empty
    if (components.length === 0) {
        addSampleData();
    }
    
    // Try to load from GitHub if token exists
    if (githubToken && gistId) {
        loadFromGitHub();
    }
}

// Update currency symbol
function updateCurrencySymbol() {
    currencySymbol.textContent = currencySymbols[currency];
}

// Format currency
function formatCurrency(amount) {
    return `${currencySymbols[currency]}${amount.toFixed(2)}`;
}

// Show notification
function showNotification(message, isError = false) {
    if (!notification || !notificationText) return;
    
    notificationText.textContent = message;
    notification.classList.remove('error');
    
    if (isError) {
        notification.classList.add('error');
    }
    
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Add sample data for demonstration
function addSampleData() {
    const sampleData = [
        { id: generateId(), name: 'Arduino Uno R3', category: 'Microcontrollers', stock: 12, cost: 22.90, description: 'ATmega328P microcontroller board' },
        { id: generateId(), name: 'Raspberry Pi 4 Model B', category: 'Microcontrollers', stock: 8, cost: 35.00, description: '4GB RAM version' },
        { id: generateId(), name: 'DHT22 Temperature Sensor', category: 'Sensors', stock: 24, cost: 9.50, description: 'Digital temperature and humidity sensor' },
        { id: generateId(), name: 'HC-SR04 Ultrasonic Sensor', category: 'Sensors', stock: 15, cost: 3.50, description: 'Ultrasonic distance measurement sensor' },
        { id: generateId(), name: 'SG90 Servo Motor', category: 'Actuators', stock: 20, cost: 4.25, description: 'Micro servo motor' },
        { id: generateId(), name: '12V Power Supply', category: 'Power', stock: 10, cost: 15.99, description: '12V 2A DC power supply' },
        { id: generateId(), name: 'Jumper Wires Pack', category: 'Wires & Cables', stock: 30, cost: 6.99, description: '40-piece jumper wire set' },
        { id: generateId(), name: 'Breadboard', category: 'Tools & Equipment', stock: 18, cost: 8.50, description: '400-point solderless breadboard' }
    ];
    
    components = [...components, ...sampleData];
    saveComponents();
    loadComponents();
    updateStats();
}

// GitHub Sync Functions
async function syncWithGitHub() {
    if (!githubToken) {
        showNotification('GitHub token is required for sync', true);
        return false;
    }
    
    showNotification('Syncing with GitHub...');
    
    try {
        // Prepare data for sync
        const syncData = {
            components,
            cart,
            currency,
            lowStockThreshold,
            lastSync: new Date().toISOString(),
            userId: localStorage.getItem('currentUser') ? JSON.parse(localStorage.getItem('currentUser')).email : 'anonymous'
        };
        
        // Check if we already have a gist ID
        if (gistId) {
            // Update existing gist
            await updateGist(syncData);
        } else {
            // Create new gist
            await createGist(syncData);
        }
        
        showNotification('Data synced successfully with GitHub');
        return true;
        
    } catch (error) {
        console.error('Sync error:', error);
        showNotification('Failed to sync with GitHub: ' + error.message, true);
        return false;
    }
}

async function createGist(data) {
    const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            description: 'ElectroManage Component Data',
            public: false,
            files: {
                'electromanage-data.json': {
                    content: JSON.stringify(data, null, 2)
                }
            }
        })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }
    
    const result = await response.json();
    gistId = result.id;
    localStorage.setItem('gistId', gistId);
    return result;
}

async function updateGist(data) {
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `token ${githubToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            description: 'ElectroManage Component Data - Last update: ' + new Date().toLocaleString(),
            files: {
                'electromanage-data.json': {
                    content: JSON.stringify(data, null, 2)
                }
            }
        })
    });
    
    if (!response.ok) {
        // If gist doesn't exist anymore, clear the ID and try creating a new one
        if (response.status === 404) {
            localStorage.removeItem('gistId');
            gistId = '';
            return createGist(data);
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
    }
    
    return response.json();
}

async function loadFromGitHub() {
    if (!githubToken || !gistId) {
        return false;
    }
    
    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }
        
        const gist = await response.json();
        const content = gist.files['electromanage-data.json'].content;
        const data = JSON.parse(content);
        
        // Apply the synced data
        if (data.components) {
            components = data.components;
            localStorage.setItem('electronicComponents', JSON.stringify(components));
        }
        
        if (data.cart) {
            cart = data.cart;
            localStorage.setItem('componentCart', JSON.stringify(cart));
        }
        
        if (data.currency) {
            currency = data.currency;
            localStorage.setItem('currency', currency);
            if (currencySelect) currencySelect.value = currency;
        }
        
        if (data.lowStockThreshold) {
            lowStockThreshold = data.lowStockThreshold;
            localStorage.setItem('lowStockThreshold', lowStockThreshold);
            if (lowStockThresholdInput) lowStockThresholdInput.value = lowStockThreshold;
        }
        
        updateCurrencySymbol();
        loadComponents();
        updateCart();
        updateStats();
        
        showNotification('Data loaded from GitHub');
        return true;
        
    } catch (error) {
        console.error('Load from GitHub error:', error);
        showNotification('Failed to load data from GitHub: ' + error.message, true);
        return false;
    }
}

// Set up event listeners
function setupEventListeners() {
    // Modal functionality
    document.getElementById('addComponentBtn').addEventListener('click', () => openModal());
    document.getElementById('addComponentBtn2').addEventListener('click', () => openModal());
    document.querySelector('.close').addEventListener('click', () => closeModal());
    document.getElementById('cancelBtn').addEventListener('click', () => closeModal());
    
    // Form submission
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveComponent();
    });
    
    // Category filtering
    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            const category = item.getAttribute('data-category');
            setActiveCategory(item, category);
        });
    });
    
    // Search functionality
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        loadComponents();
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
        if (e.target === checkoutModal) {
            closeCheckoutModal();
        }
    });
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            navigateTo(page);
        });
    });
    
    // Cart icon
    cartIcon.addEventListener('click', () => {
        navigateTo('cart');
    });
    
    // Checkout functionality
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        openCheckoutModal();
    });
    
    document.getElementById('cancelCheckoutBtn').addEventListener('click', () => {
        closeCheckoutModal();
    });
    
    document.getElementById('confirmCheckoutBtn').addEventListener('click', () => {
        checkout();
    });
    
    // Close checkout modal
    checkoutModal.querySelector('.close').addEventListener('click', () => {
        closeCheckoutModal();
    });
    
    // Settings changes
    currencySelect.addEventListener('change', (e) => {
        currency = e.target.value;
        localStorage.setItem('currency', currency);
        updateCurrencySymbol();
        loadComponents();
        updateStats();
        if (autoSync && githubToken) syncWithGitHub();
        showNotification('Currency changed successfully');
    });
    
    lowStockThresholdInput.addEventListener('change', (e) => {
        lowStockThreshold = parseInt(e.target.value);
        localStorage.setItem('lowStockThreshold', lowStockThreshold);
        updateStats();
        if (autoSync && githubToken) syncWithGitHub();
        showNotification('Low stock threshold updated');
    });
    
    // Export data
    exportDataBtn.addEventListener('click', () => {
        exportData();
    });
    
    // Import data
    importFileInput.addEventListener('change', (e) => {
        importData(e);
    });
    
    // Reset data
    resetDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset all data? This action cannot be undone.')) {
            resetData();
        }
    });
    
    // GitHub token save
    saveGithubToken.addEventListener('click', () => {
        githubToken = githubTokenSettings.value;
        localStorage.setItem('githubToken', githubToken);
        showNotification('GitHub token saved successfully');
    });
    
    // Auto sync toggle
    autoSyncCheckbox.addEventListener('change', (e) => {
        autoSync = e.target.checked;
        localStorage.setItem('autoSync', autoSync);
        showNotification(`Auto sync ${autoSync ? 'enabled' : 'disabled'}`);
    });
    
    // Manual sync button
    if (manualSyncBtn) {
        manualSyncBtn.addEventListener('click', () => {
            syncWithGitHub();
        });
    }
}

// Export data
function exportData() {
    const data = {
        components: components,
        cart: cart,
        currency: currency,
        lowStockThreshold: lowStockThreshold,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `electromanage-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    
    showNotification('Data exported successfully');
}

// Import data
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.components) {
                components = data.components;
                localStorage.setItem('electronicComponents', JSON.stringify(components));
            }
            
            if (data.cart) {
                cart = data.cart;
                localStorage.setItem('componentCart', JSON.stringify(cart));
            }
            
            if (data.currency) {
                currency = data.currency;
                localStorage.setItem('currency', currency);
                currencySelect.value = currency;
            }
            
            if (data.lowStockThreshold) {
                lowStockThreshold = data.lowStockThreshold;
                localStorage.setItem('lowStockThreshold', lowStockThreshold);
                lowStockThresholdInput.value = lowStockThreshold;
            }
            
            updateCurrencySymbol();
            loadComponents();
            updateCart();
            updateStats();
            
            if (autoSync && githubToken) syncWithGitHub();
            
            showNotification('Data imported successfully');
            
            // Reset the file input
            event.target.value = '';
        } catch (error) {
            showNotification('Error importing data: Invalid file format', true);
            console.error('Import error:', error);
        }
    };
    reader.readAsText(file);
}

// Reset all data
function resetData() {
    components = [];
    cart = [];
    localStorage.removeItem('electronicComponents');
    localStorage.removeItem('componentCart');
    
    // Reset to default settings
    currency = 'INR';
    lowStockThreshold = 5;
    localStorage.setItem('currency', currency);
    localStorage.setItem('lowStockThreshold', lowStockThreshold);
    
    currencySelect.value = currency;
    lowStockThresholdInput.value = lowStockThreshold;
    
    updateCurrencySymbol();
    loadComponents();
    updateCart();
    updateStats();
    
    if (autoSync && githubToken) syncWithGitHub();
    
    showNotification('All data has been reset');
}

// Navigation function
function navigateTo(page) {
    // Update navigation
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') === page) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // Update page sections
    pageSections.forEach(section => {
        if (section.id === page) {
            section.classList.add('active');
        } else {
            section.classList.remove('active');
        }
    });
    
    currentPage = page;
    
    // Load appropriate data
    if (page === 'components') {
        loadComponents('componentsBody2', 'emptyState2', 'componentsTable2');
    } else if (page === 'cart') {
        loadCartItems();
    } else if (page === 'reports') {
        generateReports();
    }
}

// Set active category
function setActiveCategory(selectedItem, category) {
    categoryItems.forEach(item => item.classList.remove('active'));
    selectedItem.classList.add('active');
    currentCategory = category;
    currentCategoryHeader.textContent = selectedItem.textContent;
    loadComponents();
}

// Load components into the table
function loadComponents(bodyId = 'componentsBody', emptyId = 'emptyState', tableId = 'componentsTable') {
    const componentsBody = document.getElementById(bodyId);
    const emptyState = document.getElementById(emptyId);
    const componentsTable = document.getElementById(tableId);
    
    if (!componentsBody || !emptyState || !componentsTable) return;
    
    componentsBody.innerHTML = '';
    
    let filteredComponents = components;
    
    // Filter by category
    if (currentCategory !== 'all') {
        filteredComponents = filteredComponents.filter(comp => comp.category === currentCategory);
    }
    
    // Filter by search query
    if (searchQuery) {
        filteredComponents = filteredComponents.filter(comp => 
            comp.name.toLowerCase().includes(searchQuery) || 
            (comp.description && comp.description.toLowerCase().includes(searchQuery))
        );
    }
    
    if (filteredComponents.length === 0) {
        componentsTable.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        componentsTable.style.display = 'table';
        emptyState.style.display = 'none';
        
        filteredComponents.forEach(component => {
            const totalValue = component.stock * component.cost;
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${component.name}</td>
                <td>${component.category}</td>
                <td>${component.stock}</td>
                <td>${formatCurrency(component.cost)}</td>
                <td>${formatCurrency(totalValue)}</td>
                <td class="action-buttons">
                    <button class="action-btn edit-btn" data-id="${component.id}"><i class="fas fa-edit"></i></button>
                    <button class="action-btn delete-btn" data-id="${component.id}"><i class="fas fa-trash"></i></button>
                    <button class="action-btn cart-btn" data-id="${component.id}"><i class="fas fa-cart-plus"></i></button>
                </td>
            `;
            
            componentsBody.appendChild(row);
        });
        
        // Add event listeners to action buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                editComponent(id);
            });
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                deleteComponent(id);
            });
        });
        
        document.querySelectorAll('.cart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                addToCart(id);
            });
        });
    }
}

// Update statistics
function updateStats() {
    // Total components
    if (totalComponentsEl) totalComponentsEl.textContent = components.length;
    
    // Total value
    const totalValue = components.reduce((sum, comp) => sum + (comp.stock * comp.cost), 0);
    if (totalValueEl) totalValueEl.textContent = formatCurrency(totalValue);
    
    // Low stock items (based on threshold)
    const lowStockCount = components.filter(comp => comp.stock < lowStockThreshold).length;
    if (lowStockItemsEl) lowStockItemsEl.textContent = lowStockCount;
    
    // Unique categories
    const uniqueCategories = new Set(components.map(comp => comp.category));
    if (totalCategoriesEl) totalCategoriesEl.textContent = uniqueCategories.size;
}

// Generate reports
function generateReports() {
    // Category distribution
    const categoryCount = new Set(components.map(comp => comp.category)).size;
    if (document.getElementById('categoryDistribution')) {
        document.getElementById('categoryDistribution').textContent = `${categoryCount} Categories`;
    }
    
    // Total inventory
    if (document.getElementById('totalInventory')) {
        document.getElementById('totalInventory').textContent = `${components.length} Items`;
    }
    
    // Low stock report
    const lowStockCount = components.filter(comp => comp.stock < lowStockThreshold).length;
    if (document.getElementById('lowStockReport')) {
        document.getElementById('lowStockReport').textContent = `${lowStockCount} Items`;
    }
    
    // Total worth
    const totalWorth = components.reduce((sum, comp) => sum + (comp.stock * comp.cost), 0);
    if (document.getElementById('totalWorth')) {
        document.getElementById('totalWorth').textContent = formatCurrency(totalWorth);
    }
    
    // Inventory summary
    const summaryContainer = document.getElementById('inventorySummary');
    if (summaryContainer) {
        summaryContainer.innerHTML = '';
        
        // Create category breakdown
        const categories = {};
        components.forEach(comp => {
            if (!categories[comp.category]) {
                categories[comp.category] = {
                    count: 0,
                    value: 0
                };
            }
            categories[comp.category].count += 1;
            categories[comp.category].value += comp.stock * comp.cost;
        });
        
        for (const category in categories) {
            const categoryEl = document.createElement('div');
            categoryEl.style.padding = '10px';
            categoryEl.style.borderBottom = '1px solid #eee';
            categoryEl.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <strong>${category}</strong>
                    <span>${categories[category].count} items (${formatCurrency(categories[category].value)})</span>
                </div>
            `;
            summaryContainer.appendChild(categoryEl);
        }
    }
}

// Open modal for adding/editing
function openModal(component = null) {
    if (!modal) return;
    
    if (component) {
        modalTitle.textContent = 'Edit Component';
        componentIdInput.value = component.id;
        document.getElementById('componentName').value = component.name;
        document.getElementById('componentCategory').value = component.category;
        document.getElementById('componentStock').value = component.stock;
        document.getElementById('componentCost').value = component.cost;
        document.getElementById('componentDescription').value = component.description || '';
    } else {
        modalTitle.textContent = 'Add New Component';
        form.reset();
        componentIdInput.value = '';
    }
    
    modal.style.display = 'flex';
}

// Close modal
function closeModal() {
    if (!modal) return;
    
    modal.style.display = 'none';
    form.reset();
}

// Save component (add or update)
function saveComponent() {
    const id = componentIdInput.value;
    const name = document.getElementById('componentName').value;
    const category = document.getElementById('componentCategory').value;
    const stock = parseInt(document.getElementById('componentStock').value);
    const cost = parseFloat(document.getElementById('componentCost').value);
    const description = document.getElementById('componentDescription').value;
    
    if (id) {
        // Update existing component
        const index = components.findIndex(comp => comp.id === id);
        if (index !== -1) {
            components[index] = { id, name, category, stock, cost, description };
        }
    } else {
        // Add new component
        components.push({ 
            id: generateId(), 
            name, 
            category, 
            stock, 
            cost, 
            description 
        });
    }
    
    saveComponents();
    loadComponents();
    updateStats();
    closeModal();
    
    // Show notification
    showNotification(`Component ${id ? 'updated' : 'added'} successfully!`);
}

// Edit component
function editComponent(id) {
    const component = components.find(comp => comp.id === id);
    if (component) {
        openModal(component);
    }
}

// Delete component
function deleteComponent(id) {
    if (confirm('Are you sure you want to delete this component?')) {
        components = components.filter(comp => comp.id !== id);
        saveComponents();
        loadComponents();
        updateStats();
        
        // Show notification
        showNotification('Component deleted successfully!');
    }
}

// Add to cart
function addToCart(id) {
    const component = components.find(comp => comp.id === id);
    if (component) {
        // Check if already in cart
        const existingItem = cart.find(item => item.id === id);
        
        if (existingItem) {
            if (existingItem.quantity < component.stock) {
                existingItem.quantity += 1;
            } else {
                showNotification(`Cannot add more. Only ${component.stock} available in stock.`, true);
                return;
            }
        } else {
            cart.push({
                id: component.id,
                name: component.name,
                price: component.cost,
                quantity: 1,
                maxQuantity: component.stock
            });
        }
        
        updateCart();
        showNotification(`Added ${component.name} to cart!`);
    }
}

// Update cart
function updateCart() {
    // Save cart
    localStorage.setItem('componentCart', JSON.stringify(cart));
    
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountEl) cartCountEl.textContent = totalItems;
    
    // If on cart page, reload cart items
    if (currentPage === 'cart') {
        loadCartItems();
    }
    
    // Sync with GitHub if enabled
    if (autoSync && githubToken) {
        syncWithGitHub();
    }
}

// Save components to localStorage
function saveComponents() {
    localStorage.setItem('electronicComponents', JSON.stringify(components));
    
    // Sync with GitHub if enabled
    if (autoSync && githubToken) {
        syncWithGitHub();
    }
}

// Load cart items
function loadCartItems() {
    if (!cartItemsContainer || !cartTotalEl) return;
    
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-cart"></i>
                <h3>Your cart is empty</h3>
                <p>Add components to your cart from the components page</p>
            </div>
        `;
        cartTotalEl.textContent = `Total: ${formatCurrency(0)}`;
        return;
    }
    
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItemEl = document.createElement('div');
        cartItemEl.className = 'cart-item';
        cartItemEl.innerHTML = `
            <div class="cart-item-details">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${formatCurrency(item.price)} each</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn decrease-btn" data-id="${item.id}">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn increase-btn" data-id="${item.id}">+</button>
                <button class="action-btn delete-btn" data-id="${item.id}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        
        cartItemsContainer.appendChild(cartItemEl);
    });
    
    cartTotalEl.textContent = `Total: ${formatCurrency(total)}`;
    
    // Add event listeners to cart buttons
    document.querySelectorAll('.decrease-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            updateCartItemQuantity(id, -1);
        });
    });
    
    document.querySelectorAll('.increase-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            updateCartItemQuantity(id, 1);
        });
    });
    
    document.querySelectorAll('.cart-item .delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            removeFromCart(id);
        });
    });
}

// Update cart item quantity
function updateCartItemQuantity(id, change) {
    const item = cart.find(item => item.id === id);
    if (item) {
        const newQuantity = item.quantity + change;
        
        if (newQuantity < 1) {
            removeFromCart(id);
        } else if (newQuantity > item.maxQuantity) {
            showNotification(`Cannot add more. Only ${item.maxQuantity} available in stock.`, true);
        } else {
            item.quantity = newQuantity;
            updateCart();
        }
    }
}

// Remove from cart
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCart();
}

// Open checkout modal
function openCheckoutModal() {
    if (!checkoutModal || !checkoutSummary) return;
    
    if (cart.length === 0) {
        showNotification('Your cart is empty!', true);
        return;
    }
    
    checkoutSummary.innerHTML = '';
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const itemEl = document.createElement('div');
        itemEl.style.padding = '10px';
        itemEl.style.borderBottom = '1px solid #eee';
        itemEl.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <div>${item.name} x${item.quantity}</div>
                <div>${formatCurrency(itemTotal)}</div>
            </div>
        `;
        checkoutSummary.appendChild(itemEl);
    });
    
    const totalEl = document.createElement('div');
    totalEl.style.padding = '10px';
    totalEl.style.fontWeight = 'bold';
    totalEl.style.borderTop = '2px solid var(--primary-light)';
    totalEl.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
            <div>Total:</div>
            <div>${formatCurrency(total)}</div>
        </div>
    `;
    checkoutSummary.appendChild(totalEl);
    
    checkoutModal.style.display = 'flex';
}

// Close checkout modal
function closeCheckoutModal() {
    if (!checkoutModal) return;
    
    checkoutModal.style.display = 'none';
}

// Checkout process
function checkout() {
    // Check if all items are still in stock
    for (const item of cart) {
        const component = components.find(comp => comp.id === item.id);
        if (!component || component.stock < item.quantity) {
            showNotification(`Sorry, ${item.name} is no longer available in the requested quantity.`, true);
            closeCheckoutModal();
            updateCart();
            return;
        }
    }
    
    // Update stock levels
    for (const item of cart) {
        const component = components.find(comp => comp.id === item.id);
        if (component) {
            component.stock -= item.quantity;
        }
    }
    
    // Save components
    saveComponents();
    
    // Clear cart
    cart = [];
    updateCart();
    
    // Close modal and show success message
    closeCheckoutModal();
    showNotification('Purchase completed successfully! Thank you for your order.');
    
    // Reload components and stats
    loadComponents();
    updateStats();
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', init);