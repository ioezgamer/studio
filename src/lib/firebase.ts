// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmhXTDMDWnu71z2I7PRG06H_L2g0yQmJI",
  authDomain: "techcare-xugw8.firebaseapp.com",
  projectId: "techcare-xugw8",
  storageBucket: "techcare-xugw8.firebasestorage.app",
  messagingSenderId: "1063527955049",
  appId: "1:1063527955049:web:3d61fc7c3f863c968980f8"
};

// Initialize Firebase for the client
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);


// Note: getAuthenticatedDb has been removed as it's no longer needed.
// The Server Actions now use the client-initialized `db` instance
// and perform role checks within the action itself. This simplifies
// the setup and resolves the authentication context issue.

export { db, auth };
