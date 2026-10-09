# KATALOG DIAGRAM ARTIFAK SISTEM BLOCKCHAIN
### Mata Kuliah: Blockchain (KP70067008) — Universitas Siliwangi
#### Penyusun: Diva Prayoga Alpariji Putra (NPM: 237006173) — Kelas F

---

## 1. Daftar Berkas Diagram Vektor (Scalable Vector Graphics)

Direktori ini memuat seluruh diagram teknis dalam format vektor SVG beresolusi tinggi yang dapat dibuka langsung di peramban web (*browser*), disematkan ke berkas Markdown, atau diekspor ke dokumen laporan cetak:

| Nama Berkas Diagram | Topik Kasus UTS | Deskripsi Arsitektural |
| :--- | :--- | :--- |
| [`diagram_arsitektur_jaringan.svg`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/docs/artifak/07_diagram/diagram_arsitektur_jaringan.svg) | **Case 1 (Feasibility)** | Memvisualisasikan arsitektur sistem 4-lapis: (1) Presentation Layer Next.js, (2) Application API Service Layer, (3) Off-Chain Storage (Zero PII), dan (4) Jaringan Konsorsium 4-Node Hyperledger Besu QBFT. |
| [`diagram_alur_transaksi.svg`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/docs/artifak/07_diagram/diagram_alur_transaksi.svg) | **Case 1 & Case 5** | Sequence diagram alur transaksi 4-fase: Penerbitan & Anchoring on-chain, Permintaan tantangan (*Challenge Nonce*), Evaluasi verifikasi 6-lapisan, dan Siklus pencabutan (*Revocation*). |
| [`diagram_merkle_tree.svg`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/docs/artifak/07_diagram/diagram_merkle_tree.svg) | **Case 2 (Crypto/Merkle)** | Struktur pohon biner Merkle Tree yang merangkum 4 record ijazah akademik sintetis, lengkap dengan ilustrasi jalur pembuktian keanggotaan (*Merkle Proof Audit Path*) berlatensi $O(\log N)$. |
| [`diagram_bitcoin_utxo.svg`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/docs/artifak/07_diagram/diagram_bitcoin_utxo.svg) | **Case 4 (Bitcoin UTXO)** | Diagram model transaksi Bitcoin berbasis UTXO yang mendemonstrasikan penghabisan total input (1.5 BTC), penciptaan output beasiswa (0.1 BTC), kembalian kampus (1.3995 BTC), dan penarikan biaya penambang (*miner fee* 0.0005 BTC). |

---

## 2. Cara Membuka dan Menyematkan Diagram

1. **Membuka Langsung di Browser**:
   Klik dua kali berkas `.svg` untuk membuka di Google Chrome, Microsoft Edge, atau Mozilla Firefox.
2. **Menyematkan ke Dokumen Markdown**:
   ```markdown
   ![Diagram Arsitektur Konsorsium](./docs/artifak/07_diagram/diagram_arsitektur_jaringan.svg)
   ```
3. **Melihat di Antarmuka VS Code / Antigravity IDE**:
   Gunakan ekstensi SVG Viewer atau preview bawaan IDE untuk melihat rendering visual grafis secara interaktif.

---
*Kembali ke Indeks Artifak: [`docs/artifak/README.md`](file:///c:/Users/Administrator/Documents/Block%20chain/UTS/docs/artifak/README.md)*
