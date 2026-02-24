# 🔧 Troubleshooting: SSH Key "error in libcrypto"

Jika Anda melihat error:
```
Load key "/home/runner/.ssh/deploy_key": error in libcrypto
Permission denied (publickey,password).
```

Ini berarti ada masalah dengan format SSH key di GitHub Secrets.

## 🔍 Diagnosa Masalah

### 1. Cek Format SSH Key

Error "error in libcrypto" biasanya disebabkan oleh:
- ✅ SSH key terpotong (tidak lengkap)
- ✅ Ada karakter tambahan (seperti `>` dari terminal)
- ✅ Line breaks tidak benar
- ✅ Encoding masalah

### 2. Verifikasi di VPS

Jalankan di VPS untuk memastikan key valid:

```bash
# Cek apakah private key valid
ssh-keygen -l -f ~/.ssh/github_actions_deploy

# Jika valid, akan menampilkan fingerprint
# Jika tidak valid, akan error
```

## ✅ Solusi

### Step 1: Dapatkan Private Key yang Benar

**Di VPS, jalankan:**

```bash
# Tampilkan private key (tanpa karakter tambahan)
cat ~/.ssh/github_actions_deploy
```

**Penting:**
- Copy **SEMUA** output
- Termasuk baris `-----BEGIN` dan `-----END`
- **JANGAN** copy karakter `>` yang mungkin muncul
- Pastikan semua baris ter-copy

### Step 2: Copy dengan Benar

**Cara yang benar:**

1. Jalankan: `cat ~/.ssh/github_actions_deploy`
2. **Select All** output (Ctrl+A atau mouse drag)
3. **Copy** (Ctrl+C)
4. **Paste** langsung ke GitHub Secret

**Jangan:**
- ❌ Copy manual baris per baris
- ❌ Copy dengan karakter `>` di akhir
- ❌ Menambahkan atau menghapus spasi
- ❌ Mengubah format apapun

### Step 3: Update GitHub Secret

1. Buka GitHub → Settings → Secrets → Actions
2. Edit secret `VPS_SSH_KEY`
3. **Hapus semua isi lama**
4. **Paste** private key yang baru (dari Step 2)
5. Klik **Update secret**

### Step 4: Verifikasi Public Key di VPS

Pastikan public key sudah ada di `authorized_keys`:

```bash
# Tampilkan public key
cat ~/.ssh/github_actions_deploy.pub

# Cek apakah sudah ada di authorized_keys
grep "github-actions" ~/.ssh/authorized_keys

# Jika tidak ada, tambahkan:
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Step 5: Test SSH Key

**Test dari VPS sendiri:**

```bash
# Test dengan private key
ssh -i ~/.ssh/github_actions_deploy localhost

# Jika berhasil, akan masuk ke VPS
# Ketik 'exit' untuk keluar
```

**Test dari komputer lain (opsional):**

```bash
# Copy private key ke komputer lokal
scp user@vps:~/.ssh/github_actions_deploy ~/.ssh/

# Test connection
ssh -i ~/.ssh/github_actions_deploy user@vps
```

## 🔄 Alternatif: Generate Ulang SSH Key

Jika masih error, generate ulang SSH key:

```bash
# Di VPS, hapus key lama (jika perlu)
rm ~/.ssh/github_actions_deploy*

# Generate key baru
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_deploy -N ""

# Tampilkan private key
cat ~/.ssh/github_actions_deploy

# Tambahkan public key ke authorized_keys
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Kemudian copy private key baru ke GitHub Secret.

## 📝 Checklist

Setelah update GitHub Secret, pastikan:

- [ ] Private key lengkap (ada BEGIN dan END)
- [ ] Tidak ada karakter `>` di key
- [ ] Public key sudah di `authorized_keys`
- [ ] Permission file benar (`chmod 600`)
- [ ] Test SSH connection berhasil

## 🐛 Masih Error?

### Cek Logs GitHub Actions

1. Buka tab **Actions** di GitHub
2. Klik workflow yang gagal
3. Klik step **Test SSH Connection**
4. Lihat output untuk detail error

### Debug di VPS

```bash
# Cek SSH service
sudo systemctl status ssh

# Cek authorized_keys
cat ~/.ssh/authorized_keys

# Cek permissions
ls -la ~/.ssh/

# Test SSH dengan verbose
ssh -v -i ~/.ssh/github_actions_deploy localhost
```

### Common Issues

**Issue 1: Key terpotong**
- **Solusi:** Copy ulang dengan lengkap

**Issue 2: Public key tidak match**
- **Solusi:** Pastikan menggunakan public key dari private key yang sama
  ```bash
  ssh-keygen -y -f ~/.ssh/github_actions_deploy
  ```

**Issue 3: Permission salah**
- **Solusi:**
  ```bash
  chmod 700 ~/.ssh
  chmod 600 ~/.ssh/authorized_keys
  chmod 600 ~/.ssh/github_actions_deploy
  ```

## 📞 Quick Reference

**Command untuk copy private key:**
```bash
cat ~/.ssh/github_actions_deploy
```

**Command untuk extract public key:**
```bash
ssh-keygen -y -f ~/.ssh/github_actions_deploy
```

**Command untuk test key:**
```bash
ssh-keygen -l -f ~/.ssh/github_actions_deploy
```
