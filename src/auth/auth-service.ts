// Firebase Auth wrapper
// Initialize Firebase before using these functions

let firebaseApp: any = null;
let firebaseAuth: any = null;

export type AuthUser = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  provider: string;
};

type AuthCallback = (user: AuthUser | null) => void;
const listeners: AuthCallback[] = [];

export function onAuthChange(cb: AuthCallback) {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notifyListeners(user: AuthUser | null) {
  for (const cb of listeners) cb(user);
}

function toAuthUser(fbUser: any): AuthUser | null {
  if (!fbUser) return null;
  return {
    uid: fbUser.uid,
    displayName: fbUser.displayName,
    email: fbUser.email,
    photoURL: fbUser.photoURL,
    provider: fbUser.providerData?.[0]?.providerId || 'unknown',
  };
}

export async function initAuth(): Promise<void> {
  // Only init if Firebase config is available
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) {
    console.log('No Firebase config found. Auth disabled, playing as guest.');
    return;
  }

  try {
    const { initializeApp } = await import('firebase/app');
    const { getAuth, onAuthStateChanged } = await import('firebase/auth');

    firebaseApp = initializeApp({
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });

    firebaseAuth = getAuth(firebaseApp);
    onAuthStateChanged(firebaseAuth, (user: any) => {
      notifyListeners(toAuthUser(user));
    });
  } catch (e) {
    console.warn('Firebase init failed:', e);
  }
}

export async function signInWithGoogle(): Promise<AuthUser | null> {
  if (!firebaseAuth) return null;
  try {
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(firebaseAuth, provider);
    return toAuthUser(result.user);
  } catch (e) {
    console.error('Google sign-in failed:', e);
    return null;
  }
}

export async function signInWithApple(): Promise<AuthUser | null> {
  if (!firebaseAuth) return null;
  try {
    const { OAuthProvider, signInWithPopup } = await import('firebase/auth');
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    const result = await signInWithPopup(firebaseAuth, provider);
    return toAuthUser(result.user);
  } catch (e) {
    console.error('Apple sign-in failed:', e);
    return null;
  }
}

export async function signOut(): Promise<void> {
  if (!firebaseAuth) return;
  try {
    const { signOut: fbSignOut } = await import('firebase/auth');
    await fbSignOut(firebaseAuth);
    notifyListeners(null);
  } catch (e) {
    console.error('Sign-out failed:', e);
  }
}

export function getFirebaseApp() {
  return firebaseApp;
}

export function isAuthAvailable(): boolean {
  return !!import.meta.env.VITE_FIREBASE_API_KEY;
}
