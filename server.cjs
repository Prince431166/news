require('dotenv').config(); // Load environment variables - इसे यहाँ सबसे ऊपर रखें

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

// fs की अब सीधी ज़रूरत नहीं, क्योंकि हम लोकल स्टोरेज नहीं कर रहे
// const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // uuidv4 को यहाँ import किया गया है

// --- Cloudinary Setup ---
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
// Render लॉग्स में पुष्टि करने के लिए इन्हें लॉग करें, ताकि पता चले ENV vars लोड हुए या नहीं
console.log('Cloudinary Config Check:');
console.log('CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Loaded' : 'NOT LOADED');
console.log('API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Loaded' : 'NOT LOADED');
console.log('API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Loaded' : 'NOT LOADED');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- PostgreSQL Setup ---
const { Client } = require('pg');
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render's managed databases in production
    }
});

// Connect to PostgreSQL when the server starts
client.connect()
    .then(() => {
        console.log('Connected to PostgreSQL database');
        createTables(); // Ensure tables are created on connect
    })
    .catch(err => console.error('Error connecting to PostgreSQL:', err.stack));

// Function to create tables if they don't exist
async function createTables() {
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS news (
                id VARCHAR(255) PRIMARY KEY,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                fullContent TEXT NOT NULL,
                imageUrl TEXT, -- This will now store Cloudinary URLs
                author TEXT NOT NULL,
                authorImage TEXT,
                publishDate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                isFeatured BOOLEAN DEFAULT FALSE,
                isSideFeature BOOLEAN DEFAULT FALSE,
                authorId TEXT NOT NULL
            );
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS comments (
                id VARCHAR(255) PRIMARY KEY,
                news_id VARCHAR(255) REFERENCES news(id) ON DELETE CASCADE,
                author TEXT NOT NULL,
                authorId TEXT NOT NULL,
                avatar TEXT,
                text TEXT NOT NULL,
                timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
app.use(cors({
    origin: ['https://flashnews1.netlify.app', 'http://localhost:3000'], // आपका Netlify डोमेन और लोकल डेवलपमेंट के लिए localhost
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Multer setup: Since images are uploaded directly to Cloudinary from the client,
// we use `multer.none()` in the routes to only parse other text fields from multipart forms.
// Multer को initialize करना होगा, लेकिन यह फाइलें सीधे हैंडल नहीं करेगा।
const upload = multer({ storage: multer.memoryStorage() }); // memoryStorage is a placeholder

// --- API Endpoints for News ---

// GET all news with optional filtering and search
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
        if (authorId) {
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

// POST a new news item (Multer is used here to parse other form fields, but image upload will be direct to Cloudinary)
app.post('/api/news', upload.none(), async (req, res) => { // Changed to upload.none() as image is direct uploaded
    const { title, category, fullContent, imageUrl, author, authorImage, authorId } = req.body; // imageUrl will now come from frontend

    console.log('Received POST /api/news request.');
    console.log('req.body:', req.body);

    if (!title || !category || !fullContent || fullContent.trim() === '' || !author || !authorId) {
        console.error('Missing or invalid required news fields:', { title, category, fullContent, author, authorId });
        return res.status(400).json({ message: 'Missing required news fields or full content is empty.' });
    }

    const finalImageUrl = imageUrl || 'https://placehold.co/600x400?text=No+Image'; // Updated placeholder

    const newNews = {
        id: uuidv4(), // uuidv4 का उपयोग करके unique ID बनाना
        category,
        title,
        fullContent: fullContent.trim(),
        imageUrl: finalImageUrl, // Use the imageUrl received from frontend
        author,
        authorImage: authorImage || 'https://placehold.co/28x28?text=A', // Updated placeholder
        publishDate: new Date().toISOString(),
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

// PUT/PATCH (Update) an existing news item (Multer is used here to parse other form fields)
app.put('/api/news/:newsid', upload.none(), async (req, res) => { // Changed to upload.none()
    const newsId = req.params.newsid;
    const { title, category, fullContent, imageUrl, author, authorImage, authorId } = req.body; // imageUrl will now come from frontend

    console.log(`Received PUT /api/news/${newsId} request.`);
    console.log('req.body for update:', req.body);

    try {
        const currentNewsResult = await client.query('SELECT * FROM news WHERE id = $1', [newsId]);
        const existingNews = currentNewsResult.rows[0];

        if (!existingNews) {
            return res.status(404).json({ message: 'News item not found' });
        }

        let updatedFullContent = existingNews.fullContent;
        if (fullContent !== undefined && fullContent.trim() !== '') {
            updatedFullContent = fullContent.trim();
        } else if (fullContent !== undefined && fullContent.trim() === '') {
            return res.status(400).json({ message: 'Full content cannot be empty.' });
        }

        const finalImageUrl = imageUrl || existingNews.imageUrl; // Use new imageUrl or keep existing

        const updateQuery = `
            UPDATE news
            SET
                title = COALESCE($1, title),
                category = COALESCE($2, category),
                fullContent = COALESCE($3, fullContent),
                imageUrl = $4,
                author = COALESCE($5, author),
                authorImage = COALESCE($6, authorImage),
                authorId = COALESCE($7, authorId)
            WHERE id = $8
            RETURNING *;
        `;
        const values = [
            title, category, updatedFullContent, finalImageUrl, author, authorImage, authorId, newsId
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

        // Delete associated image from Cloudinary if it's a Cloudinary URL
        if (newsItemToDelete.imageUrl && newsItemToDelete.imageUrl.includes('res.cloudinary.com')) {
            // Extract public_id from Cloudinary URL
            const urlParts = newsItemToDelete.imageUrl.split('/');
            // Cloudinary URL format example: https://res.cloudinary.com/<cloud_name>/image/upload/<version>/<folder>/<public_id>.<format>
            // We need to extract '<folder>/<public_id>'
            const uploadIndex = urlParts.indexOf('upload');
            if (uploadIndex > -1 && urlParts.length > uploadIndex + 1) {
                const publicIdPath = urlParts.slice(uploadIndex + 1).join('/'); // Get everything after 'upload/'
                const publicIdWithFormat = publicIdPath.split('/').pop(); // Get last part (public_id.format)
                const publicId = publicIdWithFormat.split('.')[0]; // Get public_id without format
                // Reconstruct the full public ID path, assuming the 'folder' is the second to last segment
                // If there's a folder, it's typically the part before the final publicIdWithFormat
                let folderAndPublicId = publicId;
                if (publicIdPath.includes('/')) {
                    const folder = publicIdPath.substring(0, publicIdPath.lastIndexOf('/'));
                    folderAndPublicId = `${folder}/${publicId}`;
                }

                console.log("Attempting to delete Cloudinary image with public ID:", folderAndPublicId);
                try {
                    const cloudinaryDeleteResult = await cloudinary.uploader.destroy(folderAndPublicId);
                    console.log('Cloudinary delete result:', cloudinaryDeleteResult);
                    if (cloudinaryDeleteResult.result !== 'ok') {
                        console.warn(`Cloudinary delete for ${folderAndPublicId} was not 'ok':`, cloudinaryDeleteResult.result);
                    }
                } catch (clError) {
                    console.error("Error deleting image from Cloudinary:", clError);
                    // Don't block the news item deletion if Cloudinary deletion fails
                    // Log and continue, as the primary goal is to remove the news record
                }
            } else {
                console.warn("Could not parse Cloudinary URL for deletion:", newsItemToDelete.imageUrl);
            }
        }

        // Comments will be deleted automatically due to ON DELETE CASCADE in schema
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

// --- API Endpoint for Cloudinary Signature Generation ---
// यह एंडपॉइंट सही है और इसे बदला नहीं गया है।
app.post('/api/cloudinary-signature', (req, res) => {
    try {
        const { folder } = req.body;
        const timestamp = Math.round((new Date).getTime() / 1000);

        const paramsToSign = {
            timestamp: timestamp,
            source: 'uw',
            folder: folder || 'flashnews_uploads' // Default folder
        };

        const signature = cloudinary.utils.api_sign_request(
            paramsToSign,
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            signature: signature,
            timestamp: timestamp,
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            folder: paramsToSign.folder
        });
    } catch (error) {
        console.error('Error generating Cloudinary signature:', error.stack);
        res.status(500).json({ message: 'Error generating Cloudinary signature.' });
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
        id: uuidv4(), // uuidv4 का उपयोग करके unique ID बनाना
        news_id: newsId,
        author: author,
        authorId: authorId || 'guest',
        avatar: avatar || 'https://placehold.co/45x45?text=U', // Updated placeholder
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
        console.error("Multer error:", err);
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
});
