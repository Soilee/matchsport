const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const NodeCache = require('node-cache');
const { initializeDatabase } = require('./database');
const { seedDatabase } = require('./seed');
const routes = require('./routes');
const { startAutomation } = require('./automation');
const { sanitizeBody } = require('./securityMiddleware');

const app = express();
const PORT = process.env.PORT || 3001;

// Global Cache (10 mins default TTL)
const appCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
app.set('appCache', appCache);

// --- Security & Performance Middleware ---
// 1. Helmet for security headers
app.use(helmet());

// 2. Gzip Compression
app.use(compression());

// 2. Global Sanitization
app.use(sanitizeBody);

// 2. Trust proxy if behind Heroku/Render/etc.
app.set('trust proxy', 1);

// 3. Rate Limiting (General)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Çok fazla istek gönderdiniz, lütfen biraz bekleyin.' }
});
app.use('/api/', limiter);

// 4. Stricter Rate Limiting for Auth/AI
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts
    message: { error: 'Çok fazla deneme yaptınız, lütfen 1 saat sonra tekrar deneyin.' }
});
app.use('/api/auth/login', authLimiter);
app.use('/api/nutrition/ai-log-meal', authLimiter);

// 5. Hardened CORS
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' })); // Limit payload size to 10kb to prevent DDoS

// Initialize DB and seed
initializeDatabase();
startAutomation();
// seedDatabase(); // Disabled legacy seed, use supabase_seed.js instead
// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), app: 'Matchless Fitness API' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Matchless Error:', err.message);
    res.status(500).json({ error: 'Sistem hatası oluştu' });
});

app.listen(PORT, () => {
    console.log(`\n🏋️ Matchless Fitness API running on http://localhost:${PORT}`);
    console.log(`📊 Panel: http://localhost:5173`);
    console.log(`🔑 Demo Giriş: admin@matchsport.com / admin123\n`);
});
