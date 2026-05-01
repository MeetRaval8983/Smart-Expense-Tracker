// Database Operations Module
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  query, 
  orderBy, 
  where, 
  onSnapshot,
  writeBatch,
  limit
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

import { getFirebaseDB } from './firebase-config.js';

// Global data variables
let userProfile = {
  name: 'Rahul Sharma',
  college: 'IIT Bombay',
  year: '2nd Year',
  money: 15000
};

let transactions = [];
let budgets = {};
let accounts = [];
let recurringTransactions = [];

// Categories configuration
export const categories = {
  mess:          { icon: '🍽️', name: 'Mess & Food',      color: '#ff6b6b' },
  study:         { icon: '📚', name: 'Study Materials',   color: '#6bcbff' },
  hostel:        { icon: '🏠', name: 'Hostel',            color: '#a78bfa' },
  transport:     { icon: '🚌', name: 'Transport',          color: '#ffd93d' },
  entertainment: { icon: '🎬', name: 'Entertainment',     color: '#fb923c' },
  personal:      { icon: '💅', name: 'Personal Care',     color: '#f472b6' },
  shopping:      { icon: '🛍️', name: 'Shopping',          color: '#2dd4bf' },
  healthcare:    { icon: '❤️', name: 'Healthcare',        color: '#f87171' },
  education:     { icon: '🎓', name: 'Education',         color: '#818cf8' },
  travel:        { icon: '✈️', name: 'Travel',            color: '#34d399' },
  other:         { icon: '📦', name: 'Other',             color: '#94a3b8' },
  income:        { icon: '💰', name: 'Income',            color: '#00e5a0' },
};

// Load user data from Firestore
export async function loadUserData(currentUser) {
  const db = getFirebaseDB();
  if (!currentUser || !db) return;

  try {
    // Load user profile
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      userProfile = userDoc.data();
    } else {
      // Create default profile if it doesn't exist
      userProfile = {
        name: currentUser.displayName || 'User',
        email: currentUser.email,
        college: 'IIT Bombay',
        year: '2nd Year',
        money: 15000
      };
      await setDoc(userDocRef, userProfile);
    }

    // Load transactions
    const txnQuery = query(
      collection(db, 'users', currentUser.uid, 'transactions'),
      orderBy('createdAt', 'desc')
    );
    const txnSnapshot = await getDocs(txnQuery);
    transactions = txnSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Load budgets
    const budgetSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'budgets'));
    budgets = {};
    budgetSnapshot.docs.forEach(doc => { 
      budgets[doc.id] = doc.data(); 
    });

    // Load accounts
    const accSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'accounts'));
    accounts = accSnapshot.docs.map(doc => ({ ...doc.data() }));
    
    // Create default accounts if none exist
    if (accounts.length === 0) {
      const defaultAccounts = [
        { name: 'SBI Campus Account', type: 'savings', balance: 18350, icon: '🏦', color: 'savings' },
        { name: 'HDFC Student', type: 'current', balance: 5200, icon: '💼', color: 'current' },
        { name: 'Paytm Wallet', type: 'wallet', balance: 1300, icon: '📱', color: 'wallet' },
      ];
      
      for (let acc of defaultAccounts) {
        await addDoc(collection(db, 'users', currentUser.uid, 'accounts'), acc);
      }
      accounts = defaultAccounts;
    }

    // Load recurring transactions
    const recSnapshot = await getDocs(collection(db, 'users', currentUser.uid, 'recurring'));
    recurringTransactions = recSnapshot.docs.map(doc => ({ ...doc.data() }));

    return { userProfile, transactions, budgets, accounts, recurringTransactions };
    
  } catch (error) {
    console.error('Error loading user data:', error);
    showToast('Error loading your data', 'error');
    return null;
  }
}

// Setup real-time listeners
export function setupRealtimeListeners(currentUser, callbacks) {
  const db = getFirebaseDB();
  if (!currentUser || !db) return;

  const unsubscribers = [];

  // Transactions listener
  const txnUnsub = onSnapshot(
    query(collection(db, 'users', currentUser.uid, 'transactions'), orderBy('createdAt', 'desc')),
    (snapshot) => {
      transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (callbacks.onTransactionsUpdate) callbacks.onTransactionsUpdate(transactions);
    },
    (error) => {
      console.error('Transactions listener error:', error);
    }
  );
  unsubscribers.push(txnUnsub);

  // Budgets listener
  const budgetUnsub = onSnapshot(
    collection(db, 'users', currentUser.uid, 'budgets'),
    (snapshot) => {
      budgets = {};
      snapshot.docs.forEach(doc => { budgets[doc.id] = doc.data(); });
      if (callbacks.onBudgetsUpdate) callbacks.onBudgetsUpdate(budgets);
    },
    (error) => {
      console.error('Budgets listener error:', error);
    }
  );
  unsubscribers.push(budgetUnsub);

  // Accounts listener
  const accUnsub = onSnapshot(
    collection(db, 'users', currentUser.uid, 'accounts'),
    (snapshot) => {
      accounts = snapshot.docs.map(doc => ({ ...doc.data() }));
      if (callbacks.onAccountsUpdate) callbacks.onAccountsUpdate(accounts);
    },
    (error) => {
      console.error('Accounts listener error:', error);
    }
  );
  unsubscribers.push(accUnsub);

  // Recurring listener
  const recUnsub = onSnapshot(
    collection(db, 'users', currentUser.uid, 'recurring'),
    (snapshot) => {
      recurringTransactions = snapshot.docs.map(doc => ({ ...doc.data() }));
      if (callbacks.onRecurringUpdate) callbacks.onRecurringUpdate(recurringTransactions);
    },
    (error) => {
      console.error('Recurring listener error:', error);
    }
  );
  unsubscribers.push(recUnsub);

  return unsubscribers;
}

// Data validation functions
function validateTransaction(txn) {
  if (!txn.desc || txn.desc.trim().length < 2) return 'Description must be at least 2 characters';
  if (!txn.amount || txn.amount <= 0) return 'Amount must be greater than 0';
  if (!txn.date) return 'Date is required';
  if (!txn.category) return 'Category is required';
  if (!txn.account) return 'Account is required';
  if (!['income', 'expense'].includes(txn.type)) return 'Invalid transaction type';
  return null; // Valid
}

function validateBudget(budget) {
  if (!budget.category) return 'Category is required';
  if (!budget.limit || budget.limit <= 0) return 'Budget limit must be greater than 0';
  return null;
}

function validateAccount(acc) {
  if (!acc.name || acc.name.trim().length < 2) return 'Account name must be at least 2 characters';
  if (!['savings', 'current', 'wallet', 'fd'].includes(acc.type)) return 'Invalid account type';
  return null;
}

// Add transaction
export async function addTransaction(currentUser, t) {
  const db = getFirebaseDB();
  if (!currentUser || !db) return;

  const validationError = validateTransaction(t);
  if (validationError) {
    showToast(validationError, 'error');
    return;
  }

  try {
    const newTxn = { 
      ...t, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), newTxn);

    // Store analytics data
    await storeAnalyticsData(currentUser, 'transaction_added', { 
      category: t.category, 
      amount: t.amount, 
      type: t.type 
    });

    showToast(`${t.type === 'income' ? '💰' : '💸'} ₹${t.amount.toLocaleString('en-IN')} ${t.type === 'income' ? 'income' : 'expense'} added!`, 'success');
  } catch (error) {
    console.error('Error adding transaction:', error);
    showToast('Error saving transaction', 'error');
  }
}

// Save budget
export async function saveBudget(currentUser, cat, amount) {
  const db = getFirebaseDB();
  if (!currentUser || !db) return;

  const validationError = validateBudget({ category: cat, limit: amount });
  if (validationError) {
    showToast(validationError, 'error');
    return;
  }

  try {
    const budgetData = { 
      limit: amount, 
      spent: budgets[cat]?.spent || 0,
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(doc(db, 'users', currentUser.uid, 'budgets', cat), budgetData);

    // Store analytics
    await storeAnalyticsData(currentUser, 'budget_set', { category: cat, limit: amount });

    showToast(`Budget set for ${categories[cat]?.name}!`, 'success');
  } catch (error) {
    console.error('Error saving budget:', error);
    showToast('Error saving budget', 'error');
  }
}

// Save recurring transaction
export async function saveRecurring(currentUser, rec) {
  const db = getFirebaseDB();
  if (!currentUser || !db) return;

  if (!rec.name || !rec.amount) {
    showToast('Fill all fields', 'error');
    return;
  }

  try {
    const recData = {
      ...rec,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'users', currentUser.uid, 'recurring'), recData);
    showToast(`Recurring "${rec.name}" added!`, 'success');
  } catch (error) {
    console.error('Error saving recurring:', error);
    showToast('Error saving recurring', 'error');
  }
}

// Save account
export async function saveAccount(currentUser, acc) {
  const db = getFirebaseDB();
  if (!currentUser || !db) return;

  if (!acc.name) {
    showToast('Enter account name', 'error');
    return;
  }

  try {
    const accData = {
      ...acc,
      icon: acc.icon || '🏦',
      color: acc.color || acc.type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await addDoc(collection(db, 'users', currentUser.uid, 'accounts'), accData);
    showToast(`Account "${acc.name}" added!`, 'success');
  } catch (error) {
    console.error('Error saving account:', error);
    showToast('Error saving account', 'error');
  }
}

// Update user profile
export async function updateUserProfile(currentUser, profile) {
  const db = getFirebaseDB();
  if (!currentUser || !db) return;

  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      ...profile,
      updatedAt: new Date().toISOString()
    });
    
    userProfile = { ...userProfile, ...profile };
    showToast('✅ Profile Updated Successfully!', 'success');
  } catch (error) {
    console.error('Error saving profile:', error);
    showToast('Error saving profile', 'error');
  }
}

// Store analytics data
async function storeAnalyticsData(currentUser, type, data) {
  const db = getFirebaseDB();
  if (!currentUser || !db) return;

  try {
    await addDoc(collection(db, 'users', currentUser.uid, 'analytics'), {
      type,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analytics storage error:', error);
  }
}

// Export user data
export async function exportUserData(currentUser) {
  const db = getFirebaseDB();
  if (!currentUser || !db) return;

  try {
    const [txnSnap, budgetSnap, accSnap, recSnap] = await Promise.all([
      getDocs(collection(db, 'users', currentUser.uid, 'transactions')),
      getDocs(collection(db, 'users', currentUser.uid, 'budgets')),
      getDocs(collection(db, 'users', currentUser.uid, 'accounts')),
      getDocs(collection(db, 'users', currentUser.uid, 'recurring'))
    ]);

    const data = {
      profile: userProfile,
      transactions: txnSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      budgets: budgetSnap.docs.map(doc => ({ category: doc.id, ...doc.data() })),
      accounts: accSnap.docs.map(doc => doc.data()),
      recurring: recSnap.docs.map(doc => doc.data()),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus-wealth-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('✅ Data exported successfully!', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showToast('Error exporting data', 'error');
  }
}

// Clear all data
export async function clearAllData(currentUser) {
  const db = getFirebaseDB();
  if (!currentUser || !db) return;

  if (!confirm('⚠️ Are you sure? This will permanently delete ALL your data from the cloud. This action cannot be undone!')) {
    return;
  }

  if (!confirm('🔴 LAST WARNING: All transactions, budgets, accounts, and settings will be lost forever. Continue?')) {
    return;
  }

  try {
    // Clear all collections
    const collections = ['transactions', 'budgets', 'accounts', 'recurring', 'analytics'];
    const batch = writeBatch(db);

    for (const collection of collections) {
      const snap = await getDocs(collection(db, 'users', currentUser.uid, collection));
      snap.docs.forEach(doc => batch.delete(doc.ref));
    }

    // Reset profile to defaults
    const defaultProfile = {
      name: currentUser.displayName || 'User',
      email: currentUser.email,
      college: 'IIT Bombay',
      year: '2nd Year',
      money: 15000
    };
    const profileRef = doc(db, 'users', currentUser.uid);
    batch.set(profileRef, defaultProfile);

    await batch.commit();

    // Reset local state
    transactions = [];
    budgets = {};
    accounts = [];
    recurringTransactions = [];
    userProfile = defaultProfile;

    showToast('🗑️ All data cleared and reset to defaults', 'info');
  } catch (error) {
    console.error('Error clearing data:', error);
    showToast('Error clearing data', 'error');
  }
}

// Getters for global state
export function getUserProfile() { return userProfile; }
export function getTransactions() { return transactions; }
export function getBudgets() { return budgets; }
export function getAccounts() { return accounts; }
export function getRecurringTransactions() { return recurringTransactions; }

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
