// DOM Elements
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerFormElement');
const switchToRegister = document.getElementById('switchToRegister');
const switchToLogin = document.getElementById('switchToLogin');
const registerFormContainer = document.getElementById('registerForm');
const authTitle = document.querySelector('.auth-form h2');

// User storage
let users = JSON.parse(localStorage.getItem('users')) || [];
const demoUser = {
    email: 'demo@electromanage.com',
    password: 'password123'
};

// Add demo user if not exists
if (!users.some(u => u.email === demoUser.email)) {
    users.push({
        name: 'Demo User',
        ...demoUser
    });
    localStorage.setItem('users', JSON.stringify(users));
}

// Switch to register form
switchToRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.parentElement.style.display = 'none';
    registerFormContainer.style.display = 'block';
    authTitle.textContent = 'Create Account';
});

// Switch to login form
switchToLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerFormContainer.style.display = 'none';
    loginForm.parentElement.style.display = 'block';
    authTitle.textContent = 'Login to Your Account';
});

// Login form submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const token = document.getElementById('githubToken').value;
    
    // Validate credentials
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Store current user session
        localStorage.setItem('currentUser', JSON.stringify({
            email: user.email,
            name: user.name
        }));
        
        // Store GitHub token if provided
        if (token) {
            localStorage.setItem('githubToken', token);
        }
        
        alert('Login successful! Redirecting to application...');
        window.location.href = "./html.html"; // Replace with your actual app URL
    } else {
        alert('Invalid email or password. Please try again.');
    }
});

// Register form submission
registerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerConfirmPassword').value;
    const token = document.getElementById('registerGithubToken').value;
    
    // Validate form
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    // Check if user already exists
    if (users.some(u => u.email === email)) {
        alert('User with this email already exists');
        return;
    }
    
    // Create new user
    const newUser = {
        name,
        email,
        password
    };
    
    // Add to users array
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Store current user session
    localStorage.setItem('currentUser', JSON.stringify({
        email: newUser.email,
        name: newUser.name
    }));
    
    // Store GitHub token if provided
    if (token) {
        localStorage.setItem('githubToken', token);
    }
    
    alert('Account created successfully! Redirecting to application...');
    window.location.href = "./html.html"; // Replace with your actual app URL
});
/*
// Pre-fill demo credentials on click
document.getElementById('loginEmail').addEventListener('focus', function() {
    if (this.value === '') {
        this.value = 'demo@electromanage.com';
    }
});

document.getElementById('loginPassword').addEventListener('focus', function() {
    if (this.value === '') {
        this.value = 'password123';
    }
});*/