import {
    signInWithEmailAndPassword,
    //signInWithPopup,
    signInWithCredential as signInWithCredential,
    getRedirectResult,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged // <-- add this
} from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { type FormEvent, useEffect, useState } from "react";
import { app } from "../../firebase.ts";
import { highlightAllergies } from "../../utils/allergyChecker";

// Define the ScrapeResult interface
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
    

    const auth = getAuth(app);
    const db = getFirestore(app);

    // On mount, see if we're returning from a redirect
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

    // Listen for auth state changes to load allergies
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                loadUserAllergies(user.uid);
            }
        });
        return () => unsubscribe();
    }, [auth]);

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
            setLoginError(''); // Clear any previous errors
        }
    };

    // Save allergies to Firestore
    const saveUserAllergies = async (updatedAllergies: string[]) => {
        if (!auth.currentUser) {
            setLoginError('You must be logged in to save allergies');
            return;
        }

        try {
            const userRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userRef, {
                allergies: updatedAllergies,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        } catch (err) {
            console.error('Error saving allergies:', err);
            setLoginError('Failed to save your allergies');
        }
    };

    // Handle email/password login
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

    // Handle email/password sign-up
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

            // Use signInWithCredential**s** (plural)
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

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            const tab = tabs[0] || undefined;
            if (!tab?.id) {
                setLoginError('No active tab found');
                return;
            }

            if (!tab.url?.includes('amazon.com')) {
                setLoginError('Please navigate to your Amazon Fresh cart first');
                return;
            }

            chrome.runtime.sendMessage({ action: 'injectContentScript' }, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error injecting content script:', chrome.runtime.lastError);
                    setLoginError(`Extension error: ${chrome.runtime.lastError.message || 'Could not inject content script'}`);
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
                            if (chrome.runtime.lastError) {
                                console.error('Error sending message:', chrome.runtime.lastError);
                                setLoginError(`Extension error: ${chrome.runtime.lastError.message || 'Could not communicate with page'}`);
                                return;
                            }

                            console.log('Received response:', response);
                            if (response?.success && response.results) {
                                setScrapeResults(response.results);
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
            <div className="formContent">
                {loginError && <p className="error">{loginError}</p>}

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
                    <button type="submit">Log in</button>
                </form>

                <button type="button" onClick={handleSignUp}>
                    Sign Up
                </button>

                <button type="button" onClick={handleGoogleSignIn}>
                    <FaGoogle style={{ verticalAlign: 'middle', marginRight: '0.5em' }} />
                    Continue with Google
                </button>
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
                                <span>{allergy}</span>
                                <button onClick={() => handleRemoveAllergy(index)}>Remove</button>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            <div className="scrape-section">
                <button type="button" onClick={handleScrapeClick}>
                    Scrape My Fresh Cart
                </button>

                {scrapeResults.length > 0 && (
                    <div className="scrape-output">
                        <h3>Ingredients found:</h3>
                        <ul>
                            {scrapeResults.map(({ url, title, ingredients, error, allergyFound, allergyMatches }) => (
                                <li key={url} className={allergyFound ? 'allergy-warning-item' : error ? 'error-item' : ''}>
                                    <h4>{title || 'Unknown Product'}</h4>
                                    {allergyFound && allergyMatches && allergyMatches.length > 0 && (
                                        <div className="allergy-warning">
                                            <p className="warning-text">⚠️ Warning: Contains allergens: {allergyMatches.join(', ')}</p>
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
                                                {allergyFound && allergyMatches && allergyMatches.length > 0
                                                    ? <span dangerouslySetInnerHTML={{
                                                        __html: highlightAllergies(ingredients, allergyMatches)
                                                    }} />
                                                    : ingredients}
                                            </p>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </>
    );
}
