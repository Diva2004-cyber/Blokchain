import * as crypto from "crypto";

export interface UTXO {
  txid: string;
  vout: number;
  address: string;
  amountSat: number;
  spent: boolean;
}

export interface TxInput {
  prevTxid: string;
  vout: number;
}

export interface TxOutput {
  address: string;
  amountSat: number;
}

export interface Transaction {
  txid: string;
  inputs: TxInput[];
  outputs: TxOutput[];
  feeSat: number;
  vsizeBytes: number;
  feeRateSatVb: number;
}

export class BitcoinUtxoEngine {
  private utxoSet: Map<string, UTXO> = new Map();
  private mempool: Transaction[] = [];

  constructor() {
    // 1. Genesis UTXO: Kas Awal Kampus bernilai 1.5 BTC (150.000.000 Sats)
    const genesisUtxo: UTXO = {
      txid: "0000000000000000000000000000000000000000000000000000000000000000",
      vout: 0,
      address: "bc1qsynth_kampus_kas_master",
      amountSat: 150_000_000,
      spent: false,
    };
    this.utxoSet.set(`${genesisUtxo.txid}:0`, genesisUtxo);
  }

  public getUtxo(txid: string, vout: number): UTXO | undefined {
    return this.utxoSet.get(`${txid}:${vout}`);
  }

  public getAllUnspent(): UTXO[] {
    return Array.from(this.utxoSet.values()).filter((u) => !u.spent);
  }

  public createTransaction(
    inputs: TxInput[],
    outputs: TxOutput[],
    changeAddress: string,
    feeRateSatVb: number = 20
  ): Transaction {
    // 1. Validasi Keberadaan dan Status Belum Dibelanjakan (Unspent)
    let totalInSat = 0;
    for (const inp of inputs) {
      const key = `${inp.prevTxid}:${inp.vout}`;
      const utxo = this.utxoSet.get(key);
      if (!utxo) {
        throw new Error(`UTXO_NOT_FOUND: Input ${key} tidak ditemukan pada UTXO set`);
      }
      if (utxo.spent) {
        throw new Error(`DOUBLE_SPENDING_DETECTED: Input ${key} telah dibelanjakan sebelumnya!`);
      }
      totalInSat += utxo.amountSat;
    }

    // 2. Estimasi Ukuran Virtual Transaksi (vSize)
    // Formula pendekatan: 10.5 (overhead) + (inputs.length * 68) + (outputs.length * 31)
    const estimatedOutputsCount = outputs.length + 1; // +1 untuk change
    const estimatedVsize = Math.ceil(11 + inputs.length * 68 + estimatedOutputsCount * 31);
    const requiredFeeSat = Math.ceil(estimatedVsize * feeRateSatVb);

    const totalOutRequestedSat = outputs.reduce((acc, out) => acc + out.amountSat, 0);
    const remainingForChangeSat = totalInSat - totalOutRequestedSat - requiredFeeSat;

    if (remainingForChangeSat < 0) {
      throw new Error(`INSUFFICIENT_FUNDS: Total input (${totalInSat}) < output + fee (${totalOutRequestedSat + requiredFeeSat})`);
    }

    const finalOutputs: TxOutput[] = [...outputs];
    // Masukkan output kembalian (change) jika di atas batas debu (dust threshold ~546 sat)
    if (remainingForChangeSat >= 546) {
      finalOutputs.push({
        address: changeAddress,
        amountSat: remainingForChangeSat,
      });
    }

    const actualTotalOutSat = finalOutputs.reduce((acc, out) => acc + out.amountSat, 0);
    const actualFeeSat = totalInSat - actualTotalOutSat;
    const finalVsize = Math.ceil(11 + inputs.length * 68 + finalOutputs.length * 31);
    const actualFeeRateSatVb = Number((actualFeeSat / finalVsize).toFixed(2));

    // Hitung TxID (Hash SHA-256 Ganda)
    const txPayload = JSON.stringify({ inputs, outputs: finalOutputs, timestamp: Date.now() });
    const h1 = crypto.createHash("sha256").update(txPayload).digest();
    const txid = crypto.createHash("sha256").update(h1).digest("hex");

    const transaction: Transaction = {
      txid,
      inputs,
      outputs: finalOutputs,
      feeSat: actualFeeSat,
      vsizeBytes: finalVsize,
      feeRateSatVb: actualFeeRateSatVb,
    };

    // Tandai Input Sebagai Spent (Atomic Transition)
    for (const inp of inputs) {
      const key = `${inp.prevTxid}:${inp.vout}`;
      const utxo = this.utxoSet.get(key)!;
      utxo.spent = true;
    }

    // Masukkan Output Baru ke dalam UTXO Set
    finalOutputs.forEach((out, idx) => {
      this.utxoSet.set(`${txid}:${idx}`, {
        txid,
        vout: idx,
        address: out.address,
        amountSat: out.amountSat,
        spent: false,
      });
    });

    this.mempool.push(transaction);
    return transaction;
  }
}

// Skrip demonstrasi mandiri
if (require.main === module) {
  console.log("=== SIMULASI BITCOIN UTXO MODEL (UTS CASE 4) ===");
  const engine = new BitcoinUtxoEngine();
  console.log("1. Saldo Awal UTXO Kas Kampus: 1.5 BTC (150.000.000 Satoshis)");

  // Transaksi 1: Beasiswa Mahasiswa
  const tx1 = engine.createTransaction(
    [{ prevTxid: "0000000000000000000000000000000000000000000000000000000000000000", vout: 0 }],
    [{ address: "bc1qsynth_mahasiswa_beasiswa_01", amountSat: 10_000_000 }],
    "bc1qsynth_kampus_change_1",
    25
  );
  console.log(`\n2. Transaksi 1 Sukses (TxID: ${tx1.txid.slice(0, 16)}...)`);
  console.log(`   - Output 0: 0.1 BTC (Mahasiswa)`);
  console.log(`   - Output 1: ${(tx1.outputs[1].amountSat / 1e8).toFixed(6)} BTC (Kembalian Kampus)`);
  console.log(`   - Miner Fee: ${tx1.feeSat} Sats (${tx1.feeRateSatVb} sat/vB)`);

  // Uji Pencegahan Double Spending
  console.log("\n3. Uji Coba Serangan Double Spending pada UTXO yang sama...");
  try {
    engine.createTransaction(
      [{ prevTxid: "0000000000000000000000000000000000000000000000000000000000000000", vout: 0 }],
      [{ address: "bc1qsynth_penyerang", amountSat: 50_000_000 }],
      "bc1qsynth_penyerang_change",
      25
    );
  } catch (err: any) {
    console.log(`   ✓ DITOLAK: ${err.message}`);
    console.log("   ✓ Penanganan Double Spending Berhasil 100%!");
  }
}
