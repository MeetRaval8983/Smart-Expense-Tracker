// Authentication Module
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

import { getFirebaseAuth } from './firebase-config.js';

let currentUser = null;
let authMode = 'login'; // 'login' or 'signup'

// Auth state listener setup
export function setupAuthListener(callback) {
  const auth = getFirebaseAuth();
  if (!auth) {
    console.error('Auth not initialized');
    return;
  }

  return onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    
    if (user) {
      // User is signed in
      console.log('User signed in:', user.email);
      document.getElementById('auth-overlay').style.display = 'none';
      document.getElementById('app').style.display = 'block';
      
      // Load user data
      if (callback) await callback(user);
      
      // Show welcome message
      showToast(`Welcome back, ${user.displayName || user.email}!`, 'success');
    } else {
      // User is signed out
      console.log('User signed out');
      document.getElementById('auth-overlay').style.display = 'flex';
      document.getElementById('app').style.display = 'none';
      
      // Reset auth mode
      authMode = 'login';
      document.getElementById('auth-title').textContent = 'Login';
      document.getElementById('auth-toggle-text').textContent = "Don't have an account? ";
      document.getElementById('auth-toggle-btn').textContent = 'Sign Up';
      document.getElementById('auth-btn').textContent = 'Login';
      document.getElementById('auth-name').style.display = 'none';
      document.getElementById('auth-error').style.display = 'none';
    }
  });
}

// Toggle between login and signup
export function toggleAuthMode() {
  authMode = authMode === 'login' ? 'signup' : 'login';
  document.getElementById('auth-title').textContent = authMode === 'login' ? 'Login' : 'Sign Up';
  document.getElementById('auth-toggle-text').textContent = authMode === 'login' ? "Don't have an account? " : 'Already have an account? ';
  document.getElementById('auth-toggle-btn').textContent = authMode === 'login' ? 'Sign Up' : 'Login';
  document.getElementById('auth-btn').textContent = authMode === 'login' ? 'Login' : 'Create Account';
  document.getElementById('auth-name').style.display = authMode === 'signup' ? 'block' : 'none';
  document.getElementById('auth-college').style.display = authMode === 'signup' ? 'block' : 'none';
  document.getElementById('auth-year').style.display = authMode === 'signup' ? 'block' : 'none';
  document.getElementById('auth-money').style.display = authMode === 'signup' ? 'block' : 'none';
  document.getElementById('auth-error').style.display = 'none';
}

// Handle auth submit
export async function handleAuthSubmit(db) {
  const auth = getFirebaseAuth();
  if (!auth) {
    showToast('Firebase not initialized yet. Please wait...', 'error');
    return;
  }

  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();
  const college = document.getElementById('auth-college').value.trim();
  const year = document.getElementById('auth-year').value.trim();
  const moneyValue = document.getElementById('auth-money').value.trim();
  const money = moneyValue === '' ? NaN : parseFloat(moneyValue);
  const errorEl = document.getElementById('auth-error');

  // Validation
  if (!email || !password) {
    errorEl.textContent = 'Please fill in all fields';
    errorEl.style.display = 'block';
    return;
  }

  if (authMode === 'signup') {
    if (!name || !college || !year || !money) {
      errorEl.textContent = 'Please fill in all required signup fields';
      errorEl.style.display = 'block';
      return;
    }
    if (money <= 0) {
      errorEl.textContent = 'Monthly pocket money must be greater than 0';
      errorEl.style.display = 'block';
      return;
    }
  }

  // Show loading state
  document.getElementById('auth-btn').textContent = 'Loading...';
  document.getElementById('auth-btn').disabled = true;
  errorEl.style.display = 'none';

  try {
    if (authMode === 'signup') {
      // Create new user
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update display name
      await updateProfile(result.user, { displayName: name });
      
      // Create user profile in Firestore
      if (db) {
        await db.collection('users').doc(result.user.uid).set({
          name: name,
          email: email,
          college: college,
          year: year,
          money: money,
          createdAt: new Date().toISOString()
        });
      }
      
      showToast('Account created successfully!', 'success');
    } else {
      // Sign in existing user
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Logged in successfully!', 'success');
    }
  } catch (error) {
    console.error('Auth error:', error);
    errorEl.textContent = getAuthErrorMessage(error);
    errorEl.style.display = 'block';
  } finally {
    // Reset button state
    document.getElementById('auth-btn').textContent = authMode === 'login' ? 'Login' : 'Create Account';
    document.getElementById('auth-btn').disabled = false;
  }
}

// Get user-friendly error messages
function getAuthErrorMessage(error) {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    default:
      return error.message || 'An error occurred. Please try again.';
  }
}

// Google Sign-in
export async function signInWithGoogle(db) {
  const auth = getFirebaseAuth();
  if (!auth) {
    showToast('Firebase not initialized yet. Please wait...', 'error');
    return;
  }

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if user exists in Firestore
    if (db) {
      const userDoc = await db.collection('users').doc(result.user.uid).get();
      if (!userDoc.exists) {
        // Create new user profile with default values (user can update in settings)
        await db.collection('users').doc(result.user.uid).set({
          name: result.user.displayName || 'User',
          email: result.user.email,
          college: 'Not specified',
          year: 'Not specified',
          money: 15000,
          createdAt: new Date().toISOString()
        });
      }
    }
    
    showToast('Signed in with Google successfully!', 'success');
  } catch (error) {
    console.error('Google sign-in error:', error);
    showToast('Error signing in with Google', 'error');
  }
}

// Logout
export async function logout() {
  const auth = getFirebaseAuth();
  if (!auth) {
    showToast('Firebase not initialized', 'error');
    return;
  }

  try {
    await signOut(auth);
    document.getElementById('user-menu').style.display = 'none';
    showToast('Logged out successfully', 'success');
  } catch (error) {
    console.error('Logout error:', error);
    showToast('Error logging out', 'error');
  }
}

// Show user menu
export function showUserMenu() {
  const menu = document.getElementById('user-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

// Get current user
export function getCurrentUser() {
  return currentUser;
}

// Simple toast notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toasts');
  if (!container) return;
  
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.style.animation = 'slideIn 0.3s ease reverse';
    setTimeout(() => el.remove(), 300);
  }, 3000);
}
