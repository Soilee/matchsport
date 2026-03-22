const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');
const { seedDatabase } = require('./seed');
const routes = require('./routes');
const { startAutomation } = require('./automation');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
