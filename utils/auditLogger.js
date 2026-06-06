const fs = require('fs');
const path = require('path');

const logAdminAction = (adminId, action, targetId, details) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        adminId,
        action,
        targetId,
        details
    };
    
    const logFilePath = path.join(__dirname, '..', 'audit.log');
    
    fs.appendFile(logFilePath, JSON.stringify(logEntry) + '\n', (err) => {
        if (err) console.error('Failed to write to audit log', err);
    });
};

module.exports = { logAdminAction };
