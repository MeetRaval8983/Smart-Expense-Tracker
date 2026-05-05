import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, doc, setDoc, addDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy } from "firebase/firestore";

let currentUser = null;
let isSignup = false;
let spendingChartInst = null;
let categoryChartInst = null;
let unsubTxns = null;
let unsubProfile = null;
let globalBudget = 15000;
let allTransactionsGlobal = [];
let currentTxnFilter = 'all';
let globalAccounts = []; 
let globalCategoryBudgets = {}; 
let unsubAccounts = null;
let unsubBudgets = null;
let currentUserProfile = {};
let overviewChartInst = null;
let currentChartType = 'line';
let balanceChartInst = null;
let analyticsMonthlyInst = null;
let analyticsTrendInst = null;

// ==============================
// NOTIFICATION SYSTEM (Bell Dropdown + Top-right Corner)
// ==============================
let notificationId = 0;
let activeNotifications = []; // Store notifications for dropdown display

window.showNotification = (title, message, type = 'info', persistent = true) => {
    // Store notification for dropdown
    const notification = {
        id: `notification-${notificationId++}`,
        title,
        message,
        type,
        timestamp: new Date(),
        persistent
    };
    
    activeNotifications.unshift(notification); // Add to beginning of array
    
    // Show notification dot if there are unread notifications
    updateNotificationDot();
    
    // Update dropdown content
    updateNotificationDropdown();
    
    // Also show floating notification for immediate visibility (optional)
    if (persistent) {
        showFloatingNotification(notification);
    }
};

// Show floating notification (existing behavior)
function showFloatingNotification(notification) {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const notificationEl = document.createElement('div');
    notificationEl.className = `notification ${notification.type}`;
    notificationEl.id = notification.id;
    
    const icons = {
        warning: '⚠️',
        error: '❌', 
        success: '✅',
        info: 'ℹ️'
    };
    
    notificationEl.innerHTML = `
        <div class="notification-icon">${icons[notification.type]}</div>
        <div class="notification-content">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
        </div>
        <button class="notification-close" onclick="window.dismissNotification('${notification.id}')">✕</button>
    `;
    
    container.appendChild(notificationEl);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        window.dismissNotification(notification.id);
    }, 5000);
}

// Update notification dot visibility
function updateNotificationDot() {
    const dot = document.getElementById('notification-dot');
    if (dot) {
        const hasUnread = activeNotifications.length > 0;
        dot.style.display = hasUnread ? 'block' : 'none';
    }
}

// Update notification dropdown content
function updateNotificationDropdown() {
    const content = document.getElementById('notification-dropdown-content');
    if (!content) return;
    
    if (activeNotifications.length === 0) {
        content.innerHTML = `
            <div style="padding: 32px 16px; text-align: center; color: var(--text3);">
                <div style="font-size: 24px; margin-bottom: 8px;">🔔</div>
                <div style="font-size: 14px;">No notifications yet</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    activeNotifications.forEach(notification => {
        const timeAgo = getTimeAgo(notification.timestamp);
        const icons = {
            warning: '⚠️',
            error: '❌', 
            success: '✅',
            info: 'ℹ️'
        };
        
        html += `
            <div class="notification-item" style="padding: 12px 16px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--surface2)'" onmouseout="this.style.background='transparent'">
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <div class="notification-item-icon" style="width: 32px; height: 32px; border-radius: 6px; background: ${getNotificationColor(notification.type, 'bg')}; color: ${getNotificationColor(notification.type, 'text')}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 14px;">
                        ${icons[notification.type]}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <div class="notification-item-title" style="font-weight: 600; color: var(--text1); font-size: 14px; margin-bottom: 4px; line-height: 1.3;">
                            ${notification.title}
                        </div>
                        <div class="notification-item-message" style="color: var(--text2); font-size: 13px; line-height: 1.4; margin-bottom: 4px;">
                            ${notification.message}
                        </div>
                        <div class="notification-item-time" style="color: var(--text3); font-size: 11px;">
                            ${timeAgo}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    content.innerHTML = html;
}

// Get notification color based on type
function getNotificationColor(type, variant) {
    const colors = {
        warning: { bg: 'rgba(251, 146, 60, 0.1)', text: 'var(--orange)' },
        error: { bg: 'rgba(255, 107, 107, 0.1)', text: 'var(--red)' },
        success: { bg: 'rgba(0, 229, 160, 0.1)', text: 'var(--green)' },
        info: { bg: 'rgba(107, 203, 255, 0.1)', text: 'var(--accent4)' }
    };
    return colors[type] ? colors[type][variant] : colors.info[variant];
}

// Get time ago string
function getTimeAgo(timestamp) {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
}

window.dismissNotification = (id) => {
    const notification = document.getElementById(id);
    if (notification) {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }
};

window.toggleNotificationDropdown = () => {
    const dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) return;
    
    const isVisible = dropdown.style.display !== 'none';
    dropdown.style.display = isVisible ? 'none' : 'block';
    
    // Mark notifications as read when dropdown is opened
    if (!isVisible) {
        // Optional: Clear the notification dot when opened
        setTimeout(() => {
            const dot = document.getElementById('notification-dot');
            if (dot) dot.style.display = 'none';
        }, 100);
    }
};

window.clearAllNotifications = () => {
    // Clear stored notifications
    activeNotifications = [];
    
    // Clear floating notifications
    const container = document.getElementById('notifications');
    if (container) {
        container.innerHTML = '';
    }
    
    // Update dropdown
    updateNotificationDropdown();
    updateNotificationDot();
};

// Test notification function for debugging
window.testNotification = () => {
    console.log('Testing notification...');
    window.showNotification('Test Alert', 'This is a test notification to check visibility', 'info');
};

// Chart type switching function
window.setChartType = (type) => {
    // Remove active class from all chart buttons
    document.querySelectorAll('.chart-toggle').forEach(btn => btn.classList.remove('active'));
    
    // Add active class to clicked button
    const activeBtn = document.getElementById(`btn-chart-${type}`);
    if (activeBtn) activeBtn.classList.add('active');
    
    // Here you would typically update the actual chart rendering
    // For now, this just handles the button states
};

// Auto-test notification after 2 seconds of page load
setTimeout(() => {
    if (currentUser) {
        window.showNotification('Welcome!', 'Notification system is working. Budget alerts will appear here.', 'success');
    }
}, 2000);

// ==============================
// TOAST NOTIFICATIONS (Like Image 3)
// ==============================
function showToast(message, type = 'success') {
    const container = document.getElementById('toasts');
    if (!container) return;
    
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : '❌';
    el.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
    
    container.appendChild(el);
    setTimeout(() => {
        el.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => el.remove(), 300);
    }, 3000);
}

// ==============================
// AUTHENTICATION LOGIC
// ==============================

// 1. Handle Login Form Submit
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorDiv = loginForm.querySelector('.auth-error-msg');
        const btn = loginForm.querySelector('.auth-btn-main');
        const originalText = btn.innerHTML;
        
        if(errorDiv) errorDiv.style.display = 'none'; 
        btn.innerText = "Authenticating...";

        try {
            await signInWithEmailAndPassword(auth, email, password);
            btn.innerHTML = originalText;
        } catch (error) {
            if(errorDiv) {
                errorDiv.innerText = error.message.replace('Firebase: ', '');
                errorDiv.style.display = 'block';
            }
            btn.innerHTML = originalText;
        }
    });
}

// 2. Handle Sign-Up Form Submit
const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const budget = document.getElementById('signup-budget').value;
        const password = document.getElementById('signup-password').value;
        
        const confirmPassword = document.getElementById('signup-password-confirm').value;
        
        const errorDiv = signupForm.querySelector('.auth-error-msg');
        const btn = signupForm.querySelector('.auth-btn-main');
        const originalText = btn.innerHTML;
        
        if(errorDiv) errorDiv.style.display = 'none';

        // NEW: Check if passwords match!
        if (password !== confirmPassword) {
            if(errorDiv) {
                errorDiv.innerText = "Security Halt: Passwords do not match.";
                errorDiv.style.display = 'block';
            }
            return; // Stop the function here so it doesn't create the account
        }

        btn.innerText = "Initializing...";

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Save profile data
            await setDoc(doc(db, "users", user.uid), {
                profile: {
                    name: name,
                    email: email,
                    budget: Number(budget)
                }
            });

            // Trigger the seed data
            if (typeof seedInitialData === 'function') {
                await seedInitialData(user.uid);
            }
            
            btn.innerHTML = originalText;
        } catch (error) {
            if(errorDiv) {
                errorDiv.innerText = error.message.replace('Firebase: ', '');
                errorDiv.style.display = 'block';
            }
            btn.innerHTML = originalText;
        }
    });
}

// Global Logout
window.logout = () => {
    signOut(auth).then(() => {
        window.location.reload();
    });
};

// 3. Master Auth State Listener
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    
    // Hide the global loader smoothly
    const loader = document.getElementById('global-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 400); 
    }

    if (user) {
        // Logged IN: Hide auth pages, show the main App
        document.getElementById('page-auth').classList.remove('active');
        document.getElementById('page-signup').classList.remove('active');
        document.getElementById('app').style.display = 'flex';
        
        // Ensure we land on the Dashboard
        if (typeof window.navigate === 'function') {
            window.navigate('dashboard', document.querySelectorAll('.nav-item')[0]);
        }
        
        loadData();
    } else {
        document.getElementById('app').style.display = 'none';
        document.getElementById('page-signup').classList.remove('active');
        document.getElementById('page-auth').classList.add('active'); 
        
        allTransactionsGlobal = [];
        globalAccounts = []; 
        globalCategoryBudgets = {};
        globalBudget = 15000;
        
        const navName = document.getElementById('nav-name');
        const navAvatar = document.getElementById('nav-avatar');
        if (navName) navName.innerText = 'User';
        if (navAvatar) navAvatar.innerText = 'U';

        if (unsubTxns) unsubTxns();
        if (unsubProfile) unsubProfile();
        if (unsubAccounts) unsubAccounts();
        if (unsubBudgets) unsubBudgets();
    }
});


// Function to seed initial data for new accounts
async function seedInitialData(uid) {
    // 1. Predefined Transactions
    const seedTxns = [
        { desc: 'Monthly Pocket Money', amount: 15000, type: 'income', category: 'income', account: 'savings', date: new Date().toISOString() },
        { desc: 'Mess Monthly Fee', amount: 3500, type: 'expense', category: 'food', account: 'savings', date: new Date().toISOString() },
        { desc: 'Technical Books', amount: 1200, type: 'expense', category: 'study', account: 'current', date: new Date().toISOString() },
        { desc: 'New Laptop Bag', amount: 1500, type: 'expense', category: 'shopping', account: 'wallet', date: new Date().toISOString() }
    ];

    // 2. Predefined Accounts
    const seedAccounts = [
        { name: 'SBI Campus Account', type: 'savings', balance: 18216 },
        { name: 'HDFC Student', type: 'current', balance: 910 },
        { name: 'Paytm Wallet', type: 'wallet', balance: 1050 }
    ];

    // 3. Predefined Budgets (NEW)
    const seedBudgets = [
        { category: 'study', limit: 1500, threshold: 80 } // Added the 1500 Study Budget
    ];

    try {
        // Add dummy transactions to Firebase
        for (const item of seedTxns) {
            await addDoc(collection(db, "users", uid, "transactions"), item);
        }
        
        // Add predefined accounts to Firebase
        for (const acc of seedAccounts) {
            await addDoc(collection(db, "users", uid, "accounts"), { ...acc, createdAt: new Date().toISOString() });
        }

        // Add predefined budgets to Firebase
        for (const budget of seedBudgets) {
            // Using setDoc with a specific ID (the category name) so it matches our budget structure
            await setDoc(doc(db, "users", uid, "budgets", budget.category), {
                limit: budget.limit,
                threshold: budget.threshold
            });
        }
        
        // Seed data added successfully
    } catch (e) {
        // Error seeding data:
    }
}


// ==============================
// GLOBAL NAVIGATION
// ==============================
// ==============================
// 5. MASTER NAVIGATION ROUTER
// ==============================
window.navigate = (page, el) => {
    // 1. Hide all pages, remove active classes
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // 2. Show the target page
    const target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');
    if(el) el.classList.add('active');

    // 3. Update Titles
    const titles = { 
        dashboard: 'Dashboard', 
        transactions: 'Transactions', 
        budget: 'Budget Limits', 
        accounts: 'Accounts', 
        analytics: 'Analytics',
        profile: 'My Profile'
    };
    document.getElementById('page-title').innerText = titles[page] || 'Smart Expense';
    
    // 4. Close mobile menu after navigation
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (sidebar && overlay && window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open');
        overlay.classList.remove('show');
    }

    // 4. Page-Specific Triggers (THIS IS THE FIX)
    if(page === 'transactions') window.applyFilters();
    
    if(page === 'accounts') {
        document.getElementById('page-subtitle').innerText = 'Manage all your accounts';
        // Delay drawing the chart by 50ms so the CSS has time to un-hide the canvas!
        setTimeout(() => {
            if (typeof window.renderBalanceChart === 'function') {
                window.renderBalanceChart();
            }
        }, 50);
    } 
    
    if(page === 'analytics') {
        document.getElementById('page-subtitle').innerText = 'Deep dive into your finances';
        setTimeout(() => {
            if (typeof window.renderAnalyticsPage === 'function') {
                window.renderAnalyticsPage();
            }
        }, 50);
    }
    
    if(page === 'budget') {
        document.getElementById('page-subtitle').innerText = 'Manage your budget limits';
        // Trigger budget page rendering when navigating to it
        if (allTransactionsGlobal.length > 0 && typeof renderBudgetPage === 'function') {
            renderBudgetPage(allTransactionsGlobal);
        }
    }
    
    if(page === 'profile') {
        document.getElementById('page-subtitle').innerText = 'Personalize your experience';
        // Pre-fill profile settings with actual user data
        const userName = currentUserProfile.name || document.getElementById('nav-name').innerText || 'User';
        document.getElementById('set-name').value = userName;
        document.getElementById('set-budget').value = globalBudget;
    }
};

// ==============================
// PROCESS QUICK TRANSFER
// ==============================
window.processTransfer = async () => {
    const fromId = document.getElementById('transfer-from').value;
    const toId = document.getElementById('transfer-to').value;
    const amount = Number(document.getElementById('transfer-amount').value);

    if(!amount || amount <= 0) return showToast('Please enter a valid amount', 'error');
    if(fromId === toId) return showToast('Cannot transfer to the same account', 'error');

    // Find the transfer button and show loading state
    const btn = document.querySelector('#page-accounts .btn-primary:not(.modal-close)');
    const originalText = btn.innerText;
    btn.innerText = "Processing...";

    try {
        const fromAcc = globalAccounts.find(a => a.id === fromId);
        const toAcc = globalAccounts.find(a => a.id === toId);

        if (fromAcc && toAcc) {
            // 1. Deduct from Sender Account
            await updateDoc(doc(db, "users", currentUser.uid, "accounts", fromId), {
                balance: fromAcc.balance - amount
            });

            // 2. Add to Receiver Account
            await updateDoc(doc(db, "users", currentUser.uid, "accounts", toId), {
                balance: toAcc.balance + amount
            });

            // 3. Add a record of this transfer to the Transactions history
            await addDoc(collection(db, "users", currentUser.uid, "transactions"), {
                desc: `Transfer to ${toAcc.name}`,
                amount: amount, 
                type: 'expense', // Marked as expense from the original account
                category: 'other', 
                account: fromId,
                date: new Date().toISOString()
            });
        }

        showToast(`Transferred ₹${amount.toLocaleString('en-IN')} successfully!`);
        document.getElementById('transfer-amount').value = '';
    } catch(e) {
        // Error processing transfer
        showToast('Error processing transfer', 'error');
    } finally {
        btn.innerText = originalText;
    }
};

window.openModal = (id) => {
    document.getElementById(id).classList.add('open');
    if(id === 'add-txn-modal') {
        document.getElementById('txn-date').valueAsDate = new Date();
    }
};
window.closeModal = (id) => document.getElementById(id).classList.remove('open');

// Mobile Menu Toggle
window.toggleMobileMenu = () => {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobile-menu-overlay');
    if (sidebar && overlay) {
        const isOpen = sidebar.classList.contains('mobile-open');
        
        if (isOpen) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('show');
        } else {
            sidebar.classList.add('mobile-open');
            overlay.classList.add('show');
        }
    }
};

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const overlay = document.getElementById('mobile-menu-overlay');
    const notificationDropdown = document.getElementById('notification-dropdown');
    const notificationBell = document.querySelector('.notification-bell');
    
    if (sidebar && window.innerWidth <= 768) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('show');
        }
    }
    
    // Close notification dropdown when clicking outside
    if (notificationDropdown && notificationBell) {
        if (!notificationBell.contains(e.target) && !notificationDropdown.contains(e.target)) {
            notificationDropdown.style.display = 'none';
        }
    }
});

// Close mobile menu when pressing Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobile-menu-overlay');
        
        if (sidebar && sidebar.classList.contains('mobile-open')) {
            sidebar.classList.remove('mobile-open');
            if (overlay) overlay.classList.remove('show');
        }
    }
});

// Handle window resize - close mobile menu if switching to desktop
window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.getElementById('mobile-menu-overlay');
        
        if (sidebar) sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('show');
    }
});
// Toggle Expense/Income dynamically
window.setTxnType = (type) => {
    document.getElementById('txn-type').value = type;
    document.getElementById('btn-expense').classList.remove('active');
    document.getElementById('btn-income').classList.remove('active');
    document.getElementById(`btn-${type}`).classList.add('active');

    // Dynamically swap categories based on type!
    const catSelect = document.getElementById('txn-category');
    if(type === 'income') {
        catSelect.innerHTML = `
            <option value="pocket_money">📥 Pocket Money</option>
            <option value="salary">💼 Salary</option>
            <option value="freelance">💻 Freelance</option>
            <option value="other">📦 Other</option>`;
    } else {
        catSelect.innerHTML = `
            <option value="food">🍽️ Mess & Food</option>
            <option value="study">📚 Study</option>
            <option value="hostel">🏠 Hostel</option>
            <option value="travel">🚌 Travel</option>
            <option value="shopping">🛍️ Shopping</option>
            <option value="other">📦 Other</option>`;
    }
};


// ==============================
// THEME TOGGLE (DARK/LIGHT MODE)
// ==============================
// Check local storage for saved theme on load
const savedTheme = localStorage.getItem('smart_expense_theme') || 'dark';
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    document.getElementById('theme-toggle').innerText = '🌙';
}

window.toggleTheme = () => {
    const body = document.body;
    body.classList.toggle('light-mode');
    const isLight = body.classList.contains('light-mode');
    
    // Save preference
    localStorage.setItem('smart_expense_theme', isLight ? 'light' : 'dark');
    
    // Update button icon
    document.getElementById('theme-toggle').innerText = isLight ? '🌙' : '☀️';
    
    // Dynamically update Chart text and grid colors
    Chart.defaults.color = isLight ? '#64748b' : '#8b9cc8';
    
    if (spendingChartInst) {
        spendingChartInst.options.scales.x.grid.color = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
        spendingChartInst.options.scales.y.grid.color = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
        spendingChartInst.update();
    }
    if (categoryChartInst) {
        categoryChartInst.update();
    }
};



// ==============================
// DATABASE (FIRESTORE)
// ==============================
// --- SAVE TRANSACTION & UPDATE ACCOUNT BALANCE ---
window.saveTransaction = async () => {
    if (!currentUser) return;
    
    const desc = document.getElementById('txn-desc').value;
    const amount = Number(document.getElementById('txn-amount').value);
    const type = document.getElementById('txn-type').value;
    const category = document.getElementById('txn-category').value;
    const date = document.getElementById('txn-date').value;
    const accountId = document.getElementById('txn-account').value; 
    const note = document.getElementById('txn-note').value;
    
    if (!desc || !amount || !date || !accountId) return showToast('Please fill required fields', 'error');

    // FIX: Only one declaration here
    const selectedAcc = globalAccounts.find(a => a.id === accountId);
    
    if (!selectedAcc) {
        return showToast('Error: Please select a valid account.', 'error');
    }

    const btn = document.querySelector('#add-txn-modal .btn-primary');
    const originalText = btn.innerText;
    btn.innerText = "Saving...";

    try {
        // 1. Add the transaction to history
        await addDoc(collection(db, "users", currentUser.uid, "transactions"), {
            desc, amount, type, category, account: accountId, note,
            date: new Date(date).toISOString() 
        });

        // 2. Calculate the new balance
        const newBalance = type === 'income' 
            ? selectedAcc.balance + amount 
            : selectedAcc.balance - amount;

        // 3. Update the specific account in Firebase
        await updateDoc(doc(db, "users", currentUser.uid, "accounts", accountId), {
            balance: newBalance
        });
        
        window.closeModal('add-txn-modal');
        
        // Clear form fields
        document.getElementById('txn-desc').value = '';
        document.getElementById('txn-amount').value = '';
        document.getElementById('txn-note').value = '';
        
        // Show transaction added notification
        const transactionType = type === 'income' ? 'Income' : 'Expense';
        const icon = type === 'income' ? '📈' : '💳';
        window.showNotification(
            `${transactionType} Added`, 
            `${icon} ${desc}: ₹${amount.toLocaleString('en-IN')}`, 
            type === 'income' ? 'success' : 'info'
        );
        
        // Check category budget exceedance after adding transaction
        if (type === 'expense') {
            checkCategoryBudgetExceedance(category, amount);
        }
        
        showToast('Transaction added and balance updated!');
    } catch (e) {
        // Error saving transaction
        showToast('Error saving transaction', 'error');
    } finally {
        btn.innerText = originalText;
    }
};

// --- CATEGORY BUDGET EXCEEDANCE CHECK ---
function checkCategoryBudgetExceedance(category, amount) {
    const categoryBudget = globalCategoryBudgets[category];
    if (!categoryBudget) return;
    
    // Calculate current spending for this category this month
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let categorySpent = 0;
    allTransactionsGlobal.forEach(t => {
        if (t.type === 'expense' && t.category === category) {
            const d = new Date(t.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                categorySpent += t.amount;
            }
        }
    });
    
    const limit = categoryBudget.limit;
    const threshold = categoryBudget.threshold || 80;
    const percentage = (categorySpent / limit) * 100;
    
    const categoryNames = {
        food: 'Mess & Food',
        study: 'Study', 
        hostel: 'Hostel',
        travel: 'Transport',
        shopping: 'Shopping',
        other: 'Other'
    };
    
    const categoryName = categoryNames[category] || category.toUpperCase();
    
    if (percentage >= 100) {
        window.showNotification(
            'Category Budget Exceeded',
            `🚨 ${categoryName}: ₹${categorySpent.toLocaleString('en-IN')} / ₹${limit.toLocaleString('en-IN')} (${percentage.toFixed(0)}%)`,
            'error'
        );
    } else if (percentage >= threshold) {
        window.showNotification(
            'Category Budget Warning',
            `⚠️ ${categoryName}: ₹${categorySpent.toLocaleString('en-IN')} / ₹${limit.toLocaleString('en-IN')} (${percentage.toFixed(0)}%)`,
            'warning'
        );
    }
}

// --- DELETE TRANSACTION ---
window.confirmDelete = (id, name) => {
    if(confirm(`Are you sure you want to delete "${name}"?`)) {
        window.deleteTransaction(id);
    }
};

window.deleteTransaction = async (id) => {
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "transactions", id));
        showToast('Transaction deleted successfully!');
    } catch (e) {
        // Error deleting transaction
        showToast('Error deleting transaction', 'error');
    }
};

// ==============================
// DATA LOADING & RENDERING
// ==============================
let hasWelcomed = false;

function loadData() {
    if (!currentUser) return;
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadData);
        return;
    }
    
    // 1. Profile Listener
    // --- 1. PROFILE & TOTAL BUDGET LISTENER ---
    unsubProfile = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Safely grab the data whether it is inside the new 'profile' object or the old structure
            const userData = data.profile ? data.profile : data;

            // Update the global total budget
            globalBudget = Number(userData.budget) || 0;

            // Update the Sidebar Profile Card
            const navName = document.getElementById('nav-name');
            const navAvatar = document.getElementById('nav-avatar');
            
            if (navName) navName.innerText = userData.name || 'User';
            if (navAvatar && userData.name) navAvatar.innerText = userData.name.charAt(0).toUpperCase();

            // Update Profile Page elements
            const profileFullName = document.getElementById('profile-full-name');
            const profileAvatar = document.getElementById('profile-avatar-lg');
            
            if (profileFullName) profileFullName.innerText = userData.name || 'User Name';
            if (profileAvatar && userData.name) profileAvatar.innerText = userData.name.charAt(0).toUpperCase();

            // Store user data for other uses
            currentUserProfile = userData;

            // Re-render the UI elements that depend on the Total Budget
            if (typeof window.renderBudgetsUI === 'function') window.renderBudgetsUI();
            if (typeof window.renderDashboard === 'function') window.renderDashboard();
        }
    });

    
    unsubAccounts = onSnapshot(collection(db, "users", currentUser.uid, "accounts"), (snapshot) => {
        globalAccounts = [];
        snapshot.forEach(doc => globalAccounts.push({ id: doc.id, ...doc.data() }));
        renderAccountsUI();
        
        // ADD THIS LINE:
        if (document.getElementById('page-accounts').classList.contains('active')) {
            if (typeof window.renderBalanceChart === 'function') window.renderBalanceChart();
        }
    });

    // 3. Budgets Listener
    unsubBudgets = onSnapshot(collection(db, "users", currentUser.uid, "budgets"), (snapshot) => {
        globalCategoryBudgets = {};
        snapshot.forEach(doc => {
            globalCategoryBudgets[doc.id] = doc.data(); 
        });
        if(allTransactionsGlobal.length > 0) renderBudgetPage(allTransactionsGlobal);
    });

    // 4. Transactions Listener
    const q = query(collection(db, "users", currentUser.uid, "transactions"), orderBy("date", "desc"));
    unsubTxns = onSnapshot(q, (snapshot) => {
        allTransactionsGlobal = [];
        let totalIncome = 0;
        let totalExpense = 0;

        snapshot.forEach(doc => {
            const t = { id: doc.id, ...doc.data() };
            allTransactionsGlobal.push(t);
            
            // Crunch the numbers
            if (t.type === 'income') totalIncome += t.amount;
            if (t.type === 'expense') totalExpense += t.amount;
        });
        
        // 1. Update the Top 4 KPI Cards
        const balance = totalIncome - totalExpense;
        document.getElementById('stat-balance').innerText = `₹${balance.toLocaleString('en-IN')}`;
        document.getElementById('stat-spent').innerText = `₹${totalExpense.toLocaleString('en-IN')}`;
        document.getElementById('stat-income').innerText = `₹${totalIncome.toLocaleString('en-IN')}`;

        // 2. Calculate Budget Percentage
        let budgetPct = 0;
        if (globalBudget > 0) {
            budgetPct = Math.min(100, Math.round((totalExpense / globalBudget) * 100));
        }
        document.getElementById('stat-budget-pct').innerText = `${budgetPct}%`;
        
        const remaining = Math.max(0, globalBudget - totalExpense);
        document.getElementById('stat-budget-sub').innerText = `₹${remaining.toLocaleString('en-IN')} remaining`;
        
        // Check for budget alerts and show notifications
        if (budgetPct >= 100) {
            window.showNotification('Budget Exceeded', `You've spent ₹${totalExpense.toLocaleString('en-IN')} which exceeds your monthly budget of ₹${globalBudget.toLocaleString('en-IN')}`, 'error');
        } else if (budgetPct >= 80) {
            window.showNotification('Budget Warning', `You've used ${budgetPct}% of your monthly budget. ₹${remaining.toLocaleString('en-IN')} remaining.`, 'warning');
        }
        
        // Check all category budgets for exceedances
        Object.keys(globalCategoryBudgets).forEach(category => {
            checkCategoryBudgetExceedance(category);
        });

        // 3. Render the lists and charts
        renderDashboardList(allTransactionsGlobal);
        window.applyFilters();
        if (typeof Chart !== 'undefined') {
            if (typeof window.renderOverviewChart === 'function') window.renderOverviewChart(allTransactionsGlobal);
            if (typeof window.renderCategoryChart === 'function') window.renderCategoryChart(allTransactionsGlobal);
            if (typeof window.renderDashboardBudgets === 'function') window.renderDashboardBudgets(allTransactionsGlobal);
        }
        
        // 4. Update Budget page if active
        if (document.getElementById('page-budget').classList.contains('active')) {
            if (typeof renderBudgetPage === 'function') renderBudgetPage(allTransactionsGlobal);
        }
    });
}

// ==============================
// TRANSACTION PAGE LOGIC (Search, Filter, Export)
// ==============================
function renderDashboardList(transactions) {
    const listEl = document.getElementById('dashboard-recent-txns');
    const summaryEl = document.getElementById('dashboard-txn-summary'); // New

    if (listEl) {
        listEl.innerHTML = generateTxnHTML(transactions.slice(0, 5), true);
    }
    if (summaryEl) {
        summaryEl.innerText = `${transactions.length} total transactions`;
    }
}

// Consolidate into one clean function in app.js
window.applyFilters = () => {
    const searchBar = document.getElementById('txn-search');
    const summaryEl = document.getElementById('txn-page-summary');
    const listPageEl = document.getElementById('page-txns-list');

    // Safety check: Only run if we are actually on the Transactions page
    if (!searchBar || !listPageEl) return; 

    const searchTerm = searchBar.value.toLowerCase();
    
    // Filter logic using the global variable 'allTransactionsGlobal'
    let filtered = allTransactionsGlobal.filter(t => {
        const matchesSearch = t.desc.toLowerCase().includes(searchTerm) || 
                            t.category.toLowerCase().includes(searchTerm);
        
        let matchesFilter = true;
        if (currentTxnFilter === 'income' || currentTxnFilter === 'expense') {
            matchesFilter = t.type === currentTxnFilter;
        } else if (currentTxnFilter !== 'all') {
            matchesFilter = t.category === currentTxnFilter;
        }
        return matchesSearch && matchesFilter;
    });
    
    // Calculate Net Amount
    let net = 0;
    filtered.forEach(t => net += t.type === 'income' ? t.amount : -t.amount);
    
    // Update UI elements
    if (summaryEl) {
        summaryEl.innerText = `${filtered.length} transactions • Net: ₹${net.toLocaleString('en-IN')}`;
    }
    listPageEl.innerHTML = generateTxnHTML(filtered, false);
};

window.setFilter = (filterType, el) => {
    currentTxnFilter = filterType;
    document.querySelectorAll('.filter-pill').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');
    window.applyFilters();
};

// Consolidate into one clean function in app.js
window.applyFilters = () => {
    const searchBar = document.getElementById('txn-search');
    const summaryEl = document.getElementById('txn-page-summary');
    const listPageEl = document.getElementById('page-txns-list');

    // Safety check: Only run if we are actually on the Transactions page
    if (!searchBar || !listPageEl) return; 

    const searchTerm = searchBar.value.toLowerCase();
    
    // Filter logic using the global variable 'allTransactionsGlobal'
    let filtered = allTransactionsGlobal.filter(t => {
        const matchesSearch = t.desc.toLowerCase().includes(searchTerm) || 
                            t.category.toLowerCase().includes(searchTerm);
        
        let matchesFilter = true;
        if (currentTxnFilter === 'income' || currentTxnFilter === 'expense') {
            matchesFilter = t.type === currentTxnFilter;
        } else if (currentTxnFilter !== 'all') {
            matchesFilter = t.category === currentTxnFilter;
        }
        return matchesSearch && matchesFilter;
    });
    
    // Calculate Net Amount
    let net = 0;
    filtered.forEach(t => net += t.type === 'income' ? t.amount : -t.amount);
    
    // Update UI elements
    if (summaryEl) {
        summaryEl.innerText = `${filtered.length} transactions • Net: ₹${net.toLocaleString('en-IN')}`;
    }
    listPageEl.innerHTML = generateTxnHTML(filtered, false);
};



function generateTxnHTML(txns, isDashboard = false) {
    if (txns.length === 0) {
        return `
            <div style="padding: 60px 20px; text-align: center; opacity: 0.5;">
                <div style="font-size: 40px; margin-bottom: 10px;">🍃</div>
                <p style="color: var(--text2); font-size: 14px;">No transactions found yet.</p>
            </div>`;
    }

    const icons = { 
        food: '🍽️', study: '📚', hostel: '🏠', 
        travel: '🚌', shopping: '🛍️', other: '📦', income: '💰' 
    };

    return txns.map(t => `
        <div class="txn-item">
            <!-- 1. ICON -->
            <div class="txn-icon" style="background: ${t.type === 'income' ? 'rgba(0,229,160,0.1)' : 'rgba(255,107,107,0.1)'}">
                ${t.type === 'income' ? icons.income : (icons[t.category] || '📦')}
            </div>

            <!-- 2. INFO (Pushes everything else to the right) -->
            <div class="txn-info">
                <div class="txn-name" style="font-weight: 700; font-size: 15px;">${t.desc}</div>
                <div class="txn-meta" style="color: var(--text2); font-size: 12px; text-transform: uppercase;">
                    ${t.category} • ${t.account || 'Wallet'}
                </div>
            </div>

            <!-- 3. AMOUNT & DATE -->
            <div class="txn-right">
                <div class="txn-amount ${t.type === 'income' ? 'credit' : 'debit'}" style="font-weight: 800; font-size: 16px;">
                    ${t.type === 'income' ? '+' : '-'}₹${t.amount.toLocaleString('en-IN')}
                </div>
                <div class="txn-date" style="font-size: 11px; color: var(--text3); margin-top: 4px;">
                    ${new Date(t.date).toLocaleDateString('en-GB', {day: '2-digit', month: 'short'})}
                </div>
            </div>
            
            <!-- 4. ACTIONS (Only on Transactions page) -->
            ${!isDashboard ? `
            <div class="txn-actions">
                <button class="action-btn delete" onclick="window.confirmDelete('${t.id}', '${t.desc}')">
                    🗑️
                </button>
            </div>
            ` : ''}
        </div>
    `).join('');
}


window.confirmDelete = (id, name) => {
    if(confirm(`Do you want to delete "${name}"?`)) {
        window.deleteTransaction(id);
    }
};

window.deleteTransaction = async (id) => {
    try {
        await deleteDoc(doc(db, "users", currentUser.uid, "transactions", id));
        showToast('Transaction deleted');
    } catch (e) {
        // Error deleting
        showToast('Error deleting', 'error');
    }
};

// REAL CSV EXPORT FUNCTION (Killer feature for viva)
window.exportCSV = () => {
    if(allTransactionsGlobal.length === 0) return showToast('No data to export', 'error');
    
    let csv = 'Date,Type,Category,Description,Account,Amount\n';
    
    allTransactionsGlobal.forEach(t => {
        const date = new Date(t.date).toLocaleDateString('en-GB');
        // Clean strings to prevent CSV format breaking
        const desc = t.desc.replace(/,/g, ''); 
        const amount = t.amount;
        const account = t.account || 'default';
        
        csv += `"${date}","${t.type}","${t.category}","${desc}","${account}",${amount}\n`;
    });
    
    // Create a downloadable Blob
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SmartExpense_Report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showToast('Exported CSV successfully!');
};

// Render Budget Progress Bars (Matching Image 2)
function renderBudgetBars(transactions) {
    // Hardcoded mock limits for demo UI
    const limits = { food: 3500, hostel: 4501 }; 
    const spent = { food: 0, hostel: 0 };
    
    transactions.forEach(t => {
        if(t.type === 'expense' && spent[t.category] !== undefined) {
            spent[t.category] += t.amount;
        }
    });

    const list = document.getElementById('dashboard-budgets');
    list.innerHTML = Object.keys(limits).map(cat => {
        const pct = Math.min(100, Math.round((spent[cat] / limits[cat]) * 100));
        const color = pct >= 90 ? 'var(--red)' : 'var(--green)';
        const icon = cat === 'food' ? '🍽️' : '🏠';
        const title = cat === 'food' ? 'Mess & Food' : 'Hostel';
        
        return `
        <div class="budget-item" style="margin-bottom:16px;">
          <div class="budget-header">
            <span class="budget-name">${icon} ${title}</span>
            <span class="budget-amounts"><span>₹${spent[cat].toLocaleString('en-IN')}</span> / ₹${limits[cat].toLocaleString('en-IN')}</span>
          </div>
          <div class="budget-bar"><div class="budget-fill" style="width:${pct}%; background:${color}"></div></div>
          <div class="budget-pct">${pct}% used</div>
        </div>`;
    }).join('');
}

// ==============================
// BUDGET PAGE LOGIC
// ==============================
window.saveCategoryBudget = async () => {
    const category = document.getElementById('budget-category').value;
    const amount = Number(document.getElementById('budget-amount').value);
    const threshold = Number(document.getElementById('budget-threshold').value);

    if (!amount) return showToast('Please enter a valid amount', 'error');

    try {
        // Correct path: users -> uid -> budgets -> categoryName
        await setDoc(doc(db, "users", currentUser.uid, "budgets", category), {
            limit: amount,
            threshold: threshold
        });

        showToast('Budget saved successfully!');
        window.closeModal('set-budget-modal');
    } catch (e) {
        // Error saving budget
        showToast('Error saving budget', 'error');
    }
};

// ==============================
// BUDGET PAGE
// ==============================

function renderBudgetPage(transactions) {
    const listEl = document.getElementById('category-budget-list');
    if (!listEl) return;

    // 1. Calculate Spent amounts per category
    const spentData = {};
    let totalSpent = 0;
    
    transactions.forEach(t => {
        if (t.type === 'expense') {
            totalSpent += t.amount;
            if (!spentData[t.category]) spentData[t.category] = 0;
            spentData[t.category] += t.amount;
        }
    });

    // 2. Handle Empty State
    const categories = Object.keys(globalCategoryBudgets);
    if (categories.length === 0) {
        document.getElementById('budget-page-total').innerText = `₹${globalBudget.toLocaleString('en-IN')}`;
        document.getElementById('budget-page-spent').innerText = `₹${totalSpent.toLocaleString('en-IN')}`;
        document.getElementById('budget-page-remaining').innerText = `₹${(globalBudget - totalSpent).toLocaleString('en-IN')}`;
        return;
    }

    // 3. Render Items & Check Alerts
    let totalCustomBudget = 0;
    let budgetedSpent = 0; // NEW: Track spending ONLY for budgeted categories
    let html = '';
    let alertData = null;

    const icons = { food: '', study: '', hostel: '', travel: '', shopping: '', other: '' };
    const titles = { food: 'Mess & Food', study: 'Study Material', hostel: 'Hostel', travel: 'Transport', shopping: 'Shopping', other: 'Other' };

    categories.forEach(cat => {
        const limit = globalCategoryBudgets[cat].limit;
        const threshold = globalCategoryBudgets[cat].threshold;
        const spent = spentData[cat] || 0;
        
        totalCustomBudget += limit;
        budgetedSpent += spent; // NEW: Add to our budgeted spending total
        
        // Prevent dividing by zero if someone accidentally sets a limit of 0
        let pct = limit > 0 ? Math.round((spent / limit) * 100) : 100; 
        if (pct > 100) pct = 100;

        // Color logic
        let color = 'var(--accent)'; // Green
        let statusText = 'On track';
        if (pct >= threshold && pct < 100) {
            color = 'var(--orange)';
            statusText = 'Nearing limit';
            alertData = { name: titles[cat], pct }; 
        }
        if (pct >= 100) {
            color = 'var(--red)';
            statusText = 'Over budget!';
        }

        // Generate Item HTML (Keep your exact HTML string here!)
        html += `
        <div class="cat-budget-item">
            <div class="progress-circle" style="background: conic-gradient(${color} ${pct}%, var(--surface2) 0);">
                <span class="progress-circle-val" style="color: ${color}">${pct}%</span>
            </div>
            
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div style="font-weight: 600; font-size: 15px;">${icons[cat] || ''} ${titles[cat] || cat}</div>
                    <div style="font-size: 13px; color: var(--text2);">
                        ₹${spent.toLocaleString('en-IN')} / <span style="color: var(--text); font-weight: 700;">₹${limit.toLocaleString('en-IN')}</span>
                    </div>
                </div>
                
                <div class="budget-bar" style="height: 6px; margin-bottom: 8px;">
                    <div class="budget-fill" style="width: ${pct}%; background: ${color};"></div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--text3);">
                    <div style="color: ${color}">${statusText}</div>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div>₹${Math.max(0, limit - spent).toLocaleString('en-IN')} remaining</div>
                        <button onclick="window.deleteBudget('${cat}', '${titles[cat] || cat}')" style="background: none; border: none; cursor: pointer; color: var(--text3); font-size: 14px; transition: color 0.2s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'" title="Remove Budget">🗑️</button>
                    </div>
                </div>
            </div>
        </div>`;
    });

    listEl.innerHTML = html;

    // 4. Update Summary Cards (Using the correct budgetedSpent variable)
    document.getElementById('budget-page-total').innerText = `₹${totalCustomBudget.toLocaleString('en-IN')}`;
    document.getElementById('budget-page-spent').innerText = `₹${budgetedSpent.toLocaleString('en-IN')}`;
    document.getElementById('budget-page-remaining').innerText = `₹${Math.max(0, totalCustomBudget - budgetedSpent).toLocaleString('en-IN')}`;

    // 5. Handle Alert Banner
    const alertBanner = document.getElementById('budget-alert-banner');
    if (alertData) {
        document.getElementById('budget-alert-title').innerText = `Budget Alert: ${alertData.name}`;
        document.getElementById('budget-alert-desc').innerText = `You've used ${alertData.pct}% of your ${alertData.name.toLowerCase()} budget.`;
        alertBanner.style.display = 'flex';
    } else {
        alertBanner.style.display = 'none';
    }
}

// ==============================
// DELETE BUDGET LOGIC
// ==============================
window.deleteBudget = async (categoryId, categoryName) => {
    // Add a confirmation so users don't accidentally delete their budgets
    if (!confirm(`Are you sure you want to remove the budget limit for ${categoryName}?`)) {
        return;
    }

    try {
        // Delete the document from Firebase
        await deleteDoc(doc(db, "users", currentUser.uid, "budgets", categoryId));
        showToast(`${categoryName} budget removed`);
        
        // No need to manually re-render, your Firebase onSnapshot listener 
        // will detect the deletion and refresh the page automatically!
    } catch (e) {
        // Error removing budget
        showToast('Error removing budget', 'error');
    }
};

// ==============================
// ACCOUNTS PAGE LOGIC
// ==============================
function renderAccountsUI() {
    const dashboardGrid = document.getElementById('dashboard-accounts-grid');
    const accountsList = document.getElementById('page-accounts-list');
    
    // Select dropdowns
    const txnSelect = document.getElementById('txn-account');
    const transferFrom = document.getElementById('transfer-from');
    const transferTo = document.getElementById('transfer-to');

    let dashboardHtml = '';
    let listHtml = '';
    let optionsHtml = '';

    const typeDetails = {
        savings: { icon: '🏦', color: 'rgba(0, 229, 160, 0.1)', text: 'var(--green)', bg: 'linear-gradient(135deg, #0f5c46, #0a382b)' },
        current: { icon: '💼', color: 'rgba(107, 203, 255, 0.1)', text: 'var(--accent4)', bg: 'linear-gradient(135deg, #1f1860, #130f40)' },
        wallet: { icon: '📱', color: 'rgba(251, 146, 60, 0.1)', text: 'var(--orange)', bg: 'linear-gradient(135deg, #5c1e52, #3a1133)' }
    };

    if (globalAccounts.length > 0) {
        globalAccounts.forEach(acc => {
            const ui = typeDetails[acc.type] || typeDetails.wallet;
            const balance = acc.balance || 0;
            
            // Dashboard Card HTML
            dashboardHtml += `
                <div class="account-card" style="background: ${ui.bg}; border-radius: 12px; padding: 20px; color: white; position: relative; overflow: hidden;">
                    <div class="account-icon" style="font-size: 24px; margin-bottom: 12px;">${ui.icon}</div>
                    <div class="account-type" style="font-size: 12px; opacity: 0.8; margin-bottom: 8px;">${acc.type.toUpperCase()}</div>
                    <div class="account-balance" style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">₹${balance.toLocaleString('en-IN')}</div>
                    <div class="account-name" style="font-size: 14px; opacity: 0.9;">${acc.name}</div>
                </div>`;

            // List View HTML (for Accounts page)
            const bankInfo = acc.bankName ? `<div style="font-size: 11px; color: var(--text3);">${acc.bankName}</div>` : '';
            const accountInfo = acc.accountNumber ? `<div style="font-size: 11px; color: var(--text3);">****${acc.accountNumber}</div>` : '';
            
            listHtml += `
                <div class="acc-list-item" style="display: flex; align-items: center; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--border);">
                    <div class="acc-list-icon" style="background: ${ui.color}; color: ${ui.text}; width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px;">${ui.icon}</div>
                    <div class="acc-list-info" style="flex: 1;">
                        <div class="acc-list-name" style="font-weight: 600; color: var(--text1); margin-bottom: 4px;">${acc.name}</div>
                        <div class="acc-list-type" style="font-size: 13px; color: var(--text2);">${acc.type.toUpperCase()}</div>
                        ${bankInfo}
                        ${accountInfo}
                    </div>
                    <div class="acc-list-right" style="display: flex; flex-direction: column; align-items: flex-end; gap: 6px;">
                        <div class="acc-list-bal" style="font-weight: 700; color: var(--text1);">₹${balance.toLocaleString('en-IN')}</div>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div class="acc-list-status" style="font-size: 12px; color: var(--green);">Active</div>
                            <button onclick="window.deleteAccount('${acc.id}', '${acc.name}')" style="background: none; border: none; cursor: pointer; color: var(--text3); font-size: 14px; transition: color 0.2s;" onmouseover="this.style.color='var(--red)'" onmouseout="this.style.color='var(--text3)'" title="Delete Account">🗑️</button>
                        </div>
                    </div>
                </div>`;

            optionsHtml += `<option value="${acc.id}">${ui.icon} ${acc.name}</option>`;
        });
    }

    // Update Dashboard
    if (dashboardGrid) dashboardGrid.innerHTML = dashboardHtml || '<p style="text-align:center; color:var(--text2); padding:20px;">No accounts found.</p>';
    if (accountsList) accountsList.innerHTML = listHtml || '<p style="text-align:center; color:var(--text2); padding:20px;">No accounts found.</p>';

    // Update Select Dropdowns
    if(txnSelect) txnSelect.innerHTML = optionsHtml || '<option value="" disabled selected>No accounts available</option>';
    if(transferFrom) transferFrom.innerHTML = optionsHtml || '<option value="" disabled selected>No accounts available</option>';
    if(transferTo) transferTo.innerHTML = optionsHtml || '<option value="" disabled selected>No accounts available</option>';
}

// --- ACCOUNTS PAGE: BALANCE TREND CHART ---
window.renderBalanceChart = () => {
    const ctx = document.getElementById('balanceChart');
    if (!ctx) return;

    // 1. Get the CURRENT total balance across all accounts
    let currentTotal = globalAccounts.reduce((sum, acc) => sum + acc.balance, 0);

    const labels = [];
    const data = [];
    let runningBalance = currentTotal;

    // 2. Walk backwards through the last 7 days to reconstruct the balance
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        
        // Push the date label (e.g., 'May 02') to the front of the array
        labels.unshift(d.toLocaleString('default', { month: 'short', day: 'numeric' }));
        
        // Calculate the net change for this specific day
        let dailyNet = 0;
        allTransactionsGlobal.forEach(t => {
            const txDate = new Date(t.date);
            if (txDate.toDateString() === d.toDateString()) {
                if (t.type === 'income') dailyNet += t.amount;
                if (t.type === 'expense') dailyNet -= t.amount;
            }
        });
        
        // Save the balance for this day, then subtract the daily net to step back in time
        data.unshift(runningBalance);
        runningBalance = runningBalance - dailyNet; 
    }

    if (balanceChartInst) balanceChartInst.destroy();
    if (typeof Chart !== 'undefined') Chart.defaults.color = '#8b9cc8';

    // 3. Draw the beautiful blue trendline
    balanceChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Balance',
                data: data,
                borderColor: '#6bcbff', // Sleek UI Blue
                backgroundColor: 'rgba(107, 203, 255, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4, // Smooth curve
                pointBackgroundColor: '#6bcbff',
                pointBorderColor: '#111827',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { 
                    beginAtZero: false, // Don't drop to 0 if balance is high
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { callback: value => '₹' + (value >= 1000 ? (value/1000) + 'k' : value) }
                }
            }
        }
    });
};

// ==============================
// ADD NEW ACCOUNT LOGIC
// ==============================
window.submitNewAccount = async () => {
    if (!currentUser) return;

    const btn = document.getElementById('btn-save-account');
    const originalText = btn.innerHTML;
    btn.innerHTML = "Saving...";

    // 1. Grab values from the modal
    const nameInput = document.getElementById('new-acc-name');
    const typeInput = document.getElementById('new-acc-type');
    const balanceInput = document.getElementById('new-acc-balance');
    const bankInput = document.getElementById('new-acc-bank');
    const numberInput = document.getElementById('new-acc-number');

    // 2. Prepare the data object
    const newAccountData = {
        name: nameInput.value,
        type: typeInput.value,
        balance: Number(balanceInput.value),
        bankName: bankInput.value || '',
        accountNumber: numberInput.value || '',
        createdAt: new Date().toISOString()
    };

    try {
        // 3. Save to Firebase Firestore
        await addDoc(collection(db, "users", currentUser.uid, "accounts"), newAccountData);
        
        // 4. Clean up and close modal
        nameInput.value = '';
        balanceInput.value = '';
        bankInput.value = '';
        numberInput.value = '';
        typeInput.value = 'savings';
        window.closeModal('add-account-modal');
        
        showToast('Account added successfully!');
        
        // Note: You don't need to manually re-render the UI here! 
        // Your onSnapshot listener (unsubAccounts) will automatically detect the new data and redraw your accounts grid!
        
    } catch (error) {
        // Error adding account
        showToast('Failed to add account', 'error');
    } finally {
        btn.innerHTML = originalText;
    }
};

// --- DELETE ACCOUNT ---
window.deleteAccount = async (id, name) => {
    if(confirm(`Are you sure you want to delete the account "${name}"? This will not delete its transactions.`)) {
        try {
            await deleteDoc(doc(db, "users", currentUser.uid, "accounts", id));
            showToast('Account deleted successfully!');
        } catch (e) {
            // Error deleting account
            showToast('Error deleting account', 'error');
        }
    }
};



// ==============================
// ANALYTICS PAGE LOGIC
// ==============================
let monthlyChartInst = null;
let trendChartInst = null;

// ==============================
// ANALYTICS PAGE LOGIC
// ==============================
window.renderAnalyticsPage = () => {
    const transactions = allTransactionsGlobal;
    const now = new Date();
    
    // --- 1. CALCULATE TOP KPIs ---
    let currentMonthIncome = 0;
    let currentMonthExpense = 0;

    transactions.forEach(t => {
        const d = new Date(t.date);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            if (t.type === 'income') currentMonthIncome += t.amount;
            if (t.type === 'expense') currentMonthExpense += t.amount;
        }
    });

    const currentDay = now.getDate();
    const avgSpend = currentDay > 0 ? (currentMonthExpense / currentDay) : 0;
    document.getElementById('kpi-daily-spend').innerText = `₹${Math.round(avgSpend).toLocaleString('en-IN')}`;

    let savingsRate = 0;
    if (currentMonthIncome > 0) savingsRate = Math.max(0, Math.round(((currentMonthIncome - currentMonthExpense) / currentMonthIncome) * 100));
    document.getElementById('kpi-savings-rate').innerText = `${savingsRate}%`;


    // --- 2. MONTHLY COMPARISON CHART ---
    const monthlyCtx = document.getElementById('monthlyComparisonChart');
    if (monthlyCtx) {
        const labels6 = [];
        const incData = [0, 0, 0, 0, 0, 0];
        const expData = [0, 0, 0, 0, 0, 0];

        for (let i = 5; i >= 0; i--) {
            let d = new Date();
            d.setMonth(d.getMonth() - i);
            labels6.push(d.toLocaleString('default', { month: 'short' }));
        }

        transactions.forEach(t => {
            const d = new Date(t.date);
            const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
            if (monthsAgo >= 0 && monthsAgo <= 5) {
                const index = 5 - monthsAgo;
                if (t.type === 'income') incData[index] += t.amount;
                if (t.type === 'expense') expData[index] += t.amount;
            }
        });

        if (analyticsMonthlyInst) analyticsMonthlyInst.destroy();
        if(typeof Chart !== 'undefined') Chart.defaults.color = '#8b9cc8';

        analyticsMonthlyInst = new Chart(monthlyCtx, {
            type: 'bar',
            data: { labels: labels6, datasets: [
                { label: 'Income', data: incData, backgroundColor: '#00e5a0', borderRadius: 4 },
                { label: 'Expense', data: expData, backgroundColor: '#ff6b6b', borderRadius: 4 }
            ]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.05)' } } } }
        });
    }

    // --- 3. SPENDING TREND CHART ---
    const trendCtx = document.getElementById('twelveMonthTrendChart');
    if (trendCtx) {
        const labels12 = [];
        const trendData = [0,0,0,0,0,0,0,0,0,0,0,0];

        for (let i = 11; i >= 0; i--) {
            let d = new Date();
            d.setMonth(d.getMonth() - i);
            labels12.push(d.toLocaleString('default', { month: 'short' }));
        }

        transactions.forEach(t => {
            if (t.type === 'expense') {
                const d = new Date(t.date);
                const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
                if (monthsAgo >= 0 && monthsAgo <= 11) trendData[11 - monthsAgo] += t.amount;
            }
        });

        if (analyticsTrendInst) analyticsTrendInst.destroy();
        if(typeof Chart !== 'undefined') Chart.defaults.color = '#8b9cc8';

        analyticsTrendInst = new Chart(trendCtx, {
            type: 'line',
            data: { labels: labels12, datasets: [{
                label: 'Expenses', data: trendData, borderColor: '#ff6b6b', backgroundColor: 'rgba(255, 107, 107, 0.1)', borderWidth: 3, fill: true, tension: 0.4, pointBackgroundColor: '#ff6b6b', pointRadius: 4
            }]},
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true } } }
        });
    }

    // --- 4. SPENDING HEATMAP ---
    const heatmapContainer = document.getElementById('analytics-heatmap');
    if (heatmapContainer) {
        const categories = ['food', 'study', 'travel', 'shopping', 'other'];
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        const heatData = Array(categories.length).fill().map(() => Array(7).fill(0));
        let maxSpend = 0;

        transactions.forEach(t => {
            if (t.type === 'expense') {
                const catIdx = categories.indexOf(t.category);
                if (catIdx !== -1) {
                    const d = new Date(t.date);
                    heatData[catIdx][d.getDay()] += t.amount;
                    if (heatData[catIdx][d.getDay()] > maxSpend) maxSpend = heatData[catIdx][d.getDay()];
                }
            }
        });

        let html = `<div style="display: grid; grid-template-columns: 60px repeat(7, 1fr); gap: 4px; text-align: center; font-size: 11px; color: var(--text3); margin-bottom: 4px;"><div></div>`;
        days.forEach(d => html += `<div>${d}</div>`);
        html += `</div>`;

        categories.forEach((cat, rIdx) => {
            html += `<div style="display: grid; grid-template-columns: 60px repeat(7, 1fr); gap: 4px; align-items: center;">`;
            html += `<div style="font-size: 11px; color: var(--text2); text-align: right; padding-right: 8px;">${cat.charAt(0).toUpperCase() + cat.slice(1)}</div>`;
            
            for (let cIdx = 0; cIdx < 7; cIdx++) {
                const val = heatData[rIdx][cIdx];
                let opacity = 0.1;
                if (val > 0 && maxSpend > 0) opacity = 0.3 + (0.7 * (val / maxSpend)); 
                
                const titleText = val > 0 ? `₹${val.toLocaleString()}` : 'No spend';
                html += `<div title="${titleText}" style="height: 24px; border-radius: 4px; background-color: rgba(255, 107, 107, ${opacity}); transition: transform 0.2s; cursor: pointer;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></div>`;
            }
            html += `</div>`;
        });

        heatmapContainer.innerHTML = html;
    }
};

function renderAnalyticsCharts(income, expense) {
    // Standard Bar Chart for Monthly Comparison
    const ctxBar = document.getElementById('monthlyComparisonChart');
    if (window.monthlyChartInst) window.monthlyChartInst.destroy();
    window.monthlyChartInst = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: ['Current Month'],
            datasets: [
                { label: 'Income', data: [income], backgroundColor: '#00e5a0', borderRadius: 6 },
                { label: 'Expenses', data: [expense], backgroundColor: '#ff6b6b', borderRadius: 6 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });

    // 12 Month Trend (Simplified for now to ensure it draws)
    const ctxTrend = document.getElementById('twelveMonthTrendChart');
    if (window.trendChartInst) window.trendChartInst.destroy();
    window.trendChartInst = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
            datasets: [{
                label: 'Spending',
                data: [5000, 4500, 6000, 4000, expense],
                borderColor: '#6bcbff',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(107, 203, 255, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}



// ==============================
//  PROFILE PAGE
// ==============================
window.updateProfile = async () => {
    const btn = document.querySelector('#page-profile .btn-primary');
    const originalText = btn.innerText;

    const name = document.getElementById('set-name').value;
    const budget = Number(document.getElementById('set-budget').value);
    const college = document.getElementById('set-college').value;
    const year = document.getElementById('set-year').value;

    if(!name || !college) return showToast('Please fill all fields', 'error');

    btn.innerText = "Syncing...";
    try {
        await updateDoc(doc(db, "users", currentUser.uid), {
            "profile.name": name,
            "profile.budget": budget,
            "profile.college": college,
            "profile.year": year
        });
        showToast('Profile synced successfully!');
    } catch (e) {
        // Error updating profile
        showToast('Error syncing profile', 'error');
    } finally {
        btn.innerText = originalText;
    }
};



// ==============================
// CHART.JS RENDERING
// ==============================
Chart.defaults.color = '#8b9cc8';
Chart.defaults.font.family = "'DM Sans', sans-serif";

// ==============================
// DASHBOARD CHARTS (Chart.js)
// ==============================
// --- 6-MONTH OVERVIEW CHART ---
window.setChartType = (type) => {
    currentChartType = type;
    document.getElementById('btn-chart-line').classList.toggle('active', type === 'line');
    document.getElementById('btn-chart-bar').classList.toggle('active', type === 'bar');
    if(allTransactionsGlobal.length > 0) window.renderOverviewChart(allTransactionsGlobal);
};

window.renderOverviewChart = (transactions) => {
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;

    // 1. Generate the last 6 months labels dynamically (e.g., 'Dec', 'Jan', 'Feb')
    const labels = [];
    const incomeData = [0, 0, 0, 0, 0, 0];
    const expenseData = [0, 0, 0, 0, 0, 0];
    
    for(let i=5; i>=0; i--) {
        let d = new Date();
        d.setMonth(d.getMonth() - i);
        labels.push(d.toLocaleString('default', { month: 'short' })); 
    }

    // 2. Group transactions into those 6 buckets
    const now = new Date();
    transactions.forEach(t => {
        const d = new Date(t.date);
        const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        
        if (monthsAgo >= 0 && monthsAgo <= 5) {
            const index = 5 - monthsAgo; 
            if (t.type === 'income') incomeData[index] += t.amount;
            if (t.type === 'expense') expenseData[index] += t.amount;
        }
    });

    if (overviewChartInst) overviewChartInst.destroy();
    
    // Set default text color for chart
    if(typeof Chart !== 'undefined') Chart.defaults.color = '#8b9cc8';

    // 3. Draw the Chart
    overviewChartInst = new Chart(ctx, {
        type: currentChartType,
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: '#00e5a0',
                    backgroundColor: currentChartType === 'bar' ? '#00e5a0' : 'rgba(0, 229, 160, 0.1)',
                    borderWidth: 3,
                    tension: 0.4, // Smooth curves!
                    pointBackgroundColor: '#00e5a0',
                    pointBorderColor: '#111827',
                    pointRadius: currentChartType === 'line' ? 4 : 0
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: '#ff6b6b',
                    backgroundColor: currentChartType === 'bar' ? '#ff6b6b' : 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    pointBackgroundColor: '#ff6b6b',
                    pointBorderColor: '#111827',
                    pointRadius: currentChartType === 'line' ? 4 : 0
                }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: { 
                legend: { position: 'top', labels: { usePointStyle: true, boxWidth: 8 } } 
            },
            scales: {
                x: { grid: { display: false } },
                y: { 
                    beginAtZero: true, 
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { callback: (value) => '₹' + (value >= 1000 ? (value/1000) + 'k' : value) } 
                }
            }
        }
    });
};

// --- DASHBOARD BUDGET WIDGET (Compact View) ---
window.renderDashboardBudgets = (transactions) => {
    const container = document.getElementById('dashboard-budget-status');
    if (!container) return;

    const now = new Date();
    document.getElementById('budget-widget-month').innerText = now.toLocaleString('default', { month: 'long', year: 'numeric' });

    const spentData = {};
    transactions.forEach(t => {
        const d = new Date(t.date);
        if (t.type === 'expense' && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
            spentData[t.category] = (spentData[t.category] || 0) + t.amount;
        }
    });

    const catInfo = { 
        food: { title: 'Mess & Food', icon: '🍽️' }, study: { title: 'Study', icon: '📚' }, 
        hostel: { title: 'Hostel', icon: '🏠' }, travel: { title: 'Transport', icon: '🚌' }, 
        shopping: { title: 'Shopping', icon: '🛍️' }, other: { title: 'Other', icon: '📦' } 
    };
    
    let html = '';

    for (const [cat, data] of Object.entries(globalCategoryBudgets)) {
        const limit = data.limit;
        const spent = spentData[cat] || 0;
        const pct = Math.min(100, (spent / limit) * 100);

        let color = '#00e5a0'; 
        if (pct >= 100) color = '#ff6b6b'; 
        else if (pct >= (data.threshold || 80)) color = '#f59e0b'; 

        const info = catInfo[cat] || { title: cat.toUpperCase(), icon: '📌' };

        html += `
        <div style="margin-bottom: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; font-size: 14px;">
                <div style="color: var(--text1); font-weight: 600; display: flex; gap: 8px;">
                    <span>${info.icon}</span> <span>${info.title}</span>
                </div>
                <div>
                    <span style="font-weight: 700; color: var(--text1);">₹${spent.toLocaleString('en-IN')}</span> 
                    <span style="color: var(--text3);">/ ₹${limit.toLocaleString('en-IN')}</span>
                </div>
            </div>
            
            <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin-bottom: 6px;">
                <div style="width: ${pct}%; background: ${color}; height: 100%; border-radius: 3px; box-shadow: 0 0 8px ${color}40;"></div>
            </div>
            
            <div style="text-align: right; font-size: 11px; color: var(--text3);">
                ${pct.toFixed(0)}% used
            </div>
        </div>`;
    }

    if (Object.keys(globalCategoryBudgets).length === 0) {
        html = `<div style="text-align:center; color: var(--text3); padding: 20px 0;">No budgets configured.</div>`;
    }

    container.innerHTML = html;
};


// --- CATEGORY DOUGHNUT CHART ---
window.renderCategoryChart = (transactions) => {
    const ctx = document.getElementById('categoryChart');
    const legendContainer = document.getElementById('category-legend');
    if (!ctx || !legendContainer) return;

    // Group expenses by category
    const catData = {};
    transactions.forEach(t => {
        if (t.type === 'expense') {
            catData[t.category] = (catData[t.category] || 0) + t.amount;
        }
    });

    // Format labels (e.g., 'food' -> 'Food')
    const labels = Object.keys(catData).map(c => c.charAt(0).toUpperCase() + c.slice(1));
    const data = Object.values(catData);
    
    // The exact colors from your design
    const bgColors = ['#00e5a0', '#ff6b6b', '#6bcbff', '#f59e0b', '#8b5cf6', '#94a3b8'];

    if (categoryChartInst) categoryChartInst.destroy();

    // 1. Draw the Doughnut Chart
    categoryChartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // TURN OFF NATIVE LEGEND
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ' ₹' + context.raw.toLocaleString('en-IN');
                        }
                    }
                }
            },
            cutout: '75%' // Keeps the ring slim
        }
    });

    // 2. Generate the Custom HTML Legend
    let legendHTML = '';
    labels.forEach((label, index) => {
        const color = bgColors[index % bgColors.length];
        legendHTML += `
        <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text2);">
            <div style="width: 12px; height: 12px; border-radius: 3px; background-color: ${color};"></div>
            ${label}
        </div>`;
    });
    
    // Fallback if no expenses exist yet
    if (labels.length === 0) {
        legendHTML = `<div style="color: var(--text3); font-size: 13px;">No data yet</div>`;
    }
    
    legendContainer.innerHTML = legendHTML;
};



// ==============================
// BUDGET PROGRESS LOGIC
// ==============================
window.renderBudgetBars = (transactions) => {
    if (typeof window.renderBudgetPage === 'function') window.renderBudgetPage(transactions);
    
    if (typeof window.renderDashboardBudgets === 'function') window.renderDashboardBudgets(transactions);
};


