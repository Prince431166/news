const express = require('express');
const cors = require('cors');
const multer = require('multer'); // For handling file uploads
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file (if any)
const fs = require('fs'); // For file system operations (saving images)
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs (install: npm install uuid)

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors()); // Allows requests from your frontend
app.use(express.json()); // To parse JSON bodies from requests
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies

// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public'))); // <<< Added: Serves your frontend files

// Ensure 'uploads' directory exists for images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating uploads directory: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir);
}

// Path to your JSON data file
const dataFilePath = path.join(__dirname, 'uploads', 'data.json');

// Function to read news data from data.json
const loadNewsData = () => {
    try {
        if (fs.existsSync(dataFilePath)) {
            const data = fs.readFileSync(dataFilePath, 'utf8');
            // Ensure comments array exists for all news items loaded from file
            return JSON.parse(data).map(news => ({ ...news, comments: news.comments || [] }));
        }
    } catch (error) {
        console.error('Error reading data.json:', error);
    }
    return []; // Return empty array if file not found or error
};

// Function to save news data to data.json
const saveNewsData = (data) => {
    try {
        fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing data.json:', error);
    }
};

let newsData = loadNewsData(); // Load data when server starts

// Multer storage configuration for images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Images will be saved in the 'uploads' folder
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
app.get('/api/news', (req, res) => {
    let filteredNews = [...newsData];
    const { category, search, authorId } = req.query;

    if (category && category !== 'all' && category !== 'my-posts') {
        filteredNews = filteredNews.filter(news => news.category === category);
    }
    if (search) {
        const searchTerm = search.toLowerCase();
        filteredNews = filteredNews.filter(news =>
            news.title.toLowerCase().includes(searchTerm) ||
            news.fullContent.toLowerCase().includes(searchTerm) ||
            news.category.toLowerCase().includes(searchTerm) ||
            news.author.toLowerCase().includes(searchTerm)
        );
    }
    if (authorId) {
        filteredNews = filteredNews.filter(news => news.authorId === authorId);
    }

    filteredNews.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
    res.json(filteredNews);
});

// GET single news item by ID
app.get('/api/news/:newsid', (req, res) => {
    const newsItem = newsData.find(news => news.id === req.params.newsid);
    if (newsItem) {
        res.json(newsItem);
    } else {
        res.status(404).json({ message: 'News item not found' });
    }
});

// POST a new news item
app.post('/api/news', upload.single('image'), (req, res) => {
    const { title, category, fullContent, author, authorImage, authorId } = req.body;

    if (!title || !category || !fullContent || !author || !authorId) {
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
        publishDate: formatDate(new Date()),
        isFeatured: false,
        isSideFeature: false,
        authorId,
        comments: []
    };
    newsData.push(newNews);
    saveNewsData(newsData); // Save data after adding new news
    res.status(201).json(newNews);
});

// PUT/PATCH (Update) an existing news item
app.put('/api/news/:newsid', upload.single('image'), (req, res) => {
    const newsId = req.params.newsid;
    const newsIndex = newsData.findIndex(news => news.id === newsId);

    if (newsIndex > -1) {
        const existingNews = newsData[newsIndex];
        const { title, category, fullContent, author, authorImage, authorId } = req.body;
        let imageUrl = req.body.imageUrl;

        if (req.file) {
            if (existingNews.imageUrl && existingNews.imageUrl.startsWith('/uploads/')) {
                const oldImagePath = path.join(__dirname, existingNews.imageUrl);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlink(oldImagePath, (err) => {
                        if (err) console.error("Error deleting old image:", oldImagePath, err);
                    });
                }
            }
            imageUrl = `/uploads/${req.file.filename}`;
        } else if (req.body.imageUrl === '') {
            imageUrl = 'https://via.placeholder.com/600x400?text=No+Image';
            if (existingNews.imageUrl && existingNews.imageUrl.startsWith('/uploads/')) {
                const oldImagePath = path.join(__dirname, existingNews.imageUrl);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlink(oldImagePath, (err) => {
                        if (err) console.error("Error deleting old image after clear:", oldImagePath, err);
                    });
                }
            }
        } else {
            imageUrl = existingNews.imageUrl;
        }

        const updatedNews = {
            ...existingNews,
            title: title !== undefined ? title : existingNews.title,
            category: category !== undefined ? category : existingNews.category,
            fullContent: fullContent !== undefined ? fullContent : existingNews.fullContent,
            imageUrl: imageUrl,
            author: author !== undefined ? author : existingNews.author,
            authorImage: authorImage !== undefined ? authorImage : existingNews.authorImage,
            authorId: authorId !== undefined ? authorId : existingNews.authorId,
        };
        newsData[newsIndex] = updatedNews;
        saveNewsData(newsData); // Save data after updating news
        res.json(updatedNews);
    } else {
        res.status(404).json({ message: 'News item not found' });
    }
});

// DELETE a news item
app.delete('/api/news/:newsid', (req, res) => {
    const newsId = req.params.newsid;
    const initialLength = newsData.length;
    const newsItemToDelete = newsData.find(news => news.id === newsId);

    if (!newsItemToDelete) {
        return res.status(404).json({ message: 'News item not found' });
    }

    newsData = newsData.filter(news => news.id !== newsId);

    if (newsData.length < initialLength) {
        if (newsItemToDelete.imageUrl && newsItemToDelete.imageUrl.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, newsItemToDelete.imageUrl);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error("Error deleting image file:", imagePath, err);
                }
            });
        }
        saveNewsData(newsData); // Save data after deleting news
        res.status(200).json({ message: 'News item deleted successfully' });
    } else {
        res.status(500).json({ message: 'Failed to delete news item due to internal error.' });
    }
});

// --- API Endpoints for Comments ---
// GET comments for a specific news item (added to the original code, preferred)
app.get('/api/news/:newsId/comments', (req, res) => {
    const newsItem = newsData.find(news => news.id === req.params.newsId);
    if (newsItem) {
        const sortedComments = [...newsItem.comments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(sortedComments);
    } else {
        res.status(404).json({ message: 'News item not found' });
    }
});

// POST a new comment to a news item (using the more complete version)
app.post('/api/news/:newsId/comments', (req, res) => {
    const newsItem = newsData.find(news => news.id === req.params.newsId);
    if (!newsItem) {
        return res.status(404).json({ message: 'News item not found.' });
    }

    const { author, authorId, avatar, text } = req.body; // Use author and authorId, avatar

    if (!text || text.trim() === '') { // Ensure comment text is not empty and not just whitespace
        return res.status(400).json({ message: 'Comment text cannot be empty.' });
    }
    // authorId is crucial for 'My Posts' and user-specific comments.
    // If you don't have a user authentication system yet, you might default authorId and avatar.
    // For now, let's make authorId optional if not explicitly passed, but good to have.
    // If you want to enforce author/authorId, change the below 'if' condition.
    if (!author) { // Author name is essential for display
        return res.status(400).json({ message: 'Author name is required for comments.' });
    }

    const newComment = {
        id: uuidv4(),
        author: author,
        authorId: authorId || 'guest', // Default to 'guest' if authorId is not provided
        avatar: avatar || 'https://via.placeholder.com/45x45?text=U',
        text: text.trim(), // Trim whitespace from comment text
        timestamp: new Date().toISOString()
    };
    newsItem.comments.push(newComment);
    saveNewsData(newsData); // Save data after adding new comment
    res.status(201).json(newComment);
});


// PUT/PATCH (Update) a comment (preferred version)
app.put('/api/news/:newsId/comments/:commentId', (req, res) => {
    const newsItem = newsData.find(news => news.id === req.params.newsId);
    if (!newsItem) {
        return res.status(404).json({ message: 'News item not found' });
    }

    const commentIndex = newsItem.comments.findIndex(c => c.id === req.params.commentId);
    if (commentIndex === -1) {
        return res.status(404).json({ message: 'Comment not found' });
    }

    const { text } = req.body;
    if (text === undefined || text.trim() === '') {
        return res.status(400).json({ message: 'Comment text cannot be empty for update.' });
    }

    newsItem.comments[commentIndex].text = text.trim();
    saveNewsData(newsData); // Save data after updating comment
    res.json(newsItem.comments[commentIndex]);
});

// DELETE a comment (preferred version)
app.delete('/api/news/:newsId/comments/:commentId', (req, res) => {
    const newsItem = newsData.find(news => news.id === req.params.newsId);
    if (!newsItem) {
        return res.status(404).json({ message: 'News item not found' });
    }

    const initialCommentCount = newsItem.comments.length;
    newsItem.comments = newsItem.comments.filter(c => c.id !== req.params.commentId);

    if (newsItem.comments.length < initialCommentCount) {
        saveNewsData(newsData); // Save data after deleting comment
        res.status(200).json({ message: 'Comment deleted successfully' });
    } else {
        res.status(404).json({ message: 'Comment not found' });
    }
});


// --- Error Handling Middleware (should be last app.use) ---
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size too large. Max 10MB allowed.' });
        }
        return res.status(400).json({ message: err.message });
    } else if (err) {
        console.error(err);
        return res.status(500).json({ message: err.message || 'An unexpected error occurred.' });
    }
    next();
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});