# 🚀 Quick Start Guide

Panduan cepat untuk menjalankan MO Receiver Website dalam 5 menit!

## ⚡ Langkah Cepat

### 1. Install Dependencies
```bash
npm install
```

### 2. Jalankan Server
```bash
npm start
```

Server akan berjalan di: **http://localhost:4000**

### 3. Buka Browser
Akses: **http://localhost:4000** (atau **http://YOUR_VPS_IP:4000** untuk akses dari luar)

### 4. Test dengan Sample Data
Buka terminal baru dan jalankan:
```bash
node test-send-data.js
```

Data sample akan otomatis masuk ke database dan muncul di website!

---

## 📋 Checklist Setup

- [ ] Node.js sudah terinstall (minimal versi 14.x)
- [ ] Port 4000 tersedia (tidak digunakan aplikasi lain)
- [ ] Dependencies sudah terinstall (`npm install`)
- [ ] Server sudah running (`npm start`)
- [ ] Browser bisa akses http://localhost:4000 (atau http://YOUR_VPS_IP:4000)
- [ ] Test data sudah berhasil (`node test-send-data.js`)
- [ ] Firewall VPS sudah dibuka untuk port 4000 (jika deploy ke VPS)

---

## 🔧 Quick Commands

| Command | Deskripsi |
|---------|-----------|
| `npm install` | Install dependencies |
| `npm start` | Jalankan server (production) |
| `npm run dev` | Jalankan server (development mode) |
| `node test-send-data.js` | Kirim sample data untuk testing |

---

## 🌐 Testing dari Website Eksternal

### Kirim Data dengan JavaScript:

```javascript
fetch('http://YOUR_VPS_IP:4000/api/mo/receive', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    work_order: "MO-2024-001",
    sku: "SKU-001",
    formulation_name: "Test Formula",
    production_date: "2024-12-19T10:00:00Z",
    planned_quantity: 1000.0,
    status: "completed",
    operator_name: "Operator",
    end_time: "2024-12-19T12:00:00Z",
    ingredients: [...]
  })
})
.then(res => res.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err))
```

### Kirim Data dengan cURL:

```bash
curl -X POST http://localhost:4000/api/mo/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d @sample-data.json
```

---

## 🎯 Cara Pakai Website

1. **View List MO**
   - Buka http://localhost:4000 (atau http://YOUR_VPS_IP:4000)
   - Lihat daftar MO yang sudah diterima

2. **View Report Detail**
   - Klik tombol "📄 View Report" pada MO
   - Lihat detail penimbangan lengkap

3. **Print Report**
   - Di halaman detail, klik "🖨️ Print"
   - Report siap dicetak

4. **Hapus Data**
   - Klik tombol "🗑️" untuk hapus MO

---

## 🐛 Troubleshooting Cepat

### Server tidak bisa start?
```bash
# Cek apakah port 4000 sudah digunakan
# Windows:
netstat -ano | findstr :4000

# Linux/Mac:
lsof -i :4000

# Atau gunakan port lain:
PORT=8080 npm start
```

### Test data tidak masuk?
1. Pastikan server sudah running
2. Cek console untuk error message
3. Coba refresh browser (F5)

### Database error?
```bash
# Hapus database dan restart server (data akan hilang!)
rm mo_receiver.db
npm start
```

---

## 📱 Deploy ke Server

### Deploy ke VPS/Server:

1. **Upload file ke server**
   ```bash
   scp -r * user@server:/path/to/mo-receiver/
   ```

2. **SSH ke server dan install**
   ```bash
   ssh user@server
   cd /path/to/mo-receiver
   npm install
   ```

3. **Jalankan dengan PM2 (recommended)**
   ```bash
   npm install -g pm2
   pm2 start server.js --name mo-receiver
   pm2 save
   pm2 startup
   ```

4. **Akses dari luar**
   - Buka firewall port 4000:
     ```bash
     # Ubuntu/Debian:
     sudo ufw allow 4000
     sudo ufw reload
     
     # CentOS/RHEL:
     sudo firewall-cmd --permanent --add-port=4000/tcp
     sudo firewall-cmd --reload
     ```
   - Atau gunakan nginx sebagai reverse proxy

### Nginx Reverse Proxy (optional):

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## ✅ Selesai!

Website sudah siap digunakan. Untuk dokumentasi lengkap, baca [README.md](README.md).

**Happy coding! 🎉**

