# 🔧 Setup Environment Variables (.env)

Dokumentasi untuk setup file `.env` untuk konfigurasi aplikasi dan database.

## 📋 Quick Start

1. Copy file contoh:
   ```bash
   cp env.example .env
   ```

2. Edit file `.env` dengan konfigurasi Anda:
   ```bash
   nano .env
   # atau
   vi .env
   ```

3. Restart aplikasi untuk menerapkan perubahan:
   ```bash
   pm2 restart mo-receiver-kmi
   ```

## 📝 Contoh Konfigurasi

### 1. Konfigurasi dengan PostgreSQL (Production)

```env
# Application Configuration
PORT=4001
HOST=0.0.0.0
NODE_ENV=production
AUTH_TOKEN=your_strong_secret_token_here

# Database Configuration - PostgreSQL
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kmi_receiver
DB_USER=admin
DB_PASSWORD=admin123
```

### 2. Konfigurasi dengan SQLite (Development)

```env
# Application Configuration
PORT=4001
HOST=localhost
NODE_ENV=development
AUTH_TOKEN=dev_token_12345

# Database Configuration - SQLite
DB_TYPE=sqlite
DB_PATH=./kmi_receiver.db
```

## 🔐 Environment Variables

### Application Configuration

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PORT` | Port untuk menjalankan server | `4001` | No |
| `HOST` | Host untuk binding server | `0.0.0.0` | No |
| `NODE_ENV` | Environment mode (`development`, `production`) | - | No |
| `AUTH_TOKEN` | Token untuk autentikasi API endpoint | - | Yes (untuk production) |

### Database Configuration

#### PostgreSQL

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_TYPE` | Tipe database (`sqlite` atau `postgresql`) | `sqlite` | No |
| `DB_HOST` | PostgreSQL host | `localhost` | Yes (jika PostgreSQL) |
| `DB_PORT` | PostgreSQL port | `5432` | No |
| `DB_NAME` | Nama database | `kmi_receiver` | Yes (jika PostgreSQL) |
| `DB_USER` | PostgreSQL username | `kmi_user` | Yes (jika PostgreSQL) |
| `DB_PASSWORD` | PostgreSQL password | - | Yes (jika PostgreSQL) |

#### SQLite

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DB_TYPE` | Tipe database (`sqlite` atau `postgresql`) | `sqlite` | No |
| `DB_PATH` | Path ke file database SQLite | `./kmi_receiver.db` | No |

## 🔒 Security Best Practices

### 1. Generate Strong AUTH_TOKEN

```bash
# Generate random token (32 bytes)
openssl rand -hex 32

# Atau menggunakan Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Protect .env File

- ✅ **DO NOT** commit `.env` file ke git repository
- ✅ File `.env` sudah ada di `.gitignore`
- ✅ Gunakan `env.example` sebagai template
- ✅ Set permission yang tepat: `chmod 600 .env`

### 3. Database Credentials

- ✅ Gunakan password yang kuat untuk production
- ✅ Jangan gunakan password default seperti `admin123` di production
- ✅ Gunakan user dengan privileges terbatas (bukan superuser)
- ✅ Simpan credentials di `.env`, bukan di code

## 📍 Lokasi File .env

### Development (Local)
```
website/
└── .env
```

### Production (VPS)
```
/opt/mo-receiver/website/
└── .env
```

## 🚀 Setup di VPS

### 1. Buat file .env di VPS

```bash
cd /opt/mo-receiver/website
nano .env
```

### 2. Copy konfigurasi

Paste konfigurasi sesuai kebutuhan Anda (lihat contoh di atas).

### 3. Set permission

```bash
chmod 600 .env
```

### 4. Restart aplikasi

```bash
pm2 restart mo-receiver-kmi
```

## 🧪 Testing Configuration

### Test dengan SQLite

```bash
# Set environment variables
export DB_TYPE=sqlite
export DB_PATH=./kmi_receiver.db

# Run application
npm start
```

### Test dengan PostgreSQL

```bash
# Set environment variables
export DB_TYPE=postgresql
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=kmi_receiver
export DB_USER=admin
export DB_PASSWORD=admin123

# Run application
npm start
```

## 🐛 Troubleshooting

### Error: "Cannot find module"
- Pastikan dependencies terinstall: `npm install`
- Cek apakah `package.json` valid

### Error: "Database connection failed" (PostgreSQL)
- Pastikan PostgreSQL service berjalan: `sudo systemctl status postgresql`
- Cek credentials di `.env` file
- Test koneksi: `psql -h localhost -U admin -d kmi_receiver`

### Error: "Permission denied" untuk .env
- Set permission: `chmod 600 .env`
- Pastikan user yang menjalankan aplikasi memiliki akses read ke file

### Environment variables tidak terbaca
- Pastikan file `.env` ada di directory yang sama dengan `server.js`
- Restart aplikasi setelah mengubah `.env`
- Cek apakah PM2 membaca `.env` file (gunakan `pm2 restart mo-receiver-kmi --update-env`)

## 📝 Contoh Lengkap untuk Production

```env
# ============================================
# MO Receiver Website - Production
# ============================================

# Application
PORT=4001
HOST=0.0.0.0
NODE_ENV=production
AUTH_TOKEN=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6

# Database - PostgreSQL
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kmi_receiver
DB_USER=admin
DB_PASSWORD=admin123
```

## 📝 Contoh Lengkap untuk Development

```env
# ============================================
# MO Receiver Website - Development
# ============================================

# Application
PORT=4001
HOST=localhost
NODE_ENV=development
AUTH_TOKEN=dev_token_12345

# Database - SQLite
DB_TYPE=sqlite
DB_PATH=./kmi_receiver.db
```

## 🔄 Update Environment Variables

Setelah mengubah `.env` file:

1. **Development:**
   ```bash
   # Stop aplikasi (Ctrl+C)
   # Start ulang
   npm start
   ```

2. **Production (PM2):**
   ```bash
   pm2 restart mo-receiver-kmi --update-env
   ```

3. **Verifikasi:**
   ```bash
   pm2 logs mo-receiver-kmi
   # Cek apakah aplikasi membaca konfigurasi baru
   ```
