require('dotenv').config(); // Load environment variables - इसे यहाँ सबसे ऊपर रखें

const express = require('express');
const cors = require('cors');
const multer = require('multer'); // Multer को import करें
const path = require('path');
const { Pool } = require('pg'); // PostgreSQL Client के बजाय Pool का उपयोग करें
const { v4: uuidv4 } = require('uuid'); // uuidv4 को यहाँ import किया गया है

// --- Cloudinary Setup ---
// Cloudinary को यहाँ डिक्लेयर करें - यह सुनिश्चित करें कि यह केवल एक बार ही हो
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary - Render लॉग्स में पुष्टि करने के लिए इन्हें लॉग करें
console.log('Cloudinary Config Check:');
console.log('CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME ? 'Loaded' : 'NOT LOADED');
console.log('API_KEY:', process.env.CLOUDINARY_API_KEY ? 'Loaded' : 'NOT LOADED');
console.log('API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'Loaded' : 'NOT LOADED');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true // हमेशा secure URLs का उपयोग करें
});

// --- PostgreSQL Setup ---
const pool = new Pool({ // Client के बजाय Pool का उपयोग करें
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for Render's managed databases in production
    }
});

// Connect to PostgreSQL and create tables if they don't exist
pool.connect() // client.connect() के बजाय pool.connect() का उपयोग करें
    .then(client => { // client ऑब्जेक्ट को यहां पास किया जाएगा
        console.log('Connected to PostgreSQL database!');
        return client.query(`
            CREATE TABLE IF NOT EXISTS news (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID को प्राइमरी की के रूप में उपयोग करें
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                fullContent TEXT NOT NULL,
                imageUrl TEXT, -- This will now store Cloudinary URLs
                author TEXT NOT NULL,
                authorImage TEXT,
                publishDate TIMESTAMPTZ DEFAULT NOW(), -- TIMESTAMP WITH TIME ZONE के बजाय TIMESTAMPTZ
                isFeatured BOOLEAN DEFAULT FALSE,
                isSideFeature BOOLEAN DEFAULT FALSE,
                authorId TEXT NOT NULL
            );
        `)
        .then(() => {
            return client.query(`
                CREATE TABLE IF NOT EXISTS comments (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- UUID को प्राइमरी की के रूप में उपयोग करें
                    news_id UUID REFERENCES news(id) ON DELETE CASCADE,
                    author TEXT NOT NULL,
                    authorId TEXT NOT NULL,
                    avatar TEXT,
                    text TEXT NOT NULL,
                    timestamp TIMESTAMPTZ DEFAULT NOW() -- TIMESTAMP WITH TIME ZONE के बजाय TIMESTAMPTZ
                );
            `);
        })
        .then(() => {
            console.log('News and Comments tables ensured.');
            client.release(); // client को रिलीज़ करें
        })
        .catch(err => {
            console.error('Error creating tables:', err);
            client.release(); // त्रुटि होने पर भी client को रिलीज़ करें
            process.exit(1); // यदि DB टेबल नहीं बन पाती हैं तो ऐप को बंद करें
        });
    })
    .catch(err => {
        console.error('Error connecting to PostgreSQL:', err.stack);
        process.exit(1); // यदि DB से कनेक्ट नहीं हो पाता है तो ऐप को बंद करें
    });


const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors({
    origin: ['https://flashnews1.netlify.app', 'http://localhost:3000'], // आपका Netlify डोमेन और लोकल डेवलपमेंट के लिए localhost
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Set body parser limits for JSON and URL-encoded data.
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Multer setup:
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // Allow up to 100 MB for file uploads
    }
});

// --- API Endpoints for News ---

// GET all news with optional filtering and search
app.get('/api/news', async (req, res) => {
    try {
        let query = 'SELECT * FROM news WHERE 1=1';
        const queryParams = [];
        let paramIndex = 1;

        const { category, search, authorId } = req.query;

        if (category && category !== 'all' && category !== 'my-posts') {
            query += ` AND category ILIKE $${paramIndex++}`; // ILIKE का उपयोग करें ताकि केस-इनसेंसिटिव हो
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

        const result = await pool.query(query, queryParams); // client.query() के बजाय pool.query() का उपयोग करें
        const news = result.rows;

        // Fetch comments for each news item
        const newsWithComments = await Promise.all(news.map(async (newsItem) => {
            const commentsResult = await pool.query('SELECT * FROM comments WHERE news_id = $1 ORDER BY timestamp DESC', [newsItem.id]); // client.query() के बजाय pool.query() का उपयोग करें
            return { ...newsItem, comments: commentsResult.rows };
        }));

        res.json(newsWithComments);
    } catch (err) {
        console.error('Error fetching news:', err.stack);
        res.status(500).json({ message: 'Error fetching news' });
    }
});

// GET single news item by ID
app.get('/api/news/:newsid', async (req, res) => {
    try {
        const newsId = req.params.newsid;
        const result = await pool.query('SELECT * FROM news WHERE id = $1', [newsId]); // client.query() के बजाय pool.query() का उपयोग करें
        const newsItem = result.rows[0];

        if (newsItem) {
            const commentsResult = await pool.query('SELECT * FROM comments WHERE news_id = $1 ORDER BY timestamp DESC', [newsItem.id]); // client.query() के बजाय pool.query() का उपयोग करें
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

// POST a new news item (Multer's `upload.none()` is used for parsing text fields from multipart forms)
// The image itself is uploaded directly to Cloudinary from the client.
app.post('/api/news', upload.none(), async (req, res) => {
    const { title, category, fullContent, imageUrl, author, authorImage, authorId } = req.body;

    console.log('Received POST /api/news request.');
    console.log('req.body:', req.body);

    if (!title || !category || !fullContent || fullContent.trim() === '' || !author || !authorId) {
        console.error('Missing or invalid required news fields:', { title, category, fullContent, author, authorId });
        return res.status(400).json({ message: 'Missing required news fields or full content is empty.' });
    }

    const finalImageUrl = imageUrl || 'https://placehold.co/600x400?text=No+Image';

    const newNews = {
        // id: uuidv4(), // PostgreSQL में gen_random_uuid() का उपयोग किया जा रहा है, इसलिए इसे हटाने की आवश्यकता है
        category,
        title,
        fullContent: fullContent.trim(),
        imageUrl: finalImageUrl,
        author,
        authorImage: authorImage || 'https://placehold.co/28x28?text=A',
        // publishDate: new Date().toISOString(), // PostgreSQL में CURRENT_TIMESTAMP का उपयोग किया जा रहा है
        isFeatured: false,
        isSideFeature: false,
        authorId,
    };

    try {
        const insertQuery = `
            INSERT INTO news (category, title, fullContent, imageUrl, author, authorImage, isFeatured, isSideFeature, authorId)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *;
        `;
        const values = [
            newNews.category, newNews.title, newNews.fullContent, newNews.imageUrl,
            newNews.author, newNews.authorImage, newNews.isFeatured,
            newNews.isSideFeature, newNews.authorId
        ];
        const result = await pool.query(insertQuery, values); // client.query() के बजाय pool.query() का उपयोग करें
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error adding new news item:', err.stack);
        res.status(500).json({ message: 'Error adding news item' });
    }
});

// PUT/PATCH (Update) an existing news item (Multer's `upload.none()` for text fields)
app.put('/api/news/:newsid', upload.none(), async (req, res) => {
    const newsId = req.params.newsid;
    const { title, category, fullContent, imageUrl, author, authorImage, authorId, isFeatured, isSideFeature } = req.body; // isFeatured, isSideFeature भी यहाँ लें

    console.log(`Received PUT /api/news/${newsId} request.`);
    console.log('req.body for update:', req.body);

    try {
        const currentNewsResult = await pool.query('SELECT * FROM news WHERE id = $1', [newsId]); // client.query() के बजाय pool.query() का उपयोग करें
        const existingNews = currentNewsResult.rows[0];

        if (!existingNews) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // COALESCE का उपयोग करने पर, अगर क्लाइंट 'undefined' या 'null' भेजता है, तो डेटाबेस का मान रखा जाएगा
        // लेकिन यदि क्लाइंट खाली स्ट्रिंग ('') भेजता है, तो उसे अपडेट किया जाएगा।
        // fullContent के लिए, यदि यह खाली भेजा जाता है तो हमें 400 त्रुटि देनी होगी।
        let updatedFullContent = fullContent;
        if (fullContent !== undefined && fullContent.trim() === '') {
            return res.status(400).json({ message: 'Full content cannot be empty.' });
        } else if (fullContent !== undefined) {
             updatedFullContent = fullContent.trim();
        }


        const finalImageUrl = imageUrl || existingNews.imageUrl; // अगर कोई नई इमेज नहीं है तो मौजूदा इमेज रखें

        const updateQuery = `
            UPDATE news
            SET
                title = COALESCE($1, title),
                category = COALESCE($2, category),
                fullContent = COALESCE($3, fullContent),
                imageUrl = $4,
                author = COALESCE($5, author),
                authorImage = COALESCE($6, authorImage),
                authorId = COALESCE($7, authorId),
                isFeatured = COALESCE($8, isFeatured),
                isSideFeature = COALESCE($9, isSideFeature)
            WHERE id = $10
            RETURNING *;
        `;
        const values = [
            title, category, updatedFullContent, finalImageUrl, author, authorImage, authorId,
            isFeatured, isSideFeature, newsId
        ];
        const result = await pool.query(updateQuery, values); // client.query() के बजाय pool.query() का उपयोग करें
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
        const newsItemResult = await pool.query('SELECT * FROM news WHERE id = $1', [newsId]); // client.query() के बजाय pool.query() का उपयोग करें
        const newsItemToDelete = newsItemResult.rows[0];

        if (!newsItemToDelete) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Delete associated image from Cloudinary if it's a Cloudinary URL
        if (newsItemToDelete.imageUrl && newsItemToDelete.imageUrl.includes('res.cloudinary.com')) {
            // Extract public_id from Cloudinary URL
            const urlParts = newsItemToDelete.imageUrl.split('/');
            const uploadIndex = urlParts.indexOf('upload');

            if (uploadIndex > -1 && urlParts.length > uploadIndex + 1) {
                // Get the path after 'upload/' (e.g., 'v12345/folder/public_id.format')
                const pathAfterUpload = urlParts.slice(uploadIndex + 1).join('/');

                // If it contains a version number (like v12345), remove it for public_id extraction
                // This regex is more robust for cases like 'v12345/folder/subfolder/public_id.ext'
                const publicIdMatch = pathAfterUpload.match(/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
                let publicId;
                if (publicIdMatch && publicIdMatch[1]) {
                    publicId = publicIdMatch[1];
                } else {
                    console.warn("Could not extract public ID from Cloudinary URL:", newsItemToDelete.imageUrl);
                    publicId = null; // Set to null to skip Cloudinary delete if cannot extract
                }

                if (publicId) {
                    console.log("Attempting to delete Cloudinary image with public ID:", publicId);
                    try {
                        const cloudinaryDeleteResult = await cloudinary.uploader.destroy(publicId);
                        console.log('Cloudinary delete result:', cloudinaryDeleteResult);
                        if (cloudinaryDeleteResult.result !== 'ok') {
                            console.warn(`Cloudinary delete for ${publicId} was not 'ok':`, cloudinaryDeleteResult.result);
                        }
                    } catch (clError) {
                        console.error("Error deleting image from Cloudinary:", clError);
                        // Don't block the news item deletion if Cloudinary deletion fails
                    }
                }
            } else {
                console.warn("Could not parse Cloudinary URL for deletion:", newsItemToDelete.imageUrl);
            }
        }

        // Comments will be deleted automatically due to ON DELETE CASCADE in schema
        const deleteNewsResult = await pool.query('DELETE FROM news WHERE id = $1 RETURNING *', [newsId]); // client.query() के बजाय pool.query() का उपयोग करें

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
        const result = await pool.query('SELECT * FROM comments WHERE news_id = $1 ORDER BY timestamp DESC', [newsId]); // client.query() के बजाय pool.query() का उपयोग करें
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
        // id: uuidv4(), // PostgreSQL में gen_random_uuid() का उपयोग किया जा रहा है
        news_id: newsId,
        author: author,
        authorId: authorId || 'guest',
        avatar: avatar || 'https://placehold.co/45x45?text=U',
        text: text.trim(),
        // timestamp: new Date().toISOString() // PostgreSQL में CURRENT_TIMESTAMP का उपयोग किया जा रहा है
    };

    try {
        // First, check if the news item exists
        const newsCheck = await pool.query('SELECT id FROM news WHERE id = $1', [newsId]); // client.query() के बजाय pool.query() का उपयोग करें
        if (newsCheck.rowCount === 0) {
            return res.status(404).json({ message: 'News item not found.' });
        }

        const insertQuery = `
            INSERT INTO comments (news_id, author, authorId, avatar, text)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [
            newComment.news_id, newComment.author, newComment.authorId,
            newComment.avatar, newComment.text
        ];
        const result = await pool.query(insertQuery, values); // client.query() के बजाय pool.query() का उपयोग करें
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
        const result = await pool.query(updateQuery, [text.trim(), commentId, newsId]); // client.query() के बजाय pool.query() का उपयोग करें

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
        const result = await pool.query(deleteQuery, [commentId, newsId]); // client.query() के बजाय pool.query() का उपयोग करें

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
        console.error("Multer error caught in middleware:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ message: `File too large. Maximum size is ${upload.limits.fileSize / (1024 * 1024)}MB.` });
        }
        // General Multer errors
        return res.status(400).json({ message: `File upload error: ${err.message}` });
    } else if (err.type === 'entity.too.large') { // This error type comes from body-parser (express.json/urlencoded)
        console.error("Express body-parser error caught in middleware (PayloadTooLargeError):", err);
        return res.status(413).json({ message: `Request entity too large: ${err.message}. Please try with a smaller payload.` });
    } else if (err) {
        console.error('Generic server error caught in middleware:', err.stack || err);
        return res.status(500).json({ message: err.message || 'An unexpected server error occurred.' });
    }
    next();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
