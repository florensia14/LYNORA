
-- ==========================================================
-- LYNORA - Align Midtrans Payment Schema
-- Date: 2026-11-19
--
-- Tujuan:
-- 1. Melengkapi metadata Midtrans pada payments.
-- 2. Menyesuaikan status pembayaran.
-- 3. Membuat payment_attempts.
--
-- Prasyarat:
-- Migration unique active Midtrans sudah diperiksa.
-- Backup database sebelum menjalankan.
-- ==========================================================

-- ==========================================================
-- STEP 0: Unique payment per order
-- ==========================================================
-- SUDAH DITERAPKAN MANUAL pada database LYNORA.
-- Index: uq_payments_order_id
-- Jangan jalankan ALTER TABLE ini kembali.

-- ==========================================================
-- STEP 1: Tambahkan metadata Midtrans pada payments
-- ==========================================================

ALTER TABLE payments
  ADD COLUMN midtrans_order_id VARCHAR(100) DEFAULT NULL
    AFTER order_id,

  ADD COLUMN fraud_status VARCHAR(30) DEFAULT NULL
    AFTER transaction_status,

  ADD COLUMN transaction_time DATETIME DEFAULT NULL
    AFTER fraud_status,

  ADD COLUMN settled_at DATETIME DEFAULT NULL
    AFTER transaction_time,

  ADD COLUMN expired_at DATETIME DEFAULT NULL
    AFTER settled_at,

  ADD COLUMN midtrans_response JSON DEFAULT NULL
    AFTER expired_at;


-- ==========================================================
-- STEP 2: Sesuaikan status payments
-- ==========================================================

ALTER TABLE payments
  MODIFY COLUMN status ENUM(
    'pending',
    'success',
    'rejected',
    'failed',
    'refunded',
    'expired',
    'cancelled'
  ) NOT NULL DEFAULT 'pending';


-- ==========================================================
-- STEP 3: Buat payment_attempts
-- ==========================================================

CREATE TABLE payment_attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,

  payment_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,

  midtrans_order_id VARCHAR(100) NOT NULL,

  amount DECIMAL(12,2) NOT NULL,

  status VARCHAR(20) NOT NULL DEFAULT 'pending',

  transaction_id VARCHAR(100) DEFAULT NULL,
  payment_type VARCHAR(50) DEFAULT NULL,
  transaction_status VARCHAR(50) DEFAULT NULL,
  fraud_status VARCHAR(30) DEFAULT NULL,

  transaction_time DATETIME DEFAULT NULL,
  settled_at DATETIME DEFAULT NULL,
  expired_at DATETIME DEFAULT NULL,

  snap_token VARCHAR(255) DEFAULT NULL,
  redirect_url TEXT DEFAULT NULL,
  snap_token_created_at DATETIME DEFAULT NULL,

  midtrans_response JSON DEFAULT NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  UNIQUE KEY uq_payment_attempts_midtrans_order_id
    (midtrans_order_id),

  KEY idx_payment_attempts_payment_id (payment_id),
  KEY idx_payment_attempts_order_id (order_id),
  KEY idx_payment_attempts_status_created (status, created_at),

  CONSTRAINT fk_payment_attempts_payment
    FOREIGN KEY (payment_id)
    REFERENCES payments(id),

  CONSTRAINT fk_payment_attempts_order
    FOREIGN KEY (order_id)
    REFERENCES orders(id),

  CONSTRAINT chk_payment_attempts_amount
    CHECK (amount >= 0)

) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;


-- ==========================================================
-- END MIGRATION
-- ==========================================================
