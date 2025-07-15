// --- CONFIGURATION AND CONSTANTS ---
// IMPORTANT: This BASE_API_URL must match the URL where your Node.js backend is running.
const BASE_API_URL = 'https://flashnews-7l5y.onrender.com/api'; // Make sure this is your *actual* deployed backend URL

const MY_POSTS_AUTHOR_ID = 'user-prince'; // Fixed ID for "my posts" (would come from user authentication in real app)
const USER_PROFILE_KEY = 'globalNewsUserProfile'; // LocalStorage for user profile (client-specific)

// Initial default news data (This is now primarily for initial setup of the backend,
// the frontend will fetch from the backend. This data is not actively used by script.js
// once the backend is running and providing data.)
const DEFAULT_NEWS_DATA = [
    { id: 'mainfeature', category: 'Technology', title: 'Revolutionary AI Chip Unveiled, Promising New Era of Computing', fullContent: 'A groundbreaking artificial intelligence chip has been unveiled, poised to revolutionize computing with its unprecedented processing capabilities and energy efficiency. Industry experts anticipate a new era of innovation across various sectors, from healthcare to autonomous systems.\n\nThe chip\'s architecture allows for complex computations at speeds previously thought impossible, opening doors for advanced AI applications and machine learning models.', imageUrl: 'https://images.unsplash.com/photo-1593642532400-2682810df593?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', author: 'Jane Doe', authorImage: 'https://randomuser.me/api/portraits/women/32.jpg', publishDate: 'July 6, 2025 at 10:30 AM', isFeatured: true, isSideFeature: false, authorId: 'admin', comments: [] },
    { id: 'sidefeature1', category: 'Business', title: 'Global Markets React to New Economic Policies', fullContent: 'Global markets are showing significant volatility as new economic policies are introduced. Analysts are closely watching how these changes will impact various sectors and international trade agreements.\n\nEconomic forecasts suggest potential shifts in investment strategies.', imageUrl: 'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', author: 'Emily White', authorImage: 'https://randomuser.me/api/portraits/women/67.jpg', publishDate: 'July 5, 2025 at 1:00 PM', isFeatured: true, isSideFeature: true, authorId: 'admin', comments: [] },
    { id: 'sidefeature2', category: 'Sports', title: 'National Team Qualifies for Finals', fullContent: 'In an exhilarating display of skill and determination, the national team has successfully secured its spot in the championship finals after a series of intense matches against top-ranked opponents.\n\nFans are eagerly anticipating the final showdown.', imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', author: 'David Lee', authorImage: 'https://randomuser.me/api/portraits/men/22.jpg', publishDate: 'July 5, 2025 at 11:30 AM', isFeatured: true, isSideFeature: true, authorId: 'admin', comments: [] },
    { id: 'sidefeature3', category: 'Automotive', title: 'Electric Vehicle Sales Surpass Traditional Models', fullContent: 'For the first time in history, sales of electric vehicles have officially surpassed traditional gasoline-powered models, signaling a significant shift in consumer preferences and the automotive industry\'s future.\n\nThis trend is expected to continue as infrastructure improves.', imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80', author: 'Olivia Clark', authorImage: 'https://randomuser.me/api/portraits/women/55.jpg', publishDate: 'July 5, 2025 at 9:15 AM', isFeatured: true, isSideFeature: true, authorId: 'admin', comments: [] },
    { id: 'news1', category: 'Environment', title: 'New Climate Agreement Signed by 40 Nations', fullContent: 'Global leaders from 40 nations have signed a landmark climate agreement, committing to ambitious targets aimed at significantly reducing carbon emissions by the year 2030, marking a crucial step towards combating climate change.\n\nThe agreement emphasizes renewable energy investments and sustainable practices.', imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', author: 'Sarah Johnson', authorImage: 'https://randomuser.me/api/portraits/women/44.jpg', publishDate: 'July 4, 2025 at 3:00 PM', isFeatured: false, authorId: 'admin', comments: [] },
    { id: 'news2', category: 'Sports', title: 'Underdog Team Advances to Championship Finals', fullContent: 'In a stunning upset, the underdog team defeats the reigning champions in a nail-biting finish, securing their spot in the championship finals and thrilling fans worldwide.\n\nTheir journey has captured the hearts of many.', imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', author: 'Michael Torres', authorImage: 'https://randomuser.me/api/portraits/men/22.jpg', publishDate: 'July 4, 2025 at 6:45 PM', isFeatured: false, authorId: 'admin', comments: [] },
    { id: 'news3', category: 'Finance', title: 'Central Bank Announces Interest Rate Changes', fullContent: 'In response to recent economic indicators and inflation concerns, the central bank has announced a series of interest rate adjustments, a move that is expected to have a significant impact on borrowing costs and investment across the country.\n\nAnalysts predict a period of market adjustment.', imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80', author: 'David Kim', authorImage: 'https://randomuser.me/api/portraits/men/65.jpg', publishDate: 'July 4, 2025 at 1:00 PM', isFeatured: false, authorId: 'admin', comments: [] }
];

// --- GLOBAL STATE (will be fetched from backend) ---
let allNews = []; // Master array of all news items
let notifications = []; // Notifications are still client-side for simplicity, but could be backend too.
let userProfile = { // User profile
    name: 'Guest User',
    avatar: 'https://placehold.co/100x100?text=User'
};

// --- DOM Elements ---
const menuToggle = document.getElementById('menuToggle');
const navContainer = document.getElementById('navContainer');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle.querySelector('i');
const notificationToggle = document.getElementById('notificationToggle');
const notificationBadge = document.getElementById('notificationBadge');
const notificationDropdown = document.getElementById('notificationDropdown');
const notificationList = document.getElementById('notificationList');
const noNotificationsMessage = document.getElementById('noNotificationsMessage');
const featuredSection = document.getElementById('featured-section');
const latestNewsSection = document.getElementById('latest-news-section');
const newsForm = document.getElementById('newsForm');
const editNewsIdInput = document.getElementById('editNewsId');
const publishBtn = document.getElementById('publishBtn');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const newsDetailModal = document.getElementById('newsDetailModal');
const closeModalButton = newsDetailModal.querySelector('.close-button');
const modalNewsImage = document.getElementById('modalNewsImage');
const modalCategoryTag = document.getElementById('modalCategoryTag');
const modalNewsTitle = document.getElementById('modalNewsTitle');
const modalAuthorImage = document.getElementById('modalAuthorImage');
const modalAuthorName = document.getElementById('modalAuthorName');
const modalPublishDate = document.getElementById('modalPublishDate');
const modalNewsContent = document.getElementById('modalNewsContent');
const modalAuthorBio = document.getElementById('modalAuthorBio');
const commentForm = document.getElementById('commentForm');
const commentTextInput = document.getElementById('commentText');
const commentNewsIdInput = document.getElementById('commentNewsId');
const editCommentIdInput = document.getElementById('editCommentId');
const commentsList = document.getElementById('commentsList');
const noCommentsMessage = document.getElementById('noCommentsMessage');
const postCommentBtn = document.getElementById('postCommentBtn');
const profileIcon = document.getElementById('profileIcon');
const profileModal = document.getElementById('profileModal');
const closeProfileModalBtn = document.getElementById('closeProfileModal');
const profileForm = document.getElementById('profileForm');
const profileNameInput = document.getElementById('profileName');
const profileAvatarUpload = document.getElementById('profileAvatarUpload');
const profileAvatarPreview = document.getElementById('profileAvatarPreview');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const currentImagePreview = document.getElementById('currentImagePreview');
const clearImageSelection = document.getElementById('clearImageSelection');
const loadingOverlay = document.getElementById('loadingOverlay');
const loadingMessage = document.getElementById('loadingMessage');
const loadingIcon = loadingOverlay.querySelector('i');
const navCategoryLinks = document.querySelectorAll('.nav-link-category');
const footerCategoryLinks = document.querySelectorAll('.footer-link-category');
const scrollToTopBtn = document.querySelector('.scroll-to-top');

// --- UTILITY FUNCTIONS ---
function showLoading(message = 'Loading...', iconClass = 'fas fa-spinner', animate = true) {
    loadingMessage.textContent = message;
    loadingIcon.className = iconClass;
    loadingIcon.style.animation = animate ? 'spin 1s linear infinite' : 'none';
    loadingOverlay.classList.add('visible');
}

function hideLoading() {
    loadingOverlay.classList.remove('visible');
}

function displayError(message = 'An unexpected error occurred. Please try again.') {
    showLoading(message, 'fas fa-exclamation-circle', false);
    setTimeout(hideLoading, 3000);
}

function displaySuccess(message = 'Operation successful!') {
    showLoading(message, 'fas fa-check-circle', false);
    setTimeout(hideLoading, 1500);
}

// Function to format date for display
function formatDisplayDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid date
    }
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true };
    return date.toLocaleString('en-US', options);
}

function timeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) + " seconds ago";
}

function saveUserProfile() {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
}

function loadUserProfile() {
    const storedProfile = localStorage.getItem(USER_PROFILE_KEY);
    if (storedProfile) {
        userProfile = JSON.parse(storedProfile);
    }
}

// --- THEME TOGGLE ---
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = localStorage.getItem('theme');

// Set initial theme
if (currentTheme === 'dark' || (!currentTheme && prefersDarkScheme.matches)) {
    document.documentElement.setAttribute('data-theme', 'dark');
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
} else {
    document.documentElement.setAttribute('data-theme', 'light');
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
    localStorage.setItem('theme', 'light');
}

// Toggle theme
themeToggle.addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        localStorage.setItem('theme', 'dark');
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        localStorage.setItem('theme', 'light');
    }
});

// --- MOBILE MENU TOGGLE ---
menuToggle.addEventListener('click', () => {
    navContainer.classList.toggle('active');
});

// --- NOTIFICATIONS (Client-side for simplicity, but could be backend) ---
function updateNotificationDisplay() {
    notificationList.innerHTML = '';
    if (notifications.length === 0) {
        noNotificationsMessage.style.display = 'block';
    } else {
        noNotificationsMessage.style.display = 'none';
        notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        notifications.forEach(notification => {
            const item = document.createElement('div');
            item.className = 'notification-item';
            if (notification.newsId) {
                item.setAttribute('data-news-id', notification.newsId);
            }
            item.innerHTML = `
                <i class="${notification.icon}"></i>
                <div class="notification-content">
                    <p>${notification.message}</p>
                    <small>${timeAgo(notification.timestamp)}</small>
                </div>
            `;
            notificationList.appendChild(item);
        });
    }
    notificationBadge.textContent = notifications.length;
    notificationBadge.style.display = notifications.length > 0 ? 'flex' : 'none';
}

function addNotification(message, icon = 'fas fa-info-circle', newsId = null) {
    const newNotification = {
        id: Date.now(),
        message,
        icon,
        timestamp: new Date().toISOString(),
        newsId
    };
    notifications.unshift(newNotification);
    if (notifications.length > 10) { // Keep only latest 10
        notifications = notifications.slice(0, 10);
    }
    // Ideally, notifications would also be stored/fetched from a backend
    // For now, client-side only:
    localStorage.setItem('globalNewsNotifications', JSON.stringify(notifications));
    updateNotificationDisplay();
}

notificationToggle.addEventListener('click', (event) => {
    notificationDropdown.classList.toggle('active');
    if (notificationDropdown.classList.contains('active')) {
        notificationBadge.textContent = '0';
        notificationBadge.style.display = 'none';
    }
    event.stopPropagation();
});

document.addEventListener('click', (event) => {
    if (!notificationDropdown.contains(event.target) && !notificationToggle.contains(event.target)) {
        notificationDropdown.classList.remove('active');
    }
});

// --- NEWS FETCHING AND RENDERING (Backend Interaction) ---

// Fetches all news from the backend API
async function fetchNews(category = 'all', searchTerm = '') {
    showLoading('Fetching news...');
    try {
        let url = `${BASE_API_URL}/news`;
        const params = new URLSearchParams();
        if (category !== 'all' && category !== 'my-posts') {
            params.append('category', category);
        }
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        if (category === 'my-posts') {
            params.append('authorId', MY_POSTS_AUTHOR_ID);
        }
        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            // If backend is down or returns an error, explicitly state the problem.
            throw new Error(`Failed to fetch news from ${url}. Server responded with status: ${response.status}. Please ensure your backend server is running.`);
        }
        const data = await response.json();
        allNews = data; // Update global news array with fetched data
        renderNewsCards(category, searchTerm); // Render based on fetched data
        hideLoading();
    } catch (error) {
        console.error('Error fetching news:', error);
        displayError(`Failed to load news: ${error.message}`);
        // Do NOT fall back to DEFAULT_NEWS_DATA here, as it encourages ignoring backend issues.
        // A real app would show a persistent error or a retry mechanism.
    }
}

// Function to render news cards based on the allNews array
function renderNewsCards(filterCategory = 'all', searchTerm = '') {
    featuredSection.innerHTML = '';
    latestNewsSection.innerHTML = '';

    // Sort all news by publishDate (newest first)
    const sortedNewsData = [...allNews].sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

    const featuredNewsItems = sortedNewsData.filter(news => news.isFeatured);
    const latestNewsItems = sortedNewsData.filter(news => !news.isFeatured);

    // Render Featured News
    const mainFeature = featuredNewsItems.find(news => !news.isSideFeature);
    if (mainFeature && shouldDisplayNews(mainFeature, filterCategory, searchTerm)) {
        featuredSection.appendChild(createNewsElement(mainFeature, 'main-feature'));
    }

    const sideFeaturesContainer = document.createElement('div');
    sideFeaturesContainer.className = 'side-features';
    const sideFeatures = featuredNewsItems.filter(news => news.isSideFeature);
    sideFeatures.forEach(news => {
        if (shouldDisplayNews(news, filterCategory, searchTerm)) {
            sideFeaturesContainer.appendChild(createNewsElement(news, 'side-feature'));
        }
    });
    if (sideFeaturesContainer.children.length > 0) {
        featuredSection.appendChild(sideFeaturesContainer);
    }

    // Render Latest News
    const newsGrid = document.createElement('div');
    newsGrid.className = 'news-grid';
    latestNewsItems.forEach(news => {
        if (shouldDisplayNews(news, filterCategory, searchTerm)) {
            newsGrid.appendChild(createNewsElement(news, 'news-card'));
        }
    });
    latestNewsSection.appendChild(newsGrid);
}

function shouldDisplayNews(news, filterCategory, searchTerm) {
    const matchesCategory = filterCategory === 'all' || news.category === filterCategory || (filterCategory === 'my-posts' && news.authorId === MY_POSTS_AUTHOR_ID);
    const matchesSearch = searchTerm === '' || news.title.toLowerCase().includes(searchTerm.toLowerCase()) || news.fullContent.toLowerCase().includes(searchTerm.toLowerCase()) || news.category.toLowerCase().includes(searchTerm.toLowerCase()) || news.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
}

// Helper function to resolve image URL for display
const getImageUrl = (url) => {
    return url || 'https://via.placeholder.com/600x400?text=No+Image';
};

function createNewsElement(newsItem, type) {
    const element = document.createElement('a');
    element.href = 'javascript:void(0)';
    element.className = type;
    element.setAttribute('data-id', newsItem.id);
    element.setAttribute('data-category', newsItem.category);
    element.setAttribute('data-author-id', newsItem.authorId); // Crucial for edit/delete check

    const safeFullContent = newsItem.fullContent || '';
    const firstParagraph = safeFullContent.split('\n')[0];
    const truncatedContent = firstParagraph.substring(0, 80) + (firstParagraph.length > 80 ? '...' : '');

    let actionsHTML = '';
    // Check if the news item's authorId matches the client's MY_POSTS_AUTHOR_ID
    if (newsItem.authorId === MY_POSTS_AUTHOR_ID) {
        actionsHTML = `
            <div class="card-actions">
                <i class="fas fa-edit" data-action="edit"></i>
                <i class="fas fa-trash" data-action="delete"></i>
            </div>
        `;
    }

    let contentHTML = '';
    if (type === 'main-feature') {
        contentHTML = `
            <div class="main-feature-image">
                <img src="${getImageUrl(newsItem.imageUrl)}" alt="${newsItem.title}">
            </div>
            <div class="main-feature-content">
                <span class="category-tag">${newsItem.category}</span>
                <h2>${newsItem.title}</h2>
                <p>${truncatedContent}</p>
                <div class="card-footer">
                    <div class="author">
                        <img src="${newsItem.authorImage || 'https://placehold.co/28x28?text=A'}" alt="Author">
                        <span>${newsItem.author}</span>
                    </div>
                    ${actionsHTML}
                </div>
            </div>
        `;
    } else if (type === 'side-feature') {
        contentHTML = `
            <div class="side-feature-image">
                <img src="${getImageUrl(newsItem.imageUrl)}" alt="${newsItem.title}">
            </div>
            <div class="side-feature-content">
                <span class="category-tag">${newsItem.category}</span>
                <h4>${newsItem.title}</h4>
                <div class="card-footer">
                    <span>${timeAgo(newsItem.publishDate)}</span>
                    ${actionsHTML}
                </div>
            </div>
        `;
    } else if (type === 'news-card') {
        contentHTML = `
            <div class="card-image">
                <img src="${getImageUrl(newsItem.imageUrl)}" alt="${newsItem.title}">
            </div>
            <div class="card-content">
                <span class="category-tag">${newsItem.category}</span>
                <h3>${newsItem.title}</h3>
                <p>${truncatedContent}</p>
                <div class="card-footer">
                    <div class="author">
                        <img src="${newsItem.authorImage || 'https://placehold.co/28x28?text=A'}" alt="Author">
                        <span>${newsItem.author}</span>
                    </div>
                    ${actionsHTML}
                </div>
            </div>
        `;
    }
    element.innerHTML = contentHTML;
    return element;
}

// --- CATEGORY FILTERING ---
let currentActiveCategory = 'all'; // Keep track of the currently active category

function filterNewsByCategory(category) {
    navCategoryLinks.forEach(navLink => navLink.classList.remove('active'));
    const currentActiveNavLink = document.querySelector(`.nav-link-category[data-category="${category}"]`);
    if (currentActiveNavLink) {
        currentActiveNavLink.classList.add('active');
    } else {
        document.querySelector('.nav-link-category[data-category="all"]').classList.add('active');
    }
    currentActiveCategory = category; // Update the global variable
    fetchNews(category); // Fetch news based on category
    searchInput.value = ''; // Clear search input when filtering by category
    document.querySelector('.container').scrollIntoView({ behavior: 'smooth' });
}

navCategoryLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        filterNewsByCategory(this.dataset.category);
    });
});

footerCategoryLinks.forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        filterNewsByCategory(this.dataset.category);
    });
});

// --- SEARCH BAR FUNCTIONALITY ---
function performSearch() {
    const query = searchInput.value.toLowerCase().trim();
    navCategoryLinks.forEach(navLink => navLink.classList.remove('active'));
    document.querySelector('.nav-link-category[data-category="all"]').classList.add('active');
    currentActiveCategory = 'all'; // Reset active category to all for search
    fetchNews('all', query); // Search across all categories
}

searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keyup', function(e) {
    if (e.key === 'Enter') {
        performSearch();
    } else if (searchInput.value.trim() === '') {
        filterNewsByCategory('all');
    }
});

// --- ADMIN NEWS PUBLISHING / EDITING (Backend Interaction) ---
newsForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    console.log('DEBUG: 0. News form submit event triggered.');
    showLoading('Processing news...');

    const title = document.getElementById('newsTitle').value.trim();
    const category = document.getElementById('newsCategory').value;
    const newsImageFile = document.getElementById('newsImage').files[0];
    const content = document.getElementById('newsContent').value.trim();
    const editingId = editNewsIdInput.value;

    console.log('DEBUG: 0.1. Form values collected. Title:', title, 'Category:', category);
    console.log('DEBUG: 0.2. Image file:', newsImageFile ? newsImageFile.name : 'No file selected');
    console.log('DEBUG: 0.3. Editing ID:', editingId);
    console.log('DEBUG: 0.4. Full Content (trimmed):', content);

    // Basic validation for content
    if (!content) {
        displayError('News content cannot be empty.');
        hideLoading();
        return;
    }

    const authorName = userProfile.name;
    const authorImage = userProfile.avatar;
    const authorId = MY_POSTS_AUTHOR_ID; // The fixed author ID for client-created posts

    let finalImageUrl = ''; // This will hold the Cloudinary URL or placeholder

    try {
        if (newsImageFile) {
            // Step 1: Get Cloudinary signature from your backend
            const signatureResponse = await fetch(`${BASE_API_URL}/cloudinary-signature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: 'flashnews_uploads' }) // Optional: send folder name
            });

            if (!signatureResponse.ok) {
                const errorData = await signatureResponse.json();
                throw new Error(errorData.message || 'Failed to get Cloudinary signature.');
            }
            const { signature, timestamp, api_key, cloud_name, folder } = await signatureResponse.json();
            console.log('DEBUG: Cloudinary Signature received:', { signature, timestamp, api_key, cloud_name, folder });

            // Step 2: Directly upload image to Cloudinary using the signature
            const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;
            const cloudinaryFormData = new FormData();
            cloudinaryFormData.append('file', newsImageFile);
            cloudinaryFormData.append('api_key', api_key);
            cloudinaryFormData.append('timestamp', timestamp);
            cloudinaryFormData.append('signature', signature);
            cloudinaryFormData.append('folder', folder); // Add folder to direct upload

            const cloudinaryResponse = await fetch(cloudinaryUploadUrl, {
                method: 'POST',
                body: cloudinaryFormData
            });

            if (!cloudinaryResponse.ok) {
                const errorData = await cloudinaryResponse.json();
                throw new Error(errorData.error.message || 'Failed to upload image to Cloudinary.');
            }
            const cloudinaryResult = await cloudinaryResponse.json();
            finalImageUrl = cloudinaryResult.secure_url; // Get the secure URL from Cloudinary
            console.log('DEBUG: Cloudinary Upload successful. URL:', finalImageUrl);

        } else if (editingId) {
            const existingNews = allNews.find(item => item.id === editingId);
            if (existingNews) {
                // If no new file selected, check if user cleared image or wants to keep existing
                if (currentImagePreview.src.includes('No+Image')) {
                    finalImageUrl = 'https://via.placeholder.com/600x400?text=No+Image'; // User cleared image
                    console.log('DEBUG: Image cleared for existing post.');
                } else if (existingNews.imageUrl) {
                    finalImageUrl = existingNews.imageUrl; // Keep existing image URL
                    console.log('DEBUG: Keeping existing image URL for update.');
                }
            }
        } else {
            finalImageUrl = 'https://via.placeholder.com/600x400?text=No+Image'; // New post with no image
            console.log('DEBUG: Using placeholder for new post with no image.');
        }

        // Step 3: Submit news data (including Cloudinary URL) to your backend
        console.log('DEBUG: Preparing final news submission to backend...');
        const newsDataToBackend = {
            title: title,
            category: category,
            fullContent: content,
            imageUrl: finalImageUrl, // Send the Cloudinary URL or placeholder
            author: authorName,
            authorImage: authorImage,
            authorId: authorId
        };

        const targetUrl = editingId ? `${BASE_API_URL}/news/${editingId}` : `${BASE_API_URL}/news`;
        const method = editingId ? 'PUT' : 'POST';

        const response = await fetch(targetUrl, {
            method: method,
            headers: { 'Content-Type': 'application/json' }, // Send as JSON now
            body: JSON.stringify(newsDataToBackend)
        });

        console.log('DEBUG: Fetch request completed. Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                console.error('DEBUG: Server responded with error JSON:', errorData);
                throw new Error(errorData.message || 'Server error during news submission.');
            } catch (jsonParseError) {
                console.error('DEBUG: Server responded with non-JSON error:', errorText);
                throw new Error(`Server error: ${errorText} (Status: ${response.status})`);
            }
        }

        const result = await response.json();
        console.log('DEBUG: News submission successful:', result);
        displaySuccess(editingId ? 'News updated successfully!' : 'News published successfully!');
        addNotification(
            editingId ? `"${title}" was updated by ${authorName}.` : `New article "${title}" published by ${authorName}!`,
            editingId ? 'fas fa-pen' : 'fas fa-newspaper',
            result.id // Use the ID returned from the server
        );

        // Reset form
        newsForm.reset();
        editNewsIdInput.value = '';
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish News';
        imagePreviewContainer.style.display = 'none';
        currentImagePreview.src = ''; // Clear image preview
        document.getElementById('newsImage').value = ''; // Clear file input

        await fetchNews(currentActiveCategory, searchInput.value); // Re-fetch and re-render current view
        document.querySelector('.admin-panel').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('DEBUG: Caught error during news submission:', error);
        displayError(`Failed to submit news: ${error.message}`);
    } finally {
        console.log('DEBUG: Finally block executed. Hiding loading.');
        hideLoading();
    }
});

// Image preview and clear functionality for news image
document.getElementById('newsImage').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            currentImagePreview.src = e.target.result;
            imagePreviewContainer.style.display = 'flex';
        };
        reader.readAsDataURL(file);
    } else {
        // If file input is cleared, hide preview
        imagePreviewContainer.style.display = 'none';
        currentImagePreview.src = '';
    }
});

clearImageSelection.addEventListener('click', () => {
    document.getElementById('newsImage').value = ''; // Clear the file input
    imagePreviewContainer.style.display = 'none';
    currentImagePreview.src = 'https://via.placeholder.com/600x400?text=No+Image'; // Set a default placeholder if cleared
});


// --- NEWS DETAIL MODAL AND COMMENTS (Backend Interaction) ---

async function fetchNewsDetailAndComments(newsId) {
    showLoading('Loading article...');
    try {
        const newsResponse = await fetch(`${BASE_API_URL}/news/${newsId}`);
        if (!newsResponse.ok) {
            throw new Error(`Failed to fetch news detail. Status: ${newsResponse.status}`);
        }
        const newsItem = await newsResponse.json();

        // Helper function to resolve image URL for modal - direct use for Cloudinary
        const getModalImageUrl = (url) => {
            return url || 'https://via.placeholder.com/600x400?text=No+Image';
        };

        // Populate modal
        modalNewsImage.src = getModalImageUrl(newsItem.imageUrl);
        modalNewsImage.alt = newsItem.title;
        modalCategoryTag.textContent = newsItem.category;
        modalNewsTitle.textContent = newsItem.title;
        modalAuthorImage.src = newsItem.authorImage || 'https://placehold.co/40x40?text=A';
        modalAuthorName.textContent = newsItem.author;
        modalPublishDate.textContent = formatDisplayDate(newsItem.publishDate); // Use formatDisplayDate
        modalNewsContent.textContent = newsItem.fullContent; // This directly uses fullContent
        modalAuthorBio.textContent = `Read more articles by ${newsItem.author}.`;

        commentNewsIdInput.value = newsId;
        editCommentIdInput.value = '';
        commentTextInput.value = '';
        postCommentBtn.innerHTML = '<i class="fas fa-comment-dots"></i> Post Comment';
        displayComments(newsItem); // Display fetched comments
        newsDetailModal.classList.add('visible');
        document.body.style.overflow = 'hidden';
        hideLoading();
    } catch (error) {
        console.error('Error fetching news detail or comments:', error);
        displayError(`Failed to load article details: ${error.message}`);
    }
}

function displayComments(newsItem) {
    commentsList.innerHTML = '';
    if (newsItem.comments && newsItem.comments.length > 0) {
        noCommentsMessage.style.display = 'none';
        // Comments are already sorted by backend, but ensure for consistency if data source changes
        newsItem.comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        newsItem.comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment-item';
            commentElement.setAttribute('data-comment-id', comment.id);
            let actionsHTML = '';
            // Check if comment belongs to the current user (based on authorId stored in the comment on backend)
            if (comment.authorId === MY_POSTS_AUTHOR_ID) {
                actionsHTML = `
                    <div class="comment-actions">
                        <i class="fas fa-edit" data-action="edit-comment"></i>
                        <i class="fas fa-trash" data-action="delete-comment"></i>
                    </div>
                `;
            }
            commentElement.innerHTML = `
                <img src="${comment.avatar || 'https://placehold.co/45x45?text=U'}" alt="${comment.author}" class="comment-avatar">
                <div class="comment-content">
                    <div class="comment-meta">
                        <div class="comment-author-info">
                            <span class="comment-author-name">${comment.author}</span> &bull; <span>${timeAgo(comment.timestamp)}</span>
                        </div>
                        ${actionsHTML}
                    </div>
                    <p class="comment-text">${comment.text}</p>
                </div>
            `;
            commentsList.appendChild(commentElement);
        });
    } else {
        noCommentsMessage.style.display = 'block';
    }
}

commentForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    showLoading('Posting comment...');
    const newsId = commentNewsIdInput.value;
    const editCommentId = editCommentIdInput.value;
    const commenterName = userProfile.name;
    const commenterAvatar = userProfile.avatar;
    const commentText = commentTextInput.value.trim();

    if (commenterName === 'Guest User') {
        displayError('Please set your name in the profile before commenting.');
        hideLoading();
        return;
    }
    if (!commentText) {
        displayError('Please enter your comment.');
        hideLoading();
        return;
    }

    const commentData = {
        author: commenterName,
        authorId: MY_POSTS_AUTHOR_ID, // Use the fixed author ID for comments as well
        avatar: commenterAvatar,
        text: commentText
    };

    try {
        let response;
        if (editCommentId) {
            // UPDATE Comment
            response = await fetch(`${BASE_API_URL}/news/${newsId}/comments/${editCommentId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            });
        } else {
            // CREATE Comment
            response = await fetch(`${BASE_API_URL}/news/${newsId}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(commentData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Server error during comment submission.');
        }

        displaySuccess(editCommentId ? 'Comment updated!' : 'Comment posted!');
        addNotification(
            editCommentId ? `Your comment on news ID ${newsId} was updated.` : `New comment on news ID ${newsId} by ${commenterName}.`,
            editCommentId ? 'fas fa-pen' : 'fas fa-comment',
            newsId
        );

        // Re-fetch comments for this specific news item to update the modal
        await fetchNewsDetailAndComments(newsId);

        commentForm.reset();
        editCommentIdInput.value = '';
        commentTextInput.value = ''; // Ensure text input is cleared
        postCommentBtn.innerHTML = '<i class="fas fa-comment-dots"></i> Post Comment';

    } catch (error) {
        console.error('Error submitting comment:', error);
        displayError(`Failed to submit comment: ${error.message}`);
    } finally {
        hideLoading();
    }
});

// Delegated event listener for news and comment actions
document.addEventListener('click', async function(e) {
    const target = e.target;

    // --- News Card Actions (Edit/Delete) ---
    if (target.classList.contains('fa-trash') && target.dataset.action === 'delete') {
        const newsCardElement = target.closest('.news-card,.main-feature,.side-feature');
        if (!newsCardElement) return;
        const newsIdToDelete = newsCardElement.dataset.id;
        const newsItemAuthorId = newsCardElement.dataset.authorId; // Get authorId from data attribute

        if (newsItemAuthorId === MY_POSTS_AUTHOR_ID) {
            if (confirm('Are you sure you want to delete this news item?')) {
                showLoading('Deleting news...');
                try {
                    const response = await fetch(`${BASE_API_URL}/news/${newsIdToDelete}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.message || 'Server error during deletion.');
                    }

                    displaySuccess('News item deleted!');
                    addNotification(`News item ${newsIdToDelete} was deleted.`, 'fas fa-trash-alt');
                    await fetchNews(currentActiveCategory, searchInput.value); // Re-fetch and re-render current view
                } catch (error) {
                    console.error('Error deleting news:', error);
                    displayError(`Failed to delete news: ${error.message}`);
                } finally {
                    hideLoading();
                }
            }
        } else {
            alert('You can only delete your own posts.');
        }
    } else if (target.classList.contains('fa-edit') && target.dataset.action === 'edit') {
        const newsCardElement = target.closest('.news-card,.main-feature,.side-feature');
        if (!newsCardElement) return;
        const newsIdToEdit = newsCardElement.dataset.id;
        const newsItemAuthorId = newsCardElement.dataset.authorId; // Get authorId from data attribute

        if (newsItemAuthorId === MY_POSTS_AUTHOR_ID) {
            showLoading('Loading news for edit...');
            try {
                const response = await fetch(`${BASE_API_URL}/news/${newsIdToEdit}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch news for edit. Status: ${response.status}`);
                }
                const newsItem = await response.json();

                document.getElementById('newsTitle').value = newsItem.title;
                document.getElementById('newsCategory').value = newsItem.category;
                document.getElementById('newsContent').value = newsItem.fullContent;
                document.getElementById('editNewsId').value = newsItem.id;

                // Set image preview if exists (now directly from Cloudinary URL)
                if (newsItem.imageUrl) {
                    currentImagePreview.src = newsItem.imageUrl;
                    imagePreviewContainer.style.display = 'flex';
                } else {
                    imagePreviewContainer.style.display = 'none';
                    currentImagePreview.src = '';
                }
                document.getElementById('newsImage').value = ''; // Clear file input so new file can be selected

                publishBtn.innerHTML = '<i class="fas fa-upload"></i> Update News';
                document.querySelector('.admin-panel').scrollIntoView({ behavior: 'smooth' });
                hideLoading();
            } catch (error) {
                console.error('Error fetching news for edit:', error);
                displayError(`Failed to load news for edit: ${error.message}`);
            }
        } else {
            alert('You can only edit your own posts.');
        }
    }
    // --- Comment Actions (Edit/Delete) ---
    else if (target.classList.contains('fa-trash') && target.dataset.action === 'delete-comment') {
        const commentElement = target.closest('.comment-item');
        if (!commentElement) return;
        const commentIdToDelete = commentElement.dataset.commentId;
        const newsId = commentNewsIdInput.value; // News ID from the open modal

        showLoading('Deleting comment...');
        try {
            const currentNewsInModal = allNews.find(n => n.id === newsId);
            const commentToDelete = currentNewsInModal?.comments.find(c => c.id === commentIdToDelete);

            if (commentToDelete && commentToDelete.authorId === MY_POSTS_AUTHOR_ID) {
                const response = await fetch(`${BASE_API_URL}/news/${newsId}/comments/${commentIdToDelete}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Server error during comment deletion.');
                }

                displaySuccess('Comment deleted!');
                addNotification(`A comment on news ID ${newsId} was deleted.`, 'fas fa-trash-alt', newsId);
                await fetchNewsDetailAndComments(newsId); // Re-fetch and display comments
            } else {
                alert('You can only delete your own comments.');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            displayError(`Failed to delete comment: ${error.message}`);
        } finally {
            hideLoading();
        }
    } else if (target.classList.contains('fa-edit') && target.dataset.action === 'edit-comment') {
        const commentElement = target.closest('.comment-item');
        if (!commentElement) return;
        const commentIdToEdit = commentElement.dataset.commentId;
        const newsId = commentNewsIdInput.value;

        showLoading('Loading comment for edit...');
        try {
            const currentNewsInModal = allNews.find(n => n.id === newsId);
            const commentToEdit = currentNewsInModal?.comments.find(c => c.id === commentIdToEdit);

            if (commentToEdit && commentToEdit.authorId === MY_POSTS_AUTHOR_ID) {
                commentTextInput.value = commentToEdit.text;
                editCommentIdInput.value = commentToEdit.id;
                postCommentBtn.innerHTML = '<i class="fas fa-save"></i> Update Comment';
                commentTextInput.focus();
                hideLoading();
            } else {
                hideLoading();
                alert('You can only edit your own comments.');
            }
        } catch (error) {
            console.error('Error editing comment:', error);
            displayError(`Failed to load comment for edit: ${error.message}`);
        }
    }
    // --- Handle click on notification item to show full content in modal ---
    else if (target.closest('.notification-item')) {
        const notificationItemElement = target.closest('.notification-item');
        const newsId = notificationItemElement.dataset.newsId;
        if (newsId) {
            fetchNewsDetailAndComments(newsId);
            notificationDropdown.classList.remove('active');
        }
    }
    // --- Handle click on news card to show full content in modal ---
    else if (target.closest('.news-card') || target.closest('.main-feature') || target.closest('.side-feature')) {
        const newsCard = target.closest('.news-card') || target.closest('.main-feature') || target.closest('.side-feature');
        // Prevent opening modal if edit/delete icon was clicked inside the card
        if (target.classList.contains('fa-edit') || target.classList.contains('fa-trash')) {
            return;
        }
        const newsId = newsCard.dataset.id;
        fetchNewsDetailAndComments(newsId); // Fetch and display detail and comments
    }
});

// Close modal event listener
closeModalButton.addEventListener('click', () => {
    newsDetailModal.classList.remove('visible');
    document.body.style.overflow = '';
});

// Close modal if clicked outside content (on backdrop)
newsDetailModal.addEventListener('click', (e) => {
    if (e.target === newsDetailModal) {
        newsDetailModal.classList.remove('visible');
        document.body.style.overflow = '';
    }
});

// Newsletter subscription form functionality (Client-side only)
document.getElementById('newsletterForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const emailInput = document.getElementById('newsletterEmail');
    const email = emailInput.value;
    if (email && email.includes('@') && email.includes('.')) {
        alert(`Thank you for subscribing, ${email}! You'll receive our daily updates.`);
        emailInput.value = '';
    } else {
        alert('Please enter a valid email address.');
    }
});

// Scroll to top button
window.addEventListener('scroll', () => {
    if (window.pageYOffset > 300) {
        scrollToTopBtn.classList.add('visible');
    } else {
        scrollToTopBtn.classList.remove('visible');
    }
});

scrollToTopBtn.addEventListener('click', () => {
    smoothScrollTo(0);
});

// Enhanced smooth scrolling for internal anchor links (excluding category links)
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (this.classList.contains('nav-link-category') || this.classList.contains('footer-link-category')) {
            return;
        }
        if (href !== '#' && href !== '#!' && href !== 'javascript:void(0)') {
            e.preventDefault();
            const targetElement = document.querySelector(href);
            if (targetElement) {
                const headerHeight = document.querySelector('header').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;
                smoothScrollTo(targetPosition);
            }
        }
    });
});

function smoothScrollTo(targetPosition) {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 800;
    let startTime = null;

    function animation(currentTime) {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;
        const run = easeInOutQuad(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, run);
        if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    function easeInOutQuad(t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t + b;
        t--;
        return -c / 2 * (t * (t - 2) - 1) + b;
    }
    requestAnimationFrame(animation);
}

// --- User Profile Logic (Client-side localStorage) ---
profileIcon.addEventListener('click', () => {
    profileNameInput.value = userProfile.name;
    profileAvatarPreview.src = userProfile.avatar;
    profileModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
});

closeProfileModalBtn.addEventListener('click', () => {
    profileModal.classList.remove('visible');
    document.body.style.overflow = '';
});

profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        profileModal.classList.remove('visible');
        document.body.style.overflow = '';
    }
});

profileAvatarUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            profileAvatarPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        // If file input is cleared, revert to current avatar or a default placeholder
        profileAvatarPreview.src = userProfile.avatar || 'https://placehold.co/100x100?text=User';
    }
});

profileForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const newName = profileNameInput.value.trim();
    const newAvatar = profileAvatarPreview.src;

    if (newName) {
        userProfile.name = newName;
        userProfile.avatar = newAvatar;
        saveUserProfile();
        addNotification('Your profile has been updated!', 'fas fa-user');
        alert('Profile saved successfully!');
        profileModal.classList.remove('visible');
        document.body.style.overflow = '';
    } else {
        alert('Please enter your name.');
    }
});

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    document.body.style.opacity = 1;
    loadUserProfile();
    // Load notifications from localStorage (still client-side for this example)
    try {
        const storedNotifications = localStorage.getItem('globalNewsNotifications');
        if (storedNotifications) {
            notifications = JSON.parse(storedNotifications);
        }
    } catch (e) {
        console.error("Error loading notifications from localStorage:", e);
        notifications = [];
    }
    updateNotificationDisplay();
    await fetchNews('all'); // Initial fetch of all news from backend
});
