// =============================================
// Firebase Initialization & SDK Exports
// =============================================

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate Firebase configuration
const missingVars: string[] = [];
if (!import.meta.env.VITE_FIREBASE_API_KEY) missingVars.push('VITE_FIREBASE_API_KEY');
if (!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
if (!import.meta.env.VITE_FIREBASE_PROJECT_ID) missingVars.push('VITE_FIREBASE_PROJECT_ID');
if (!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) missingVars.push('VITE_FIREBASE_STORAGE_BUCKET');
if (!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID) missingVars.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
if (!import.meta.env.VITE_FIREBASE_APP_ID) missingVars.push('VITE_FIREBASE_APP_ID');

if (missingVars.length > 0) {
  console.error('Missing Firebase environment variables:', missingVars.join(', '));
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
