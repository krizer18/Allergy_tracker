import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// API base URL from environment variable or default
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Use real Firebase config directly for now
const firebaseConfig = {
    apiKey: "AIzaSyC7Ftd-kWo-dCJ1gWoStVdti6gAJcagZ10",
    authDomain: "allergy-tracker-7394b.firebaseapp.com",
    projectId: "allergy-tracker-7394b",
    storageBucket: "allergy-tracker-7394b.firebasestorage.app",
    messagingSenderId: "239054855739",
    appId: "1:239054855739:web:1048635c53e454319d861e",
    measurementId: "G-TMT7QYQ7LV"
};

// Initialize Firebase with real config
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Fetch config from backend (for future use)
export async function getFirebaseConfigFromBackend() {
    try {
        const response = await fetch(`${API_BASE_URL}/firebase-config`);
        if (!response.ok) {
            throw new Error(`Failed to fetch Firebase config: ${response.status}`);
        }
        
        const config = await response.json();
        console.log('Firebase config fetched from backend');
        return config;
    } catch (error) {
        console.error('Error fetching Firebase config from backend:', error);
        return null;
    }
}

// This function can be called to test if the backend is working
export async function testBackendConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            const data = await response.json();
            console.log('Backend connection successful:', data);
            return true;
        }
    } catch (error) {
        console.error('Backend connection failed:', error);
    }
    return false;
}

// We're now using direct initialization with the API key
// This is a temporary solution until we implement proper backend initialization
console.log('Firebase initialized with direct config');