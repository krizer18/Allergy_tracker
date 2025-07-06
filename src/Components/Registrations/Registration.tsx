import {
    signInWithEmailAndPassword,
    //signInWithPopup,
    signInWithCredential,
    getRedirectResult,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    getAuth
} from "firebase/auth";
import {type FormEvent, useEffect, useState} from "react";
import { app } from "../../firebase.ts";

import './Registration.css';
import { FaGoogle } from 'react-icons/fa';

export default function Registration() {
    const [email, setEmail]         = useState<string>('');
    const [password, setPassword]   = useState<string>('');
    const [loginError, setLoginError] = useState<string>('');

    const auth = getAuth(app);
    //const googleProvider = new GoogleAuthProvider();

    // On mount, see if we're returning from a redirect
    useEffect(() => {
        const redirectUri = chrome.identity.getRedirectURL();
        console.log('⟳ OAuth Redirect URI:', redirectUri);

        getRedirectResult(auth)
            .then((res) => {
                if (res && res.user) {
                    console.log('Redirect sign-in successful', res.user);
                }
            })
            .catch((err) => {
                console.error('Redirect error', err);
                setLoginError(err.message);
            });
    }, [auth]);

    // Handle email/password login
    const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoginError('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log('Login successful');
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setLoginError(err.message || 'Login failed');
        }
    };

    // Handle email/password sign-up
    const handleSignUp = async (): Promise<void> => {
        setLoginError('');
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            console.log('Sign-up successful');
        } catch (err) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setLoginError(err.message || 'Sign-up failed');
        }
    };

    // Handle Google OAuth
    // const handleGoogleSignIn = async (): Promise<void> => {
    //     setLoginError('');
    //     try {
    //         await signInWithPopup(auth, googleProvider);
    //         console.log('Google sign-in successful');
    //     } catch (err) {
    //         // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //         // @ts-expect-error
    //         setLoginError(err.message || 'Google sign-in failed');
    //     }
    // };

    const handleGoogleSignIn = async (): Promise<void> => {
        setLoginError('');
        try {
            // 1) Build the Google OAuth URL
            const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
            const redirectUri = chrome.identity.getRedirectURL();
            const scope = encodeURIComponent('profile email');
            const authUrl =
                `https://accounts.google.com/o/oauth2/v2/auth` +
                `?client_id=${clientId}` +
                `&response_type=token` +
                `&redirect_uri=${encodeURIComponent(redirectUri)}` +
                `&scope=${scope}`;

            // DEBUG (REMOVE LATER):
            console.log('▶️ Google OAuth:');
            console.log('   clientId:', clientId);
            console.log('   redirectUri:', redirectUri);
            console.log('   authUrl:', authUrl);

            // 2) Open the OAuth window
            const callbackUrl = await chrome.identity.launchWebAuthFlow({
                url: authUrl,
                interactive: true
            });
            if (!callbackUrl) throw new Error('Authentication failed');

            // 3) Extract the access token from the URL fragment
            const hash = new URL(callbackUrl).hash.substring(1);  // skip leading “#”
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            if (!accessToken) throw new Error('No access token returned');

            // 4) Turn it into a Firebase credential
            const credential = GoogleAuthProvider.credential(null, accessToken);

            // 5) Sign in with Firebase
            await signInWithCredential(auth, credential);
            console.log('Google sign-in successful');
        } catch (err) {
            console.error(err);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            setLoginError(err.message || 'Google sign-in failed');
        }
    };

    return (
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
    );
}
