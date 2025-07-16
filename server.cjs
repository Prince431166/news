require('dotenv').config();

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Client } = require('pg');
const cloudinary = require('cloudinary').v2;
const bcrypt = require('bcryptjs'); // For password hashing
const jwt = require('jsonwebtoken'); // For JWTs

// --- Cloudinary Setup ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- PostgreSQL Setup ---
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

client.connect()
    .then(() => {
        console.log('Connected to PostgreSQL database');
        createTables();
    })
    .catch(err => console.error('Error connecting to PostgreSQL:', err.stack));

async function createTables() {
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                name TEXT,
                avatar TEXT
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS news (
                id VARCHAR(255) PRIMARY KEY,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                fullContent TEXT NOT NULL,
                imageUrl TEXT,
                author TEXT NOT NULL,
                authorImage TEXT,
                publishDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                isFeatured BOOLEAN DEFAULT FALSE,
                isSideFeature BOOLEAN DEFAULT FALSE,
                authorId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE -- Link to users table
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id VARCHAR(255) PRIMARY KEY,
                news_id VARCHAR(255) REFERENCES news(id) ON DELETE CASCADE,
                author TEXT NOT NULL,
                authorId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Link to users table
                avatar TEXT,
                text TEXT NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Users, News and Comments tables ensured.');
    } catch (err) {
        console.error('Error creating tables:', err);
    }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'https://flashnews1.netlify.app',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const upload = multer({
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (jpeg, jpg, png, gif) are allowed!'));
        }
    }
});

// --- JWT Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Authentication token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error('JWT verification failed:', err.message);
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user; // Contains { id: userId, username: username }
        next();
    });
};

// --- API Endpoints for Authentication ---

app.post('/api/register', async (req, res) => {
    const { username, password, name, avatar } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const defaultName = name || username;
        const defaultAvatar = avatar || 'https://placehold.co/100x100?text=User';

        const insertQuery = `
            INSERT INTO users (id, username, password_hash, name, avatar)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, name, avatar;
        `;
        const result = await client.query(insertQuery, [userId, username, hashedPassword, defaultName, defaultAvatar]);
        res.status(201).json({ message: 'User registered successfully!', user: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') { // Unique violation for username
            return res.status(409).json({ message: 'Username already exists.' });
        }
        console.error('Error registering user:', err.stack);
        res.status(500).json({ message: 'Error registering user.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
    }

    try {
        const userResult = await client.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(400).json({ message: 'Invalid username or password.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid username or password.' });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, name: user.name, avatar: user.avatar },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expires in 1 hour
        );

        res.json({
            message: 'Login successful!',
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                avatar: user.avatar
            }
        });
    } catch (err) {
        console.error('Error logging in user:', err.stack);
        res.status(500).json({ message: 'Error logging in.' });
    }
});

// GET current user profile (protected)
app.get('/api/profile', authenticateToken, async (req, res) => {
    try {
        // req.user contains id, username, name, avatar from JWT payload
        const userResult = await client.query('SELECT id, username, name, avatar FROM users WHERE id = $1', [req.user.id]);
        const userProfile = userResult.rows[0];

        if (!userProfile) {
            return res.status(404).json({ message: 'User profile not found.' });
        }
        res.json(userProfile);
    } catch (err) {
        console.error('Error fetching user profile:', err.stack);
        res.status(500).json({ message: 'Error fetching user profile.' });
    }
});

// Update user profile (protected)
app.put('/api/profile', authenticateToken, async (req, res) => {
    const { name, avatar } = req.body;
    const userId = req.user.id; // Get user ID from authenticated token

    if (!name) {
        return res.status(400).json({ message: 'Name cannot be empty.' });
    }

    try {
        const updateQuery = `
            UPDATE users
            SET name = COALESCE($1, name), avatar = COALESCE($2, avatar)
            WHERE id = $3
            RETURNING id, username, name, avatar;
        `;
        const result = await client.query(updateQuery, [name, avatar, userId]);

        if (result.rowCount > 0) {
            res.json({ message: 'Profile updated successfully!', user: result.rows[0] });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (err) {
        console.error('Error updating user profile:', err.stack);
        res.status(500).json({ message: 'Error updating profile.' });
    }
});


// --- API Endpoints for News ---

// GET all news with optional filtering and search (public endpoint)
app.get('/api/news', async (req, res) => {
    try {
        let query = 'SELECT * FROM news WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;

        const { category, search, authorId } = req.query;

        if (category && category !== 'all' && category !== 'my-posts') {
            query += ` AND category = $${paramIndex++}`;
            queryParams.push(category);
        }
        if (search) {
            query += ` AND (title ILIKE $${paramIndex} OR fullContent ILIKE $${paramIndex} OR category ILIKE $${paramIndex} OR author ILIKE $${paramIndex})`;
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        if (authorId) { // This will now typically come from frontend based on user's own ID
            query += ` AND authorId = $${paramIndex++}`;
            queryParams.push(authorId);
        }

        query += ' ORDER BY publishDate DESC';

        const result = await client.query(query, queryParams);
        const news = result.rows;

        // Fetch comments for each news item
        for (const newsItem of news) {
            const commentsResult = await client.query('SELECT * FROM comments WHERE news_id = $1 ORDER BY timestamp DESC', [newsItem.id]);
            newsItem.comments = commentsResult.rows;
        }

        res.json(news);
    } catch (err) {
        console.error('Error fetching news:', err.stack);
        res.status(500).json({ message: 'Error fetching news' });
    }
});

// GET single news item by ID (public endpoint)
app.get('/api/news/:newsid', async (req, res) => {
    try {
        const newsId = req.params.newsid;
        const result = await client.query('SELECT * FROM news WHERE id = $1', [newsId]);
        const newsItem = result.rows[0];

        if (newsItem) {
            const commentsResult = await client.query('SELECT * FROM comments WHERE news_id = $1 ORDER BY timestamp DESC', [newsItem.id]);
            newsItem.comments = commentsResult.rows;
            res.json(newsItem);
        } else {
            res.status(404).json({ message: 'News item not found' });
        }
    } catch (err) {
        console.error('Error fetching single news item:', err.stack);
        res.status(500).json({ message: 'Error fetching news item' });
    }
});

// POST a new news item (protected)
app.post('/api/news', authenticateToken, upload.none(), async (req, res) => {
    const { title, category, fullContent, imageUrl } = req.body;
    const authorId = req.user.id; // Get authorId from authenticated user
    const authorName = req.user.name || req.user.username; // Get author name from authenticated user
    const authorImage = req.user.avatar || 'https://placehold.co/28x28?text=A';

    if (!title || !category || !fullContent || fullContent.trim() === '') {
        return res.status(400).json({ message: 'Missing required news fields or full content is empty.' });
    }

    const finalImageUrl = imageUrl || 'https://placehold.co/600x400?text=No+Image';

    const newNews = {
        id: uuidv4(),
        category,
        title,
        fullContent: fullContent.trim(),
        imageUrl: finalImageUrl,
        author: authorName,
        authorImage: authorImage,
        publishDate: new Date().toISOString(),
        isFeatured: false,
        isSideFeature: false,
        authorId: authorId,
    };

    try {
        const insertQuery = `
            INSERT INTO news (id, category, title, fullContent, imageUrl, author, authorImage, publishDate, isFeatured, isSideFeature, authorId)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        const values = [
            newNews.id, newNews.category, newNews.title, newNews.fullContent, newNews.imageUrl,
            newNews.author, newNews.authorImage, newNews.publishDate, newNews.isFeatured,
            newNews.isSideFeature, newNews.authorId
        ];
        const result = await client.query(insertQuery, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding new news item:', err.stack);
        res.status(500).json({ message: 'Error adding news item' });
    }
});

// PUT/PATCH (Update) an existing news item (protected)
app.put('/api/news/:newsid', authenticateToken, upload.none(), async (req, res) => {
    const newsId = req.params.newsid;
    const { title, category, fullContent, imageUrl } = req.body;
    const userIdFromToken = req.user.id; // Get user ID from authenticated token

    try {
        const currentNewsResult = await client.query('SELECT * FROM news WHERE id = $1', [newsId]);
        const existingNews = currentNewsResult.rows[0];

        if (!existingNews) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Only allow author to update their own news
        if (existingNews.authorId !== userIdFromToken) {
            return res.status(403).json({ message: 'You are not authorized to edit this news item.' });
        }

        let updatedFullContent = existingNews.fullContent;
        if (fullContent !== undefined && fullContent.trim() !== '') {
            updatedFullContent = fullContent.trim();
        } else if (fullContent !== undefined && fullContent.trim() === '') {
            return res.status(400).json({ message: 'Full content cannot be empty.' });
        }

        const finalImageUrl = imageUrl || existingNews.imageUrl;

        const updateQuery = `
            UPDATE news
            SET
                title = COALESCE($1, title),
                category = COALESCE($2, category),
                fullContent = COALESCE($3, fullContent),
                imageUrl = $4
            WHERE id = $5
            RETURNING *;
        `;
        const values = [
            title, category, updatedFullContent, finalImageUrl, newsId
        ];
        const result = await client.query(updateQuery, values);
        res.json(result.rows[0]);

    } catch (err) {
        console.error('Error updating news item:', err.stack);
        res.status(500).json({ message: 'Error updating news item' });
    }
});


// DELETE a news item (protected)
app.delete('/api/news/:newsid', authenticateToken, async (req, res) => {
    const newsId = req.params.newsid;
    const userIdFromToken = req.user.id; // Get user ID from authenticated token

    try {
        const newsItemResult = await client.query('SELECT * FROM news WHERE id = $1', [newsId]);
        const newsItemToDelete = newsItemResult.rows[0];

        if (!newsItemToDelete) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Only allow author to delete their own news
        if (newsItemToDelete.authorId !== userIdFromToken) {
            return res.status(403).json({ message: 'You are not authorized to delete this news item.' });
        }

        // Delete associated image from Cloudinary if it's a Cloudinary URL
        if (newsItemToDelete.imageUrl && newsItemToDelete.imageUrl.includes('res.cloudinary.com')) {
            const urlParts = newsItemToDelete.imageUrl.split('/');
            const folder = urlParts[urlParts.length - 2];
            const publicIdWithFormat = urlParts[urlParts.length - 1];
            const publicId = publicIdWithFormat.split('.')[0];
            const fullPublicId = `${folder}/${publicId}`;

            try {
                const cloudinaryDeleteResult = await cloudinary.uploader.destroy(fullPublicId);
                console.log('Cloudinary delete result:', cloudinaryDeleteResult);
                if (cloudinaryDeleteResult.result !== 'ok') {
                    console.warn(`Cloudinary delete for ${fullPublicId} was not 'ok':`, cloudinaryDeleteResult.result);
                }
            } catch (clError) {
                console.error("Error deleting image from Cloudinary:", clError);
            }
        }

        const deleteNewsResult = await client.query('DELETE FROM news WHERE id = $1 RETURNING *', [newsId]);

        if (deleteNewsResult.rowCount > 0) {
            res.status(200).json({ message: 'News item deleted successfully' });
        } else {
            res.status(500).json({ message: 'Failed to delete news item due to internal error.' });
        }
    } catch (err) {
        console.error('Error deleting news item:', err.stack);
        res.status(500).json({ message: 'Error deleting news item' });
    }
});

// --- API Endpoints for Comments ---
// GET comments for a specific news item (public)
app.get('/api/news/:newsId/comments', async (req, res) => {
    try {
        const newsId = req.params.newsId;
        const result = await client.query('SELECT * FROM comments WHERE news_id = $1 ORDER BY timestamp DESC', [newsId]);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching comments:', err.stack);
        res.status(500).json({ message: 'Error fetching comments' });
    }
});

// POST a new comment to a news item (protected)
app.post('/api/news/:newsId/comments', authenticateToken, async (req, res) => {
    const newsId = req.params.newsId;
    const { text } = req.body;
    const authorId = req.user.id;
    const authorName = req.user.name || req.user.username;
    const authorAvatar = req.user.avatar || 'https://placehold.co/45x45?text=U';

    if (!text || text.trim() === '') {
        return res.status(400).json({ message: 'Comment text cannot be empty.' });
    }

    const newComment = {
        id: uuidv4(),
        news_id: newsId,
        author: authorName,
        authorId: authorId,
        avatar: authorAvatar,
        text: text.trim(),
        timestamp: new Date().toISOString()
    };

    try {
        const newsCheck = await client.query('SELECT id FROM news WHERE id = $1', [newsId]);
        if (newsCheck.rowCount === 0) {
            return res.status(404).json({ message: 'News item not found.' });
        }

        const insertQuery = `
            INSERT INTO comments (id, news_id, author, authorId, avatar, text, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `;
        const values = [
            newComment.id, newComment.news_id, newComment.author, newComment.authorId,
            newComment.avatar, newComment.text, newComment.timestamp
        ];
        const result = await client.query(insertQuery, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding new comment:', err.stack);
        res.status(500).json({ message: 'Error adding comment' });
    }
});

// PUT/PATCH (Update) a comment (protected)
app.put('/api/news/:newsId/comments/:commentId', authenticateToken, async (req, res) => {
    const { newsId, commentId } = req.params;
    const { text } = req.body;
    const userIdFromToken = req.user.id;

    if (text === undefined || text.trim() === '') {
        return res.status(400).json({ message: 'Comment text cannot be empty for update.' });
    }

    try {
        const commentResult = await client.query('SELECT authorId FROM comments WHERE id = $1 AND news_id = $2', [commentId, newsId]);
        const commentToUpdate = commentResult.rows[0];

        if (!commentToUpdate) {
            return res.status(404).json({ message: 'Comment not found for this news item.' });
        }

        // Only allow author to update their own comment
        if (commentToUpdate.authorId !== userIdFromToken) {
            return res.status(403).json({ message: 'You are not authorized to edit this comment.' });
        }

        const updateQuery = `
            UPDATE comments
            SET text = $1
            WHERE id = $2 AND news_id = $3
            RETURNING *;
        `;
        const result = await client.query(updateQuery, [text.trim(), commentId, newsId]);

        if (result.rowCount > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(500).json({ message: 'Failed to update comment.' });
        }
    } catch (err) {
        console.error('Error updating comment:', err.stack);
        res.status(500).json({ message: 'Error updating comment' });
    }
});

// DELETE a comment (protected)
app.delete('/api/news/:newsId/comments/:commentId', authenticateToken, async (req, res) => {
    const { newsId, commentId } = req.params;
    const userIdFromToken = req.user.id;

    try {
        const commentResult = await client.query('SELECT authorId FROM comments WHERE id = $1 AND news_id = $2', [commentId, newsId]);
        const commentToDelete = commentResult.rows[0];

        if (!commentToDelete) {
            return res.status(404).json({ message: 'Comment not found for this news item.' });
        }

        // Only allow author to delete their own comment
        if (commentToDelete.authorId !== userIdFromToken) {
            return res.status(403).json({ message: 'You are not authorized to delete this comment.' });
        }

        const deleteQuery = `
            DELETE FROM comments
            WHERE id = $1 AND news_id = $2
            RETURNING *;
        `;
        const result = await client.query(deleteQuery, [commentId, newsId]);

        if (result.rowCount > 0) {
            res.status(200).json({ message: 'Comment deleted successfully' });
        } else {
            res.status(500).json({ message: 'Failed to delete comment due to internal error.' });
        }
    } catch (err) {
        console.error('Error deleting comment:', err.stack);
        res.status(500).json({ message: 'Error deleting comment' });
    }
});

// --- Error Handling Middleware (should be last app.use) ---
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error("Multer error:", err);
        return res.status(400).json({ message: err.message || 'File upload error.' });
    } else if (err) {
        console.error('Generic server error:', err);
        return res.status(500).json({ message: err.message || 'An unexpected error occurred.' });
    }
    next();
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
