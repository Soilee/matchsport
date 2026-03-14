require('dotenv').config({ path: './backend/.env' });
const fs = require('fs');
process.on('uncaughtException', (err) => {
    fs.appendFileSync('debug_crash.log', 'UNCAUGHT EXCEPTION:\n' + err.stack + '\n', 'utf8');
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    fs.appendFileSync('debug_crash.log', 'UNHANDLED REJECTION:\n' + (reason.stack || reason) + '\n', 'utf8');
    process.exit(1);
});

console.log('Starting server...');
require('./backend/server');
console.log('Server module loaded.');
