const express = require('express');
const path = require('path');
// No need for multer, fs/promises if you're only serving static files and proxying Apps Script
// const multer = require('multer'); 
// const fs = require('fs/promises'); 

const app = express();
const PORT = process.env.PORT || 3000;

// Serve the Service Worker file directly from the root
app.get('/sw.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'sw.js'));
});

// Middleware to serve your static frontend files (HTML, CSS, JS) from the root directory
// This replaces app.use(express.static(path.join(__dirname, 'public')));
// Make sure index.html, style.css, script.js are in the same directory as server.js and sw.js
app.use(express.static(__dirname)); 

// --- Google Apps Script URL (used by your frontend, and now cached by SW) ---
const GOOGLE_APPS_SCRIPT_ORIGIN_URL = 'https://script.google.com/macros/s/AKfycbzK3iC-xXKQubOI5Zr5Es7K2wivt9PTsXFdPoGFO4cKps12Alv8wUs_ILZd5KLjjbPgBQ/exec';

// This server doesn't need to proxy the Apps Script URL directly anymore,
// because your frontend fetches it directly and the SW intercepts.
// So, you can remove any /api/data routes that were previously there for proxying Apps Script.

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Open your browser to http://localhost:${PORT}/index.html`);
});