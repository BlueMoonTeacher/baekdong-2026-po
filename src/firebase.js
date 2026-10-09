import { initializeApp } from 'firebase/app';
import {getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged} from 'firebase/auth';
import {getFirestore} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';
const app=initializeApp({projectId:'baekdong-population-2026',appId:'1:526498571943:web:219e433c69c4863d65dd82',storageBucket:'baekdong-population-2026.firebasestorage.app',apiKey:'AIzaSyDf_xdVqU_vohAWetYQT8esdZa8e5XjGwk',authDomain:'baekdong-population-2026.firebaseapp.com',messagingSenderId:'526498571943'});
export const auth=getAuth(app), db=getFirestore(app), storage=getStorage(app);
export const login=()=>signInWithPopup(auth,new GoogleAuthProvider());
export const logout=()=>signOut(auth);
export {onAuthStateChanged};
