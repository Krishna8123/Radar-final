// Quick Trader Mode Setup
// Run this in your browser console (F12 -> Console tab)

// Set authentication token
localStorage.setItem('token', 'demo-token');

// Set mode to TRADER
localStorage.setItem('mode', 'TRADER');

// Redirect to dashboard
window.location.href = '/dashboard';

console.log('✅ Switched to TRADER mode! Redirecting...');
