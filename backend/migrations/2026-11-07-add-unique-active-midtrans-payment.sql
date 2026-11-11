-- ==========================================================
-- LYNORA - Proteksi duplikasi pembayaran Midtrans di level database
-- ==========================================================
-- STATUS: BELUM DIJALANKAN. Butuh persetujuan pemilik project
--         karena mengubah schema tabel `payments`.
--
-- Masalah:
--   Saat ini satu order hanya dijaga oleh logika aplikasi
--   (SELECT ... FOR UPDATE + pengecekan baris pending). Bila ada dua
--   request paralel atau dua instance backend, dua baris pembayaran
--   Midtrans masih bisa terbentuk untuk order yang sama.
--
-- Solusi:
--   Constraint unik tidak bisa memakai WHERE (MySQL tidak mendukung
--   partial index), jadi dipakai generated column yang bernilai
--   order_id hanya untuk pembayaran Midtrans yang masih aktif
--   (pending/success). Baris failed/rejected/refunded bernilai NULL,
--   dan MySQL mengizinkan banyak NULL pada unique index sehingga
--   riwayat pembayaran lama tetap aman.
--
-- Dampak:
--   - Tidak menghapus data apa pun.
--   - Hanya menambah 1 kolom generated (STORED) + 1 unique index.
--   - INSERT pembayaran Midtrans kedua yang masih aktif akan gagal
--     dengan ER_DUP_ENTRY; controller sudah menangani kode tersebut.
-- ==========================================================

-- ----------------------------------------------------------
-- LANGKAH 0 (WAJIB): periksa dulu apakah sudah ada duplikat.
-- Query harus mengembalikan 0 baris sebelum ALTER dijalankan.
-- ----------------------------------------------------------
-- SELECT order_id, COUNT(*) AS active_midtrans
-- FROM payments
-- WHERE method = 'midtrans' AND status IN ('pending', 'success')
-- GROUP BY order_id
-- HAVING active_midtrans > 1;

-- ----------------------------------------------------------
-- LANGKAH 1: tambah kolom generated + unique index.
-- ----------------------------------------------------------
ALTER TABLE payments
  ADD COLUMN active_midtrans_order_id BIGINT UNSIGNED
    GENERATED ALWAYS AS (
      CASE
        WHEN method = 'midtrans' AND status IN ('pending', 'success')
          THEN order_id
        ELSE NULL
      END
    ) STORED,
  ADD UNIQUE KEY uq_payments_active_midtrans (active_midtrans_order_id);

-- ----------------------------------------------------------
-- ROLLBACK (bila perlu dibatalkan):
-- ----------------------------------------------------------
-- ALTER TABLE payments
--   DROP INDEX uq_payments_active_midtrans,
--   DROP COLUMN active_midtrans_order_id;
