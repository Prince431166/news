require('dotenv').config(); // Load environment variables - इसे यहाँ सबसे ऊपर रखें

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// --- Cloudinary Setup ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
// Cloudinary कॉन्फ़िगरेशन से पहले, आप इन्हें लॉग कर सकते हैं
// ताकि Render लॉग्स में पुष्टि कर सकें कि चर लोड हो गए हैं।
console.log('Cloudinary Config Check:');
console.log('CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME? 'Loaded' : 'NOT LOADED');
console.log('API_KEY:', process.env.CLOUDINARY_API_KEY? 'Loaded' : 'NOT LOADED');
console.log('API_SECRET:', process.env.CLOUDINARY_API_SECRET? 'Loaded' : 'NOT LOADED');

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
        rejectUnauthorized: false // Required for Render's managed databases sometimes
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
const PORT = process.env.PORT |

| 3000; // FIX: Changed | | to ||

// --- Middleware ---
app.use(cors({
    origin: 'https://flashnews1.netlify.app', // **आपका Netlify डोमेन**
    methods:, // FIX: Added missing array
    allowedHeaders: // FIX: Added missing array
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer storage configuration for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'flashnews_uploads', // Folder name in Cloudinary
        format: async (req, file) => 'png', // supports promises as well, ensure valid format
        public_id: (req, file) => `news_image_${uuidv4()}`, // Unique public ID for Cloudinary
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // Limit file size to 100MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype); // FIX: Removed nested test()

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images (jpeg, jpg, png, gif) are allowed!'));
        }
    }
});

// --- API Endpoints for News ---

// GET all news with optional filtering and search
app.get('/api/news', async (req, res) => {
    try {
        let query = 'SELECT * FROM news WHERE 1=1';
        const queryParams =; // FIX: Initialized as empty array
        let paramIndex = 1;

        const { category, search, authorId } = req.query;

        if (category && category!== 'all' && category!== 'my-posts') {
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
        const newsItem = result.rows; // FIX: Access first element of rows

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

    console.log('Received POST /api/news request.');
    console.log('req.body:', req.body);
    console.log('req.file (from Cloudinary):', req.file);

    if (!title ||!category ||!fullContent |

| fullContent.trim() === '' ||!author ||!authorId) { // FIX: Corrected |
| operators
        console.error('Missing or invalid required news fields:', { title, category, fullContent, author, authorId });
        return res.status(400).json({ message: 'Missing required news fields or full content is empty.' });
    }

    let imageUrl;
    if (req.file) {
        imageUrl = req.file.path; // Cloudinary returns the URL in req.file.path
        console.log('Cloudinary Image URL:', imageUrl);
    } else {
        // If no file uploaded, use placeholder or existing URL from body (if applicable)
        // Ensure that if frontend sends an empty string, we default to placeholder
        imageUrl = req.body.imageUrl |

| 'https://via.placeholder.com/600x400?text=No+Image'; // FIX: Corrected |
| operator
        console.log('No new image uploaded. Using imageUrl from body or placeholder:', imageUrl);
    }

    const newNews = {
        id: uuidv4(),
        category,
        title,
        fullContent: fullContent.trim(),
        imageUrl,
        author,
        authorImage: authorImage |

| 'https://via.placeholder.com/28x28?text=A', // FIX: Corrected |
| operator
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
        const values =;
        const result = await client.query(insertQuery, values);
        res.status(201).json(result.rows); // FIX: Return first element
    } catch (err) {
        console.error('Error adding new news item:', err.stack);
        res.status(500).json({ message: 'Error adding news item' });
    }
});

// PUT/PATCH (Update) an existing news item
app.put('/api/news/:newsid', upload.single('image'), async (req, res) => {
    const newsId = req.params.newsid;
    const { title, category, fullContent, author, authorImage, authorId } = req.body;

    console.log(`Received PUT /api/news/${newsId} request.`);
    console.log('req.body for update:', req.body);
    console.log('req.file for update (from Cloudinary):', req.file);

    try {
        const currentNewsResult = await client.query('SELECT * FROM news WHERE id = $1', [newsId]);
        const existingNews = currentNewsResult.rows; // FIX: Access first element of rows

        if (!existingNews) {
            return res.status(404).json({ message: 'News item not found' });
        }

        let updatedFullContent = existingNews.fullContent;
        if (fullContent!== undefined && fullContent.trim()!== '') { // FIX: Corrected!== operator
            updatedFullContent = fullContent.trim();
        } else if (fullContent!== undefined && fullContent.trim() === '') {
            return res.status(400).json({ message: 'Full content cannot be empty.' });
        }

        let imageUrl = existingNews.imageUrl;

        if (req.file) {
            // A new image was uploaded to Cloudinary.
            // If the old image was also from Cloudinary, you might want to delete it from Cloudinary.
            // This requires storing public_id for deletion. For now, we'll just update the URL.
            // To delete: cloudinary.uploader.destroy(public_id_of_old_image);
            imageUrl = req.file.path; // New Cloudinary URL
            console.log('New image uploaded to Cloudinary:', imageUrl);
        } else if (req.body.imageUrl === 'https://via.placeholder.com/600x400?text=No+Image') {
            // Client specifically requested to clear the image (by sending the placeholder URL)
            imageUrl = 'https://via.placeholder.com/600x400?text=No+Image'; // Set placeholder
            // If the old image was a Cloudinary image, you might want to delete it here as well.
            // This would require more complex logic to extract the public_id from the existingNews.imageUrl
            console.log('Image cleared to placeholder.');
        } else if (req.body.imageUrl!== undefined && req.body.imageUrl!== null && req.body.imageUrl.startsWith('http')) { // FIX: Corrected!== operator
            // Client sent an existing external URL (not a new upload, not a clear)
            // This means the user did not select a new file and did not clear the image.
            // In this case, we rely on the `imageUrl` sent from the frontend as the source of truth
            // if it's an HTTP URL (i.e., not a local path that Multer would handle).
            imageUrl = req.body.imageUrl;
            console.log('Keeping existing external image URL from body:', imageUrl);
        }
        // If req.file is null and req.body.imageUrl is not the placeholder or another HTTP URL,
        // then imageUrl remains existingNews.imageUrl (which is the desired behavior for an unchanged image that
        // was already a Cloudinary URL).

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
            title, category, updatedFullContent, imageUrl, author, authorImage, authorId, newsId
        ];
        res.json(result.rows); // FIX: Return first element

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
        const newsItemToDelete = newsItemResult.rows; // FIX: Access first element of rows

        if (!newsItemToDelete) {
            return res.status(404).json({ message: 'News item not found' });
        }

        // Delete associated image from Cloudinary if it's a Cloudinary URL
        if (newsItemToDelete.imageUrl && newsItemToDelete.imageUrl.includes('res.cloudinary.com')) {
            // Extract public_id from Cloudinary URL
            // Example URL: https://res.cloudinary.com/<cloud_name>/image/upload/v12345/flashnews_uploads/news_image_abcd123.png
            const urlParts = newsItemToDelete.imageUrl.split('/');
            // The public ID is typically the last two parts combined (folder/public_id_with_format)
            // if we used a folder.
            const folder = urlParts[urlParts.length - 2]; // e.g., flashnews_uploads
            const publicIdWithFormat = urlParts[urlParts.length - 1]; // e.g., news_image_abcd123.png
            const publicId = publicIdWithFormat.split('.'); // FIX: Get first part of split

            const fullPublicId = `${folder}/${publicId}`; // e.g., flashnews_uploads/news_image_abcd123

            console.log("Attempting to delete Cloudinary image with public ID:", fullPublicId);
            try {
                const cloudinaryDeleteResult = await cloudinary.uploader.destroy(fullPublicId);
                console.log('Cloudinary delete result:', cloudinaryDeleteResult);
                if (cloudinaryDeleteResult.result!== 'ok') { // FIX: Corrected!== operator
                    console.warn(`Cloudinary delete for ${fullPublicId} was not 'ok':`, cloudinaryDeleteResult.result);
                }
            } catch (clError) {
                console.error("Error deleting image from Cloudinary:", clError);
                // Don't block the news item deletion if Cloudinary deletion fails
                // Log and continue, as the primary goal is to remove the news record
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

    if (!text |

| text.trim() === '') { // FIX: Corrected |
| operator
        return res.status(400).json({ message: 'Comment text cannot be empty.' });
    }
    if (!author) {
        return res.status(400).json({ message: 'Author name is required for comments.' });
    }

    const newComment = {
        id: uuidv4(),
        news_id: newsId,
        author: author,
        authorId: authorId |

| 'guest', // FIX: Corrected |
| operator
        avatar: avatar |

| 'https://via.placeholder.com/45x45?text=U', // FIX: Corrected |
| operator
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
        res.status(201).json(result.rows); // FIX: Return first element
    } catch (err) {
        console.error('Error adding new comment:', err.stack);
        res.status(500).json({ message: 'Error adding comment' });
    }
});

// PUT/PATCH (Update) a comment
app.put('/api/news/:newsId/comments/:commentId', async (req, res) => {
    const { newsId, commentId } = req.params;
    const { text } = req.body;

    if (text === undefined |

| text.trim() === '') { // FIX: Corrected |
| operator
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
            res.json(result.rows); // FIX: Return first element
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
        return res.status(400).json({ message: err.message |

| 'File upload error.' }); // FIX: Corrected |
| operator
    } else if (err) {
        console.error('Generic server error:', err);
        return res.status(500).json({ message: err.message |

| 'An unexpected error occurred.' }); // FIX: Corrected |
| operator
    }
    next();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
