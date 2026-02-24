# ⚡ Quick Start: Setup GitHub Secrets

Jika deployment gagal dengan error "Deployed to: ``" (kosong), berarti GitHub Secrets belum dikonfigurasi.

## 🚀 Setup Cepat (5 Menit)

### Step 1: Buka GitHub Secrets

1. Buka repository GitHub Anda
2. Klik **Settings** (di bagian atas)
3. Klik **Secrets and variables** → **Actions**
4. Klik **New repository secret**

### Step 2: Tambahkan 3 Secrets

#### 1️⃣ VPS_HOST
```
Name: VPS_HOST
Value: [IP address VPS Anda]
Contoh: 123.456.789.0
```

#### 2️⃣ VPS_USER
```
Name: VPS_USER
Value: [Username SSH]
Contoh: root atau ubuntu
```

#### 3️⃣ VPS_SSH_KEY
```
Name: VPS_SSH_KEY
Value: [Private SSH Key - lihat cara mendapatkan di bawah]
```

### Step 3: Generate SSH Key di VPS

Jalankan command berikut di VPS:

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""

# Tampilkan PRIVATE KEY (copy semua isinya)
cat ~/.ssh/github_actions

# Tambahkan public key ke authorized_keys
cat ~/.ssh/github_actions.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

**Penting:** Copy **PRIVATE KEY** (bukan public key) ke GitHub Secret `VPS_SSH_KEY`

### Step 4: Test Deployment

1. Push perubahan ke branch KMI
2. Workflow akan otomatis berjalan
3. Cek hasil di tab **Actions**

## ✅ Checklist

- [ ] Secret `VPS_HOST` sudah ditambahkan
- [ ] Secret `VPS_USER` sudah ditambahkan  
- [ ] Secret `VPS_SSH_KEY` sudah ditambahkan (private key)
- [ ] Public key sudah ditambahkan ke `authorized_keys` di VPS
- [ ] Permission file sudah benar (`chmod 600`)

## 🐛 Masih Error?

Lihat dokumentasi lengkap: [SETUP_SECRETS.md](SETUP_SECRETS.md)

## 📸 Visual Guide

**Lokasi GitHub Secrets:**
```
Repository → Settings → Secrets and variables → Actions → New repository secret
```

**Format Private Key:**
```
-----BEGIN OPENSSH PRIVATE KEY-----
[content here]
-----END OPENSSH PRIVATE KEY-----
```
