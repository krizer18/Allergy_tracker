import {
    signInWithEmailAndPassword,
    signInWithCredential as signInWithCredential,
    getRedirectResult,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { type FormEvent, useEffect, useState } from "react";
import { app } from "../../firebase.ts";
import { highlightAllergies } from "../../utils/allergyChecker";

interface ScrapeResult {
  url: string;
  title: string;
  ingredients: string;
  error?: string;
  allergyFound?: boolean;
  allergyMatches?: string[];
}

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
    const [currentUser, setCurrentUser] = useState<{email: string, uid: string} | null>(null);
    

    const auth = getAuth(app);
    const db = getFirestore(app);

    // Check if we return from a redirect
    useEffect(() => {
        const redirectUri = chrome.identity.getRedirectURL();
        console.log('⟳ OAuth Redirect URI:', redirectUri);

        getRedirectResult(auth)
            .then((res) => {
                if (res && res.user) {
                    console.log('Redirect sign-in successful', res.user);
                    // Load allergies after successful login
                    loadUserAllergies(res.user.uid);
                }
            })
            .catch((err) => {
                console.error('Redirect error', err);
                setLoginError(err instanceof Error ? err.message : String(err));
            });
    }, [auth]);

    // Listen for authentication state change so we can load user allergies
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser({
                    email: user.email || 'User',
                    uid: user.uid
                });
                // Store user info in localStorage as backup
                localStorage.setItem('currentUser', JSON.stringify({
                    email: user.email || 'User',
                    uid: user.uid
                }));
                loadUserAllergies(user.uid);
                loadLatestScrapeResults(user.uid);
            } else {
                setCurrentUser(null);
                localStorage.removeItem('currentUser');
            }
        });
        return () => unsubscribe();
    }, [auth]);
    
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

    // Load user allergies
    const loadUserAllergies = async (userId: string) => {
        if (!userId) return;

        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.allergies) {
                    // Handle both array and object formats
                    if (Array.isArray(userData.allergies)) {
                        setAllergies(userData.allergies);
                    } else if (userData.allergies.items && Array.isArray(userData.allergies.items)) {
                        setAllergies(userData.allergies.items);
                    } else {
                        setAllergies([]);
                    }
                } else {
                    setAllergies([]);
                }
            }
        } catch (err) {
            console.error('Error loading allergies:', err);
        } finally {
            setLoginError('');
        }
    };

    // Save allergies to Firestore and localStorage
    const saveUserAllergies = async (updatedAllergies: string[]) => {
        // localStorage for backup
        localStorage.setItem('userAllergies', JSON.stringify(updatedAllergies));
        
        if (!auth.currentUser && !currentUser) {
            setLoginError('You must be logged in to save allergies to your account');
            return;
        }

        try {
            const userId = auth.currentUser?.uid || currentUser?.uid;
            if (!userId) return;
            
            const userRef = doc(db, 'users', userId);
            await setDoc(userRef, {
                allergies: updatedAllergies,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        } catch (err) {
            console.error('Error saving allergies:', err);
            setLoginError('Failed to save your allergies to your account');
        }
    };
    
    // Save scraped results to Firestore
    const saveScrapeResults = async (results: ScrapeResult[]) => {
        if (!auth.currentUser) {
            return; // Don't save if not logged in
        }

        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userRef, {
                latestScrape: {
                    results,
                    timestamp: new Date().toISOString()
                }
            }, { merge: true });
            console.log('Scrape results saved to Firebase');
        } catch (err) {
            console.error('Error saving scrape results:', err);
        }
    };
    
    // Load latest saved scrape results from Firestore
    const loadLatestScrapeResults = async (userId: string) => {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists() && userDoc.data().latestScrape) {
                const latestScrape = userDoc.data().latestScrape;
                setScrapeResults(latestScrape.results);
                console.log('Loaded previous scrape results from', latestScrape.timestamp);
            }
        } catch (err) {
            console.error('Error loading scrape results:', err);
        }
    };

    // Handles email/password login
    const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoginError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Login successful');
            if (userCredential.user) {
                loadUserAllergies(userCredential.user.uid);
            }
        } catch (err) {
            setLoginError(err instanceof Error ? err.message : 'Login failed');
        }
    };

    // Handles email/password sign-up
    const handleSignUp = async (): Promise<void> => {
        setLoginError('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log('Sign-up successful');
            // Initialize empty allergies for new user
            if (userCredential.user) {
                await saveUserAllergies([]);
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
            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
            const redirectUri = chrome.identity.getRedirectURL();
            const scope = encodeURIComponent('profile email');
            const authUrl =
                `https://accounts.google.com/o/oauth2/v2/auth` +
                `?client_id=${clientId}` +
                `&response_type=token` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&scope=${scope}`;

            console.log('▶️ Google OAuth:');
            console.log('   clientId:', clientId);
            console.log('   redirectUri:', redirectUri);
            console.log('   authUrl:', authUrl);

            const callbackUrl = await chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            });
            if (!callbackUrl) throw new Error('Authentication failed');

            const hash = new URL(callbackUrl).hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            if (!accessToken) throw new Error('No access token returned');

            // Use signInWithCredentials
            const credential = GoogleAuthProvider.credential(null, accessToken);
            const userCredential = await signInWithCredential(auth, credential);
            console.log('Google sign-in successful');
            if (userCredential.user) {
                loadUserAllergies(userCredential.user.uid);
            }
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
                        <button type="button" onClick={() => {
                            // Clear allergies and results when logging out
                            setAllergies([]);
                            setScrapeResults([]);
                            setEmail(''); // Clear email field
                            setPassword(''); // Clear password field
                            localStorage.removeItem('userAllergies');
                            auth.signOut();
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
