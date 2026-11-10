# 🏪 WarungKu - Aplikasi Kasir Warung Lengkap & Toko Online Android

**WarungKu** adalah aplikasi kasir pintar (Point of Sale / POS) serba bisa yang dirancang khusus untuk kebutuhan warung kelontong, sembako, warung makan, warteg, warkop, dan toko kelontong di Indonesia. 

Aplikasi ini dapat dijalankan langsung di **HP Android**, mendukung **mode Online (Cloud Sync)** maupun **Offline 100%**, serta dilengkapi fitur wajib warung Indonesia: **Buku Kasbon / Hutang Pelanggan** dan **Katalog Toko Online WhatsApp**.

---

## 🌟 Fitur Utama & Keunggulan

### 1. 🛒 Kasir Pintar (Point of Sale)
- **Katalog Produk Cepat**: Filter kategori (Sembako, Minuman, Makanan/Snack, Rokok, Bumbu, Pulsa/PLN).
- **Scanner Barcode Kamera Android**: Scan barcode barang menggunakan kamera HP Android secara realtime dengan suara beep kasir.
- **Keranjang Belanja Interaktif**: Tambah, kurangi jumlah, dan hitung diskon otomatis.
- **Pembayaran Fleksibel**:
  - **Tunai**: Tombol cepat uang pecahan (Uang Pas, Rp 10.000, 20.000, 50.000, 100.000) dan kalkulator uang kembalian otomatis.
  - **QRIS Dinamis**: Tampilkan kode QRIS warung dengan nominal pas untuk pembayaran nontunai (GoPay, OVO, Dana, ShopeePay, BCA, dll).
  - **Kasbon / Hutang**: Otomatis dicatat ke buku hutang tanpa menambah kas tunai saat ini.
- **Struk Belanja Digital**:
  - Cetak struk printer thermal Bluetooth 58mm / 80mm.
  - Tombol **Kirim Struk ke WhatsApp Pelanggan** dengan format nota rapi.

### 2. 📒 Buku Kasbon / Hutang Pelanggan (Fitur Khas Warung)
- Catat hutang belanja pelanggan lengkap dengan tanggal dan rincian barang.
- Pembayaran cicilan / pelunasan bertahap.
- Status hutang: *Belum Bayar*, *Dicicil*, atau *Lunas*.
- **Tombol "Tagih via WhatsApp"**: Mengirim template pengingat hutang ramah dan sopan langsung ke chat WhatsApp pelanggan dengan rincian nominal dan rekening/QRIS warung.

### 3. 📦 Manajemen Produk & Stok Otomatis
- Catat Harga Modal (Beli) vs Harga Jual untuk menghitung potensi keuntungan per produk.
- Stok otomatis berkurang setiap transaksi kasir.
- Peringatan stok menipis (*Low Stock Alert*) berwarna kuning/merah jika stok di bawah batas aman.
- Pengaturan cepat stok (`+1`, `-1`) langsung dari daftar barang tanpa ribet.

### 4. 📊 Laporan Keuangan & Laba Bersih Warung
- Ringkasan Omset Harian, Mingguan, Bulanan.
- **Perhitungan Keuntungan Bersih (Laba)** otomatis dari selisih harga jual dikurangi modal.
- Grafik tren penjualan 7 hari terakhir.
- Daftar 5 Produk Paling Laris (*Top Selling Products*).
- Riwayat transaksi detail: bisa cetak ulang struk atau batalkan transaksi (stok otomatis dikembalikan).
- Ekspor laporan ke file **CSV / Excel**.

### 5. 🌐 Toko Online Pelanggan (Online Storefront)
- Halaman web khusus pelanggan (`online-store.html`) yang bisa dibagikan link-nya atau dicetak QR-nya di meja warung.
- Pelanggan dapat memesan sembako/makanan, memilih metode (Diantar ke Rumah / Ambil Sendiri), dan langsung checkout pesanan ke WhatsApp pemilik warung.

### 6. ☁️ Mode Online (Cloud Sync) & Offline First
- **Offline First**: Aplikasi tetap berfungsi 100% lancar walau mati lampu atau sinyal internet HP hilang.
- **Cloud Sync (Firebase Realtime Database)**: Sinkronisasi data produk, kasir, dan kasbon antar HP/perangkat kasir secara otomatis.
- **Backup & Restore**: Simpan cadangan data toko ke file JSON dan pulihkan kapan saja.

---

## 📱 Cara Memasang di HP Android

Anda memiliki 2 pilihan mudah untuk menjalankan aplikasi ini di HP Android:

### Opsi A: Pasang Langsung via Google Chrome Android (PWA - 1 Detik, Direkomendasikan)
1. Buka file `index.html` di Google Chrome pada HP Android Anda (atau unggah folder ini ke hosting gratis seperti GitHub Pages, Vercel, Netlify, atau Cloudflare Pages).
2. Di browser Chrome Android, ketuk tombol **Menu titik tiga (⋮)** di pojok kanan atas.
3. Pilih **"Tambahkan ke Layar Utama"** atau **"Pasang Aplikasi" (Install App)**.
4. Ikon **WarungKu** akan muncul di menu aplikasi HP Android Anda layaknya aplikasi dari Google Play Store!
5. Buka aplikasi: tampilan akan full-screen tanpa address bar browser, mendukung notifikasi, getaran haptic, dan kamera barcode.

### Opsi B: Build Menjadi File APK (Android Studio / Capacitor)
Jika Anda ingin menghasilkan file `.apk` asli:
1. Pastikan Node.js terpasang di komputer Anda.
2. Di folder proyek ini, jalankan:
   ```bash
   npm install
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
3. Android Studio akan terbuka secara otomatis.
4. Klik **Build > Build Bundle(s) / APK(s) > Build APK(s)** untuk membuat file `app-release.apk` atau `app-debug.apk` yang bisa langsung ditransfer ke HP Android.

---

## ☁️ Cara Mengaktifkan Mode Online (Firebase Gratis)

1. Buka [Firebase Console](https://console.firebase.google.com/) menggunakan akun Google Anda (Gratis).
2. Buat proyek baru (misal: `warung-berkah`).
3. Di menu sebelah kiri, pilih **Build > Realtime Database**, lalu klik **Create Database**.
4. Pilih lokasi server (misal: `asia-southeast1` Singapura untuk kecepatan maksimal di Indonesia).
5. Pada tab **Rules**, ubah pengaturan sementara untuk akses toko Anda:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```
6. Salin URL database Anda (contoh: `https://warung-berkah-default-rtdb.asia-southeast1.firebasedatabase.app`).
7. Buka aplikasi WarungKu di HP Android > Buka tab **Pengaturan (Toko)** > Gulir ke bagian **Sinkronisasi Cloud Online**:
   - Aktifkan tombol **Cloud Sync**.
   - Tempel URL Firebase Anda ke kolom yang tersedia.
   - Ketuk **Simpan Konfigurasi Cloud** lalu **Sinkronkan Sekarang**.
8. Selesai! Semua data warung Anda kini tersimpan aman di Cloud dan otomatis tersinkron ke semua HP kasir Anda.

---

## 📂 Struktur File Proyek

```text
warung-app/
├── index.html             # Aplikasi utama WarungKu POS (Kasir, Stok, Kasbon, Laporan)
├── online-store.html      # Katalog online pesanan pelanggan via WhatsApp
├── app.js                 # Kontroler logika kasir, scanner, struk, audio synth, dan grafik
├── db.js                  # Database lokal (Offline-First) + Sinkronisasi Cloud Firebase
├── manifest.json          # Android Web App Manifest (PWA)
├── sw.js                  # Service Worker untuk cache offline di Android
├── icon.svg               # Logo & ikon aplikasi WarungKu
├── capacitor.config.json  # Konfigurasi Capacitor untuk build APK Android
├── package.json           # Dependensi & skrip build
└── README.md              # Dokumentasi lengkap
```

---

*Dibuat untuk memajukan UMKM dan warung tradisional Indonesia menjadi warung modern yang efisien dan serba digital!* 🇮🇩
