# Setup Mobile Frontend LYNORA

Ikuti panduan ini setelah berhasil `git pull origin develop`.

## 1. Install aplikasi yang dibutuhkan

Install di laptop:

-   **Git** --- untuk mengambil dan mengelola kode project.
-   **Node.js versi LTS** --- sudah termasuk npm.
-   **Visual Studio Code** --- untuk membuka dan mengedit project.
-   **Expo Go** di HP Android/iPhone --- untuk menjalankan aplikasi di
    HP.

Opsional: install **Android Studio** jika ingin menjalankan aplikasi
lewat Android Emulator, bukan HP fisik.

## 2. Buka project dan buat branch Mobile

Buka terminal di folder utama `LYNORA`:

``` bash
git switch develop
git pull origin develop
git switch -c mobile-frontend
```

Jika branch `mobile-frontend` sudah ada di GitHub, gunakan:

``` bash
git fetch origin
git switch --track origin/mobile-frontend
```

Jika branch lokal `mobile-frontend` sudah pernah dibuat:

``` bash
git switch mobile-frontend
git pull origin mobile-frontend
```

Pastikan branch aktif:

``` bash
git branch
```

Tanda `*` harus berada di `mobile-frontend`.

## 3. Install dependency project

Buka folder Mobile Frontend di terminal. Sesuaikan `<FOLDER_MOBILE>`
dengan nama folder Mobile yang ada di repository:

``` bash
cd <FOLDER_MOBILE>
npm install
```

Jika ingin menjalankan backend lokal juga, buka terminal baru dari
folder utama project:

``` bash
cd backend
npm install
```

`npm install` cukup dilakukan saat pertama kali setup atau ketika
dependency project berubah.

## 4. Siapkan konfigurasi API

Mobile menggunakan **backend LYNORA yang sama dengan Web**. Tidak perlu
membuat backend baru.

-   Minta file konfigurasi `.env` atau nilai konfigurasi yang diperlukan
    kepada PIC.
-   Jika tersedia `.env.example`, salin menjadi `.env` sesuai petunjuk
    project.
-   Atur Base URL Mobile agar mengarah ke backend yang sedang
    dijalankan.
-   Jika menggunakan HP fisik, gunakan IP laptop (contoh
    `http://192.168.1.10:PORT`), bukan `localhost`.
-   Pastikan HP dan laptop terhubung ke Wi-Fi yang sama.

Untuk melihat IP laptop Windows, jalankan:

``` powershell
ipconfig
```

Gunakan alamat **IPv4 Address** dari koneksi Wi-Fi. Ganti contoh IP dan
`PORT` dengan alamat backend yang sebenarnya.

**Jangan commit atau mengirim file `.env`, password, maupun token ke
GitHub.**

## 5. Jalankan aplikasi

**Terminal 1 --- Backend** (jika backend dijalankan secara lokal):

``` bash
cd backend
npm run dev
```

Jika script `dev` tidak tersedia, cek script yang tersedia dengan
`npm run` dan ikuti instruksi project.

**Terminal 2 --- Mobile:**

``` bash
cd <FOLDER_MOBILE>
npx expo start
```

Scan QR code menggunakan Expo Go, atau jalankan melalui Android Emulator
jika sudah disiapkan.

## 6. Sebelum mulai coding

-   Pastikan aplikasi Mobile berhasil terbuka.
-   Pastikan Mobile dapat terhubung ke backend.
-   Coba alur yang sedang dikerjakan, misalnya login.
-   Kerjakan perubahan di branch `mobile-frontend`.
-   Fokus pada folder Mobile. Jangan mengubah Web atau Backend tanpa
    koordinasi dengan PIC.

## 7. Setelah selesai coding

Dari folder utama `LYNORA`, periksa perubahan:

``` bash
git status
```

Lalu commit dan push perubahan Mobile:

``` bash
git add <FOLDER_MOBILE>
git commit -m "feat: mobile frontend"
git push origin mobile-frontend
```

Sesuaikan `<FOLDER_MOBILE>` dengan nama folder sebenarnya. Setelah itu,
buat Pull Request dari `mobile-frontend` ke `develop` untuk direview.

------------------------------------------------------------------------

## Jika ada kendala

Kirim ke grup tim: 1. Error lengkap dari terminal atau Expo. 2.
Langkah/perintah yang dijalankan. 3. Fitur yang sedang dikerjakan.

Jangan mengubah konfigurasi backend atau menghapus file project untuk
mencoba memperbaiki error tanpa koordinasi dengan PIC.

**Catatan untuk PIC:** sebelum panduan ini dipakai, pastikan nama folder
Mobile dan cara menjalankan backend sesuai dengan struktur serta
`package.json` repository LYNORA.
