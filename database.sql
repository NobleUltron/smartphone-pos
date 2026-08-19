-- STEP 1: SQL Schema File (database.sql)
-- Create Database
CREATE DATABASE IF NOT EXISTS `smartphone_pos`;
USE `smartphone_pos`;

-- 1. Users Table (For login and role management)
CREATE TABLE IF NOT EXISTS `users` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL UNIQUE,
    `email_verified_at` TIMESTAMP NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'manager', 'cashier') DEFAULT 'cashier',
    `remember_token` VARCHAR(100) NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS `categories` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 3. Products Table (Base device models)
CREATE TABLE IF NOT EXISTS `products` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `category_id` BIGINT UNSIGNED NOT NULL,
    `brand` VARCHAR(255) NOT NULL,
    `model_name` VARCHAR(255) NOT NULL,
    `storage_capacity` VARCHAR(50) NOT NULL,
    `color` VARCHAR(50) NOT NULL,
    `base_price` DECIMAL(10, 2) NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE
);

-- 4. Device IMEIs Table (Tracking individual serialized items)
CREATE TABLE IF NOT EXISTS `device_imeis` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `product_id` BIGINT UNSIGNED NOT NULL,
    `imei` VARCHAR(15) NOT NULL UNIQUE,
    `condition` ENUM('Brand New', 'Refurbished', 'Used Grade A', 'Used Grade B') NOT NULL,
    `status` ENUM('In Stock', 'Sold', 'Reserved', 'Defective') DEFAULT 'In Stock',
    `cost_price` DECIMAL(10, 2) NOT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
);

-- 5. Customers Table
CREATE TABLE IF NOT EXISTS `customers` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(50) NOT NULL,
    `email` VARCHAR(255) NULL,
    `address` TEXT NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 6. Sales Table
CREATE TABLE IF NOT EXISTS `sales` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `customer_id` BIGINT UNSIGNED NULL,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `discount` DECIMAL(10, 2) DEFAULT 0.00,
    `final_amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('Cash', 'Bank Transfer', 'MTN MoMo', 'Airtel Money', 'Layaway') NOT NULL,
    `payment_status` ENUM('Paid', 'Partial', 'Unpaid') NOT NULL,
    `sale_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
    FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL
);

-- 7. Sale Items Table
CREATE TABLE IF NOT EXISTS `sale_items` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `sale_id` BIGINT UNSIGNED NOT NULL,
    `device_imei_id` BIGINT UNSIGNED NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `warranty_months` INT DEFAULT 12,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`device_imei_id`) REFERENCES `device_imeis`(`id`)
);

-- 8. Layaway Payments Table
CREATE TABLE IF NOT EXISTS `layaway_payments` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `sale_id` BIGINT UNSIGNED NOT NULL,
    `amount_paid` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('Cash', 'Bank Transfer', 'MTN MoMo', 'Airtel Money') NOT NULL,
    `payment_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (`sale_id`) REFERENCES `sales`(`id`) ON DELETE CASCADE
);

-- ==========================================
-- SEED DATA
-- ==========================================
INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
('Admin User', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'); -- password: password

INSERT INTO `categories` (`name`, `description`) VALUES
('Smartphones', 'Apple, Samsung, Tecno, Infinix devices'),
('Tablets', 'iPads and Android tablets'),
('Accessories', 'Chargers, cases, and earphones');

INSERT INTO `products` (`category_id`, `brand`, `model_name`, `storage_capacity`, `color`, `base_price`) VALUES
(1, 'Apple', 'iPhone 13', '128GB', 'Midnight', 2500000.00),
(1, 'Samsung', 'Galaxy S23', '256GB', 'Phantom Black', 3200000.00),
(1, 'Tecno', 'Camon 20', '256GB', 'Serenity Blue', 850000.00);

INSERT INTO `device_imeis` (`product_id`, `imei`, `condition`, `status`, `cost_price`) VALUES
(1, '351234567890123', 'Brand New', 'In Stock', 2200000.00),
(1, '351234567890124', 'Brand New', 'In Stock', 2200000.00),
(2, '352234567890125', 'Brand New', 'In Stock', 2800000.00),
(3, '353234567890126', 'Refurbished', 'In Stock', 750000.00);

INSERT INTO `customers` (`name`, `phone`, `email`, `address`) VALUES
('John Doe', '0771234567', 'john@example.com', 'Kampala Road'),
('Jane Smith', '0751234567', 'jane@example.com', 'Ntinda');
