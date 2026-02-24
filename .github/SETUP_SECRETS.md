# 🔐 Setup GitHub Secrets untuk CI/CD

Panduan lengkap untuk mengkonfigurasi GitHub Secrets yang diperlukan untuk deployment otomatis.

## ⚠️ Error yang Sering Terjadi

Jika Anda melihat error seperti ini:
```
❌ SSH connection failed
usage: ssh [-46AaCfGgKkMNnqsTtVvXxYy] ...
```

Ini berarti **GitHub Secrets belum dikonfigurasi** atau **secrets kosong**.

## 📋 Langkah-langkah Setup

### 1. Buka GitHub Repository Settings

1. Buka repository Anda di GitHub
2. Klik tab **Settings** (di bagian atas repository)
3. Di sidebar kiri, klik **Secrets and variables** > **Actions**
4. Klik tombol **New repository secret**

### 2. Tambahkan Secrets Berikut

#### Secret 1: VPS_HOST

- **Name:** `VPS_HOST`
- **Value:** IP address atau domain VPS Anda
- **Contoh:**
  - `123.456.789.0` (IP address)
  - `vps.example.com` (domain)
  - `192.168.1.100` (local network IP)

**Cara mendapatkan:**
```bash
# Di VPS, cek IP address
hostname -I
# atau
ip addr show
```

#### Secret 2: VPS_USER

- **Name:** `VPS_USER`
- **Value:** Username SSH untuk login ke VPS
- **Contoh:**
  - `root`
  - `ubuntu`
  - `admin`
  - Username VPS Anda

**Cara mengetahui:**
```bash
# Di VPS, cek username saat ini
whoami
```

#### Secret 3: VPS_SSH_KEY

- **Name:** `VPS_SSH_KEY`
- **Value:** Private SSH key (bukan public key!)

**Cara mendapatkan SSH Key:**

**Option A: Generate SSH Key Baru (Recommended)**

```bash
# Di VPS, generate SSH key khusus untuk GitHub Actions
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""

# Tampilkan PRIVATE KEY (copy semua isinya termasuk -----BEGIN dan -----END)
cat ~/.ssh/github_actions

# Tambahkan PUBLIC KEY ke authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys

# Set permission yang benar
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/github_actions
```

**Option B: Gunakan SSH Key yang Sudah Ada**

```bash
# Di VPS, tampilkan private key yang sudah ada
cat ~/.ssh/id_rsa
# atau
cat ~/.ssh/id_ed25519
```

**Penting:**
- Copy **PRIVATE KEY** (bukan public key)
- Harus termasuk baris `-----BEGIN` dan `-----END`
- Jangan ada spasi tambahan di awal/akhir
- **Jangan copy karakter `>` yang muncul di terminal** (itu hanya indikator line continuation)
- Pastikan semua baris key ter-copy dengan lengkap

**Cara Copy yang Benar:**

1. **Gunakan command untuk menampilkan key:**
   ```bash
   cat ~/.ssh/github_actions_deploy
   ```

2. **Copy SEMUA output**, termasuk:
   - Baris `-----BEGIN OPENSSH PRIVATE KEY-----`
   - Semua baris di tengah (biasanya 4-5 baris)
   - Baris `-----END OPENSSH PRIVATE KEY-----`

3. **Paste ke GitHub Secret** tanpa modifikasi apapun

**Contoh format private key yang benar:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2g-
ZWQyNTUxOQAAACAdPwQq8GFvM5/AJpntJWIl3RhbaGHxzqDy4oFSRJPvsQAAAJiFGrBbh
RqwAAAAtzc2gtZWQyNTUxOQAAACAdPwQq8GFvM5/AJpntJWIl3RhbaGHxzqDy4oFSRJP
AAAEDNCKryT0JXe0Xs34shwvmD56CkJtEJQGvh1yRqOHaYzR0/BCrwYW8zn8Amme0lY
GFtoYfHOoPLigVJEk++xAAAAFWdpdGh1Yi1hY3Rpb25zLWRlcGxveQ==
-----END OPENSSH PRIVATE KEY-----
```

**⚠️ JANGAN copy jika terlihat seperti ini (ada karakter `>`):**
```
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2g>
QyNTUxOQAAACAdPwQq8GFvM5/AJpntJWIl3RhbaGHxzqDy4oFSRJPvsQAAAJiFGrBbh>
```
Karakter `>` menunjukkan key terpotong atau ada masalah formatting.

#### Secret 4: VPS_DEPLOY_PATH (Optional)

- **Name:** `VPS_DEPLOY_PATH`
- **Value:** Path deployment di VPS
- **Default:** `/opt/mo-reporting` (jika tidak diset)
- **Contoh:**
  - `/opt/mo-reporting` (default untuk branch KMI)
  - `/opt/mo-reporting` (jika menggunakan path lain)
  - `/home/user/mo-reporting`

**Catatan:** Path ini adalah root repository, aplikasi akan ada di `$VPS_DEPLOY_PATH/website/`

## ✅ Verifikasi Setup

Setelah menambahkan semua secrets, workflow akan otomatis:
1. ✅ Validasi bahwa semua secrets terisi
2. ✅ Test SSH connection
3. ✅ Deploy aplikasi

## 🧪 Test Manual SSH Connection

Sebelum menjalankan workflow, test SSH connection secara manual:

```bash
# Di komputer lokal, test SSH connection
ssh -i /path/to/private_key username@vps_host

# Jika berhasil, Anda akan masuk ke VPS
# Ketik 'exit' untuk keluar
```

## 🐛 Troubleshooting

### Error: "VPS_HOST secret is not set"

**Solusi:**
1. Pastikan secret `VPS_HOST` sudah ditambahkan
2. Pastikan nama secret tepat: `VPS_HOST` (huruf besar semua)
3. Pastikan value tidak kosong

### Error: "SSH connection failed"

**Cek:**
1. ✅ VPS_HOST benar (bisa di-ping dari internet)
2. ✅ VPS_USER benar (username yang valid di VPS)
3. ✅ VPS_SSH_KEY benar (private key, bukan public key)
4. ✅ Public key sudah ditambahkan ke `~/.ssh/authorized_keys` di VPS
5. ✅ Permission file benar: `chmod 600 ~/.ssh/authorized_keys`
6. ✅ Firewall VPS mengizinkan koneksi SSH (port 22)

**Test di VPS:**
```bash
# Cek apakah SSH service berjalan
sudo systemctl status ssh
# atau
sudo systemctl status sshd

# Cek authorized_keys
cat ~/.ssh/authorized_keys

# Test SSH key
ssh -i ~/.ssh/github_actions localhost
```

### Error: "Permission denied (publickey)"

**Solusi:**
1. Pastikan public key sudah ditambahkan ke `authorized_keys`:
   ```bash
   cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
   ```

2. Set permission yang benar:
   ```bash
   chmod 700 ~/.ssh
   chmod 600 ~/.ssh/authorized_keys
   chmod 600 ~/.ssh/github_actions
   ```

3. Cek SSH config:
   ```bash
   sudo nano /etc/ssh/sshd_config
   # Pastikan:
   # PubkeyAuthentication yes
   # AuthorizedKeysFile .ssh/authorized_keys
   
   # Restart SSH
   sudo systemctl restart ssh
   ```

### Error: "Connection refused"

**Solusi:**
1. Cek apakah SSH service berjalan:
   ```bash
   sudo systemctl status ssh
   ```

2. Cek firewall:
   ```bash
   # Ubuntu/Debian
   sudo ufw status
   sudo ufw allow 22/tcp
   
   # CentOS/RHEL
   sudo firewall-cmd --list-all
   sudo firewall-cmd --permanent --add-service=ssh
   sudo firewall-cmd --reload
   ```

3. Cek apakah port 22 listening:
   ```bash
   sudo netstat -tlnp | grep :22
   ```

## 📝 Checklist Setup

Sebelum menjalankan workflow, pastikan:

- [ ] Repository GitHub sudah dibuat
- [ ] Branch `KMI` sudah dibuat
- [ ] VPS sudah setup dan bisa diakses via SSH
- [ ] Secret `VPS_HOST` sudah ditambahkan
- [ ] Secret `VPS_USER` sudah ditambahkan
- [ ] Secret `VPS_SSH_KEY` sudah ditambahkan (private key)
- [ ] Public key sudah ditambahkan ke `authorized_keys` di VPS
- [ ] Permission file SSH sudah benar
- [ ] Firewall VPS mengizinkan SSH (port 22)
- [ ] Repository sudah di-clone di VPS (untuk pertama kali)

## 🚀 Setup Repository di VPS (First Time)

Jika repository belum ada di VPS, clone terlebih dahulu:

```bash
# Di VPS
cd /opt
git clone YOUR_REPOSITORY_URL mo-receiver
cd mo-receiver
git checkout KMI
```

Ganti `YOUR_REPOSITORY_URL` dengan URL repository GitHub Anda.

## 📞 Quick Reference

**Lokasi GitHub Secrets:**
```
Repository > Settings > Secrets and variables > Actions > New repository secret
```

**Lokasi file di VPS:**
- SSH keys: `~/.ssh/`
- Authorized keys: `~/.ssh/authorized_keys`
- Repository: `/opt/mo-reporting/` (atau sesuai VPS_DEPLOY_PATH)

**Test SSH:**
```bash
ssh -i ~/.ssh/github_actions username@vps_host
```

## 🎯 Setelah Setup Selesai

1. Push perubahan ke branch KMI
2. Workflow akan otomatis berjalan
3. Cek hasil di tab **Actions** di GitHub
4. Jika berhasil, aplikasi akan ter-deploy otomatis ke VPS
