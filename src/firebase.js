import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAl6kfCYvThvPru5ivfMm76KEDN4WYFHR8",
  authDomain: "bitacoraar-65e90.firebaseapp.com",
  projectId: "bitacoraar-65e90",
  storageBucket: "bitacoraar-65e90.firebasestorage.app",
  messagingSenderId: "226090102520",
  appId: "1:226090102520:web:89e47accfd7d73b3f3150d"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
