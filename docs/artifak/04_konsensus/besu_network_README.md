# Konfigurasi Konsorsium Hyperledger Besu QBFT

Direktori ini berisi konfigurasi simulasi konsorsium akademik permissioned berbasis **Hyperledger Besu QBFT (Quorum Byzantine Fault Tolerance)** sesuai **PRD Section 6, 18, dan 20 (E-10)**.

## 1. Topologi Jaringan Konsorsium 4-Node

Konsorsium perguruan tinggi beroperasi dengan 4 entitas independen yang bertindak sebagai validator konsensus:

| Validator Node | Organisasi Pengelola | Alamat Akun Validator | Port P2P / RPC | Peran Konsensus |
|---|---|---|---|---|
| **Node 1 (UIS)** | Universitas Indonesia Sintetis | `0x9e688319656e0d104a65b269e5273a30718d159c` | `8545:8545` (RPC Bootnode) | Pengusul & Pemilih Blok |
| **Node 2 (ITBS)**| Institut Teknologi Bandung Sintetis | `0x89205a3a3b2a69de6dbf7f01ed13b2108b2c43e7` | Internal P2P (30303) | Pengusul & Pemilih Blok |
| **Node 3 (UGMS)**| Universitas Gadjah Mada Sintetis | `0xf17f52151ebef6c7334fad080c5704d77216b732` | Internal P2P (30303) | Pengusul & Pemilih Blok |
| **Node 4 (Gov)** | LLDIKTI / Dewan Tata Kelola | `0xc5d2460186f7233c927e7db2dcc703c0e500b653` | Internal P2P (30303) | Pengusul & Pemilih Blok |

## 2. Karakteristik Konsensus QBFT
* **Toleransi Kesalahan**: $N = 3f + 1 \Rightarrow 4 = 3(1) + 1$. Jaringan dapat mentoleransi **1 node yang mati atau berperilaku jahat (Byzantine)** tanpa menghentikan kelangsungan jaringan (*liveness*).
* **Finalitas Blok Deterministik**: Bebas dari risiko *forking* atau *chain reorganization* (tidak seperti Proof of Work / Nakamoto consensus).
* **Block Time**: 2 detik (`blockperiodseconds: 2`).

## 3. Menjalankan Jaringan dengan Docker
Jika Docker Desktop terpasang di host:
```bash
docker compose up -d
```
Untuk memantau log konsensus QBFT:
```bash
docker compose logs -f validator1-uis
```

## 4. Fallback Lingkungan Pengembangan (PRD Section 21)
Sesuai **PRD Section 21 (Implementation Risks & Fallbacks)**:
Pada lingkungan Windows pengembang di mana Docker Desktop tidak tersedia atau dibatasi oleh kuota resource host, repositori menyediakan **simulasi konsorsium deterministik** melalui `npm run simulate:consortium` dan eksekusi fungsional utama pada EVM lokal (Hardhat/Ganache).
