#!/bin/bash

# Create .env dynamically
echo "Creating .env file..."
cat << EOF > /var/www/html/.env
APP_NAME="${APP_NAME:-Laravel}"
APP_ENV="${APP_ENV:-production}"
APP_KEY="${APP_KEY}"
APP_DEBUG="${APP_DEBUG:-false}"
APP_URL="${APP_URL}"
LOG_CHANNEL=stderr
DB_CONNECTION=pgsql
DATABASE_URL="${DATABASE_URL}"
EOF

# Run migrations
echo "Running migrations..."
php artisan migrate --force || true

# Cache configurations
echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start Apache
echo "Starting Apache..."
exec apache2-foreground
