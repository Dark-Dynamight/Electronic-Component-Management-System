// firebase.js - Firebase configuration and database functions
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc,
    onSnapshot
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    authDomain: "electromanage-xxxxx.firebaseapp.com",
    projectId: "electromanage-xxxxx",
    storageBucket: "electromanage-xxxxx.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijklmnopqrstuvw"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

class FirebaseSync {
    constructor(userId) {
        this.userId = userId;
        this.isOnline = false;
        this.unsubscribe = null;
    }

    // Check connection status
    async checkConnection() {
        try {
            const docRef = doc(db, 'connectionTest', 'test');
            await setDoc(docRef, { timestamp: new Date() });
            this.isOnline = true;
            return true;
        } catch (error) {
            this.isOnline = false;
            return false;
        }
    }

    // Load data from Firebase
    async loadData() {
        try {
            const docRef = doc(db, 'users', this.userId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    components: data.components || [],
                    cart: data.cart || [],
                    settings: data.settings || {}
                };
            }
            return null;
        } catch (error) {
            console.error('Error loading data:', error);
            return null;
        }
    }

    // Save data to Firebase
    async saveData(components, cart, settings = {}) {
        try {
            const docRef = doc(db, 'users', this.userId);
            await setDoc(docRef, {
                components,
                cart,
                settings: {
                    currency: settings.currency || 'INR',
                    lowStockThreshold: settings.lowStockThreshold || 5,
                    lastSync: new Date().toISOString()
                },
                lastUpdated: new Date().toISOString()
            });
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    // Real-time sync listener
    startRealTimeSync(callback) {
        try {
            const docRef = doc(db, 'users', this.userId);
            this.unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    callback(data);
                }
            });
        } catch (error) {
            console.error('Error starting real-time sync:', error);
        }
    }

    // Stop real-time sync
    stopRealTimeSync() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }

    // Get sync status
    getSyncStatus() {
        return {
            isOnline: this.isOnline,
            lastSync: localStorage.getItem('lastSync') || 'Never'
        };
    }
}

// Export singleton instance
let firebaseInstance = null;

export function getFirebaseSync(userId) {
    if (!firebaseInstance || firebaseInstance.userId !== userId) {
        firebaseInstance = new FirebaseSync(userId);
    }
    return firebaseInstance;
}

export function getCurrentFirebaseSync() {
    return firebaseInstance;
}