const fs = require('fs');
try {
    console.log('Attempting to require routes...');
    require('./backend/routes');
    console.log('Success!');
} catch (e) {
    const errorMsg = 'FAILED TO REQUIRE ROUTES:\n' + e.message + '\n' + e.stack;
    fs.writeFileSync('debug_error.log', errorMsg, 'utf8');
    console.error(errorMsg);
}
