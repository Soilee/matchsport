/**
 * MatchSport Security Middleware
 * Purpose: Input validation, Sanitization, and advanced RBAC checks
 */

// Simple XSS Sanitizer (basic)
function sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/[<>]/g, ''); // Remove < and > tags
}

// Global Sanitizer Middleware
function sanitizeBody(req, res, next) {
    if (req.body) {
        for (let key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        }
    }
    next();
}

// Input Validator for specific types
const validate = {
    email: (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
    uuid: (id) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id),
    numeric: (val) => !isNaN(parseFloat(val)) && isFinite(val)
};

// Example Validation Middleware for Registration
function validateRegister(req, res, next) {
    const { email, full_name, password } = req.body;
    if (!email || !validate.email(email)) return res.status(400).json({ error: 'Geçersiz email adresi' });
    if (!full_name || full_name.length < 3) return res.status(400).json({ error: 'İsim çok kısa' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    next();
}

module.exports = {
    sanitizeBody,
    validate,
    validateRegister
};
