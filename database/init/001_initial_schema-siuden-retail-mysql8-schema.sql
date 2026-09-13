-- ============================================================================
-- Siuden Retail - Initial relational schema
-- Target: MySQL 8.0+
-- Architecture: Account 1:N Tenant, multi-tenant data isolation
-- First tenant: Rubi Joyeria
--
-- The application (NestJS) generates UUID values and performs transactional
-- inventory updates. This script intentionally does not create database users,
-- passwords, triggers, or a database because shared hosting normally provides
-- those resources from its control panel.
--
-- Optional, when the database already exists:
-- USE siuden_retail;
-- ============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ============================================================================
-- 1. ACCOUNTS, IDENTITIES, ROLES AND PERMISSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts (
    id CHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    status ENUM('TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED') NOT NULL DEFAULT 'TRIAL',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_accounts_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(150) NOT NULL,
    status ENUM('PENDING', 'ACTIVE', 'BLOCKED', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    email_verified_at DATETIME(6) NULL,
    last_login_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    KEY idx_users_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
    id CHAR(36) NOT NULL,
    account_id CHAR(36) NOT NULL,
    code VARCHAR(60) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_account_code (account_id, code),
    UNIQUE KEY uq_roles_account_id (account_id, id),
    CONSTRAINT fk_roles_account
        FOREIGN KEY (account_id) REFERENCES accounts (id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
    id CHAR(36) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id CHAR(36) NOT NULL,
    permission_id CHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (role_id, permission_id),
    KEY idx_role_permissions_permission (permission_id),
    CONSTRAINT fk_role_permissions_role
        FOREIGN KEY (role_id) REFERENCES roles (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission
        FOREIGN KEY (permission_id) REFERENCES permissions (id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_members (
    id CHAR(36) NOT NULL,
    account_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    role_id CHAR(36) NOT NULL,
    status ENUM('INVITED', 'ACTIVE', 'BLOCKED') NOT NULL DEFAULT 'INVITED',
    joined_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_account_members_account_user (account_id, user_id),
    KEY idx_account_members_user (user_id),
    KEY idx_account_members_account_role (account_id, role_id),
    CONSTRAINT fk_account_members_account
        FOREIGN KEY (account_id) REFERENCES accounts (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_account_members_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_account_members_role_same_account
        FOREIGN KEY (account_id, role_id) REFERENCES roles (account_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 2. SAAS PLANS, FEATURES AND ACCOUNT BILLING
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
    id CHAR(36) NOT NULL,
    code VARCHAR(60) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500) NULL,
    billing_cycle ENUM('MONTHLY', 'YEARLY', 'CUSTOM') NOT NULL DEFAULT 'MONTHLY',
    price_amount DECIMAL(14, 2) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    max_tenants INT UNSIGNED NOT NULL DEFAULT 1,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_plans_code (code),
    CONSTRAINT chk_plans_price CHECK (price_amount IS NULL OR price_amount >= 0),
    CONSTRAINT chk_plans_max_tenants CHECK (max_tenants >= 1)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS features (
    id CHAR(36) NOT NULL,
    code VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(255) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_features_code (code)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS plan_features (
    plan_id CHAR(36) NOT NULL,
    feature_id CHAR(36) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    limit_value INT UNSIGNED NULL,
    PRIMARY KEY (plan_id, feature_id),
    KEY idx_plan_features_feature (feature_id),
    CONSTRAINT fk_plan_features_plan
        FOREIGN KEY (plan_id) REFERENCES plans (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_plan_features_feature
        FOREIGN KEY (feature_id) REFERENCES features (id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_subscriptions (
    id CHAR(36) NOT NULL,
    account_id CHAR(36) NOT NULL,
    plan_id CHAR(36) NOT NULL,
    status ENUM('TRIALING', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED') NOT NULL DEFAULT 'TRIALING',
    price_amount DECIMAL(14, 2) NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    starts_at DATETIME(6) NOT NULL,
    renews_at DATETIME(6) NULL,
    cancelled_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_account_subscriptions_account_status (account_id, status),
    KEY idx_account_subscriptions_plan (plan_id),
    CONSTRAINT fk_account_subscriptions_account
        FOREIGN KEY (account_id) REFERENCES accounts (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_account_subscriptions_plan
        FOREIGN KEY (plan_id) REFERENCES plans (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_account_subscriptions_price CHECK (price_amount IS NULL OR price_amount >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS account_billing_profiles (
    id CHAR(36) NOT NULL,
    account_id CHAR(36) NOT NULL,
    legal_name VARCHAR(200) NOT NULL,
    tax_id VARCHAR(30) NULL,
    tax_condition VARCHAR(80) NULL,
    billing_email VARCHAR(254) NULL,
    address_line VARCHAR(200) NULL,
    address_number VARCHAR(30) NULL,
    city VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'AR',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_account_billing_profiles_account (account_id),
    CONSTRAINT fk_account_billing_profiles_account
        FOREIGN KEY (account_id) REFERENCES accounts (id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_invoices (
    id CHAR(36) NOT NULL,
    account_subscription_id CHAR(36) NOT NULL,
    invoice_number VARCHAR(60) NOT NULL,
    period_start DATETIME(6) NOT NULL,
    period_end DATETIME(6) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    status ENUM('PENDING', 'PAID', 'VOID', 'OVERDUE') NOT NULL DEFAULT 'PENDING',
    due_at DATETIME(6) NULL,
    paid_at DATETIME(6) NULL,
    external_document_url VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_subscription_invoices_number (invoice_number),
    KEY idx_subscription_invoices_subscription (account_subscription_id),
    CONSTRAINT fk_subscription_invoices_subscription
        FOREIGN KEY (account_subscription_id) REFERENCES account_subscriptions (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_subscription_invoices_amount CHECK (amount >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscription_payments (
    id CHAR(36) NOT NULL,
    subscription_invoice_id CHAR(36) NOT NULL,
    provider VARCHAR(60) NULL,
    external_reference VARCHAR(150) NULL,
    amount DECIMAL(14, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    status ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    paid_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_subscription_payments_invoice (subscription_invoice_id),
    KEY idx_subscription_payments_external_ref (provider, external_reference),
    CONSTRAINT fk_subscription_payments_invoice
        FOREIGN KEY (subscription_invoice_id) REFERENCES subscription_invoices (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_subscription_payments_amount CHECK (amount > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 3. TENANTS AND STOREFRONT CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id CHAR(36) NOT NULL,
    account_id CHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    status ENUM('DRAFT', 'ACTIVE', 'SUSPENDED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    default_currency CHAR(3) NOT NULL DEFAULT 'ARS',
    time_zone VARCHAR(80) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_tenants_slug (slug),
    UNIQUE KEY uq_tenants_account_id (account_id, id),
    KEY idx_tenants_account_status (account_id, status),
    CONSTRAINT fk_tenants_account
        FOREIGN KEY (account_id) REFERENCES accounts (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
    tenant_id CHAR(36) NOT NULL,
    feature_id CHAR(36) NOT NULL,
    enabled BOOLEAN NOT NULL,
    limit_value INT UNSIGNED NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (tenant_id, feature_id),
    KEY idx_tenant_feature_overrides_feature (feature_id),
    CONSTRAINT fk_tenant_feature_overrides_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_tenant_feature_overrides_feature
        FOREIGN KEY (feature_id) REFERENCES features (id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_assets (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    storage_key VARCHAR(500) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    width INT UNSIGNED NULL,
    height INT UNSIGNED NULL,
    alt_text VARCHAR(255) NULL,
    checksum_sha256 CHAR(64) NULL,
    status ENUM('ACTIVE', 'DELETED') NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    deleted_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_media_assets_tenant_storage_key (tenant_id, storage_key),
    UNIQUE KEY uq_media_assets_tenant_id (tenant_id, id),
    CONSTRAINT fk_media_assets_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_profiles (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    brand_name VARCHAR(150) NOT NULL,
    contact_email VARCHAR(254) NULL,
    phone VARCHAR(40) NULL,
    address_line VARCHAR(200) NULL,
    address_number VARCHAR(30) NULL,
    city VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    postal_code VARCHAR(20) NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'AR',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_store_profiles_tenant (tenant_id),
    CONSTRAINT fk_store_profiles_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS storefront_settings (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    contact_form_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    show_prices BOOLEAN NOT NULL DEFAULT TRUE,
    allow_negative_stock BOOLEAN NOT NULL DEFAULT FALSE,
    default_catalog_sort ENUM('FEATURED', 'NEWEST', 'PRICE_ASC', 'PRICE_DESC', 'NAME_ASC') NOT NULL DEFAULT 'FEATURED',
    catalog_columns_desktop TINYINT UNSIGNED NOT NULL DEFAULT 4,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_storefront_settings_tenant (tenant_id),
    CONSTRAINT fk_storefront_settings_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT chk_storefront_catalog_columns CHECK (catalog_columns_desktop BETWEEN 1 AND 6)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_themes (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    logo_asset_id CHAR(36) NULL,
    favicon_asset_id CHAR(36) NULL,
    primary_color CHAR(7) NOT NULL DEFAULT '#111111',
    secondary_color CHAR(7) NOT NULL DEFAULT '#6B7280',
    background_color CHAR(7) NOT NULL DEFAULT '#FFFFFF',
    text_color CHAR(7) NOT NULL DEFAULT '#111111',
    heading_font VARCHAR(100) NOT NULL DEFAULT 'Merriweather',
    body_font VARCHAR(100) NOT NULL DEFAULT 'Lora',
    border_radius VARCHAR(30) NOT NULL DEFAULT 'NONE',
    announcement_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    announcement_text VARCHAR(255) NULL,
    announcement_url VARCHAR(500) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_store_themes_tenant (tenant_id),
    KEY idx_store_themes_logo (tenant_id, logo_asset_id),
    KEY idx_store_themes_favicon (tenant_id, favicon_asset_id),
    CONSTRAINT fk_store_themes_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_store_themes_logo_same_tenant
        FOREIGN KEY (tenant_id, logo_asset_id) REFERENCES media_assets (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_store_themes_favicon_same_tenant
        FOREIGN KEY (tenant_id, favicon_asset_id) REFERENCES media_assets (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_contact_channels (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    channel_type ENUM('WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'MESSENGER', 'EMAIL', 'OTHER') NOT NULL,
    value VARCHAR(255) NULL,
    url VARCHAR(500) NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_store_contact_channels_tenant_type (tenant_id, channel_type),
    CONSTRAINT fk_store_contact_channels_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS store_domains (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    hostname VARCHAR(253) NOT NULL,
    status ENUM('PENDING', 'VERIFIED', 'FAILED', 'DISABLED') NOT NULL DEFAULT 'PENDING',
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_store_domains_hostname (hostname),
    KEY idx_store_domains_tenant_status (tenant_id, status),
    CONSTRAINT fk_store_domains_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 4. CATALOG, CATEGORY TREE, OPTIONS, VARIANTS AND IMAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    parent_id CHAR(36) NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(180) NOT NULL,
    description TEXT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    deleted_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_tenant_slug (tenant_id, slug),
    UNIQUE KEY uq_categories_tenant_id (tenant_id, id),
    KEY idx_categories_parent (tenant_id, parent_id, sort_order),
    CONSTRAINT fk_categories_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_categories_parent_same_tenant
        FOREIGN KEY (tenant_id, parent_id) REFERENCES categories (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS category_external_mappings (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    category_id CHAR(36) NOT NULL,
    provider ENUM('GOOGLE_SHOPPING', 'META', 'OTHER') NOT NULL,
    external_category_id VARCHAR(150) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_category_external_mapping (tenant_id, category_id, provider),
    CONSTRAINT fk_category_external_mappings_category
        FOREIGN KEY (tenant_id, category_id) REFERENCES categories (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(220) NOT NULL,
    description LONGTEXT NULL,
    status ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    selling_mode ENUM('DIRECT', 'INQUIRY_ONLY') NOT NULL DEFAULT 'DIRECT',
    seo_title VARCHAR(255) NULL,
    seo_description VARCHAR(500) NULL,
    published_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    deleted_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_products_tenant_slug (tenant_id, slug),
    UNIQUE KEY uq_products_tenant_id (tenant_id, id),
    KEY idx_products_tenant_status (tenant_id, status, published_at),
    KEY idx_products_tenant_name (tenant_id, name),
    CONSTRAINT fk_products_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_categories (
    tenant_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    category_id CHAR(36) NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (product_id, category_id),
    KEY idx_product_categories_tenant_category (tenant_id, category_id, sort_order),
    KEY idx_product_categories_tenant_product (tenant_id, product_id),
    CONSTRAINT fk_product_categories_product
        FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_product_categories_category
        FOREIGN KEY (tenant_id, category_id) REFERENCES categories (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_options (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_options_product_name (tenant_id, product_id, name),
    UNIQUE KEY uq_product_options_tenant_id (tenant_id, id),
    CONSTRAINT fk_product_options_product
        FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_option_values (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    product_option_id CHAR(36) NOT NULL,
    value VARCHAR(100) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_option_values_option_value (tenant_id, product_option_id, value),
    UNIQUE KEY uq_product_option_values_tenant_id (tenant_id, id),
    CONSTRAINT fk_product_option_values_option
        FOREIGN KEY (tenant_id, product_option_id) REFERENCES product_options (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variants (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    name VARCHAR(180) NOT NULL DEFAULT 'Default',
    sku VARCHAR(100) NULL,
    barcode VARCHAR(100) NULL,
    price DECIMAL(14, 2) NULL,
    compare_at_price DECIMAL(14, 2) NULL,
    cost DECIMAL(14, 2) NULL,
    weight_kg DECIMAL(12, 3) NULL,
    height_cm DECIMAL(12, 2) NULL,
    width_cm DECIMAL(12, 2) NULL,
    depth_cm DECIMAL(12, 2) NULL,
    track_inventory BOOLEAN NOT NULL DEFAULT TRUE,
    allow_backorder BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    deleted_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_variants_tenant_sku (tenant_id, sku),
    UNIQUE KEY uq_product_variants_tenant_barcode (tenant_id, barcode),
    UNIQUE KEY uq_product_variants_tenant_id (tenant_id, id),
    KEY idx_product_variants_product (tenant_id, product_id, enabled),
    CONSTRAINT fk_product_variants_product
        FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_product_variants_price CHECK (price IS NULL OR price >= 0),
    CONSTRAINT chk_product_variants_compare_price CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
    CONSTRAINT chk_product_variants_cost CHECK (cost IS NULL OR cost >= 0),
    CONSTRAINT chk_product_variants_weight CHECK (weight_kg IS NULL OR weight_kg >= 0),
    CONSTRAINT chk_product_variants_dimensions CHECK (
        (height_cm IS NULL OR height_cm >= 0) AND
        (width_cm IS NULL OR width_cm >= 0) AND
        (depth_cm IS NULL OR depth_cm >= 0)
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_variant_option_values (
    tenant_id CHAR(36) NOT NULL,
    product_variant_id CHAR(36) NOT NULL,
    product_option_value_id CHAR(36) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (product_variant_id, product_option_value_id),
    KEY idx_variant_option_values_tenant_value (tenant_id, product_option_value_id),
    KEY idx_variant_option_values_tenant_variant (tenant_id, product_variant_id),
    CONSTRAINT fk_variant_option_values_variant
        FOREIGN KEY (tenant_id, product_variant_id) REFERENCES product_variants (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_variant_option_values_value
        FOREIGN KEY (tenant_id, product_option_value_id) REFERENCES product_option_values (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_images (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    product_variant_id CHAR(36) NULL,
    media_asset_id CHAR(36) NOT NULL,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_product_images_tenant_id (tenant_id, id),
    KEY idx_product_images_product (tenant_id, product_id, sort_order),
    KEY idx_product_images_variant (tenant_id, product_variant_id),
    KEY idx_product_images_asset (tenant_id, media_asset_id),
    CONSTRAINT fk_product_images_product
        FOREIGN KEY (tenant_id, product_id) REFERENCES products (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_product_images_variant
        FOREIGN KEY (tenant_id, product_variant_id) REFERENCES product_variants (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_product_images_asset
        FOREIGN KEY (tenant_id, media_asset_id) REFERENCES media_assets (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 5. STOCK LOCATIONS, CURRENT BALANCE AND DOCUMENT SEQUENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_locations (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(60) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    address_line VARCHAR(200) NULL,
    address_number VARCHAR(30) NULL,
    city VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_stock_locations_tenant_code (tenant_id, code),
    UNIQUE KEY uq_stock_locations_tenant_id (tenant_id, id),
    CONSTRAINT fk_stock_locations_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_balances (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    stock_location_id CHAR(36) NOT NULL,
    product_variant_id CHAR(36) NOT NULL,
    on_hand DECIMAL(14, 3) NOT NULL DEFAULT 0,
    reserved DECIMAL(14, 3) NOT NULL DEFAULT 0,
    low_stock_threshold DECIMAL(14, 3) NULL,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_balance_location_variant (tenant_id, stock_location_id, product_variant_id),
    KEY idx_inventory_balances_variant (tenant_id, product_variant_id),
    CONSTRAINT fk_inventory_balances_location
        FOREIGN KEY (tenant_id, stock_location_id) REFERENCES stock_locations (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_balances_variant
        FOREIGN KEY (tenant_id, product_variant_id) REFERENCES product_variants (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_inventory_balances_reserved CHECK (reserved >= 0),
    CONSTRAINT chk_inventory_balances_low_stock CHECK (low_stock_threshold IS NULL OR low_stock_threshold >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS document_sequences (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    document_type ENUM('SALE', 'ORDER', 'PURCHASE', 'STOCK_MOVEMENT') NOT NULL,
    prefix VARCHAR(20) NOT NULL,
    next_value BIGINT UNSIGNED NOT NULL DEFAULT 1,
    padding TINYINT UNSIGNED NOT NULL DEFAULT 6,
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_document_sequences_tenant_type (tenant_id, document_type),
    CONSTRAINT fk_document_sequences_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT chk_document_sequences_next CHECK (next_value >= 1),
    CONSTRAINT chk_document_sequences_padding CHECK (padding BETWEEN 1 AND 12)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 6. CUSTOMERS AND PAYMENT METHODS
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_groups (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    code VARCHAR(60) NOT NULL,
    name VARCHAR(100) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_customer_groups_tenant_code (tenant_id, code),
    UNIQUE KEY uq_customer_groups_tenant_id (tenant_id, id),
    CONSTRAINT fk_customer_groups_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    user_id CHAR(36) NULL,
    customer_group_id CHAR(36) NULL,
    source ENUM('STOREFRONT', 'POS', 'ADMIN', 'IMPORT') NOT NULL DEFAULT 'ADMIN',
    kind ENUM('INDIVIDUAL', 'BUSINESS') NOT NULL DEFAULT 'INDIVIDUAL',
    first_name VARCHAR(100) NULL,
    last_name VARCHAR(100) NULL,
    business_name VARCHAR(200) NULL,
    document_type VARCHAR(30) NULL,
    document_number VARCHAR(40) NULL,
    tax_condition VARCHAR(80) NULL,
    email VARCHAR(254) NULL,
    phone VARCHAR(40) NULL,
    status ENUM('ACTIVE', 'BLOCKED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    notes TEXT NULL,
    blocked_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    deleted_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_tenant_user (tenant_id, user_id),
    UNIQUE KEY uq_customers_tenant_document (tenant_id, document_type, document_number),
    UNIQUE KEY uq_customers_tenant_id (tenant_id, id),
    KEY idx_customers_user (user_id),
    KEY idx_customers_tenant_email (tenant_id, email),
    KEY idx_customers_tenant_phone (tenant_id, phone),
    KEY idx_customers_group (tenant_id, customer_group_id),
    CONSTRAINT fk_customers_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_customers_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON UPDATE RESTRICT ON DELETE SET NULL,
    CONSTRAINT fk_customers_group
        FOREIGN KEY (tenant_id, customer_group_id) REFERENCES customer_groups (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_customers_name CHECK (
        first_name IS NOT NULL OR last_name IS NOT NULL OR business_name IS NOT NULL
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_addresses (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    customer_id CHAR(36) NOT NULL,
    address_type ENUM('HOME', 'BILLING', 'SHIPPING', 'OTHER') NOT NULL DEFAULT 'HOME',
    label VARCHAR(80) NULL,
    street VARCHAR(200) NOT NULL,
    number VARCHAR(30) NULL,
    floor VARCHAR(20) NULL,
    apartment VARCHAR(20) NULL,
    city VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NULL,
    country_code CHAR(2) NOT NULL DEFAULT 'AR',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_customer_addresses_customer (tenant_id, customer_id),
    CONSTRAINT fk_customer_addresses_customer
        FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    customer_id CHAR(36) NULL,
    sender_name VARCHAR(150) NOT NULL,
    sender_email VARCHAR(254) NULL,
    sender_phone VARCHAR(40) NULL,
    subject VARCHAR(200) NULL,
    message TEXT NOT NULL,
    status ENUM('NEW', 'READ', 'ANSWERED', 'ARCHIVED') NOT NULL DEFAULT 'NEW',
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_contact_messages_tenant_status (tenant_id, status, created_at),
    KEY idx_contact_messages_customer (tenant_id, customer_id),
    CONSTRAINT fk_contact_messages_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_contact_messages_customer
        FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_methods (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    code VARCHAR(60) NOT NULL,
    name VARCHAR(100) NOT NULL,
    method_type ENUM('CASH', 'TRANSFER', 'DEBIT_CARD', 'CREDIT_CARD', 'MERCADO_PAGO', 'OTHER') NOT NULL,
    availability ENUM('POS', 'STOREFRONT', 'BOTH') NOT NULL DEFAULT 'POS',
    provider_code VARCHAR(80) NULL,
    instructions TEXT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_payment_methods_tenant_code (tenant_id, code),
    UNIQUE KEY uq_payment_methods_tenant_id (tenant_id, id),
    CONSTRAINT fk_payment_methods_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 7. FUTURE STOREFRONT CARTS, ONLINE ORDERS AND RESERVATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS carts (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    customer_id CHAR(36) NULL,
    anonymous_token_hash CHAR(64) NULL,
    status ENUM('ACTIVE', 'CONVERTED', 'ABANDONED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    expires_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_carts_tenant_id (tenant_id, id),
    KEY idx_carts_customer_status (tenant_id, customer_id, status),
    KEY idx_carts_anonymous_token (tenant_id, anonymous_token_hash),
    CONSTRAINT fk_carts_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_carts_customer
        FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cart_items (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    cart_id CHAR(36) NOT NULL,
    product_variant_id CHAR(36) NOT NULL,
    quantity DECIMAL(14, 3) NOT NULL,
    unit_price_snapshot DECIMAL(14, 2) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_cart_items_cart_variant (tenant_id, cart_id, product_variant_id),
    UNIQUE KEY uq_cart_items_tenant_id (tenant_id, id),
    CONSTRAINT fk_cart_items_cart
        FOREIGN KEY (tenant_id, cart_id) REFERENCES carts (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_cart_items_variant
        FOREIGN KEY (tenant_id, product_variant_id) REFERENCES product_variants (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_cart_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_cart_items_price CHECK (unit_price_snapshot IS NULL OR unit_price_snapshot >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    order_number VARCHAR(60) NOT NULL,
    cart_id CHAR(36) NULL,
    customer_id CHAR(36) NULL,
    channel ENUM('STOREFRONT', 'ADMIN') NOT NULL DEFAULT 'STOREFRONT',
    status ENUM('DRAFT', 'PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    payment_status ENUM('UNPAID', 'PENDING', 'PARTIAL', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    fulfillment_type ENUM('PICKUP', 'SHIPPING') NOT NULL DEFAULT 'PICKUP',
    fulfillment_status ENUM('UNFULFILLED', 'READY', 'DISPATCHED', 'DELIVERED', 'PICKED_UP', 'CANCELLED') NOT NULL DEFAULT 'UNFULFILLED',
    customer_name_snapshot VARCHAR(200) NULL,
    customer_email_snapshot VARCHAR(254) NULL,
    customer_phone_snapshot VARCHAR(40) NULL,
    shipping_address_snapshot JSON NULL,
    billing_address_snapshot JSON NULL,
    subtotal DECIMAL(14, 2) NOT NULL DEFAULT 0,
    discount_total DECIMAL(14, 2) NOT NULL DEFAULT 0,
    shipping_total DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total DECIMAL(14, 2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    notes TEXT NULL,
    reservation_expires_at DATETIME(6) NULL,
    placed_at DATETIME(6) NULL,
    confirmed_at DATETIME(6) NULL,
    fulfilled_at DATETIME(6) NULL,
    cancelled_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_orders_tenant_number (tenant_id, order_number),
    UNIQUE KEY uq_orders_tenant_id (tenant_id, id),
    KEY idx_orders_customer_created (tenant_id, customer_id, created_at),
    KEY idx_orders_status_created (tenant_id, status, created_at),
    KEY idx_orders_cart (tenant_id, cart_id),
    CONSTRAINT fk_orders_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_orders_cart
        FOREIGN KEY (tenant_id, cart_id) REFERENCES carts (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_orders_customer
        FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_orders_totals CHECK (
        subtotal >= 0 AND discount_total >= 0 AND shipping_total >= 0 AND total >= 0
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_items (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    product_variant_id CHAR(36) NULL,
    product_name_snapshot VARCHAR(200) NOT NULL,
    variant_name_snapshot VARCHAR(180) NULL,
    sku_snapshot VARCHAR(100) NULL,
    quantity DECIMAL(14, 3) NOT NULL,
    unit_price DECIMAL(14, 2) NOT NULL,
    discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    line_total DECIMAL(14, 2) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_order_items_tenant_id (tenant_id, id),
    KEY idx_order_items_order (tenant_id, order_id),
    KEY idx_order_items_variant (tenant_id, product_variant_id),
    CONSTRAINT fk_order_items_order
        FOREIGN KEY (tenant_id, order_id) REFERENCES orders (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE CASCADE,
    CONSTRAINT fk_order_items_variant
        FOREIGN KEY (tenant_id, product_variant_id) REFERENCES product_variants (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_order_items_amounts CHECK (
        unit_price >= 0 AND discount_amount >= 0 AND line_total >= 0
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_payments (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    payment_method_id CHAR(36) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    status ENUM('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'VOIDED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    external_reference VARCHAR(150) NULL,
    paid_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_order_payments_order_status (tenant_id, order_id, status),
    KEY idx_order_payments_method (tenant_id, payment_method_id),
    CONSTRAINT fk_order_payments_order
        FOREIGN KEY (tenant_id, order_id) REFERENCES orders (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_order_payments_method
        FOREIGN KEY (tenant_id, payment_method_id) REFERENCES payment_methods (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_order_payments_amount CHECK (amount > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    order_id CHAR(36) NOT NULL,
    order_item_id CHAR(36) NOT NULL,
    stock_location_id CHAR(36) NOT NULL,
    product_variant_id CHAR(36) NOT NULL,
    quantity DECIMAL(14, 3) NOT NULL,
    status ENUM('ACTIVE', 'RELEASED', 'CONSUMED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    expires_at DATETIME(6) NULL,
    released_at DATETIME(6) NULL,
    consumed_at DATETIME(6) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_inventory_reservation_item_location (tenant_id, order_item_id, stock_location_id),
    KEY idx_inventory_reservations_order_status (tenant_id, order_id, status),
    KEY idx_inventory_reservations_variant_status (tenant_id, product_variant_id, status),
    CONSTRAINT fk_inventory_reservations_order
        FOREIGN KEY (tenant_id, order_id) REFERENCES orders (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_reservations_order_item
        FOREIGN KEY (tenant_id, order_item_id) REFERENCES order_items (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_reservations_location
        FOREIGN KEY (tenant_id, stock_location_id) REFERENCES stock_locations (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_inventory_reservations_variant
        FOREIGN KEY (tenant_id, product_variant_id) REFERENCES product_variants (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_inventory_reservations_quantity CHECK (quantity > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 8. LOCAL/ONLINE SALES AND THEIR PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    sale_number VARCHAR(60) NOT NULL,
    customer_id CHAR(36) NULL,
    source_order_id CHAR(36) NULL,
    stock_location_id CHAR(36) NOT NULL,
    channel ENUM('POS', 'MANUAL', 'ONLINE') NOT NULL DEFAULT 'POS',
    status ENUM('DRAFT', 'CONFIRMED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'DRAFT',
    payment_status ENUM('UNPAID', 'PENDING', 'PARTIAL', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    customer_name_snapshot VARCHAR(200) NULL,
    customer_document_snapshot VARCHAR(80) NULL,
    subtotal DECIMAL(14, 2) NOT NULL DEFAULT 0,
    discount_total DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total DECIMAL(14, 2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    notes TEXT NULL,
    sold_at DATETIME(6) NULL,
    confirmed_at DATETIME(6) NULL,
    cancelled_at DATETIME(6) NULL,
    created_by_user_id CHAR(36) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_sales_tenant_number (tenant_id, sale_number),
    UNIQUE KEY uq_sales_tenant_id (tenant_id, id),
    UNIQUE KEY uq_sales_source_order (tenant_id, source_order_id),
    KEY idx_sales_customer_date (tenant_id, customer_id, sold_at),
    KEY idx_sales_status_date (tenant_id, status, sold_at),
    KEY idx_sales_location_date (tenant_id, stock_location_id, sold_at),
    KEY idx_sales_created_by (created_by_user_id),
    CONSTRAINT fk_sales_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_sales_customer
        FOREIGN KEY (tenant_id, customer_id) REFERENCES customers (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_sales_source_order
        FOREIGN KEY (tenant_id, source_order_id) REFERENCES orders (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_sales_location
        FOREIGN KEY (tenant_id, stock_location_id) REFERENCES stock_locations (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_sales_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON UPDATE RESTRICT ON DELETE SET NULL,
    CONSTRAINT chk_sales_totals CHECK (subtotal >= 0 AND discount_total >= 0 AND total >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_items (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    sale_id CHAR(36) NOT NULL,
    product_variant_id CHAR(36) NULL,
    product_name_snapshot VARCHAR(200) NOT NULL,
    variant_name_snapshot VARCHAR(180) NULL,
    sku_snapshot VARCHAR(100) NULL,
    quantity DECIMAL(14, 3) NOT NULL,
    unit_price DECIMAL(14, 2) NOT NULL,
    discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    line_total DECIMAL(14, 2) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_sale_items_tenant_id (tenant_id, id),
    KEY idx_sale_items_sale (tenant_id, sale_id),
    KEY idx_sale_items_variant (tenant_id, product_variant_id),
    CONSTRAINT fk_sale_items_sale
        FOREIGN KEY (tenant_id, sale_id) REFERENCES sales (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_sale_items_variant
        FOREIGN KEY (tenant_id, product_variant_id) REFERENCES product_variants (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_sale_items_quantity CHECK (quantity > 0),
    CONSTRAINT chk_sale_items_amounts CHECK (
        unit_price >= 0 AND discount_amount >= 0 AND line_total >= 0
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sale_payments (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    sale_id CHAR(36) NOT NULL,
    payment_method_id CHAR(36) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    status ENUM('PENDING', 'PAID', 'VOIDED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    external_reference VARCHAR(150) NULL,
    paid_at DATETIME(6) NULL,
    received_by_user_id CHAR(36) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_sale_payments_sale_status (tenant_id, sale_id, status),
    KEY idx_sale_payments_method (tenant_id, payment_method_id),
    KEY idx_sale_payments_received_by (received_by_user_id),
    CONSTRAINT fk_sale_payments_sale
        FOREIGN KEY (tenant_id, sale_id) REFERENCES sales (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_sale_payments_method
        FOREIGN KEY (tenant_id, payment_method_id) REFERENCES payment_methods (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_sale_payments_received_by
        FOREIGN KEY (received_by_user_id) REFERENCES users (id)
        ON UPDATE RESTRICT ON DELETE SET NULL,
    CONSTRAINT chk_sale_payments_amount CHECK (amount > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 9. SUPPLIERS, PURCHASES AND PURCHASE PAYMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    name VARCHAR(200) NOT NULL,
    tax_id VARCHAR(40) NULL,
    email VARCHAR(254) NULL,
    phone VARCHAR(40) NULL,
    address_line VARCHAR(200) NULL,
    city VARCHAR(100) NULL,
    province VARCHAR(100) NULL,
    status ENUM('ACTIVE', 'BLOCKED', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    notes TEXT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    deleted_at DATETIME(6) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_suppliers_tenant_tax_id (tenant_id, tax_id),
    UNIQUE KEY uq_suppliers_tenant_id (tenant_id, id),
    KEY idx_suppliers_tenant_name (tenant_id, name),
    CONSTRAINT fk_suppliers_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchases (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    purchase_number VARCHAR(60) NOT NULL,
    supplier_id CHAR(36) NULL,
    stock_location_id CHAR(36) NOT NULL,
    document_type ENUM('INVOICE', 'DELIVERY_NOTE', 'NO_DOCUMENT') NOT NULL DEFAULT 'NO_DOCUMENT',
    document_number VARCHAR(80) NULL,
    status ENUM('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    payment_status ENUM('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED') NOT NULL DEFAULT 'UNPAID',
    subtotal DECIMAL(14, 2) NOT NULL DEFAULT 0,
    discount_total DECIMAL(14, 2) NOT NULL DEFAULT 0,
    total DECIMAL(14, 2) NOT NULL DEFAULT 0,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    notes TEXT NULL,
    purchased_at DATETIME(6) NULL,
    received_at DATETIME(6) NULL,
    cancelled_at DATETIME(6) NULL,
    created_by_user_id CHAR(36) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_purchases_tenant_number (tenant_id, purchase_number),
    UNIQUE KEY uq_purchases_tenant_id (tenant_id, id),
    KEY idx_purchases_supplier_date (tenant_id, supplier_id, purchased_at),
    KEY idx_purchases_status_date (tenant_id, status, purchased_at),
    KEY idx_purchases_created_by (created_by_user_id),
    CONSTRAINT fk_purchases_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_purchases_supplier
        FOREIGN KEY (tenant_id, supplier_id) REFERENCES suppliers (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_purchases_location
        FOREIGN KEY (tenant_id, stock_location_id) REFERENCES stock_locations (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_purchases_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON UPDATE RESTRICT ON DELETE SET NULL,
    CONSTRAINT chk_purchases_totals CHECK (subtotal >= 0 AND discount_total >= 0 AND total >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_items (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    purchase_id CHAR(36) NOT NULL,
    product_variant_id CHAR(36) NOT NULL,
    description_snapshot VARCHAR(255) NOT NULL,
    ordered_quantity DECIMAL(14, 3) NOT NULL,
    received_quantity DECIMAL(14, 3) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(14, 2) NOT NULL,
    discount_amount DECIMAL(14, 2) NOT NULL DEFAULT 0,
    line_total DECIMAL(14, 2) NOT NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_purchase_items_tenant_id (tenant_id, id),
    KEY idx_purchase_items_purchase (tenant_id, purchase_id),
    KEY idx_purchase_items_variant (tenant_id, product_variant_id),
    CONSTRAINT fk_purchase_items_purchase
        FOREIGN KEY (tenant_id, purchase_id) REFERENCES purchases (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_purchase_items_variant
        FOREIGN KEY (tenant_id, product_variant_id) REFERENCES product_variants (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_purchase_items_quantities CHECK (
        ordered_quantity > 0 AND received_quantity >= 0 AND received_quantity <= ordered_quantity
    ),
    CONSTRAINT chk_purchase_items_amounts CHECK (
        unit_cost >= 0 AND discount_amount >= 0 AND line_total >= 0
    )
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS purchase_payments (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    purchase_id CHAR(36) NOT NULL,
    payment_method_id CHAR(36) NOT NULL,
    amount DECIMAL(14, 2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ARS',
    status ENUM('PENDING', 'PAID', 'VOIDED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
    external_reference VARCHAR(150) NULL,
    paid_at DATETIME(6) NULL,
    paid_by_user_id CHAR(36) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_purchase_payments_purchase_status (tenant_id, purchase_id, status),
    KEY idx_purchase_payments_method (tenant_id, payment_method_id),
    CONSTRAINT fk_purchase_payments_purchase
        FOREIGN KEY (tenant_id, purchase_id) REFERENCES purchases (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_purchase_payments_method
        FOREIGN KEY (tenant_id, payment_method_id) REFERENCES payment_methods (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_purchase_payments_paid_by
        FOREIGN KEY (paid_by_user_id) REFERENCES users (id)
        ON UPDATE RESTRICT ON DELETE SET NULL,
    CONSTRAINT chk_purchase_payments_amount CHECK (amount > 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- ============================================================================
-- 10. IMMUTABLE INVENTORY MOVEMENT LEDGER
-- A confirmed sale causes a SALE movement. The sale and movement remain
-- separate records so that stock adjustments, purchases, reversals and returns
-- use the same inventory ledger.
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_movements (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    movement_number VARCHAR(60) NOT NULL,
    stock_location_id CHAR(36) NOT NULL,
    movement_type ENUM(
        'INITIAL',
        'MANUAL_IN',
        'MANUAL_OUT',
        'ADJUSTMENT',
        'SALE',
        'SALE_REVERSAL',
        'PURCHASE',
        'PURCHASE_RETURN',
        'CUSTOMER_RETURN'
    ) NOT NULL,
    status ENUM('POSTED', 'REVERSED') NOT NULL DEFAULT 'POSTED',
    sale_id CHAR(36) NULL,
    order_id CHAR(36) NULL,
    purchase_id CHAR(36) NULL,
    reversal_of_id CHAR(36) NULL,
    reason VARCHAR(255) NULL,
    occurred_at DATETIME(6) NOT NULL,
    created_by_user_id CHAR(36) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    UNIQUE KEY uq_stock_movements_tenant_number (tenant_id, movement_number),
    UNIQUE KEY uq_stock_movements_tenant_id (tenant_id, id),
    KEY idx_stock_movements_location_date (tenant_id, stock_location_id, occurred_at),
    KEY idx_stock_movements_type_date (tenant_id, movement_type, occurred_at),
    KEY idx_stock_movements_sale (tenant_id, sale_id),
    KEY idx_stock_movements_order (tenant_id, order_id),
    KEY idx_stock_movements_purchase (tenant_id, purchase_id),
    KEY idx_stock_movements_reversal (tenant_id, reversal_of_id),
    KEY idx_stock_movements_created_by (created_by_user_id),
    CONSTRAINT fk_stock_movements_tenant
        FOREIGN KEY (tenant_id) REFERENCES tenants (id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_stock_movements_location
        FOREIGN KEY (tenant_id, stock_location_id) REFERENCES stock_locations (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_stock_movements_sale
        FOREIGN KEY (tenant_id, sale_id) REFERENCES sales (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_stock_movements_order
        FOREIGN KEY (tenant_id, order_id) REFERENCES orders (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_stock_movements_purchase
        FOREIGN KEY (tenant_id, purchase_id) REFERENCES purchases (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_stock_movements_reversal
        FOREIGN KEY (tenant_id, reversal_of_id) REFERENCES stock_movements (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_stock_movements_created_by
        FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON UPDATE RESTRICT ON DELETE SET NULL
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS stock_movement_items (
    id CHAR(36) NOT NULL,
    tenant_id CHAR(36) NOT NULL,
    stock_movement_id CHAR(36) NOT NULL,
    product_variant_id CHAR(36) NOT NULL,
    quantity_delta DECIMAL(14, 3) NOT NULL,
    unit_cost DECIMAL(14, 2) NULL,
    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    KEY idx_stock_movement_items_movement (tenant_id, stock_movement_id),
    KEY idx_stock_movement_items_variant (tenant_id, product_variant_id),
    CONSTRAINT fk_stock_movement_items_movement
        FOREIGN KEY (tenant_id, stock_movement_id) REFERENCES stock_movements (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT fk_stock_movement_items_variant
        FOREIGN KEY (tenant_id, product_variant_id) REFERENCES product_variants (tenant_id, id)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    CONSTRAINT chk_stock_movement_items_quantity CHECK (quantity_delta <> 0),
    CONSTRAINT chk_stock_movement_items_unit_cost CHECK (unit_cost IS NULL OR unit_cost >= 0)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Useful read model. available = physical stock - active reservations.
CREATE OR REPLACE VIEW v_inventory_available AS
SELECT
    ib.id,
    ib.tenant_id,
    ib.stock_location_id,
    ib.product_variant_id,
    ib.on_hand,
    ib.reserved,
    (ib.on_hand - ib.reserved) AS available,
    ib.low_stock_threshold,
    ib.updated_at
FROM inventory_balances AS ib;

-- ============================================================================
-- 11. INITIAL SEED: RUBI JOYERIA
-- No user/password or customer personal data is inserted here.
-- Product/customer migration is a separate import process.
-- ============================================================================

START TRANSACTION;

SET @account_rubi = '11111111-1111-4111-8111-111111111111';
SET @tenant_rubi = '22222222-2222-4222-8222-222222222222';
SET @plan_starter = '33333333-3333-4333-8333-333333333333';
SET @subscription_rubi = '33333333-3333-4333-8333-333333333334';

INSERT INTO accounts (id, name, status)
VALUES (@account_rubi, 'Rubi Joyeria', 'ACTIVE')
ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status);

INSERT INTO plans (
    id, code, name, description, billing_cycle, price_amount, currency, max_tenants, enabled
)
VALUES (
    @plan_starter,
    'STARTER',
    'Starter',
    'Plan inicial para una tienda. El precio comercial se configura fuera de este seed.',
    'MONTHLY',
    NULL,
    'ARS',
    1,
    TRUE
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    max_tenants = VALUES(max_tenants),
    enabled = VALUES(enabled);

INSERT INTO account_subscriptions (
    id, account_id, plan_id, status, price_amount, currency, starts_at
)
VALUES (
    @subscription_rubi,
    @account_rubi,
    @plan_starter,
    'ACTIVE',
    NULL,
    'ARS',
    UTC_TIMESTAMP(6)
)
ON DUPLICATE KEY UPDATE
    plan_id = VALUES(plan_id),
    status = VALUES(status),
    price_amount = VALUES(price_amount),
    currency = VALUES(currency);

INSERT INTO tenants (
    id, account_id, name, slug, status, default_currency, time_zone, enabled
)
VALUES (
    @tenant_rubi,
    @account_rubi,
    'Rubi Joyeria',
    'rubi',
    'ACTIVE',
    'ARS',
    'America/Argentina/Tucuman',
    TRUE
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    slug = VALUES(slug),
    status = VALUES(status),
    default_currency = VALUES(default_currency),
    time_zone = VALUES(time_zone),
    enabled = VALUES(enabled);

-- Feature catalogue.
INSERT INTO features (id, code, name, description) VALUES
    ('60000000-0000-4000-8000-000000000001', 'CATALOG', 'Catalogo', 'Productos, variantes, categorias e imagenes'),
    ('60000000-0000-4000-8000-000000000002', 'INVENTORY', 'Inventario', 'Stock, saldos y movimientos'),
    ('60000000-0000-4000-8000-000000000003', 'CUSTOMERS', 'Clientes', 'Registro y administracion de clientes'),
    ('60000000-0000-4000-8000-000000000004', 'SALES', 'Ventas', 'Ventas manuales y su historial'),
    ('60000000-0000-4000-8000-000000000005', 'POS', 'Punto de venta', 'Punto de venta para el local'),
    ('60000000-0000-4000-8000-000000000006', 'PURCHASES', 'Compras', 'Proveedores y compras'),
    ('60000000-0000-4000-8000-000000000007', 'ONLINE_ORDERS', 'Pedidos online', 'Carrito y pedidos del storefront'),
    ('60000000-0000-4000-8000-000000000008', 'ONLINE_PAYMENTS', 'Pagos online', 'Integraciones de cobro online'),
    ('60000000-0000-4000-8000-000000000009', 'SHIPPING', 'Envios', 'Metodos y seguimiento de envios'),
    ('60000000-0000-4000-8000-000000000010', 'INVOICING', 'Facturacion', 'Comprobantes y facturacion')
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description);

INSERT INTO plan_features (plan_id, feature_id, enabled, limit_value)
SELECT @plan_starter, id,
       CASE WHEN code IN ('CATALOG', 'INVENTORY', 'CUSTOMERS', 'SALES', 'POS') THEN TRUE ELSE FALSE END,
       NULL
FROM features
ON DUPLICATE KEY UPDATE enabled = VALUES(enabled), limit_value = VALUES(limit_value);

-- Permissions used by the admin application.
INSERT INTO permissions (id, code, description) VALUES
    ('50000000-0000-4000-8000-000000000001', 'store.read', 'Ver configuracion de tienda'),
    ('50000000-0000-4000-8000-000000000002', 'store.update', 'Modificar informacion de tienda'),
    ('50000000-0000-4000-8000-000000000003', 'store.theme.update', 'Modificar diseno de tienda'),
    ('50000000-0000-4000-8000-000000000004', 'products.read', 'Ver productos'),
    ('50000000-0000-4000-8000-000000000005', 'products.write', 'Crear y modificar productos'),
    ('50000000-0000-4000-8000-000000000006', 'categories.write', 'Administrar categorias'),
    ('50000000-0000-4000-8000-000000000007', 'inventory.read', 'Ver stock'),
    ('50000000-0000-4000-8000-000000000008', 'inventory.adjust', 'Registrar ajustes de stock'),
    ('50000000-0000-4000-8000-000000000009', 'customers.read', 'Ver clientes'),
    ('50000000-0000-4000-8000-000000000010', 'customers.write', 'Crear y modificar clientes'),
    ('50000000-0000-4000-8000-000000000011', 'sales.read', 'Ver ventas'),
    ('50000000-0000-4000-8000-000000000012', 'sales.create', 'Registrar ventas'),
    ('50000000-0000-4000-8000-000000000013', 'sales.cancel', 'Anular ventas'),
    ('50000000-0000-4000-8000-000000000014', 'pos.use', 'Usar el punto de venta'),
    ('50000000-0000-4000-8000-000000000015', 'orders.manage', 'Administrar pedidos online'),
    ('50000000-0000-4000-8000-000000000016', 'users.manage', 'Administrar usuarios internos'),
    ('50000000-0000-4000-8000-000000000017', 'roles.manage', 'Administrar roles y permisos')
ON DUPLICATE KEY UPDATE description = VALUES(description);

SET @role_owner = '40000000-0000-4000-8000-000000000001';
SET @role_admin = '40000000-0000-4000-8000-000000000002';
SET @role_seller = '40000000-0000-4000-8000-000000000003';
SET @role_stock = '40000000-0000-4000-8000-000000000004';

INSERT INTO roles (id, account_id, code, name, description, is_system) VALUES
    (@role_owner, @account_rubi, 'OWNER', 'Propietario', 'Acceso completo a la cuenta', TRUE),
    (@role_admin, @account_rubi, 'ADMIN', 'Administrador', 'Administra la tienda y su operacion', TRUE),
    (@role_seller, @account_rubi, 'SELLER', 'Vendedor', 'Opera ventas y clientes', TRUE),
    (@role_stock, @account_rubi, 'STOCK_MANAGER', 'Responsable de stock', 'Administra catalogo e inventario', TRUE)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    is_system = VALUES(is_system);

INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_owner, id FROM permissions
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_admin, id FROM permissions
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_seller, id
FROM permissions
WHERE code IN (
    'products.read', 'inventory.read', 'customers.read', 'customers.write',
    'sales.read', 'sales.create', 'pos.use'
)
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

INSERT INTO role_permissions (role_id, permission_id)
SELECT @role_stock, id
FROM permissions
WHERE code IN (
    'products.read', 'products.write', 'categories.write',
    'inventory.read', 'inventory.adjust'
)
ON DUPLICATE KEY UPDATE permission_id = VALUES(permission_id);

-- Public Rubi storefront configuration observed in the authorized source.
INSERT INTO store_profiles (
    id, tenant_id, brand_name, contact_email, phone,
    address_line, address_number, city, province, country_code
)
VALUES (
    '70000000-0000-4000-8000-000000000001',
    @tenant_rubi,
    'RUBI JOYERIA',
    'rubi.joyeria803@gmail.com',
    '3816776136',
    'Mendoza',
    '803',
    'San Miguel de Tucuman',
    'Tucuman',
    'AR'
)
ON DUPLICATE KEY UPDATE
    brand_name = VALUES(brand_name),
    contact_email = VALUES(contact_email),
    phone = VALUES(phone),
    address_line = VALUES(address_line),
    address_number = VALUES(address_number),
    city = VALUES(city),
    province = VALUES(province),
    country_code = VALUES(country_code);

INSERT INTO storefront_settings (
    id, tenant_id, is_published, contact_form_enabled, show_prices,
    allow_negative_stock, default_catalog_sort, catalog_columns_desktop
)
VALUES (
    '70000000-0000-4000-8000-000000000002',
    @tenant_rubi,
    TRUE,
    TRUE,
    TRUE,
    FALSE,
    'FEATURED',
    4
)
ON DUPLICATE KEY UPDATE
    is_published = VALUES(is_published),
    contact_form_enabled = VALUES(contact_form_enabled),
    show_prices = VALUES(show_prices),
    allow_negative_stock = VALUES(allow_negative_stock),
    default_catalog_sort = VALUES(default_catalog_sort),
    catalog_columns_desktop = VALUES(catalog_columns_desktop);

INSERT INTO store_themes (
    id, tenant_id, primary_color, secondary_color, background_color, text_color,
    heading_font, body_font, border_radius,
    announcement_enabled, announcement_text, announcement_url
)
VALUES (
    '70000000-0000-4000-8000-000000000003',
    @tenant_rubi,
    '#EF3B3B',
    '#6B7280',
    '#FFFFFF',
    '#111111',
    'Merriweather',
    'Lora',
    'NONE',
    TRUE,
    'ENVIO GRATIS a todo San Miguel de Tucuman',
    NULL
)
ON DUPLICATE KEY UPDATE
    primary_color = VALUES(primary_color),
    secondary_color = VALUES(secondary_color),
    background_color = VALUES(background_color),
    text_color = VALUES(text_color),
    heading_font = VALUES(heading_font),
    body_font = VALUES(body_font),
    border_radius = VALUES(border_radius),
    announcement_enabled = VALUES(announcement_enabled),
    announcement_text = VALUES(announcement_text),
    announcement_url = VALUES(announcement_url);

INSERT INTO store_contact_channels (
    id, tenant_id, channel_type, value, url, enabled, sort_order
)
VALUES (
    '70000000-0000-4000-8000-000000000004',
    @tenant_rubi,
    'WHATSAPP',
    '+543816776136',
    'https://wa.me/543816776136',
    TRUE,
    1
)
ON DUPLICATE KEY UPDATE
    value = VALUES(value),
    url = VALUES(url),
    enabled = VALUES(enabled),
    sort_order = VALUES(sort_order);

INSERT INTO stock_locations (
    id, tenant_id, name, code, is_default, enabled,
    address_line, address_number, city, province
)
VALUES (
    '90000000-0000-4000-8000-000000000001',
    @tenant_rubi,
    'Local principal',
    'MAIN',
    TRUE,
    TRUE,
    'Mendoza',
    '803',
    'San Miguel de Tucuman',
    'Tucuman'
)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    is_default = VALUES(is_default),
    enabled = VALUES(enabled),
    address_line = VALUES(address_line),
    address_number = VALUES(address_number),
    city = VALUES(city),
    province = VALUES(province);

INSERT INTO document_sequences (id, tenant_id, document_type, prefix, next_value, padding) VALUES
    ('91000000-0000-4000-8000-000000000001', @tenant_rubi, 'SALE', 'V-', 1, 6),
    ('91000000-0000-4000-8000-000000000002', @tenant_rubi, 'ORDER', 'P-', 1, 6),
    ('91000000-0000-4000-8000-000000000003', @tenant_rubi, 'PURCHASE', 'C-', 1, 6),
    ('91000000-0000-4000-8000-000000000004', @tenant_rubi, 'STOCK_MOVEMENT', 'M-', 1, 8)
ON DUPLICATE KEY UPDATE
    prefix = VALUES(prefix),
    padding = VALUES(padding);

INSERT INTO customer_groups (id, tenant_id, code, name, enabled) VALUES
    ('92000000-0000-4000-8000-000000000001', @tenant_rubi, 'RETAIL', 'Minorista', TRUE),
    ('92000000-0000-4000-8000-000000000002', @tenant_rubi, 'WHOLESALE', 'Mayorista', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), enabled = VALUES(enabled);

INSERT INTO payment_methods (
    id, tenant_id, code, name, method_type, availability, enabled, sort_order
)
VALUES
    ('80000000-0000-4000-8000-000000000001', @tenant_rubi, 'CASH', 'Efectivo', 'CASH', 'POS', TRUE, 1),
    ('80000000-0000-4000-8000-000000000002', @tenant_rubi, 'TRANSFER', 'Transferencia', 'TRANSFER', 'BOTH', TRUE, 2),
    ('80000000-0000-4000-8000-000000000003', @tenant_rubi, 'DEBIT_CARD', 'Tarjeta de debito', 'DEBIT_CARD', 'POS', TRUE, 3),
    ('80000000-0000-4000-8000-000000000004', @tenant_rubi, 'CREDIT_CARD', 'Tarjeta de credito', 'CREDIT_CARD', 'POS', TRUE, 4)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    method_type = VALUES(method_type),
    availability = VALUES(availability),
    enabled = VALUES(enabled),
    sort_order = VALUES(sort_order);

-- Authorized Rubi category tree. More products/categories can be imported later.
SET @cat_general = 'a0000000-0000-4000-8000-000000000001';
SET @cat_gold = 'a0000000-0000-4000-8000-000000000002';
SET @cat_silver = 'a0000000-0000-4000-8000-000000000003';
SET @cat_gold_rings = 'a0000000-0000-4000-8000-000000000011';
SET @cat_silver_rings = 'a0000000-0000-4000-8000-000000000021';

INSERT INTO categories (id, tenant_id, parent_id, name, slug, sort_order, is_visible) VALUES
    (@cat_general, @tenant_rubi, NULL, 'General', 'general', 1, TRUE),
    (@cat_gold, @tenant_rubi, NULL, 'Oro 18kt', 'oro-18kt', 2, TRUE),
    (@cat_silver, @tenant_rubi, NULL, 'Plata', 'plata', 3, TRUE)
ON DUPLICATE KEY UPDATE
    parent_id = VALUES(parent_id),
    name = VALUES(name),
    sort_order = VALUES(sort_order),
    is_visible = VALUES(is_visible);

INSERT INTO categories (id, tenant_id, parent_id, name, slug, sort_order, is_visible) VALUES
    (@cat_gold_rings, @tenant_rubi, @cat_gold, 'Anillos', 'oro-18kt-anillos', 1, TRUE),
    ('a0000000-0000-4000-8000-000000000012', @tenant_rubi, @cat_gold, 'Pulseras', 'oro-18kt-pulseras', 2, TRUE),
    ('a0000000-0000-4000-8000-000000000013', @tenant_rubi, @cat_gold, 'Dijes', 'oro-18kt-dijes', 3, TRUE),
    ('a0000000-0000-4000-8000-000000000014', @tenant_rubi, @cat_gold, 'Cadenas', 'oro-18kt-cadenas', 4, TRUE),
    ('a0000000-0000-4000-8000-000000000015', @tenant_rubi, @cat_gold, 'Aros', 'oro-18kt-aros', 5, TRUE),
    ('a0000000-0000-4000-8000-000000000016', @tenant_rubi, @cat_gold, 'Alianzas', 'oro-18kt-alianzas', 6, TRUE),
    ('a0000000-0000-4000-8000-000000000017', @tenant_rubi, @cat_gold, 'Abridores', 'oro-18kt-abridores', 7, TRUE),
    (@cat_silver_rings, @tenant_rubi, @cat_silver, 'Anillos', 'plata-anillos', 1, TRUE)
ON DUPLICATE KEY UPDATE
    parent_id = VALUES(parent_id),
    name = VALUES(name),
    sort_order = VALUES(sort_order),
    is_visible = VALUES(is_visible);

INSERT INTO categories (id, tenant_id, parent_id, name, slug, sort_order, is_visible)
VALUES (
    'a0000000-0000-4000-8000-000000000022',
    @tenant_rubi,
    @cat_silver_rings,
    'Iniciales',
    'plata-anillos-iniciales',
    1,
    TRUE
)
ON DUPLICATE KEY UPDATE
    parent_id = VALUES(parent_id),
    name = VALUES(name),
    sort_order = VALUES(sort_order),
    is_visible = VALUES(is_visible);

COMMIT;

-- ============================================================================
-- APPLICATION TRANSACTION RULES (implemented in NestJS, not as SQL triggers)
-- ============================================================================
-- 1. Local sale confirmation:
--    lock inventory_balances -> validate availability -> insert SALE movement
--    and items -> decrement on_hand -> confirm sale -> commit.
-- 2. Online order placement (future):
--    lock inventory_balances -> insert inventory_reservations -> increment
--    reserved -> confirm order -> commit.
-- 3. Online pickup/dispatch (future):
--    consume reservation -> decrement on_hand and reserved -> create ONLINE sale
--    and SALE movement -> commit.
-- 4. Cancellation/reversal:
--    never delete posted movement rows; insert the opposite movement and mark
--    the original movement REVERSED.
-- 5. Every application query for tenant-owned data must include tenant_id from
--    authenticated server context. Never trust a freely supplied tenant header.
-- ============================================================================
