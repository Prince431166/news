// --- CONFIGURATION AND CONSTANTS ---
const BASE_API_URL = 'https://flashnews-7l5y.onrender.com/api'; // <--- सुनिश्चित करें कि यह आपका सही Render URL है

// Removed MY_POSTS_AUTHOR_ID as it will now come from authenticated user
const USER_PROFILE_KEY = 'globalNewsUserProfile'; // LocalStorage for user profile (client-specific)
const JWT_TOKEN_KEY = 'globalNewsJwtToken'; // LocalStorage for JWT token

// Initial default news data (No longer used directly by frontend for news)
const DEFAULT_NEWS_DATA = []; // Clear this as it's not used by script.js anymore

// --- GLOBAL STATE (will be fetched from backend) ---
let allNews = [];
let notifications = [];
let userProfile = {
    id: null, // User ID from backend
    username: 'guest',
    name: 'Guest User',
    avatar: 'https://placehold.co/100x100?text=User'
};
let authToken = null; // Store JWT token

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

// --- NEW AUTHENTICATION DOM Elements ---
const authButtons = document.getElementById('authButtons');
const loginButton = document.getElementById('loginButton');
const registerButton = document.getElementById('registerButton');
const logoutButton = document.getElementById('logoutButton');
const adminPanelLink = document.getElementById('adminPanelLink');

const authModal = document.getElementById('authModal');
const closeAuthModalBtn = authModal.querySelector('.close-button') : null;
const authForm = document.getElementById('authForm');
const authUsernameInput = document.getElementById('authUsername');
const authPasswordInput = document.getElementById('authPassword');
const authNameContainer = document.getElementById('authNameContainer');
const authNameInput = document.getElementById('authName');
const authAvatarContainer = document.getElementById('authAvatarContainer');
const authAvatarUpload = document.getElementById('authAvatarUpload');
const authAvatarPreview = document.getElementById('authAvatarPreview');
const authSubmitBtn = document.getElementById('authSubmitBtn');
const authToggleLink = document.getElementById('authToggleLink');
const authModeTitle = document.getElementById('authModeTitle');

let authMode = 'login'; // 'login' or 'register'

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
        return dateString;
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

// --- JWT and User Profile Management ---
function saveAuthToken(token) {
    localStorage.setItem(JWT_TOKEN_KEY, token);
    authToken = token;
}

function getAuthToken() {
    if (!authToken) {
        authToken = localStorage.getItem(JWT_TOKEN_KEY);
    }
    return authToken;
}

function clearAuthToken() {
    localStorage.removeItem(JWT_TOKEN_KEY);
    authToken = null;
}

function saveUserProfile() {
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
}

function loadUserProfile() {
    const storedProfile = localStorage.getItem(USER_PROFILE_KEY);
    if (storedProfile) {
        userProfile = JSON.parse(storedProfile);
    } else {
        // Reset to default guest profile if no user profile is found
        userProfile = {
            id: null,
            username: 'guest',
            name: 'Guest User',
            avatar: 'https://placehold.co/100x100?text=User'
        };
    }
}

async function fetchAndSetUserProfile() {
    const token = getAuthToken();
    if (!token) {
        userProfile = {
            id: null,
            username: 'guest',
            name: 'Guest User',
            avatar: 'https://placehold.co/100x100?text=User'
        };
        updateAuthUI();
        saveUserProfile();
        return;
    }

    try {
        const response = await fetch(`${BASE_API_URL}/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            userProfile = {
                id: data.id,
                username: data.username,
                name: data.name,
                avatar: data.avatar
            };
            saveUserProfile();
        } else if (response.status === 401 || response.status === 403) {
            // Token expired or invalid
            clearAuthToken();
            userProfile = {
                id: null,
                username: 'guest',
                name: 'Guest User',
                avatar: 'https://placehold.co/100x100?text=User'
            };
            saveUserProfile();
            displayError('Your session has expired. Please log in again.');
        } else {
            throw new Error(`Failed to fetch profile: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Error fetching user profile:', error);
        displayError('Failed to load user profile. Please check your connection or try again later.');
        // Even if fetch fails, revert to guest user state
        userProfile = {
            id: null,
            username: 'guest',
            name: 'Guest User',
            avatar: 'https://placehold.co/100x100?text=User'
        };
        saveUserProfile();
    } finally {
        updateAuthUI();
    }
}

function updateAuthUI() {
    if (userProfile.id) { // User is logged in
        authButtons.classList.add('hidden');
        logoutButton.classList.remove('hidden');
        profileIcon.classList.remove('hidden');
        adminPanelLink.classList.remove('hidden');
    } else { // User is a guest
        authButtons.classList.remove('hidden');
        logoutButton.classList.add('hidden');
        profileIcon.classList.add('hidden');
        adminPanelLink.classList.add('hidden');
    }
}

// --- AUTH MODAL LOGIC ---
loginButton.addEventListener('click', () => {
    authMode = 'login';
    authModeTitle.textContent = 'Login';
    authSubmitBtn.textContent = 'Login';
    authToggleLink.innerHTML = 'Don\'t have an account? <a href="#">Register</a>';
    authNameContainer.classList.add('hidden');
    authAvatarContainer.classList.add('hidden');
    authForm.reset();
    authModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
});

registerButton.addEventListener('click', () => {
    authMode = 'register';
    authModeTitle.textContent = 'Register';
    authSubmitBtn.textContent = 'Register';
    authToggleLink.innerHTML = 'Already have an account? <a href="#">Login</a>';
    authNameContainer.classList.remove('hidden');
    authAvatarContainer.classList.remove('hidden');
    authForm.reset();
    authAvatarPreview.src = 'https://placehold.co/100x100?text=User'; // Default for register
    authModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
});

authToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    if (authMode === 'login') {
        registerButton.click(); // Simulate click on register button
    } else {
        loginButton.click(); // Simulate click on login button
    }
});

closeAuthModalBtn.addEventListener('click', () => {
    authModal.classList.remove('visible');
    document.body.style.overflow = 'auto';
});

authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.classList.remove('visible');
        document.body.style.overflow = 'auto';
    }
});

authAvatarUpload.addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            authAvatarPreview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    } else {
        authAvatarPreview.src = 'https://placehold.co/100x100?text=User';
    }
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading('Processing...');

    const username = authUsernameInput.value.trim();
    const password = authPasswordInput.value.trim();
    const name = authNameInput.value.trim();

    if (!username || !password) {
        displayError('Username and password cannot be empty.');
        hideLoading();
        return;
    }

    let avatarUrl = authAvatarPreview.src; // Default to current preview image

    try {
        if (authAvatarUpload.files[0]) {
            // Upload avatar to Cloudinary if a new file is selected
            const avatarFile = authAvatarUpload.files[0];
            const signatureResponse = await fetch(`${BASE_API_URL}/cloudinary-signature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: 'flashnews_avatars' })
            });

            if (!signatureResponse.ok) {
                const errorData = await signatureResponse.json();
                throw new Error(errorData.message || 'Failed to get Cloudinary signature for avatar.');
            }
            const signatureData = await signatureResponse.json();
            const { signature, timestamp, api_key, cloud_name, folder } = signatureData;

            const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;
            const cloudinaryFormData = new FormData();
            cloudinaryFormData.append('file', avatarFile);
            cloudinaryFormData.append('api_key', api_key);
            cloudinaryFormData.append('timestamp', timestamp);
            cloudinaryFormData.append('signature', signature);
            cloudinaryFormData.append('folder', folder);

            const cloudinaryResponse = await fetch(cloudinaryUploadUrl, {
                method: 'POST',
                body: cloudinaryFormData
            });

            if (!cloudinaryResponse.ok) {
                const errorData = await cloudinaryResponse.json();
                throw new Error(errorData.error.message || 'Failed to upload avatar to Cloudinary.');
            }
            const cloudinaryResult = await cloudinaryResponse.json();
            avatarUrl = cloudinaryResult.secure_url;
        }

        let endpoint = '';
        let body = {};

        if (authMode === 'login') {
            endpoint = '/login';
            body = { username, password };
        } else { // register
            endpoint = '/register';
            body = { username, password, name: name || username, avatar: avatarUrl };
        }

        const response = await fetch(`${BASE_API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to ${authMode}.`);
        }

        const result = await response.json();
        if (authMode === 'login') {
            saveAuthToken(result.token);
            userProfile = {
                id: result.user.id,
                username: result.user.username,
                name: result.user.name,
                avatar: result.user.avatar
            };
            saveUserProfile();
            displaySuccess('Logged in successfully!');
            addNotification(`Welcome, ${userProfile.name}!`, 'fas fa-user-circle');
            authModal.classList.remove('visible');
            document.body.style.overflow = 'auto';
            await fetchNews(currentActiveCategory, searchInput.value); // Re-fetch news
        } else { // register
            displaySuccess('Registration successful! Please log in.');
            authMode = 'login'; // Switch to login mode after successful registration
            authUsernameInput.value = username; // Pre-fill username
            authPasswordInput.value = ''; // Clear password
            loginButton.click(); // Open login modal
        }
    } catch (error) {
        console.error(`Auth error during ${authMode}:`, error);
        displayError(error.message);
    } finally {
        hideLoading();
    }
});

logoutButton.addEventListener('click', () => {
    if (confirm('Are you sure you want to log out?')) {
        clearAuthToken();
        userProfile = {
            id: null,
            username: 'guest',
            name: 'Guest User',
            avatar: 'https://placehold.co/100x100?text=User'
        };
        saveUserProfile();
        updateAuthUI();
        displaySuccess('Logged out successfully!');
        addNotification('You have been logged out.', 'fas fa-sign-out-alt');
        // Re-fetch news to reflect public view (e.g., cannot edit own posts anymore)
        fetchNews(currentActiveCategory, searchInput.value);
    }
});

// --- THEME TOGGLE ---
const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
const currentTheme = localStorage.getItem('theme');

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
    if (notifications.length > 10) {
        notifications = notifications.slice(0, 10);
    }
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
        if (category === 'my-posts' && userProfile.id) { // Fetch "my posts" only if logged in
            params.append('authorId', userProfile.id);
        }
        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch news from ${url}. Server responded with status: ${response.status}.`);
        }
        const data = await response.json();
        allNews = data;
        renderNewsCards(category, searchTerm);
        hideLoading();
    } catch (error) {
        console.error('Error fetching news:', error);
        displayError(`Failed to load news: ${error.message}`);
    }
}

function renderNewsCards(filterCategory = 'all', searchTerm = '') {
    featuredSection.innerHTML = '';
    latestNewsSection.innerHTML = '';

    const sortedNewsData = [...allNews].sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));

    const featuredNewsItems = sortedNewsData.filter(news => news.isFeatured);
    const latestNewsItems = sortedNewsData.filter(news => !news.isFeatured);

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
    const matchesCategory = filterCategory === 'all' || news.category === filterCategory || (filterCategory === 'my-posts' && news.authorId === userProfile.id);
    const matchesSearch = searchTerm === '' || news.title.toLowerCase().includes(searchTerm.toLowerCase()) || news.fullContent.toLowerCase().includes(searchTerm.toLowerCase()) || news.category.toLowerCase().includes(searchTerm.toLowerCase()) || news.author.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
}

const getImageUrl = (url) => {
    return url || 'https://placehold.co/600x400?text=No+Image';
};

function createNewsElement(newsItem, type) {
    const element = document.createElement('a');
    element.href = 'javascript:void(0)';
    element.className = type;
    element.setAttribute('data-id', newsItem.id);
    element.setAttribute('data-category', newsItem.category);
    element.setAttribute('data-author-id', newsItem.authorId);

    const safeFullContent = newsItem.fullContent || '';
    const firstParagraph = safeFullContent.split('\n')[0];
    const truncatedContent = firstParagraph.substring(0, 80) + (firstParagraph.length > 80 ? '...' : '');

    let actionsHTML = '';
    // Check if the news item's authorId matches the logged-in user's ID
    if (newsItem.authorId === userProfile.id) {
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
let currentActiveCategory = 'all';

function filterNewsByCategory(category) {
    navCategoryLinks.forEach(navLink => navLink.classList.remove('active'));
    const currentActiveNavLink = document.querySelector(`.nav-link-category[data-category="${category}"]`);
    if (currentActiveNavLink) {
        currentActiveNavLink.classList.add('active');
    } else {
        document.querySelector('.nav-link-category[data-category="all"]').classList.add('active');
    }
    currentActiveCategory = category;
    fetchNews(category);
    searchInput.value = '';
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
    currentActiveCategory = 'all';
    fetchNews('all', query);
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
    if (!userProfile.id) {
        displayError('You must be logged in to publish or edit news.');
        return;
    }
    showLoading('Processing news...');

    const title = document.getElementById('newsTitle').value.trim();
    const category = document.getElementById('newsCategory').value;
    const newsImageFile = document.getElementById('newsImage').files[0];
    const content = document.getElementById('newsContent').value.trim();
    const editingId = editNewsIdInput.value;

    if (!content) {
        displayError('News content cannot be empty.');
        hideLoading();
        return;
    }

    let finalImageUrl = '';

    try {
        if (newsImageFile) {
            const signatureResponse = await fetch(`${BASE_API_URL}/cloudinary-signature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: 'flashnews_uploads' })
            });

            if (!signatureResponse.ok) {
                const errorData = await signatureResponse.json();
                throw new Error(errorData.message || 'Failed to get Cloudinary signature.');
            }
            const signatureData = await signatureResponse.json();
            const { signature, timestamp, api_key, cloud_name, folder } = signatureData;

            const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;
            const cloudinaryFormData = new FormData();
            cloudinaryFormData.append('file', newsImageFile);
            cloudinaryFormData.append('api_key', api_key);
            cloudinaryFormData.append('timestamp', timestamp);
            cloudinaryFormData.append('signature', signature);
            cloudinaryFormData.append('folder', folder);

            const cloudinaryResponse = await fetch(cloudinaryUploadUrl, {
                method: 'POST',
                body: cloudinaryFormData
            });

            if (!cloudinaryResponse.ok) {
                const errorData = await cloudinaryResponse.json();
                throw new Error(errorData.error.message || 'Failed to upload image to Cloudinary.');
            }
            const cloudinaryResult = await cloudinaryResponse.json();
            finalImageUrl = cloudinaryResult.secure_url;

        } else if (editingId) {
            const existingNews = allNews.find(item => item.id === editingId);
            if (existingNews) {
                if (currentImagePreview.src.includes('placehold.co') && currentImagePreview.src.includes('No+Image')) {
                    finalImageUrl = 'https://placehold.co/600x400?text=No+Image';
                } else if (existingNews.imageUrl) {
                    finalImageUrl = existingNews.imageUrl;
                }
            }
        } else {
            finalImageUrl = 'https://placehold.co/600x400?text=No+Image';
        }

        const newsDataToBackend = {
            title: title,
            category: category,
            fullContent: content,
            imageUrl: finalImageUrl,
            // author, authorImage, authorId are now set by backend from JWT
        };

        const targetUrl = editingId ? `${BASE_API_URL}/news/${editingId}` : `${BASE_API_URL}/news`;
        const method = editingId ? 'PUT' : 'POST';

        const response = await fetch(targetUrl, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}` // Include JWT
            },
            body: JSON.stringify(newsDataToBackend)
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = 'Server error during news submission.';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.message || errorMessage;
            } catch (jsonParseError) {
                errorMessage = `Server error: ${errorText.substring(0, 200)}... (Status: ${response.status})`;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        displaySuccess(editingId ? 'News updated successfully!' : 'News published successfully!');
        addNotification(
            editingId ? `"${title}" was updated by ${userProfile.name}.` : `New article "${title}" published by ${userProfile.name}!`,
            editingId ? 'fas fa-pen' : 'fas fa-newspaper',
            result.id
        );

        newsForm.reset();
        editNewsIdInput.value = '';
        publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish News';
        imagePreviewContainer.style.display = 'none';
        currentImagePreview.src = '';
        document.getElementById('newsImage').value = '';

        await fetchNews(currentActiveCategory, searchInput.value);
        document.querySelector('.admin-panel').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Caught error during news submission:', error);
        displayError(`Failed to submit news: ${error.message}`);
    } finally {
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
        imagePreviewContainer.style.display = 'none';
        currentImagePreview.src = '';
    }
});

clearImageSelection.addEventListener('click', () => {
    document.getElementById('newsImage').value = '';
    imagePreviewContainer.style.display = 'none';
    currentImagePreview.src = 'https://placehold.co/600x400?text=No+Image';
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

        const getModalImageUrl = (url) => {
            return url || 'https://placehold.co/600x400?text=No+Image';
        };

        modalNewsImage.src = getModalImageUrl(newsItem.imageUrl);
        modalNewsImage.alt = newsItem.title;
        modalCategoryTag.textContent = newsItem.category;
        modalNewsTitle.textContent = newsItem.title;
        modalAuthorImage.src = newsItem.authorImage || 'https://placehold.co/40x40?text=A';
        modalAuthorName.textContent = newsItem.author;
        modalPublishDate.textContent = formatDisplayDate(newsItem.publishDate);
        modalNewsContent.textContent = newsItem.fullContent;
        modalAuthorBio.textContent = `Read more articles by ${newsItem.author}.`;

        commentNewsIdInput.value = newsId;
        editCommentIdInput.value = '';
        commentTextInput.value = '';
        postCommentBtn.innerHTML = '<i class="fas fa-comment-dots"></i> Post Comment';
        displayComments(newsItem);
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
        newsItem.comments.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        newsItem.comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.className = 'comment-item';
            commentElement.setAttribute('data-comment-id', comment.id);
            let actionsHTML = '';
            // Check if comment belongs to the current logged-in user
            if (userProfile.id && comment.authorId === userProfile.id) {
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
    if (!userProfile.id) {
        displayError('You must be logged in to post comments.');
        return;
    }
    showLoading('Posting comment...');
    const newsId = commentNewsIdInput.value;
    const editCommentId = editCommentIdInput.value;
    const commentText = commentTextInput.value.trim();

    if (!commentText) {
        displayError('Please enter your comment.');
        hideLoading();
        return;
    }

    const commentData = {
        text: commentText
        // author, authorId, avatar are now set by backend from JWT
    };

    try {
        let response;
        if (editCommentId) {
            response = await fetch(`${BASE_API_URL}/news/${newsId}/comments/${editCommentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}` // Include JWT
                },
                body: JSON.stringify(commentData)
            });
        } else {
            response = await fetch(`${BASE_API_URL}/news/${newsId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}` // Include JWT
                },
                body: JSON.stringify(commentData)
            });
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Server error during comment submission.');
        }

        displaySuccess(editCommentId ? 'Comment updated!' : 'Comment posted!');
        addNotification(
            editCommentId ? `Your comment on news ID ${newsId} was updated.` : `New comment on news ID ${newsId} by ${userProfile.name}.`,
            editCommentId ? 'fas fa-pen' : 'fas fa-comment',
            newsId
        );

        await fetchNewsDetailAndComments(newsId);

        commentForm.reset();
        editCommentIdInput.value = '';
        commentTextInput.value = '';
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
        const newsItemAuthorId = newsCardElement.dataset.authorId;

        if (!userProfile.id || newsItemAuthorId !== userProfile.id) {
            alert('You can only delete your own posts.');
            return;
        }

        if (confirm('Are you sure you want to delete this news item?')) {
            showLoading('Deleting news...');
            try {
                const response = await fetch(`${BASE_API_URL}/news/${newsIdToDelete}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}` // Include JWT
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Server error during deletion.');
                }

                displaySuccess('News item deleted!');
                addNotification(`News item ${newsIdToDelete} was deleted.`, 'fas fa-trash-alt');
                await fetchNews(currentActiveCategory, searchInput.value);
            } catch (error) {
                console.error('Error deleting news:', error);
                displayError(`Failed to delete news: ${error.message}`);
            } finally {
                hideLoading();
            }
        }
    } else if (target.classList.contains('fa-edit') && target.dataset.action === 'edit') {
        const newsCardElement = target.closest('.news-card,.main-feature,.side-feature');
        if (!newsCardElement) return;
        const newsIdToEdit = newsCardElement.dataset.id;
        const newsItemAuthorId = newsCardElement.dataset.authorId;

        if (!userProfile.id || newsItemAuthorId !== userProfile.id) {
            alert('You can only edit your own posts.');
            return;
        }

        showLoading('Loading news for edit...');
        try {
            // No need for Authorization header for GET /api/news/:id as it's public
            const response = await fetch(`${BASE_API_URL}/news/${newsIdToEdit}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch news for edit. Status: ${response.status}`);
            }
            const newsItem = await response.json();

            document.getElementById('newsTitle').value = newsItem.title;
            document.getElementById('newsCategory').value = newsItem.category;
            document.getElementById('newsContent').value = newsItem.fullContent;
            document.getElementById('editNewsId').value = newsItem.id;

            if (newsItem.imageUrl) {
                currentImagePreview.src = newsItem.imageUrl;
                imagePreviewContainer.style.display = 'flex';
            } else {
                imagePreviewContainer.style.display = 'none';
                currentImagePreview.src = '';
            }
            document.getElementById('newsImage').value = '';

            publishBtn.innerHTML = '<i class="fas fa-upload"></i> Update News';
            document.querySelector('.admin-panel').scrollIntoView({ behavior: 'smooth' });
            hideLoading();
        } catch (error) {
            console.error('Error fetching news for edit:', error);
            displayError(`Failed to load news for edit: ${error.message}`);
        }
    }
    // --- Comment Actions (Edit/Delete) ---
    else if (target.classList.contains('fa-trash') && target.dataset.action === 'delete-comment') {
        const commentElement = target.closest('.comment-item');
        if (!commentElement) return;
        const commentIdToDelete = commentElement.dataset.commentId;
        const newsId = commentNewsIdInput.value;

        if (!userProfile.id) {
            alert('You must be logged in to delete comments.');
            return;
        }

        showLoading('Deleting comment...');
        try {
            // Fetch the news item to check the comment's authorId
            const newsResponse = await fetch(`${BASE_API_URL}/news/${newsId}`);
            if (!newsResponse.ok) throw new Error('Failed to fetch news to verify comment ownership.');
            const newsData = await newsResponse.json();
            const commentToDelete = newsData.comments.find(c => c.id === commentIdToDelete);

            if (!commentToDelete || commentToDelete.authorId !== userProfile.id) {
                alert('You can only delete your own comments.');
                hideLoading();
                return;
            }

            const response = await fetch(`${BASE_API_URL}/news/${newsId}/comments/${commentIdToDelete}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}` // Include JWT
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Server error during comment deletion.');
            }

            displaySuccess('Comment deleted!');
            addNotification(`A comment on news ID ${newsId} was deleted.`, 'fas fa-trash-alt', newsId);
            await fetchNewsDetailAndComments(newsId);
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

        if (!userProfile.id) {
            alert('You must be logged in to edit comments.');
            return;
        }

        showLoading('Loading comment for edit...');
        try {
            const newsResponse = await fetch(`${BASE_API_URL}/news/${newsId}`);
            if (!newsResponse.ok) throw new Error('Failed to fetch news to verify comment ownership.');
            const newsData = await newsResponse.json();
            const commentToEdit = newsData.comments.find(c => c.id === commentIdToEdit);

            if (!commentToEdit || commentToEdit.authorId !== userProfile.id) {
                alert('You can only edit your own comments.');
                hideLoading();
                return;
            }

            commentTextInput.value = commentToEdit.text;
            editCommentIdInput.value = commentToEdit.id;
            postCommentBtn.innerHTML = '<i class="fas fa-save"></i> Update Comment';
            commentTextInput.focus();
            hideLoading();
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
        if (target.classList.contains('fa-edit') || target.classList.contains('fa-trash')) {
            return;
        }
        const newsId = newsCard.dataset.id;
        fetchNewsDetailAndComments(newsId);
    }
});

// Close modal event listener
closeModalButton.addEventListener('click', () => {
    newsDetailModal.classList.remove('visible');
    document.body.style.overflow = 'auto';
});

newsDetailModal.addEventListener('click', (e) => {
    if (e.target === newsDetailModal) {
        newsDetailModal.classList.remove('visible');
        document.body.style.overflow = 'auto';
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
profileIcon.addEventListener('click', async () => {
    // Re-fetch profile to ensure it's up-to-date with backend (e.g., if avatar changed by another session)
    await fetchAndSetUserProfile();
    profileNameInput.value = userProfile.name;
    profileAvatarPreview.src = userProfile.avatar;
    profileModal.classList.add('visible');
    document.body.style.overflow = 'hidden';
});

closeProfileModalBtn.addEventListener('click', () => {
    profileModal.classList.remove('visible');
    document.body.style.overflow = 'auto';
});

profileModal.addEventListener('click', (e) => {
    if (e.target === profileModal) {
        profileModal.classList.remove('visible');
        document.body.style.overflow = 'auto';
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
        profileAvatarPreview.src = userProfile.avatar || 'https://placehold.co/100x100?text=User';
    }
});

profileForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!userProfile.id) {
        displayError('You must be logged in to update your profile.');
        return;
    }
    showLoading('Updating profile...');
    const newName = profileNameInput.value.trim();
    let newAvatarUrl = profileAvatarPreview.src; // Default to current preview

    if (!newName) {
        displayError('Please enter your name.');
        hideLoading();
        return;
    }

    try {
        if (profileAvatarUpload.files[0]) {
            // Upload new avatar to Cloudinary if a file is selected
            const avatarFile = profileAvatarUpload.files[0];
            const signatureResponse = await fetch(`${BASE_API_URL}/cloudinary-signature`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder: 'flashnews_avatars' })
            });

            if (!signatureResponse.ok) {
                const errorData = await signatureResponse.json();
                throw new Error(errorData.message || 'Failed to get Cloudinary signature for avatar.');
            }
            const signatureData = await signatureResponse.json();
            const { signature, timestamp, api_key, cloud_name, folder } = signatureData;

            const cloudinaryUploadUrl = `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`;
            const cloudinaryFormData = new FormData();
            cloudinaryFormData.append('file', avatarFile);
            cloudinaryFormData.append('api_key', api_key);
            cloudinaryFormData.append('timestamp', timestamp);
            cloudinaryFormData.append('signature', signature);
            cloudinaryFormData.append('folder', folder);

            const cloudinaryResponse = await fetch(cloudinaryUploadUrl, {
                method: 'POST',
                body: cloudinaryFormData
            });

            if (!cloudinaryResponse.ok) {
                const errorData = await cloudinaryResponse.json();
                throw new Error(errorData.error.message || 'Failed to upload new avatar to Cloudinary.');
            }
            const cloudinaryResult = await cloudinaryResponse.json();
            newAvatarUrl = cloudinaryResult.secure_url;
        }

        const response = await fetch(`${BASE_API_URL}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}` // Include JWT
            },
            body: JSON.stringify({ name: newName, avatar: newAvatarUrl })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to update profile.');
        }

        const result = await response.json();
        userProfile.name = result.user.name;
        userProfile.avatar = result.user.avatar;
        saveUserProfile();
        displaySuccess('Profile saved successfully!');
        addNotification('Your profile has been updated!', 'fas fa-user');
        profileModal.classList.remove('visible');
        document.body.style.overflow = 'auto';

    } catch (error) {
        console.error('Error updating profile:', error);
        displayError(`Failed to update profile: ${error.message}`);
    } finally {
        hideLoading();
    }
});

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    document.body.style.opacity = 1;
    loadUserProfile(); // Load user profile from local storage
    getAuthToken(); // Load auth token if present
    await fetchAndSetUserProfile(); // Verify token and fetch latest user profile from backend

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


