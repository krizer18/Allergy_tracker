import { type FormEvent, useEffect, useState } from "react";
import { testBackendConnection } from "../../firebase.ts";
import { signIn, signUp, signInWithGoogle, signOutUser, getCurrentUser, type User } from "../../services/auth";
import { highlightAllergies } from "../../utils/allergyChecker";
import { getUserAllergies, saveUserAllergies as apiSaveUserAllergies, saveScrapeResults as apiSaveScrapeResults, getLatestScrapeResults,
    type ScrapeResult } from "../../services/api";

import './Registration.css';
import { FaGoogle } from 'react-icons/fa';

export default function Registration() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loginError, setLoginError] = useState<string>('');
    const [scrapeResults, setScrapeResults] = useState<ScrapeResult[]>([]);
    const [allergies, setAllergies] = useState<string[]>([]);
    const [newAllergy, setNewAllergy] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    
    // Initialize user state from auth service
    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setCurrentUser(user);
            loadUserAllergies(user.uid);
            loadLatestScrapeResults(user.uid);
        }
    }, []);
    
    // Check localStorage for user access
    useEffect(() => {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser && parsedUser.uid) {
                    setCurrentUser(parsedUser);
                    loadUserAllergies(parsedUser.uid);
                    loadLatestScrapeResults(parsedUser.uid);
                }
            } catch (err) {
                console.error('Error parsing stored user:', err);
                localStorage.removeItem('currentUser');
            }
        }
    }, []);
    
    // Load allergies from localStorage
    useEffect(() => {
        const storedAllergies = localStorage.getItem('userAllergies');
        if (storedAllergies) {
            try {
                const parsedAllergies = JSON.parse(storedAllergies);
                if (Array.isArray(parsedAllergies)) {
                    setAllergies(parsedAllergies);
                }
            } catch (err) {
                console.error('Error parsing stored allergies:', err);
            }
        }
    }, []);

    // Load user allergies from backend API
    const loadUserAllergies = async (userId: string) => {
        if (!userId) return;

        try {
            // Get allergies from backend API
            const userAllergies = await getUserAllergies();
            setAllergies(userAllergies || []);
        } catch (err) {
            console.error('Error loading allergies from API:', err);
            // Try to load from localStorage as fallback
            const storedAllergies = localStorage.getItem('userAllergies');
            if (storedAllergies) {
                try {
                    const parsedAllergies = JSON.parse(storedAllergies);
                    if (Array.isArray(parsedAllergies)) {
                        setAllergies(parsedAllergies);
                    }
                } catch (parseErr) {
                    console.error('Error parsing stored allergies:', parseErr);
                }
            }
        } finally {
            setLoginError('');
        }
    };

    // Save allergies to backend API and localStorage
    const saveUserAllergies = async (updatedAllergies: string[]) => {
        // localStorage for backup
        localStorage.setItem('userAllergies', JSON.stringify(updatedAllergies));
        
        if (!currentUser) {
            setLoginError('You must be logged in to save allergies to your account');
            return;
        }

        try {
            // Save allergies using backend API
            await apiSaveUserAllergies(updatedAllergies);
        } catch (err) {
            console.error('Error saving allergies to API:', err);
            setLoginError('Failed to save your allergies to your account');
        }
    };
    
    // Save scraped results to backend API
    const saveScrapeResults = async (results: ScrapeResult[]) => {
        if (!currentUser) {
            return; // Don't save if not logged in
        }

        try {
            // Save results using backend API
            await apiSaveScrapeResults(results);
            console.log('Scrape results saved to backend');
        } catch (err) {
            console.error('Error saving scrape results to API:', err);
        }
    };
    
    // Load latest saved scrape results from backend API
    const loadLatestScrapeResults = async (userId: string) => {
        if (!userId || !currentUser) return;
        
        try {
            // Get latest scrape results from backend API
            const results = await getLatestScrapeResults();
            if (results && results.length > 0) {
                setScrapeResults(results);
                console.log('Loaded previous scrape results from backend');
            }
        } catch (err) {
            console.error('Error loading scrape results from API:', err);
        }
    };

    // Handles email/password login
    const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoginError('');
        try {
            const user = await signIn(email, password);
            console.log('Login successful');
            setCurrentUser(user);
            loadUserAllergies(user.uid);
        } catch (err) {
            setLoginError(err instanceof Error ? err.message : 'Login failed');
        }
    };

    // Handles email/password sign-up
    const handleSignUp = async (): Promise<void> => {
        setLoginError('');
        try {
            const user = await signUp(email, password);
            console.log('Sign-up successful');
            setCurrentUser(user);
            
            // Initialize empty allergies for new user
            // Use the user directly instead of relying on currentUser state
            localStorage.setItem('userAllergies', JSON.stringify([]));
            
            try {
                // Save allergies using backend API with the user we just got
                await apiSaveUserAllergies([]);
            } catch (saveErr) {
                console.error('Error saving initial allergies:', saveErr);
            }
        } catch (err) {
            setLoginError(err instanceof Error ? err.message : 'Sign-up failed');
        }
    };

    // Add a new allergy
    const handleAddAllergy = () => {
        if (!newAllergy.trim()) return;

        const allergyLower = newAllergy.trim().toLowerCase();
        if (!allergies.includes(allergyLower)) {
            const updatedAllergies = [...allergies, allergyLower];
            setAllergies(updatedAllergies);
            saveUserAllergies(updatedAllergies);
            setNewAllergy('');
        }
    };

    // Remove an allergy
    const handleRemoveAllergy = (index: number) => {
        const updatedAllergies = allergies.filter((_, i) => i !== index);
        setAllergies(updatedAllergies);
        saveUserAllergies(updatedAllergies);
    };

    // Google OAuth sign-in
    const handleGoogleSignIn = async (): Promise<void> => {
        setLoginError('');
        try {
            const user = await signInWithGoogle();
            console.log('Google sign-in successful');
            setCurrentUser(user);
            loadUserAllergies(user.uid);
        } catch (err) {
            console.error(err);
            setLoginError(err instanceof Error ? err.message : 'Google sign-in failed');
        }
    };

    const handleScrapeClick = () => {
        setLoginError('');
        setScrapeResults([]);
        setIsLoading(true); // Start loading state

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const tab = tabs[0] || undefined;
            if (!tab?.id) {
                setLoginError('No active tab found');
                setIsLoading(false);
                return;
            }

            if (!tab.url?.includes('amazon.com')) {
                setLoginError('Please navigate to your Amazon Fresh cart first');
                setIsLoading(false);
                return;
            }

            chrome.runtime.sendMessage({ action: 'injectContentScript' }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error injecting content script:', chrome.runtime.lastError);
                    setLoginError(`Extension error: ${chrome.runtime.lastError.message || 'Could not inject content script'}`);
                    setIsLoading(false);
                    return;
                }

                setTimeout(() => {
                    console.log('Sending scrape request to content script with allergies:', allergies);
                    chrome.tabs.sendMessage(
                        tab.id!,
                        {
                            action: "scrapeCart",
                            allergies: allergies
                        },
                        response => {
                            setIsLoading(false);
                            
                            if (chrome.runtime.lastError) {
                                console.error('Error sending message:', chrome.runtime.lastError);
                                setLoginError(`Extension error: ${chrome.runtime.lastError.message || 'Could not communicate with page'}`);
                                return;
                            }

                            console.log('Received response:', response);
                            if (response?.success && response.results) {
                                setScrapeResults(response.results);
                                // Save results to Firebase if user is logged in
                                if (currentUser) {
                                    saveScrapeResults(response.results);
                                }
                            } else {
                                setLoginError(response?.error || "Unknown error");
                            }
                        }
                    );
                }, 500);
            });
        });
    };

    return (
        <>
            <div className="app-title">
                <h1>Allergy Tracker</h1>
                {currentUser && (
                    <div className="user-status">
                        <span className="status-dot"></span>
                        Logged in as {currentUser.email}
                    </div>
                )}
                <small className="privacy-link">
                    <a href="privacy-policy.html" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                    <button 
                        onClick={async () => {
                            const isConnected = await testBackendConnection();
                            setLoginError(isConnected ? 'Backend is connected and working!' : 'Backend connection failed. Make sure the server is running.');
                        }}
                        style={{ marginLeft: '10px', fontSize: '10px', padding: '2px 5px' }}
                    >
                        Test Backend
                    </button>
                </small>
            </div>
            <div className="formContent">
                {loginError && <p className="error">{loginError}</p>}

                {!currentUser ? (
                    <>
                        <form className="log" onSubmit={handleLogin}>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                            />
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                required
                            />
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button type="submit">Log in</button>
                                <button type="button" onClick={handleSignUp}>Sign up</button>
                            </div>
                        </form>

                        <button type="button" onClick={handleGoogleSignIn}>
                            <FaGoogle style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
                            Continue with Google
                        </button>
                    </>
                ) : (
                    <div className="logged-in-actions">
                        <p>Your allergies and scan results will be saved automatically.</p>
                        <button type="button" onClick={async () => {
                            // Clear allergies and results when logging out
                            setAllergies([]);
                            setScrapeResults([]);
                            setEmail(''); // Clear email field
                            setPassword(''); // Clear password field
                            setCurrentUser(null);
                            await signOutUser();
                        }} className="logout-button">
                            Log out
                        </button>
                    </div>
                )}
            </div>

            <div className="allergies-section">
                <h3>My Allergies</h3>

                <div className="add-allergy">
                    <input
                        type="text"
                        value={newAllergy}
                        onChange={(e) => setNewAllergy(e.target.value)}
                        placeholder="Add an allergy (e.g., peanuts, milk)"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddAllergy();
                            }
                        }}
                    />
                    <button type="button" onClick={handleAddAllergy}>Add</button>
                </div>

                <ul className="allergies-list">
                    {allergies.length === 0 ? (
                        <li className="no-allergies">No allergies added yet</li>
                    ) : (
                        allergies.map((allergy, index) => (
                            <li key={index} className="allergy-item">
                                <span style={{ color: '#333', fontWeight: 'bold' }}>{allergy}</span>
                                <button onClick={() => handleRemoveAllergy(index)}>Remove</button>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            <div className="scrape-section">
                <button 
                    type="button" 
                    onClick={handleScrapeClick} 
                    disabled={isLoading}
                >
                    {isLoading ? 'Scraping...' : 'Scrape My Fresh Cart'}
                </button>
                {isLoading && (
                    <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p>Scanning products for allergens...</p>
                    </div>
                )}

                {scrapeResults.length > 0 && (
                    <div className="scrape-output">
                        <h3>Ingredients found:</h3>
                        <ul>
                            {scrapeResults
                                // Filter out duplicate entries
                                .filter((result, index, self) =>
                                    index === self.findIndex(r => r.url === result.url) &&
                                    !(result.title === "Opens in a new tab")
                                )
                                .map(({ url, title, ingredients, error, allergyFound, allergyMatches }) => {
                                    const cleanTitle = title?.replace(/\s*Opens in a new tab\s*/, '') || 'Unknown Product';
                                    
                                    return (
                                        <li key={url} className={allergyFound ? 'allergy-warning-item' : error ? 'error-item' : ''}>
                                            <h4 style={{ backgroundColor: '#f8f9fa', padding: '5px', borderRadius: '3px' }}>
                                                {allergyFound && allergyMatches && allergyMatches.length > 0 ? (
                                                    <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>⚠️ {cleanTitle}</span>
                                                ) : (
                                                    <span style={{ color: '#0066cc', fontWeight: 'bold' }}>{cleanTitle}</span>
                                                )}
                                            </h4>
                                            {allergyFound && allergyMatches && allergyMatches.length > 0 && (
                                                <div className="allergy-warning">
                                                    <p className="warning-text">Warning: Contains allergens: {allergyMatches.join(', ')}</p>
                                                </div>
                                            )}
                                            <a href={url} target="_blank" rel="noopener noreferrer">
                                                View product
                                            </a>
                                            {error ? (
                                                <p className="error-text">Error: {error}</p>
                                            ) : (
                                                <div>
                                                    <p><strong>Ingredients:</strong></p>
                                                    <p className="ingredients-text">
                                                        <span dangerouslySetInnerHTML={{
                                                            __html: highlightAllergies(ingredients, allergyMatches || [])
                                                        }} />
                                                    </p>
                                                </div>
                                            )}
                                        </li>
                                    );
                                })
                            }
                        </ul>
                    </div>
                )}
            </div>
        </>
    );
}
