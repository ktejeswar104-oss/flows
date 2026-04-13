import { initializeApp, type FirebaseOptions, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig: FirebaseOptions = {
  apiKey: 'AIzaSyCJ8zGt__cA_901IK3Xgq6bqJ1lvLyfd7M',
  authDomain: 'gen-lang-client-0177623776.firebaseapp.com',
  projectId: 'gen-lang-client-0177623776',
  storageBucket: 'gen-lang-client-0177623776.firebasestorage.app',
  messagingSenderId: '595611263114',
  appId: '1:595611263114:web:356ecb05907b18bd4c4d73',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
