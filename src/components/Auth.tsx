import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, LogOut, Shield, ShieldCheck } from 'lucide-react';

export default function Auth({ onUserChange }: { onUserChange: (user: User | null) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Sync user to Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              displayName: firebaseUser.displayName || 'Anonymous User',
              photoURL: firebaseUser.photoURL || '',
              createdAt: Date.now()
            });
          }
        } catch (error) {
          console.error("Error syncing user:", error);
        }
      }
      setUser(firebaseUser);
      onUserChange(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [onUserChange]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) return <div className="h-10 w-24 bg-zinc-800 animate-pulse rounded-lg" />;

  return (
    <div className="flex items-center gap-4">
      {user ? (
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-zinc-100">{user.displayName}</p>
            <p className="text-xs text-zinc-400">Protector</p>
          </div>
          <img 
            src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border-2 border-zinc-700"
          />
          <button
            onClick={handleLogout}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      ) : (
        <button
          onClick={handleLogin}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 font-medium rounded-full hover:bg-white transition-all transform active:scale-95"
        >
          <LogIn size={18} />
          <span>Join Circle</span>
        </button>
      )}
    </div>
  );
}
