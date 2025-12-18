# 🚀 Panduan Deployment ke VPS

Panduan lengkap untuk deploy MO Receiver Website ke VPS dengan port 4000.

## 📋 Prasyarat

- VPS dengan OS Linux (Ubuntu/Debian/CentOS recommended)
- Akses SSH ke VPS
- Node.js versi 14.x atau lebih baru
- PM2 untuk process management (optional tapi recommended)

---

## 🔧 Langkah 1: Persiapan VPS

### Login ke VPS via SSH

```bash
ssh username@YOUR_VPS_IP
```

### Update sistem

```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### Install Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Verifikasi instalasi
node -v
npm -v
```

### Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## 📤 Langkah 2: Upload File ke VPS

### Option A: Menggunakan Git (Recommended)

```bash
# Di VPS, clone repository
cd /opt  # atau direktori pilihan Anda
git clone YOUR_REPOSITORY_URL mo-receiver
cd mo-receiver
```

### Option B: Menggunakan SCP

```bash
# Di komputer lokal (Windows PowerShell atau Linux/Mac Terminal)
scp -r C:\path\to\your\project username@YOUR_VPS_IP:/opt/mo-receiver
```

### Option C: Menggunakan FTP/SFTP

Gunakan software seperti FileZilla atau WinSCP untuk upload file.

---

## ⚙️ Langkah 3: Setup Aplikasi di VPS

### Masuk ke direktori aplikasi

```bash
cd /opt/mo-receiver
```

### Install dependencies

```bash
npm install --production
```

### Test jalankan aplikasi

```bash
npm start
```

Jika berhasil, Anda akan melihat:
```
Server is running on http://0.0.0.0:4000
API endpoint for receiving data: http://0.0.0.0:4000/api/mo/receive
API endpoint for MO list: http://0.0.0.0:4000/api/mo-list
For external access, use your VPS IP: http://YOUR_VPS_IP:4000
```

Tekan `Ctrl+C` untuk stop server (kita akan jalankan dengan PM2).

---

## 🔥 Langkah 4: Setup Firewall

### Ubuntu/Debian (UFW)

```bash
# Enable UFW
sudo ufw enable

# Allow SSH (penting! jangan lupa ini)
sudo ufw allow 22

# Allow port 4000
sudo ufw allow 4000/tcp

# Check status
sudo ufw status
```

### CentOS/RHEL (firewalld)

```bash
# Start firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow port 4000
sudo firewall-cmd --permanent --add-port=4000/tcp
sudo firewall-cmd --reload

# Check status
sudo firewall-cmd --list-all
```

---

## 🎯 Langkah 5: Jalankan dengan PM2

### Start aplikasi dengan PM2

```bash
pm2 start server.js --name mo-receiver
```

### Setup PM2 untuk auto-start saat reboot

```bash
pm2 startup
# Ikuti instruksi yang muncul (copy-paste command yang diberikan)

pm2 save
```

### Useful PM2 Commands

```bash
# Lihat status aplikasi
pm2 status

# Lihat logs
pm2 logs mo-receiver

# Restart aplikasi
pm2 restart mo-receiver

# Stop aplikasi
pm2 stop mo-receiver

# Delete aplikasi dari PM2
pm2 delete mo-receiver

# Monitor real-time
pm2 monit
```

---

## 🌐 Langkah 6: Test dari External

### Test dengan Browser

Buka browser dan akses:
```
http://YOUR_VPS_IP:4000
```

### Test API dengan cURL

```bash
# Test dari komputer lokal
curl http://YOUR_VPS_IP:4000/api/mo-list

# Test POST dengan data
curl -X POST http://YOUR_VPS_IP:4000/api/mo/receive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "work_order": "MO-TEST-001",
    "sku": "SKU-001",
    "formulation_name": "Test Formula",
    "production_date": "2024-12-19T10:00:00Z",
    "planned_quantity": 1000.0,
    "status": "completed",
    "operator_name": "Test User",
    "end_time": "2024-12-19T12:00:00Z",
    "ingredients": []
  }'
```

---

## 🔒 Langkah 7: Security Best Practices

### 1. Setup Environment Variables

Buat file `.env` untuk konfigurasi:

```bash
cd /opt/mo-receiver
nano .env
```

Isi file `.env`:
```env
PORT=4000
HOST=0.0.0.0
NODE_ENV=production
AUTH_TOKEN=YOUR_SECRET_TOKEN_HERE
```

### 2. Restrict SSH Access

Edit SSH config:
```bash
sudo nano /etc/ssh/sshd_config
```

Recommended settings:
```
PermitRootLogin no
PasswordAuthentication no  # Jika sudah setup SSH key
Port 2222  # Ubah default SSH port (optional)
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

### 3. Setup Fail2Ban (Anti Brute Force)

```bash
# Ubuntu/Debian
sudo apt install fail2ban -y

# CentOS/RHEL
sudo yum install fail2ban -y

# Start service
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

### 4. Regular Updates

Setup automatic security updates:
```bash
# Ubuntu/Debian
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## 🔄 Langkah 8: Setup Reverse Proxy dengan Nginx (Optional)

Jika ingin menggunakan domain dan SSL:

### Install Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/mo-receiver
```

Isi konfigurasi:
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
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/mo-receiver /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Install SSL dengan Let's Encrypt (Optional)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Dapatkan SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal sudah setup otomatis
```

---

## 📊 Langkah 9: Monitoring dan Maintenance

### Monitor Log Files

```bash
# PM2 logs
pm2 logs mo-receiver

# Nginx logs (jika pakai nginx)
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# System logs
journalctl -u pm2-username -f
```

### Database Backup

```bash
# Setup cron job untuk backup otomatis
crontab -e

# Tambahkan line ini (backup setiap hari jam 2 pagi)
0 2 * * * cp /opt/mo-receiver/mo_receiver.db /opt/mo-receiver/backups/mo_receiver_$(date +\%Y\%m\%d).db
```

### Monitor Resource Usage

```bash
# CPU & Memory
htop

# Disk usage
df -h

# PM2 monitoring
pm2 monit
```

---

## 🐛 Troubleshooting

### Aplikasi tidak bisa diakses dari luar

```bash
# Cek apakah aplikasi running
pm2 status

# Cek apakah port 4000 listening
sudo netstat -tlnp | grep 4000

# Cek firewall
sudo ufw status
# atau
sudo firewall-cmd --list-all

# Cek logs untuk error
pm2 logs mo-receiver
```

### Port sudah digunakan

```bash
# Cek proses yang menggunakan port 4000
sudo lsof -i :4000

# Kill proses jika perlu
sudo kill -9 PID_NUMBER
```

### Permission denied

```bash
# Berikan permission yang tepat
sudo chown -R $USER:$USER /opt/mo-receiver
chmod -R 755 /opt/mo-receiver
```

### Database error

```bash
# Restore dari backup
cp /opt/mo-receiver/backups/mo_receiver_YYYYMMDD.db /opt/mo-receiver/mo_receiver.db

# Atau buat database baru
rm /opt/mo-receiver/mo_receiver.db
pm2 restart mo-receiver
```

---

## 📱 Update Aplikasi

### Cara update aplikasi ke versi baru:

```bash
cd /opt/mo-receiver

# Backup database dulu
cp mo_receiver.db mo_receiver_backup_$(date +%Y%m%d).db

# Pull latest code (jika pakai Git)
git pull

# Atau upload file baru via SCP/FTP

# Install dependencies baru (jika ada)
npm install --production

# Restart aplikasi
pm2 restart mo-receiver

# Check logs
pm2 logs mo-receiver
```

---

## 📞 Quick Reference

### Server Information

- **Server IP**: YOUR_VPS_IP
- **Application Port**: 4000
- **Application URL**: http://YOUR_VPS_IP:4000
- **API Endpoint**: http://YOUR_VPS_IP:4000/api/mo/receive
- **Install Directory**: /opt/mo-receiver
- **Database File**: /opt/mo-receiver/mo_receiver.db

### Important Commands

```bash
# Start application
pm2 start server.js --name mo-receiver

# Restart application
pm2 restart mo-receiver

# View logs
pm2 logs mo-receiver

# View status
pm2 status

# Stop application
pm2 stop mo-receiver

# Check open ports
sudo netstat -tlnp

# Check firewall
sudo ufw status        # Ubuntu/Debian
sudo firewall-cmd --list-all  # CentOS/RHEL
```

---

## ✅ Deployment Checklist

- [ ] VPS setup dan OS updated
- [ ] Node.js dan npm terinstall
- [ ] PM2 terinstall
- [ ] File aplikasi sudah diupload ke VPS
- [ ] Dependencies terinstall (`npm install`)
- [ ] Firewall configured (port 4000 dibuka)
- [ ] Aplikasi running dengan PM2
- [ ] PM2 auto-startup configured
- [ ] Test akses dari browser eksternal
- [ ] Test API endpoint dengan cURL
- [ ] Database backup setup
- [ ] Monitoring setup
- [ ] Security best practices diterapkan
- [ ] Documentation updated dengan IP/domain VPS

---

## 🎉 Selesai!

Aplikasi sudah siap digunakan di production. 

Untuk integrasi dengan website eksternal, gunakan endpoint:
```
http://YOUR_VPS_IP:4000/api/mo/receive
```

**Happy deploying! 🚀**

