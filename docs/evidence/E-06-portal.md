# Evidensi E-06: Antarmuka Portal Pengguna (Milestone M6)

## 1. Metadata Pengujian
* **Timestamp**: 2026-10-06T11:44:00+07:00
* **Milestone**: M6 (Portal UI: Issuer, Wallet, Verifier, dan Audit View)
* **Status**: PASS / VERIFIED (Next.js 15.1.7 Production Build Succeeded)
* **Pelaksana**: AI Coding Agent (Antigravity IDE)
* **Dasar Penilaian PRD**: Section 12 (Frontend / Wireframe Requirements) dan Section 18 (Definition of Done M6).

---

## 2. Implementasi Antarmuka Pengguna (4 Layar Utama)

Sesuai dengan spesifikasi **PRD Section 12**, portal mengintegrasikan 4 modul antarmuka web modern:

### Layar 1: Issuer Dashboard (`apps/portal/app/page.tsx`)
* **Komponen & Fitur**:
  - Formulir penerbitan data akademik (NIM, Nama Mahasiswa, Program Studi, Fakultas, IPK, Tanggal Kelulusan).
  - Tombol cepat **"Muat Fixture SCN-VALID-01"** untuk demonstrasi instan data sintetis.
  - Tombol **"Terbitkan & Anchor On-Chain"** yang melakukan penandatanganan payload kanonikal off-chain dan anchoring hash komitmen ke smart contract.
  - Penampil bukti transaksi on-chain: `Transaction Hash`, `Block Number`, `Commitment Hash`, dan `Registry Contract Address`.
* **Proteksi Keamanan (PRD Section 12)**:
  - **TIDAK mengekspos** *private key*, seed phrase, atau rahasia sensitif lainnya pada antarmuka.

### Layar 2: Holder Wallet (`apps/portal/app/page.tsx`)
* **Komponen & Fitur**:
  - Daftar kredensial ijazah tersimpan di dompet digital lokal (off-chain storage).
  - Penampil rincian dokumen W3C Verifiable Credential lengkap (termasuk status on-chain dan tanda tangan digital).
  - Tombol **"Buat Verifiable Presentation (VP)"** yang membungkus VC ke dalam paket presentasi dengan target *audience* dan *nonce* tantangan dari verifier.
* **Proteksi Keamanan (PRD Section 12)**:
  - Data akademik disimpan di sisi klien / off-chain (menghormati privasi data pemegang).
  - Tombol administratif issuer tidak dapat diakses dari dompet holder.

### Layar 3: Verifier Portal (`apps/portal/app/page.tsx`)
* **Komponen & Fitur**:
  - Panel request verifier: Menampilkan tujuan verifikasi, challenge nonce, dan atribut yang diminta.
  - Tombol **"Jalankan Verifikasi Sah (Normal)"** untuk mengevaluasi kredensial aktif.
  - Tombol pengujian negatif instan:
    - **"Simulasi Pemalsuan GPA (AT-03)"** &rarr; Membuktikan pendeteksian manipulasi komitmen (*Tamper Detection*).
    - **"Simulasi Replay Attack (AT-08)"** &rarr; Membuktikan penolakan pemakaian ulang nonce.
  - Kartu evaluasi 6 lapisan verifikasi:
    1. Struktur & Format W3C VC
    2. Tanda Tangan Digital ECDSA (secp256k1)
    3. Registrasi Issuer On-Chain
    4. Komitmen Integritas (Anti-Tamper)
    5. Status Siklus Hidup On-Chain (`ACTIVE` / `SUSPENDED` / `REVOKED`)
    6. Masa Berlaku (*Validity Window*)

### Layar 4: Audit & Lifecycle View (`apps/portal/app/page.tsx`)
* **Komponen & Fitur**:
  - Indikator status kredensial terkini dengan badge warna visual (`ACTIVE`, `SUSPENDED`, `REVOKED`).
  - Tombol kontrol state machine:
    - **Tangguhkan (Suspend)**: Mengubah status menjadi `SUSPENDED`.
    - **Reaktivasi (Reactivate)**: Mengembalikan status dari `SUSPENDED` ke `ACTIVE`.
    - **Cabut Permanen (Revoke)**: Mengubah status ke *terminal state* `REVOKED` (tidak dapat diubah kembali).
  - Timeline kronologi jejak audit (*Audit Trail*) yang merekonstruksi seluruh rekaman event on-chain `CredentialStatusChanged` secara real-time.

---

## 3. Log Verifikasi Build Produksi Next.js

```text
> @academic-credential/portal@1.0.0 build
> next build

   ▲ Next.js 15.1.7

   Creating an optimized production build ...
 ✓ Compiled successfully
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/4) ...
   Generating static pages (1/4) 
   Generating static pages (2/4) 
   Generating static pages (3/4) 
 ✓ Generating static pages (4/4)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                              Size     First Load JS
┌ ○ /                                    6.54 kB         112 kB
└ ○ /_not-found                          981 B           106 kB
+ First Load JS shared by all            105 kB
  ├ chunks/855-c04e97a606e6440d.js       50.5 kB
  ├ chunks/87c73c54-7a3028210931d0db.js  52.9 kB
  └ other shared chunks (total)          1.95 kB

○  (Static)  prerendered as static content
```

---

## 4. Panduan Menjalankan Portal Secara Lokal
Untuk menjalankan portal dalam mode *live development*:
```bash
npm run dev
# Portal akan berjalan di http://localhost:3000
```
Untuk menjalankan build produksi:
```bash
npm run build --workspace=apps/portal
npm run start --workspace=apps/portal
```
