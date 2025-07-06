// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string
};

// Initialize Firebase
// Export firebase app to Registration.tsx
export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);