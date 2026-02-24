# 🔧 Setup GitHub Actions untuk CI/CD

Dokumentasi ini menjelaskan cara setup GitHub Actions untuk deployment otomatis ke VPS.

## 📋 Prasyarat

1. Repository GitHub sudah dibuat
2. VPS sudah setup dan bisa diakses via SSH
3. Branch `KMI` sudah dibuat
4. Struktur repository:
   ```
   MOWS-UI-Reporting/
   ├── .github/
   │   └── workflows/
   │       └── deploy.yml
   └── website/
       ├── server.js
       ├── package.json
       └── ...
   ```

## 🔐 Setup GitHub Secrets

Buka repository di GitHub, lalu:
1. Pergi ke **Settings** > **Secrets and variables** > **Actions**
2. Klik **New repository secret**
3. Tambahkan secrets berikut:

### 1. VPS_HOST
- **Name:** `VPS_HOST`
- **Value:** IP address atau domain VPS Anda
- **Contoh:** `123.456.789.0` atau `vps.example.com`

### 2. VPS_USER
- **Name:** `VPS_USER`
- **Value:** Username SSH untuk login ke VPS
- **Contoh:** `root` atau `ubuntu` atau username VPS Anda

### 3. VPS_SSH_KEY
- **Name:** `VPS_SSH_KEY`
- **Value:** Private SSH key untuk authentication
- **Cara mendapatkan:**
  ```bash
  # Di VPS, generate SSH key (jika belum ada)
  ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""
  
  # Tampilkan private key (copy semua isinya)
  cat ~/.ssh/github_actions
  
  # Tambahkan public key ke authorized_keys
  cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/authorized_keys
  ```
- **Penting:** Copy **private key** (bukan public key) ke GitHub Secrets

### 4. VPS_DEPLOY_PATH (Optional)
- **Name:** `VPS_DEPLOY_PATH`
- **Value:** Path deployment di VPS (root repository, bukan subfolder website)
- **Default:** `/opt/mo-receiver` (jika tidak diset)
- **Contoh:** `/opt/mo-receiver` atau `/home/user/mo-receiver`
- **Catatan:** Aplikasi akan ada di `$VPS_DEPLOY_PATH/website/`

## 🚀 Cara Menggunakan

### Deployment Otomatis
Workflow akan otomatis berjalan setiap kali:
- Push ke branch `KMI`
- Merge pull request ke branch `KMI`

### Deployment Manual
1. Buka repository di GitHub
2. Pergi ke tab **Actions**
3. Pilih workflow **Deploy to VPS**
4. Klik **Run workflow**
5. Pilih branch **KMI**
6. Klik **Run workflow**

## 📊 Monitoring Deployment

Setelah workflow berjalan, Anda bisa:
1. Lihat progress di tab **Actions**
2. Cek logs untuk setiap step
3. Lihat deployment summary di akhir workflow

## 🐛 Troubleshooting

### Error: "Permission denied (publickey)"
- Pastikan `VPS_SSH_KEY` berisi private key yang benar
- Pastikan public key sudah ditambahkan ke `~/.ssh/authorized_keys` di VPS
- Cek permission: `chmod 600 ~/.ssh/authorized_keys`

### Error: "Host key verification failed"
- Workflow sudah menggunakan `ssh-keyscan` untuk menambahkan host key
- Jika masih error, cek apakah VPS_HOST benar

### Error: "PM2 process not found"
- Ini normal untuk deployment pertama kali
- Workflow akan otomatis membuat process baru dengan `pm2 start`
- Pastikan PM2 process dijalankan dari directory `website/`

### Error: "npm install failed"
- Cek apakah Node.js terinstall di VPS
- Cek apakah `website/package.json` valid
- Lihat logs untuk detail error

### Deployment berhasil tapi aplikasi tidak running
- Cek PM2 logs: `pm2 logs mo-receiver-kmi`
- Cek PM2 status: `pm2 status`
- Cek working directory PM2: `pm2 show mo-receiver-kmi`
- Restart manual: `pm2 restart mo-receiver-kmi`

### Error: "Cannot find module" atau path issues
- Pastikan PM2 process dijalankan dengan working directory yang benar
- Cek apakah `server.js` ada di `website/` directory
- Verifikasi path deployment di VPS sesuai dengan struktur repository

## 🔒 Security Best Practices

1. **Jangan commit SSH keys ke repository**
   - Gunakan GitHub Secrets untuk menyimpan sensitive data
   - Pastikan `.env` file ada di `.gitignore`

2. **Gunakan SSH key khusus untuk GitHub Actions**
   - Jangan gunakan SSH key utama Anda
   - Buat key khusus dengan permission terbatas

3. **Restrict SSH access**
   - Gunakan firewall untuk membatasi akses SSH
   - Pertimbangkan menggunakan SSH key authentication saja (disable password)

4. **Monitor GitHub Actions logs**
   - Review logs secara berkala
   - Set up notifications untuk failed deployments

## 📝 Notes

- Workflow menggunakan Node.js 18.x (sesuai dengan `NODE_VERSION` di workflow)
- Process name di PM2: `mo-receiver-kmi`
- Database akan di-backup otomatis sebelum deployment (jika menggunakan SQLite)
- Workflow akan otomatis install dependencies dengan `npm install --production`
- Aplikasi ada di subfolder `website/`, jadi path deployment adalah `$VPS_DEPLOY_PATH/website/`

## 🔄 Update Workflow

Jika perlu mengubah workflow:
1. Edit file `.github/workflows/deploy.yml` di root repository
2. Commit dan push ke branch `KMI`
3. Workflow akan otomatis menggunakan versi terbaru

## 📁 Struktur Repository di VPS

Setelah deployment, struktur di VPS akan seperti ini:
```
/opt/mo-receiver/          # Root repository (VPS_DEPLOY_PATH)
├── .github/
│   └── workflows/
│       └── deploy.yml
├── website/               # Aplikasi Node.js
│   ├── server.js
│   ├── package.json
│   ├── kmi_receiver.db    # Database SQLite (jika digunakan)
│   └── ...
└── backups/               # Database backups
    └── kmi_receiver_backup_*.db
```
