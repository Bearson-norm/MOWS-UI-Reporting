# 🚀 Panduan Deployment ke VPS

Panduan lengkap untuk deploy MO Receiver Website ke VPS dengan port 4001 (Branch KMI).

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

## 📤 Langkah 2: Setup GitHub Actions untuk Deployment

### 1. Setup SSH Key di VPS

```bash
# Generate SSH key untuk GitHub Actions (jika belum ada)
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""

# Tampilkan public key untuk ditambahkan ke GitHub Secrets
cat ~/.ssh/github_actions.pub

# Tambahkan private key ke authorized_keys untuk deployment
cat ~/.ssh/github_actions >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 2. Setup GitHub Secrets

Di repository GitHub, buka **Settings > Secrets and variables > Actions**, tambahkan secrets berikut:

- `VPS_HOST`: IP address VPS Anda
- `VPS_USER`: Username SSH (biasanya `root` atau username VPS)
- `VPS_SSH_KEY`: Private key SSH (isi dari `~/.ssh/github_actions`)
- `VPS_DEPLOY_PATH`: Path deployment (contoh: `/opt/mo-reporting`)

### 3. Buat GitHub Actions Workflow

Buat file `.github/workflows/deploy.yml` di repository:

```yaml
name: Deploy to VPS

on:
  push:
    branches:
      - KMI  # Branch yang akan di-deploy
  workflow_dispatch:  # Manual trigger

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.VPS_SSH_KEY }}" > ~/.ssh/deploy_key
          chmod 600 ~/.ssh/deploy_key
          ssh-keyscan -H ${{ secrets.VPS_HOST }} >> ~/.ssh/known_hosts
      
      - name: Deploy to VPS
        env:
          VPS_HOST: ${{ secrets.VPS_HOST }}
          VPS_USER: ${{ secrets.VPS_USER }}
          VPS_DEPLOY_PATH: ${{ secrets.VPS_DEPLOY_PATH }}
        run: |
          ssh -i ~/.ssh/deploy_key ${{ secrets.VPS_USER }}@${{ secrets.VPS_HOST }} << 'EOF'
            cd ${{ secrets.VPS_DEPLOY_PATH }}
            
            # Pull latest code
            git fetch origin
            git checkout KMI
            git pull origin KMI
            
            # Install/update dependencies
            npm install --production
            
            # Restart application dengan PM2
            pm2 restart mo-receiver-kmi || pm2 start server.js --name mo-receiver-kmi
            
            # Save PM2 process list
            pm2 save
          EOF
      
      - name: Cleanup
        run: |
          rm -f ~/.ssh/deploy_key
```

### 4. Setup Repository di VPS (First Time)

```bash
# Di VPS, clone repository untuk pertama kali
cd /opt
git clone YOUR_REPOSITORY_URL mo-receiver
cd mo-receiver

# Checkout branch KMI
git checkout KMI

# Install dependencies
npm install --production
```

**Catatan:** Setelah setup GitHub Actions, deployment akan otomatis setiap kali push ke branch KMI.

---

## ⚙️ Langkah 3: Setup Aplikasi di VPS

**Catatan:** Jika menggunakan GitHub Actions, langkah ini hanya perlu dilakukan sekali saat setup awal. Setelah itu, deployment akan otomatis via GitHub Actions.

### Masuk ke direktori aplikasi

```bash
cd /opt/mo-reporting
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
Server is running on http://0.0.0.0:4001
API endpoint for receiving data: http://0.0.0.0:4001/api/mo/receive
API endpoint for MO list: http://0.0.0.0:4001/api/mo-list
For external access, use your VPS IP: http://YOUR_VPS_IP:4001
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

# Allow port 4001
sudo ufw allow 4001/tcp

# Check status
sudo ufw status
```

### CentOS/RHEL (firewalld)

```bash
# Start firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# Allow port 4001
sudo firewall-cmd --permanent --add-port=4001/tcp
sudo firewall-cmd --reload

# Check status
sudo firewall-cmd --list-all
```

---

## 🎯 Langkah 5: Jalankan dengan PM2

### Start aplikasi dengan PM2

```bash
pm2 start server.js --name mo-receiver-kmi
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
pm2 logs mo-receiver-kmi

# Restart aplikasi
pm2 restart mo-receiver-kmi

# Stop aplikasi
pm2 stop mo-receiver-kmi

# Delete aplikasi dari PM2
pm2 delete mo-receiver-kmi

# Monitor real-time
pm2 monit
```

---

## 🌐 Langkah 6: Test dari External

### Test dengan Browser

Buka browser dan akses:
```
http://YOUR_VPS_IP:4001
```

### Test API dengan cURL

```bash
# Test dari komputer lokal
curl http://YOUR_VPS_IP:4001/api/mo-list

# Test POST dengan data
curl -X POST http://YOUR_VPS_IP:4001/api/mo/receive \
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

## 🗄️ Langkah 7: Setup PostgreSQL Database (Optional)

Jika ingin menggunakan PostgreSQL sebagai database (lebih robust untuk production), ikuti langkah berikut:

### 1. Install PostgreSQL

#### Ubuntu/Debian:
```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verifikasi instalasi
sudo systemctl status postgresql
```

#### CentOS/RHEL:
```bash
# Install PostgreSQL repository
sudo yum install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-7-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL 14
sudo yum install -y postgresql14-server postgresql14

# Initialize database
sudo /usr/pgsql-14/bin/postgresql-14-setup initdb

# Start PostgreSQL service
sudo systemctl start postgresql-14
sudo systemctl enable postgresql-14

# Verifikasi instalasi
sudo systemctl status postgresql-14
```

### 2. Buat Database dan User

```bash
# Switch ke user postgres
sudo -u postgres psql

# Di dalam PostgreSQL prompt, jalankan:
CREATE DATABASE kmi_receiver;
CREATE USER kmi_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE kmi_receiver TO kmi_user;

# Untuk PostgreSQL 15+, perlu grant schema privileges juga
\c kmi_receiver
GRANT ALL ON SCHEMA public TO kmi_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kmi_user;

# Exit PostgreSQL
\q
```

**Catatan:** Ganti `your_secure_password_here` dengan password yang kuat!

### 3. Setup Schema/Tables

Aplikasi akan membuat tabel otomatis saat pertama kali dijalankan. Namun, jika ingin membuat manual:

```bash
# Login sebagai kmi_user
sudo -u postgres psql -d kmi_receiver -U kmi_user

# Jalankan SQL untuk membuat tabel
CREATE TABLE IF NOT EXISTS received_work_orders (
  id SERIAL PRIMARY KEY,
  work_order VARCHAR(255) UNIQUE NOT NULL,
  sku VARCHAR(255),
  formulation_name VARCHAR(255),
  production_date VARCHAR(255),
  planned_quantity NUMERIC,
  status VARCHAR(255),
  operator_name VARCHAR(255),
  end_time VARCHAR(255),
  data_json TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

# Exit
\q
```

### 4. Konfigurasi PostgreSQL untuk Remote Access (Optional)

Jika aplikasi berjalan di server berbeda dari PostgreSQL:

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf
# atau untuk CentOS: sudo nano /var/lib/pgsql/14/data/postgresql.conf

# Uncomment dan ubah:
listen_addresses = '*'  # atau IP spesifik

# Edit pg_hba.conf untuk authentication
sudo nano /etc/postgresql/14/main/pg_hba.conf
# atau untuk CentOS: sudo nano /var/lib/pgsql/14/data/pg_hba.conf

# Tambahkan baris (untuk localhost):
host    kmi_receiver    kmi_user    127.0.0.1/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
# atau untuk CentOS: sudo systemctl restart postgresql-14
```

### 5. Update Environment Variables

Edit file `.env` untuk menggunakan PostgreSQL:

```bash
cd /opt/mo-reporting
nano .env
```

Tambahkan konfigurasi PostgreSQL:
```env
PORT=4001
HOST=0.0.0.0
NODE_ENV=production
AUTH_TOKEN=YOUR_SECRET_TOKEN_HERE

# PostgreSQL Configuration
DB_TYPE=postgresql
DB_HOST=localhost
DB_PORT=5432
DB_NAME=kmi_receiver
DB_USER=kmi_user
DB_PASSWORD=your_secure_password_here
```

### 6. Test Koneksi PostgreSQL

```bash
# Test koneksi dari command line
sudo -u postgres psql -d kmi_receiver -U kmi_user -h localhost

# Jika berhasil, akan masuk ke PostgreSQL prompt
# Ketik \q untuk exit
```

### 7. Setup Backup Otomatis untuk PostgreSQL

Buat script backup:

```bash
# Buat direktori backup
mkdir -p /opt/mo-reporting/backups

# Buat script backup
sudo nano /opt/mo-reporting/backup-postgresql.sh
```

Isi script:
```bash
#!/bin/bash
BACKUP_DIR="/opt/mo-reporting/backups"
DB_NAME="kmi_receiver"
DB_USER="kmi_user"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/kmi_receiver_$DATE.sql"

# Backup database
PGPASSWORD='your_secure_password_here' pg_dump -h localhost -U $DB_USER -d $DB_NAME > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Hapus backup lebih dari 30 hari
find $BACKUP_DIR -name "kmi_receiver_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

Buat executable:
```bash
chmod +x /opt/mo-reporting/backup-postgresql.sh
```

Setup cron job untuk backup harian:
```bash
# Edit crontab
crontab -e

# Tambahkan baris untuk backup setiap hari jam 2 pagi:
0 2 * * * /opt/mo-reporting/backup-postgresql.sh >> /opt/mo-reporting/backups/backup.log 2>&1
```

### 8. Restart Aplikasi dengan PostgreSQL

```bash
# Restart PM2 dengan environment variables baru
pm2 restart mo-receiver-kmi --update-env

# Atau jika menggunakan .env file, pastikan PM2 membaca .env
pm2 restart mo-receiver-kmi

# Check logs
pm2 logs mo-receiver-kmi
```

### Troubleshooting PostgreSQL

**Error: "password authentication failed"**
- Pastikan password di `.env` sesuai dengan password user di PostgreSQL
- Cek `pg_hba.conf` untuk konfigurasi authentication

**Error: "database does not exist"**
- Pastikan database `kmi_receiver` sudah dibuat
- Verifikasi dengan: `sudo -u postgres psql -l`

**Error: "permission denied"**
- Pastikan user `kmi_user` memiliki privileges yang cukup
- Jalankan: `GRANT ALL PRIVILEGES ON DATABASE kmi_receiver TO kmi_user;`

**Error: "connection refused"**
- Pastikan PostgreSQL service berjalan: `sudo systemctl status postgresql`
- Cek firewall: PostgreSQL default port adalah 5432

---

## 🔒 Langkah 8: Security Best Practices

### 1. Setup Environment Variables

Buat file `.env` untuk konfigurasi:

```bash
cd /opt/mo-reporting
nano .env
```

Isi file `.env`:
```env
PORT=4001
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

## 🔄 Langkah 9: Setup Reverse Proxy dengan Nginx (Optional)

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
        proxy_pass http://localhost:4001;
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
pm2 logs mo-receiver-kmi

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
0 2 * * * cp /opt/mo-reporting/kmi_receiver.db /opt/mo-reporting/backups/mo_receiver_$(date +\%Y\%m\%d).db
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

# Cek apakah port 4001 listening
sudo netstat -tlnp | grep 4001

# Cek firewall
sudo ufw status
# atau
sudo firewall-cmd --list-all

# Cek logs untuk error
pm2 logs mo-receiver-kmi
```

### Port sudah digunakan

```bash
# Cek proses yang menggunakan port 4001
sudo lsof -i :4001

# Kill proses jika perlu
sudo kill -9 PID_NUMBER
```

### Permission denied

```bash
# Berikan permission yang tepat
sudo chown -R $USER:$USER /opt/mo-reporting
chmod -R 755 /opt/mo-reporting
```

### Database error

```bash
# Restore dari backup
cp /opt/mo-reporting/backups/mo_receiver_YYYYMMDD.db /opt/mo-reporting/kmi_receiver.db

# Atau buat database baru
rm /opt/mo-reporting/kmi_receiver.db
pm2 restart mo-receiver-kmi
```

---

## 📱 Update Aplikasi

### Cara Update dengan GitHub Actions (Recommended)

Update otomatis dilakukan oleh GitHub Actions setiap kali push ke branch KMI. Untuk trigger manual:

1. Buka repository di GitHub
2. Pergi ke **Actions** tab
3. Pilih workflow **Deploy to VPS**
4. Klik **Run workflow** > Pilih branch **KMI** > **Run workflow**

### Cara Update Manual (Jika GitHub Actions Gagal)

```bash
cd /opt/mo-reporting

# Backup database dulu
cp kmi_receiver.db kmi_receiver_backup_$(date +%Y%m%d).db

# Pull latest code dari branch KMI
git fetch origin
git checkout KMI
git pull origin KMI

# Install dependencies baru (jika ada)
npm install --production

# Restart aplikasi
pm2 restart mo-receiver-kmi

# Check logs
pm2 logs mo-receiver-kmi
```

---

## 📞 Quick Reference

### Server Information

- **Server IP**: YOUR_VPS_IP
- **Application Port**: 4001
- **Application URL**: http://YOUR_VPS_IP:4001
- **API Endpoint**: http://YOUR_VPS_IP:4001/api/mo/receive
- **Install Directory**: /opt/mo-reporting
- **Database File (SQLite)**: /opt/mo-reporting/kmi_receiver.db
- **Database Name (PostgreSQL)**: kmi_receiver

### Important Commands

```bash
# Start application
pm2 start server.js --name mo-receiver-kmi

# Restart application
pm2 restart mo-receiver-kmi

# View logs
pm2 logs mo-receiver-kmi

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
- [ ] Firewall configured (port 4001 dibuka)
- [ ] GitHub Actions workflow sudah dibuat
- [ ] GitHub Secrets sudah dikonfigurasi
- [ ] Aplikasi running dengan PM2 (process: mo-receiver-kmi)
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
http://YOUR_VPS_IP:4001/api/mo/receive
```

**Happy deploying! 🚀**

