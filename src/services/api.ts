import { getAuthToken, getCurrentUser } from "./auth";

// Define ScrapeResult interface
export interface ScrapeResult {
  url: string;
  title: string;
  ingredients: string;
  error?: string;
  allergyFound?: boolean;
  allergyMatches?: string[];
}

// API base URL - use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://your-backend-url.com/api'
    : 'http://localhost:3000/api');

// Get Firebase configuration from backend
export async function getFirebaseConfig() {
  try {
    const response = await fetch(`${API_BASE_URL}/firebase-config`);
    if (!response.ok) {
      throw new Error('Failed to fetch Firebase config');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Firebase config:', error);
    throw error;
  }
}

// Using getAuthToken from auth.ts
// This function gets the authentication token for API requests
// The token is now a Firebase custom token from our backend

// Get user allergies
export async function getUserAllergies() {
  try {
    const token = await getAuthToken();
    const user = getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${API_BASE_URL}/allergies?uid=${user.uid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch allergies');
    }
    
    const data = await response.json();
    return data.allergies;
  } catch (error) {
    console.error('Error fetching allergies:', error);
    // Return empty array as fallback
    return [];
  }
}

// Save user allergies
export async function saveUserAllergies(allergies: string[]) {
  try {
    const token = await getAuthToken();
    const user = getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${API_BASE_URL}/allergies`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ allergies, uid: user.uid })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save allergies');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving allergies:', error);
    throw error;
  }
}

// Save scrape results
export async function saveScrapeResults(results: ScrapeResult[]) {
  try {
    const token = await getAuthToken();
    const user = getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${API_BASE_URL}/scrape-results`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ results, uid: user.uid })
    });
    
    if (!response.ok) {
      throw new Error('Failed to save scrape results');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving scrape results:', error);
    throw error;
  }
}

// Get latest scrape results
export async function getLatestScrapeResults() {
  try {
    // Get auth token - this will throw if user is not authenticated
    const token = await getAuthToken();
    const user = getCurrentUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const response = await fetch(`${API_BASE_URL}/scrape-results?uid=${user.uid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch scrape results');
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    // If error is authentication related, don't log it as it's expected when not logged in
    if (!(error instanceof Error && error.message === 'User not authenticated')) {
      console.error('Error fetching scrape results:', error);
    }
    // Return empty array as fallback
    return [];
  }
}