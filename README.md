# Smartphone POS Setup Instructions

These are the exact terminal commands to set up the system on localhost.

## Prerequisites
1. Ensure XAMPP is running (Start Apache & MySQL).
2. Ensure you have Node.js and PHP/Composer installed.

## Step 1: Project & Database Setup
```bash
# Since the project is already created by Gemini, open this directory in terminal:
cd C:\Users\Noble\.gemini\antigravity-ide\scratch\smartphone_pos

# Install Laravel Breeze with React
composer require laravel/breeze --dev
php artisan breeze:install react

# Install Guzzle/Http for Gemini AI Requests
composer require guzzlehttp/guzzle
```

## Step 2: Configure Environment
Open `.env` and set the database credentials:
```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=smartphone_pos
DB_USERNAME=root
DB_PASSWORD=

GEMINI_API_KEY=your_google_ai_api_key_here
```

## Step 3: Run SQL Schema
Import the provided `database.sql` into phpMyAdmin, or run:
```bash
mysql -u root -p smartphone_pos < database.sql
```

## Step 4: Run Application
Open two terminal tabs:

**Tab 1: Start Laravel Server**
```bash
php artisan serve
```

**Tab 2: Compile Frontend Assets**
```bash
npm install
npm install bootstrap
npm run dev
```

Visit `http://localhost:8000/dashboard` and login with `admin@example.com` / `password`.
