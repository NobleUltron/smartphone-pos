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
MAIL_MAILER="${MAIL_MAILER:-smtp}"
MAIL_HOST="${MAIL_HOST}"
MAIL_PORT="${MAIL_PORT}"
MAIL_USERNAME="${MAIL_USERNAME}"
MAIL_PASSWORD="${MAIL_PASSWORD}"
MAIL_ENCRYPTION="${MAIL_ENCRYPTION:-tls}"
MAIL_FROM_ADDRESS="${MAIL_FROM_ADDRESS}"
MAIL_FROM_NAME="${MAIL_FROM_NAME:-\${APP_NAME}}"
FILESYSTEM_DISK="${FILESYSTEM_DISK:-local}"
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION}"
AWS_BUCKET="${AWS_BUCKET}"
AWS_ENDPOINT="${AWS_ENDPOINT}"
AWS_URL="${AWS_URL}"
AWS_USE_PATH_STYLE_ENDPOINT="${AWS_USE_PATH_STYLE_ENDPOINT}"
EOF

# Run migrations and seeder
echo "Running migrations..."
php artisan migrate --force

# Cache configurations
echo "Caching configuration..."
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Start Apache
echo "Starting Apache..."
exec apache2-foreground
