const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const db = require('./db');
const { initDatabase, checkDatabaseTables } = require('./initDatabase');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');
const forgotPasswordRoute = require('./routes/auth/forgot-password');
const resetPasswordRoute = require('./routes/auth/reset-password');

const helmet = require('helmet');
const compression = require('compression');

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'GEMINI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
if (missingEnvVars.length > 0) {
    console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
    process.exit(1);
}

const app = express();
const port = parseInt(process.env.PORT || '8000', 10);

// Security and Performance Middlewares
app.use(helmet({
    crossOriginResourcePolicy: false, // Needed to serve images from /uploads to the frontend
}));
app.use(compression());

// CORS Configuration
const allowedOrigins = (process.env.FRONTEND_URL || '*').split(',').map(url => url.trim());
app.use(cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    credentials: true,
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Initialize a dummy user for the app to work without authentication yet
async function initDb() {
    try {
        console.log('\n=== 🚀 DATABASE INITIALIZATION STARTED ===\n');

        // Step 1: Check if tables exist
        const tablesExist = await checkDatabaseTables();

        // Step 2: If tables don't exist, initialize database
        if (!tablesExist) {
            console.log('\n⚠️  Tables not found. Running database initialization...\n');
            await initDatabase();
            console.log('\n✅ Database initialization completed\n');
        } else {
            console.log('\n✅ All tables already exist\n');
        }

        // Step 3: Verify all required columns exist (backward compatibility)
        try {
            console.log('🔄 Verifying required columns...');
            await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password VARCHAR(255);');
            await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);');
            await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);');
            await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500);');
            await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS dob VARCHAR(100);');
            await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255);');
            await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;');
            await db.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;');
            
            await db.query('ALTER TABLE chats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;');
            await db.query('ALTER TABLE site_stats ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;');
            await db.query('ALTER TABLE site_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;');
            
            console.log('✅ All required columns verified/added');
        } catch (alterErr) {
            console.warn('⚠️  Could not verify columns:', alterErr.message);
        }

        console.log('\n=== ✅ DATABASE INITIALIZATION COMPLETED ===\n');
        return true;
    } catch (e) {
        console.error('\n❌ CRITICAL DATABASE ERROR\n');
        console.error('Error Code:', e.code);
        console.error('Error Message:', e.message);
        console.error('\nFull error:', e);
        
        process.exit(1);
    }
}

// Initialize database with error handling
initDb().catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

// Health Check Root Route
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'API is running successfully', 
        timestamp: new Date().toISOString() 
    });
});

// Visitor count routes
app.get('/api/visitors', async (req, res) => {
    try {
        const result = await db.query("SELECT value FROM site_stats WHERE key = 'visitor_count'");
        res.json({ count: result.rows[0] ? result.rows[0].value : 0 });
    } catch (err) {
        console.error("Failed to fetch visitor count:", err);
        res.status(500).json({ error: 'Failed to fetch visitor count' });
    }
});

app.post('/api/visitors', async (req, res) => {
    try {
        // Increment and return the new count atomically
        const result = await db.query(
            "UPDATE site_stats SET value = value + 1 WHERE key = 'visitor_count' RETURNING value"
        );
        res.json({ count: result.rows[0].value });
    } catch (err) {
        console.error("Failed to increment visitor count:", err);
        res.status(500).json({ error: 'Failed to increment visitor count' });
    }
});

// Registration route
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, first_name, last_name } = req.body;

        // Check if user exists
        const userExists = await db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Save user
        const newUser = await db.query(
            'INSERT INTO users (username, email, password, first_name, last_name) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email',
            [username, email, passwordHash, first_name, last_name]
        );

        // Create JWT
        const payload = { user: { id: newUser.rows[0].id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: newUser.rows[0] });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Login route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check user
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const user = result.rows[0];

        // Check if the user has a password set (for legacy users)
        if (!user.password) {
            return res.status(400).json({ error: 'Password not set. Please register again or reset your password.' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Create JWT
        const payload = { user: { id: user.id } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
            if (err) throw err;
            // Don't send back password
            delete user.password;
            res.json({ token, user });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

app.use('/api/auth/forgot-password', forgotPasswordRoute);
app.use('/api/auth/reset-password', resetPasswordRoute);

// Get User Profile
app.get('/api/user', auth, async (req, res) => {
    try {
        const userId = req.user.id;

        const result = await db.query('SELECT id, username, email, first_name, last_name, profile_picture, dob FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

// Update User Profile
app.put('/api/user', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { username, email, first_name, last_name, dob } = req.body;
        const result = await db.query(
            'UPDATE users SET username = $1, email = $2, first_name = $3, last_name = $4, dob = $5 WHERE id = $6 RETURNING id, username, email, first_name, last_name, profile_picture, dob',
            [username, email, first_name, last_name, dob, userId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update user profile' });
    }
});

// Upload User Avatar
app.post('/api/user/avatar', auth, upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.user.id;
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const filePath = `/uploads/${req.file.filename}`;

        const result = await db.query(
            'UPDATE users SET profile_picture = $1 WHERE id = $2 RETURNING profile_picture',
            [filePath, userId]
        );
        res.json({ profile_picture: result.rows[0].profile_picture });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to upload avatar' });
    }
});

// Remove User Avatar
app.delete('/api/user/avatar', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(
            'UPDATE users SET profile_picture = $1 WHERE id = $2 RETURNING profile_picture',
            ['', userId]
        );
        res.json({ profile_picture: result.rows[0].profile_picture });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to remove avatar' });
    }
});

// Get all chats for sidebar
app.get('/api/chats', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        // Order chats by latest message id using a subquery
        const result = await db.query(`
      SELECT c.*, COALESCE((SELECT MAX(id) FROM messages m WHERE m.chat_id = c.id), c.id) as sort_id
      FROM chats c
      WHERE c.user_id = $1
      ORDER BY sort_id DESC
    `, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch chats' });
    }
});

// Create a new chat
app.post('/api/chats', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        let { title } = req.body;
        let chatTitle = 'New Chat';

        if (title && title.trim() !== '') {
            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Summarize this user message into a very short chat title (2-4 words maximum). Return ONLY the title text, no quotes or punctuation: "${title}"`
                });
                chatTitle = response.text.trim().replace(/^"|"$/g, '');
                if (chatTitle.length > 50) {
                    chatTitle = chatTitle.substring(0, 50);
                }
            } catch (e) {
                console.error("AI Title generation failed:", e);
                chatTitle = title.length > 30 ? title.substring(0, 30) + '...' : title;
            }
        }

        const result = await db.query(
            'INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING *',
            [userId, chatTitle]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create chat' });
    }
});

// Get messages for a chat
app.get('/api/chats/:id/messages', auth, async (req, res) => {
    try {
        const chatId = req.params.id;

        // Ensure user owns this chat
        const chatCheck = await db.query('SELECT user_id FROM chats WHERE id = $1', [chatId]);
        if (chatCheck.rows.length === 0 || chatCheck.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized or chat not found' });
        }

        const result = await db.query(
            'SELECT id, role, content, created_at FROM messages WHERE chat_id = $1 ORDER BY id ASC',
            [chatId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message inside a chat id
app.post('/api/chats/:id/messages', auth, async (req, res) => {
    const chatId = req.params.id;
    const { message } = req.body;
    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // Ensure user owns this chat
        const chatCheck = await db.query('SELECT user_id FROM chats WHERE id = $1', [chatId]);
        if (chatCheck.rows.length === 0 || chatCheck.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized or chat not found' });
        }

        // 1. Save user message to DB
        await db.query(
            'INSERT INTO messages(chat_id, role, content) VALUES($1, $2, $3)',
            [chatId, 'user', message]
        );

        // 2. Fetch all previous messages in this chat for context
        const historyRes = await db.query(
            'SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY id ASC',
            [chatId]
        );

        const formattedHistory = historyRes.rows.map(row => ({
            role: row.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: row.content }]
        }));

        // 3. Set headers for SSE streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // 4. Stream response from Gemini
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: formattedHistory
        });

        let fullAiResponse = '';
        for await (const chunk of responseStream) {
            res.write(chunk.text);
            fullAiResponse += chunk.text;
        }

        // End the response stream
        res.end();

        // 5. Save AI response to DB
        await db.query(
            'INSERT INTO messages(chat_id, role, content) VALUES($1, $2, $3)',
            [chatId, 'assistant', fullAiResponse]
        );

    } catch (err) {
        console.error("DEBUG MESSAGE ERROR:", err);
        // Note: if stream already sent headers, you can't send a 500 status.
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process chat message: ' + (err.message || 'Unknown error') });
        } else {
            res.write('\n\n[Error: Connection with AI failed]');
            res.end();
        }
    }
});

// Edit a user message and regenerate response
app.put('/api/chats/:id/messages/:messageId/edit', auth, async (req, res) => {
    const chatId = req.params.id;
    const messageId = req.params.messageId;
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        // Ensure user owns this chat
        const chatCheck = await db.query('SELECT user_id FROM chats WHERE id = $1', [chatId]);
        if (chatCheck.rows.length === 0 || chatCheck.rows[0].user_id !== req.user.id) {
            return res.status(403).json({ error: 'Not authorized or chat not found' });
        }

        // Verify the message exists and belongs to this chat and is a user message
        const msgCheck = await db.query('SELECT role FROM messages WHERE id = $1 AND chat_id = $2', [messageId, chatId]);
        if (msgCheck.rows.length === 0 || msgCheck.rows[0].role !== 'user') {
            return res.status(400).json({ error: 'Invalid message to edit' });
        }

        // 1. Update the user message content
        await db.query(
            'UPDATE messages SET content = $1 WHERE id = $2',
            [message, messageId]
        );

        // 2. Truncate (delete) all subsequent messages after this one
        await db.query(
            'DELETE FROM messages WHERE chat_id = $1 AND id > $2',
            [chatId, messageId]
        );

        // 3. Fetch history up to and including the updated message
        const historyRes = await db.query(
            'SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY id ASC',
            [chatId]
        );

        const formattedHistory = historyRes.rows.map(row => ({
            role: row.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: row.content }]
        }));

        // 4. Set headers for SSE streaming
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // 5. Stream response
        const responseStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: formattedHistory
        });

        let fullAiResponse = '';
        for await (const chunk of responseStream) {
            res.write(chunk.text);
            fullAiResponse += chunk.text;
        }

        res.end();

        // 6. Save AI response
        await db.query(
            'INSERT INTO messages(chat_id, role, content) VALUES($1, $2, $3)',
            [chatId, 'assistant', fullAiResponse]
        );

    } catch (err) {
        console.error("DEBUG EDIT ERROR:", err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to edit message: ' + (err.message || 'Unknown error') });
        } else {
            res.write('\n\n[Error: Connection with AI failed]');
            res.end();
        }
    }
});

// Start server with proper error handling
const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('Server closed');
        db.close().then(() => {
            console.log('Database connection closed');
            process.exit(0);
        }).catch(err => {
            console.error('Error closing database connection:', err);
            process.exit(1);
        });
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});
