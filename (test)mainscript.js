import { dbManager, initializeDatabase } from './database.js';

// Global variables
let currentCategory = 'all';
let searchQuery = '';
let currentPage = 'dashboard';
let currency = 'INR';
let lowStockThreshold = 5;

// Currency symbols mapping
const currencySymbols = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'INR': '₹'
};

// DOM Elements (keep your existing DOM references)

// Initialize the app with database
async function init() {
    try {
        await initializeDatabase();
        
        // Load settings
        currency = await dbManager.getSetting('currency') || 'INR';
        lowStockThreshold = parseInt(await dbManager.getSetting('lowStockThreshold')) || 5;
        
        // Update UI with settings
        if (currencySelect) currencySelect.value = currency;
        if (lowStockThresholdInput) lowStockThresholdInput.value = lowStockThreshold;
        
        updateCurrencySymbol();
        await loadComponents();
        await updateCart();
        await updateStats();
        setupEventListeners();
        
        console.log('App initialized with database');
    } catch (error) {
        console.error('App initialization failed:', error);
        showNotification('Failed to initialize application', true);
    }
}

// Update currency symbol
function updateCurrencySymbol() {
    if (currencySymbol) {
        currencySymbol.textContent = currencySymbols[currency];
    }
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

// Load components into the table
async function loadComponents(bodyId = 'componentsBody', emptyId = 'emptyState', tableId = 'componentsTable') {
    const componentsBody = document.getElementById(bodyId);
    const emptyState = document.getElementById(emptyId);
    const componentsTable = document.getElementById(tableId);
    
    if (!componentsBody || !emptyState || !componentsTable) return;
    
    componentsBody.innerHTML = '';
    
    let components;
    
    try {
        if (currentCategory !== 'all') {
            components = await dbManager.getComponentsByCategory(currentCategory);
        } else {
            components = await dbManager.getAllComponents();
        }
        
        // Filter by search query
        if (searchQuery) {
            components = components.filter(comp => 
                comp.name.toLowerCase().includes(searchQuery) || 
                (comp.description && comp.description.toLowerCase().includes(searchQuery))
            );
        }
        
        if (components.length === 0) {
            componentsTable.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            componentsTable.style.display = 'table';
            emptyState.style.display = 'none';
            
            components.forEach(component => {
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
    } catch (error) {
        console.error('Error loading components:', error);
        showNotification('Error loading components', true);
    }
}

// Update statistics
async function updateStats() {
    try {
        const stats = await dbManager.getInventoryStats();
        
        if (totalComponentsEl) totalComponentsEl.textContent = stats.totalComponents;
        if (totalValueEl) totalValueEl.textContent = formatCurrency(stats.totalValue);
        if (lowStockItemsEl) lowStockItemsEl.textContent = stats.lowStockItems;
        if (totalCategoriesEl) totalCategoriesEl.textContent = stats.categories;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Save component (add or update)
async function saveComponent() {
    const id = componentIdInput.value;
    const name = document.getElementById('componentName').value.trim();
    const category = document.getElementById('componentCategory').value;
    const stock = parseInt(document.getElementById('componentStock').value);
    const cost = parseFloat(document.getElementById('componentCost').value);
    const description = document.getElementById('componentDescription').value.trim();
    
    try {
        if (id) {
            // Update existing component
            await dbManager.updateComponent(id, { name, category, stock, cost, description });
            showNotification('Component updated successfully!');
        } else {
            // Add new component
            await dbManager.addComponent({ name, category, stock, cost, description });
            showNotification('Component added successfully!');
        }
        
        await loadComponents();
        await updateStats();
        closeModal();
    } catch (error) {
        console.error('Error saving component:', error);
        showNotification('Error saving component: ' + error.message, true);
    }
}

// Edit component
async function editComponent(id) {
    try {
        const component = await dbManager.getComponent(id);
        if (component) {
            openModal(component);
        }
    } catch (error) {
        console.error('Error editing component:', error);
        showNotification('Error loading component', true);
    }
}

// Delete component
async function deleteComponent(id) {
    if (confirm('Are you sure you want to delete this component?')) {
        try {
            await dbManager.delete('components', id);
            await loadComponents();
            await updateStats();
            showNotification('Component deleted successfully!');
        } catch (error) {
            console.error('Error deleting component:', error);
            showNotification('Error deleting component', true);
        }
    }
}

// Add to cart
async function addToCart(id) {
    try {
        await dbManager.addToCart(id, 1);
        await updateCart();
        showNotification('Component added to cart!');
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Error: ' + error.message, true);
    }
}

// Update cart
async function updateCart() {
    try {
        const cartItems = await dbManager.getCartItems();
        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        
        if (cartCountEl) cartCountEl.textContent = totalItems;
        
        if (currentPage === 'cart') {
            await loadCartItems();
        }
    } catch (error) {
        console.error('Error updating cart:', error);
    }
}

// Load cart items
async function loadCartItems() {
    if (!cartItemsContainer || !cartTotalEl) return;
    
    try {
        const cartItems = await dbManager.getCartItems();
        
        if (cartItems.length === 0) {
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
        
        cartItemsContainer.innerHTML = '';
        let total = 0;
        
        for (const item of cartItems) {
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
        }
        
        cartTotalEl.textContent = `Total: ${formatCurrency(total)}`;
        
        // Add event listeners to cart buttons
        document.querySelectorAll('.decrease-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                await updateCartItemQuantity(id, -1);
            });
        });
        
        document.querySelectorAll('.increase-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                await updateCartItemQuantity(id, 1);
            });
        });
        
        document.querySelectorAll('.cart-item .delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                await removeFromCart(id);
            });
        });
    } catch (error) {
        console.error('Error loading cart items:', error);
        showNotification('Error loading cart', true);
    }
}

// Update cart item quantity
async function updateCartItemQuantity(id, change) {
    try {
        const cartItem = await dbManager.get('cart', id);
        if (cartItem) {
            const newQuantity = cartItem.quantity + change;
            
            if (newQuantity < 1) {
                await removeFromCart(id);
            } else {
                await dbManager.updateCartItem(id, newQuantity);
                await updateCart();
            }
        }
    } catch (error) {
        console.error('Error updating cart quantity:', error);
        showNotification('Error: ' + error.message, true);
    }
}

// Remove from cart
async function removeFromCart(id) {
    try {
        await dbManager.removeFromCart(id);
        await updateCart();
    } catch (error) {
        console.error('Error removing from cart:', error);
        showNotification('Error removing item from cart', true);
    }
}

// Checkout process
async function checkout() {
    try {
        const cartItems = await dbManager.getCartItems();
        
        // Check stock availability
        for (const item of cartItems) {
            const component = await dbManager.getComponent(item.id);
            if (!component || component.stock < item.quantity) {
                throw new Error(`${item.name} is no longer available in the requested quantity.`);
            }
        }
        
        // Update stock levels and create transaction
        for (const item of cartItems) {
            await dbManager.updateStock(item.id, -item.quantity);
        }
        
        // Record transaction
        const transaction = {
            items: cartItems,
            total: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            date: new Date().toISOString()
        };
        
        await dbManager.addTransaction(transaction);
        
        // Clear cart
        await dbManager.clearCart();
        await updateCart();
        
        closeCheckoutModal();
        showNotification('Purchase completed successfully! Thank you for your order.');
        
        await loadComponents();
        await updateStats();
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('Checkout failed: ' + error.message, true);
        closeCheckoutModal();
        await updateCart();
    }
}

// Export data
async function exportData() {
    try {
        const data = await dbManager.exportData();
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `electromanage-backup-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        
        showNotification('Data exported successfully');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Error exporting data', true);
    }
}

// Import data
async function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            await dbManager.importData(data);
            
            // Reload everything
            currency = await dbManager.getSetting('currency') || 'INR';
            lowStockThreshold = parseInt(await dbManager.getSetting('lowStockThreshold')) || 5;
            
            currencySelect.value = currency;
            lowStockThresholdInput.value = lowStockThreshold;
            
            updateCurrencySymbol();
            await loadComponents();
            await updateCart();
            await updateStats();
            
            showNotification('Data imported successfully');
            event.target.value = '';
        } catch (error) {
            console.error('Import error:', error);
            showNotification('Error importing data: ' + error.message, true);
        }
    };
    reader.readAsText(file);
}

// Keep the rest of your existing functions (setupEventListeners, navigation, etc.)
// but update them to use async/await where needed

// Update your HTML to include the database module
// Add this to your html.html file before mainscript.js:
// <script type="module" src="./js/mainscript.js"></script>

// Initialize the application
document.addEventListener('DOMContentLoaded', init);