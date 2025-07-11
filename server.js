const express = require('express');
const cors = require('cors');
const multer = require('multer'); // For handling file uploads
const path = require('path');
require('dotenv').config(); // Load environment variables from .env file (if any)
const fs = require('fs'); // For file system operations (saving images)
const { v4: uuidv4 } = require('uuid');
 // For generating unique IDs (install: npm install uuid)
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors()); // Allows requests from your frontend
app.use(express.json()); // To parse JSON bodies from requests
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies

// Serve static files from the 'public' directory (e.g., your frontend HTML, CSS, JS)
// Assuming your index.html and other frontend assets are in a 'public' folder
app.use(express.static(path.join(__dirname,'public')));

// Serve uploaded images statically
// The frontend will request images like http://localhost:3000/uploads/image-name.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure 'uploads' directory exists for images
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    console.log(`Creating uploads directory: ${uploadsDir}`);
    fs.mkdirSync(uploadsDir);
}

// Multer storage configuration for images
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Images will be saved in the 'uploads' folder
    },
    filename: (req, file, cb) => {
        // Use a unique ID for the filename to prevent collisions and preserve original extension
        const uniqueSuffix = uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${fileExtension}`);
    }
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB (optional, but good practice)
    fileFilter: (req, file, cb) => {
        // Accept only common image formats
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

// --- In-memory Data Store (for demonstration) ---
// In a real application, you'd use a database (e.g., MongoDB, PostgreSQL, SQLite)
let newsData = [
    { id: 'feature1', category: 'Technology', title: 'Breakthrough in Quantum Computing Announced', fullContent: 'Scientists have achieved a major milestone in quantum computing that could revolutionize how we process information and solve complex problems, opening up new frontiers in cryptography, drug discovery, and artificial intelligence.\n\nThis breakthrough could accelerate the development of next-generation technologies.', imageUrl: 'https://images.unsplash.com/photo-1588681664899-f142ff2dc9b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80', author: 'Robert Chen', authorImage: 'https://randomuser.me/api/portraits/men/32.jpg', publishDate: 'July 5, 2025 at 10:00 AM', isFeatured: true, authorId: 'admin', comments: [] },
    { id: 'sidefeature1', category: 'Business', title: 'Global Markets React to New Economic Policies', fullContent: 'Global markets are showing significant volatility as new economic policies are introduced. Analysts are closely watching how these changes will impact various sectors and international trade agreements.\n\nEconomic forecasts suggest potential shifts in investment strategies.', imageUrl: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', author: 'Emily White', authorImage: 'https://randomuser.me/api/portraits/women/67.jpg', publishDate: 'July 5, 2025 at 1:00 PM', isFeatured: true, isSideFeature: true, authorId: 'admin', comments: [] },
    { id: 'sidefeature2', category: 'Sports', title: 'National Team Qualifies for Finals', fullContent: 'In an exhilarating display of skill and determination, the national team has successfully secured its spot in the championship finals after a series of intense matches against top-ranked opponents.\n\nFans are eagerly anticipating the final showdown.', imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', author: 'David Lee', authorImage: 'https://randomuser.me/api/portraits/men/22.jpg', publishDate: 'July 5, 2025 at 11:30 AM', isFeatured: true, isSideFeature: true, authorId: 'admin', comments: [] },
    { id: 'sidefeature3', category: 'Automotive', title: 'Electric Vehicle Sales Surpass Traditional Models', fullContent: 'For the first time in history, sales of electric vehicles have officially surpassed traditional gasoline-powered models, signaling a significant shift in consumer preferences and the automotive industry\'s future.\n\nThis trend is expected to continue as infrastructure improves.', imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', author: 'Olivia Clark', authorImage: 'https://randomuser.me/api/portraits/women/55.jpg', publishDate: 'July 5, 2025 at 9:15 AM', isFeatured: true, isSideFeature: true, authorId: 'admin', comments: [] },
    { id: 'news1', category: 'Environment', title: 'New Climate Agreement Signed by 40 Nations', fullContent: 'Global leaders from 40 nations have signed a landmark climate agreement, committing to ambitious targets aimed at significantly reducing carbon emissions by the year 2030, marking a crucial step towards combating climate change.\n\nThe agreement emphasizes renewable energy investments and sustainable practices.', imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', author: 'Sarah Johnson', authorImage: 'https://randomuser.me/api/portraits/women/44.jpg', publishDate: 'July 4, 2025 at 3:00 PM', isFeatured: false, authorId: 'admin', comments: [] },
    { id: 'news2', category: 'Sports', title: 'Underdog Team Advances to Championship Finals', fullContent: 'In a stunning upset, the underdog team defeats the reigning champions in a nail-biting finish, securing their spot in the championship finals and thrilling fans worldwide.\n\nTheir journey has captured the hearts of many.', imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', author: 'Michael Torres', authorImage: 'https://randomuser.me/api/portraits/men/22.jpg', publishDate: 'July 4, 2025 at 6:45 PM', isFeatured: false, authorId: 'admin', comments: [] },
    { id: 'news3', category: 'Finance', title: 'Central Bank Announces Interest Rate Changes', fullContent: 'In response to recent economic indicators and inflation concerns, the central bank has announced a series of interest rate adjustments, a move that is expected to have a significant impact on borrowing costs and investment across the country.\n\nAnalysts predict a period of market adjustment.', imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', author: 'David Kim', authorImage: 'https://randomuser.me/api/portraits/men/65.jpg', publishDate: 'July 4, 2025 at 1:00 PM', isFeatured: false, authorId: 'admin', comments: [] }
];

// Ensure all existing news items have a 'comments' array
newsData = newsData.map(news => ({ ...news, comments: news.comments || [] }));

// Utility to format date for consistency (optional, but good practice)
const formatDate = (date) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(date).toLocaleString('en-US', options);
};

// --- API Endpoints for News ---

// ✅ Serve index.html for the root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// This endpoint seems to be for a specific JSON file, keep as is if intended.
// If data.json is intended to be a static file, it's better to place it in the 'public' folder
// or directly serve it via `app.use(express.static(...))` if it's within a static serving directory.
// For now, assuming it's meant to be served from 'uploads' if it exists.
app.get('/api/data.json', (req, res) => { // Changed endpoint to /api/data.json
    const dataFilePath = path.join(__dirname, 'uploads', 'data.json');
    if (fs.existsSync(dataFilePath)) {
        res.sendFile(dataFilePath);
    } else {
        res.status(404).json({ message: 'data.json not found' });
    }
});

// GET all news with optional filtering and search
app.get('/api/news', (req, res) => { // This is now the only /api/news route for data
    let filteredNews = [...newsData]; // Create a copy to avoid modifying original data
    const { category, search, authorId } = req.query;

    // Apply filters
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
    // Note: 'my-posts' logic is handled by the 'authorId' filter
    if (authorId) {
        filteredNews = filteredNews.filter(news => news.authorId === authorId);
    }

    // Sort by publishDate (newest first)
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
        id: uuidv4(), // Use UUID for robust unique IDs
        category,
        title,
        fullContent,
        imageUrl,
        author,
        authorImage: authorImage || 'https://via.placeholder.com/28x28?text=A',
        publishDate: formatDate(new Date()),
        isFeatured: false, // New posts are generally not featured by default
        isSideFeature: false, // New posts are generally not side featured by default
        authorId,
        comments: [] // Initialize with empty comments array
    };
    newsData.push(newNews);
    res.status(201).json(newNews);
});

// PUT/PATCH (Update) an existing news item
app.put('/api/news/:newsid', upload.single('image'), (req, res) => {
    const newsId = req.params.newsid;
    const newsIndex = newsData.findIndex(news => news.id === newsId);

    if (newsIndex > -1) {
        const existingNews = newsData[newsIndex];
        const { title, category, fullContent, author, authorImage, authorId } = req.body;
        let imageUrl = req.body.imageUrl; // Expect existing URL if no new file provided in form data

        // Handle image update logic
        if (req.file) {
            // New image uploaded: delete old local image if it exists
            if (existingNews.imageUrl && existingNews.imageUrl.startsWith('/uploads/')) {
                const oldImagePath = path.join(__dirname, existingNews.imageUrl);
                // Ensure the path exists before attempting to delete
                if (fs.existsSync(oldImagePath)) {
                    fs.unlink(oldImagePath, (err) => {
                        if (err) console.error("Error deleting old image:", oldImagePath, err);
                    });
                }
            }
            imageUrl = `/uploads/${req.file.filename}`; // Set new local image URL
        } else if (req.body.imageUrl === '') {
            // If imageUrl in body is explicitly empty, it means the user cleared it
            // And no new file was uploaded
            imageUrl = 'https://via.placeholder.com/600x400?text=No+Image';
             // If there was an old local image, delete it
            if (existingNews.imageUrl && existingNews.imageUrl.startsWith('/uploads/')) {
                const oldImagePath = path.join(__dirname, existingNews.imageUrl);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlink(oldImagePath, (err) => {
                        if (err) console.error("Error deleting old image after clear:", oldImagePath, err);
                    });
                }
            }
        } else {
            // No new file, and imageUrl not explicitly cleared from body: retain existing URL
            imageUrl = existingNews.imageUrl;
        }

        const updatedNews = {
            ...existingNews,
            title: title !== undefined ? title : existingNews.title, // Only update if provided
            category: category !== undefined ? category : existingNews.category,
            fullContent: fullContent !== undefined ? fullContent : existingNews.fullContent,
            imageUrl: imageUrl, // Use the determined imageUrl
            author: author !== undefined ? author : existingNews.author,
            authorImage: authorImage !== undefined ? authorImage : existingNews.authorImage,
            authorId: authorId !== undefined ? authorId : existingNews.authorId,
            // publishDate typically remains the original date unless explicitly modified
            // comments array should not be directly updated via PUT for news, but via comment endpoints
        };
        newsData[newsIndex] = updatedNews;
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

    // If the news item was successfully removed, delete associated image file
    if (newsData.length < initialLength) {
        if (newsItemToDelete.imageUrl && newsItemToDelete.imageUrl.startsWith('/uploads/')) {
            const imagePath = path.join(__dirname, newsItemToDelete.imageUrl);
            fs.unlink(imagePath, (err) => {
                if (err) {
                    console.error("Error deleting image file:", imagePath, err);
                    // Even if image deletion fails, consider the news item deleted from data
                }
            });
        }
        res.status(200).json({ message: 'News item deleted successfully' });
    } else {
        // This case should theoretically not be hit if newsItemToDelete was found but then filter didn't work.
        // It's a fallback for unexpected internal logic issues.
        res.status(500).json({ message: 'Failed to delete news item due to internal error.' });
    }
});

// --- API Endpoints for Comments ---

// GET comments for a specific news item
app.get('/api/news/:newsId/comments', (req, res) => {
    const newsItem = newsData.find(news => news.id === req.params.newsId);
    if (newsItem) {
        // Always return comments sorted by newest first
        const sortedComments = [...newsItem.comments].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        res.json(sortedComments);
    } else {
        res.status(404).json({ message: 'News item not found' });
    }
});

// POST a new comment to a news item
app.post('/api/news/:newsId/comments', (req, res) => {
    const newsItem = newsData.find(news => news.id === req.params.newsId);
    if (!newsItem) {
        return res.status(404).json({ message: 'News item not found' });
    }

    const { author, authorId, avatar, text } = req.body;

    if (!text) { // Ensure comment text is not empty
        return res.status(400).json({ message: 'Comment text cannot be empty.' });
    }
    if (!author || !authorId) {
        return res.status(400).json({ message: 'Author and Author ID are required for comments.' });
    }

    const newComment = {
        id: uuidv4(), // Use UUID for unique comment IDs
        author: author,
        authorId: authorId,
        avatar: avatar || 'https://via.placeholder.com/45x45?text=U',
        text,
        timestamp: new Date().toISOString()
    };
    newsItem.comments.push(newComment);
    res.status(201).json(newComment);
});

// PUT/PATCH (Update) a comment
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

    newsItem.comments[commentIndex].text = text;
    res.json(newsItem.comments[commentIndex]);
});

// DELETE a comment
app.delete('/api/news/:newsId/comments/:commentId', (req, res) => {
    const newsItem = newsData.find(news => news.id === req.params.newsId);
    if (!newsItem) {
        return res.status(404).json({ message: 'News item not found' });
    }

    const initialCommentCount = newsItem.comments.length;
    newsItem.comments = newsItem.comments.filter(c => c.id !== req.params.commentId);

    if (newsItem.comments.length < initialCommentCount) {
        res.status(200).json({ message: 'Comment deleted successfully' });
    } else {
        res.status(404).json({ message: 'Comment not found' });
    }
});

// --- Error Handling Middleware (should be last app.use) ---
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ message: 'File size too large. Max 5MB allowed.' });
        }
        // Handle other Multer errors
        return res.status(400).json({ message: err.message });
    } else if (err) {
        // Generic error handler for other issues
        console.error(err); // Log the error for debugging
        return res.status(500).json({ message: err.message || 'An unexpected error occurred.' });
    }
    next(); // Pass to the next middleware if no error
});


// Start the server
app.listen(PORT,  () => { // Listen on 0.0.0.0 to bind to all available network interfaces
    console.log(`Server running on http://localhost:${PORT}`);
});
