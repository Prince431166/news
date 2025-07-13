const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const poll = require('./db');
const result = await Pool.query('SELECT * FROM users');

// --- PostgreSQL Setup ---
const { Client } = require('pg'); // Import the pg Client
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render's managed databases sometimes
    }
});

// Connect to PostgreSQL when the server starts
client.connect()
    .then(() => {
        console.log('Connected to PostgreSQL database');
        // You might want to run schema creation here if not already done
        // For example, if you want to ensure tables exist on startup:
        // createTables();
    })
    .catch(err => console.error('Error connecting to PostgreSQL:', err.stack));

// Function to create tables if they don't exist (optional, for initial setup)
async function createTables() {
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS news (
                id VARCHAR(255) PRIMARY KEY,
                category VARCHAR(255) NOT NULL,
                title VARCHAR(255) NOT NULL,
                fullContent TEXT NOT NULL,
                imageUrl VARCHAR(255),
                author VARCHAR(255) NOT NULL,
                authorImage VARCHAR(255),
                publishDate VARCHAR(255), -- Or TIMESTAMP WITH TIME ZONE
                isFeatured BOOLEAN DEFAULT FALSE,
                isSideFeature BOOLEAN DEFAULT FALSE,
                authorId VARCHAR(255) NOT NULL
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id VARCHAR(255) PRIMARY KEY,
                news_id VARCHAR(255) REFERENCES news(id) ON DELETE CASCADE,
                author VARCHAR(255) NOT NULL,
                authorId VARCHAR(255) NOT NULL,
                avatar VARCHAR(255),
                text TEXT NOT NULL,
                timestamp VARCHAR(255) -- Or TIMESTAMP WITH TIME ZONE
            );
        `);
        console.log('News and Comments tables ensured.');
    } catch (err) {
        console.error('Error creating tables:', err);
    }
}


const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Ensure 'uploads' directory exists for images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating uploads directory: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir);
}

// Multer storage configuration for images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${fileExtension}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Limit file size to 100MB
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

// Utility to format date
const formatDate = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(date).toLocaleString('en-US', options);
};

// --- API Endpoints for News ---

// GET all news with optional filtering and search
app.get('/api/news', async (req, res) => {
    try {
        let query = 'SELECT * FROM news WHERE 1=1'; // Start with a basic query
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
            paramIndex++; // Increment for the next parameter
        }
        if (authorId) {
            query += ` AND authorId = $${paramIndex++}`;
            queryParams.push(authorId);
        }

        query += ' ORDER BY publishDate DESC'; // Sort by publishDate, newest first

        const result = await client.query(query, queryParams);
        const news = result.rows;

        // Fetch comments for each news item (this can be optimized with JOINs in a real app)
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

// GET single news item by ID
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

// POST a new news item
app.post('/api/news', upload.single('image'), async (req, res) => {
    const { title, category, fullContent, author, authorImage, authorId } = req.body;

    if (!title || !category || !fullContent || !author || !authorId) {
        // You might want to add more specific validation for field lengths here
        // if your database schema has stricter limits than the client-side.
        return res.status(400).json({ message: 'Missing required news fields.' });
    }

    const imageUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl || 'https://via.placeholder.com/600x400?text=No+Image');

    const newNews = {
        id: uuidv4(),
        category,
        title,
        fullContent,
        imageUrl,
        author,
        authorImage: authorImage || 'https://via.placeholder.com/28x28?text=A',
        publishDate: formatDate(new Date()), // Store as formatted string
        isFeatured: false,
        isSideFeature: false,
        authorId,
    };

    try {
        const insertQuery = `
            INSERT INTO news (id, category, title, fullContent, imageUrl, author, authorImage, publishDate, isFeatured, isSideFeature, authorId)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *;
        `;
        const values = [
            newNews.id, newNews.category, newNews.title, newNews.fullContent,
            newNews.imageUrl, newNews.author, newNews.authorImage, newNews.publishDate,
            newNews.isFeatured, newNews.isSideFeature, newNews.authorId
        ];
        const result = await client.query(insertQuery, values);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding new news item:', err.stack);
        res.status(500).json({ message: 'Error adding news item' });
    }
});

// PUT/PATCH (Update) an existing news item
app.put('/api/news/:newsid', upload.single('image'), async (req, res) => {
    const newsId = req.params.newsid;
    const { title, category, fullContent, author, authorImage, authorId } = req.body;

    try {
        const currentNewsResult = await client.query('SELECT * FROM news WHERE id = $1', [newsId]);
        const existingNews = currentNewsResult.rows[0];

        if (!existingNews) {
            return res.status(404).json({ message: 'News item not found' });
        }

        let imageUrl = req.body.imageUrl;

        if (req.file) {
            // Delete old image if it was a local upload
            if (existingNews.imageUrl && existingNews.imageUrl.startsWith('/uploads/')) {
                const oldImagePath = path.join(__dirname, existingNews.imageUrl);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlink(oldImagePath, (err) => {
                        if (err) console.error("Error deleting old image:", oldImagePath, err);
                    });
                }
            }
            imageUrl = `/uploads/${req.file.filename}`;
        } else if (req.body.imageUrl === '') { // Client sent empty string for image, means clear it
            imageUrl = 'https://via.placeholder.com/600x400?text=No+Image'; // Set placeholder
            // Delete old image if it was a local upload
            if (existingNews.imageUrl && existingNews.imageUrl.startsWith('/uploads/')) {
                const oldImagePath = path.join(__dirname, existingNews.imageUrl);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlink(oldImagePath, (err) => {
                        if (err) console.error("Error deleting old image after clear:", oldImagePath, err);
                    });
                }
            }
        } else {
            // If no new file and not explicitly cleared, keep existing image URL
            imageUrl = existingNews.imageUrl;
        }

        const updateQuery = `
            UPDATE news
            SET
                title = COALESCE($1, title),
                category = COALESCE($2, category),
                fullContent = COALESCE($3, fullContent),
                imageUrl = COALESCE($4, imageUrl),
                author = COALESCE($5, author),
                authorImage = COALESCE($6, authorImage),
                authorId = COALESCE($7, authorId)
            WHERE id = $8
            RETURNING *;
        `;
        const values = [
            title, category, fullContent, imageUrl, author, authorImage, authorId, newsId
        ];
        const result = await client.query(updateQuery, values);
        res.json(result.rows[0]);

    } catch (err) {
        console.error('Error updating news item:', err.stack);
        res.status(500).json({ message: 'Error updating news item' });
    }
});

// DELETE a news item
app.delete('/api/news/:newsid', async (req, res) => {
    const newsId = req.params.newsid;
    try {
        const newsItemResult = await client.query('SELECT * FROM news WHERE id = $1', [newsId]);
        const newsItemToDelete = newsItemResult.rows[0];

        if (!newsItemToDelete) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Delete associated comments first (if CASCADE DELETE is not set up in schema)
        // If your database schema has ON DELETE CASCADE for comments table,
        // then you don't need to explicitly delete comments here.
        await client.query('DELETE FROM comments WHERE news_id = $1', [newsId]);


        const deleteNewsResult = await client.query('DELETE FROM news WHERE id = $1 RETURNING *', [newsId]);

        if (deleteNewsResult.rowCount > 0) {
            if (newsItemToDelete.imageUrl && newsItemToDelete.imageUrl.startsWith('/uploads/')) {
                const imagePath = path.join(__dirname, newsItemToDelete.imageUrl);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error("Error deleting image file:", imagePath, err);
                    }
                });
            }
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
// GET comments for a specific news item
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

// POST a new comment to a news item
app.post('/api/news/:newsId/comments', async (req, res) => {
    const newsId = req.params.newsId;
    const { author, authorId, avatar, text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ message: 'Comment text cannot be empty.' });
    }
    if (!author) {
        return res.status(400).json({ message: 'Author name is required for comments.' });
    }

    const newComment = {
        id: uuidv4(),
        news_id: newsId, // This needs to match the column name in DB
        author: author,
        authorId: authorId || 'guest',
        avatar: avatar || 'https://via.placeholder.com/45x45?text=U',
        text: text.trim(),
        timestamp: new Date().toISOString()
    };

    try {
        // First, check if the news item exists
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

// PUT/PATCH (Update) a comment
app.put('/api/news/:newsId/comments/:commentId', async (req, res) => {
    const { newsId, commentId } = req.params;
    const { text } = req.body;

    if (text === undefined || text.trim() === '') {
        return res.status(400).json({ message: 'Comment text cannot be empty for update.' });
    }

    try {
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
            res.status(404).json({ message: 'Comment not found for this news item.' });
        }
    } catch (err) {
        console.error('Error updating comment:', err.stack);
        res.status(500).json({ message: 'Error updating comment' });
    }
});

// DELETE a comment
app.delete('/api/news/:newsId/comments/:commentId', async (req, res) => {
    const { newsId, commentId } = req.params;
    try {
        const deleteQuery = `
            DELETE FROM comments
            WHERE id = $1 AND news_id = $2
            RETURNING *;
        `;
        const result = await client.query(deleteQuery, [commentId, newsId]);

        if (result.rowCount > 0) {
            res.status(200).json({ message: 'Comment deleted successfully' });
        } else {
            res.status(404).json({ message: 'Comment not found for this news item.' });
        }
    } catch (err) {
        console.error('Error deleting comment:', err.stack);
        res.status(500).json({ message: 'Error deleting comment' });
    }
});

// --- Error Handling Middleware (should be last app.use) ---
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Use err.message to get the specific Multer error message
        // which could be 'File too large', 'Too many files', etc.
        return res.status(400).json({ message: err.message || 'File upload error.' });
    } else if (err) {
        console.error('Generic server error:', err);
        return res.status(500).json({ message: err.message || 'An unexpected error occurred.' });
    }
    next();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Optional: Call createTables() here if you want to ensure tables exist on every server start
    // createTables();
});