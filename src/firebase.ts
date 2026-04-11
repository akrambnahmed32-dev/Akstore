import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocFromServer, 
  increment 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with experimentalForceLongPolling for better iframe compatibility
// and enable persistence to reduce reads
export const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId);

// Enable offline persistence to reduce database reads
import { enableIndexedDbPersistence, terminate, clearIndexedDbPersistence } from 'firebase/firestore';

const enablePersistence = async () => {
  if (typeof window !== 'undefined') {
    try {
      await enableIndexedDbPersistence(db);
    } catch (err: any) {
      if (err.code === 'failed-precondition') {
        console.warn('Persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        console.warn('Persistence failed: Browser not supported');
      } else {
        console.warn('Persistence error:', err.message);
      }
    }
  }
};

enablePersistence();

export const googleProvider = new GoogleAuthProvider();

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  // If it's a quota error, we don't want to throw and crash the app in an async callback.
  // We also use console.warn instead of console.error to avoid cluttering the AI Studio error UI.
  if (errInfo.error.includes('Quota limit exceeded') || errInfo.error.includes('quota-exceeded')) {
    console.warn('Firestore Quota Exceeded: ', JSON.stringify(errInfo));
    return; 
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    // Attempt to fetch a test document to verify connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection verified.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.warn("Firestore is operating in offline mode. This is normal in some restricted environments or if internet is unstable.");
      } else if (error.message.includes('unavailable')) {
        console.warn("Firestore backend is currently unavailable. Retrying in the background...");
      } else if (error.message.includes('Quota limit exceeded') || error.message.includes('quota-exceeded')) {
        console.warn("Firebase connection quota exceeded:", error.message);
      } else {
        console.error("Firebase connection error:", error.message);
      }
    }
  }
}
testConnection();

export { 
  signInWithPopup, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  increment
};
export type { User };
