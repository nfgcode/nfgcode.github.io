# Simulasi Interaktif Model Komunikasi dalam Sistem Terdistribusi

Proyek ini adalah simulasi interaktif berbasis web untuk membandingkan dua model komunikasi pada sistem terdistribusi:

1. Request-Response
2. Publish-Subscribe

Simulasi menampilkan aliran pesan secara visual, log urutan kejadian, dan metrik pembanding seperti throughput, latensi, paket hilang, serta out-of-order delivery.

## 1) Tujuan Simulasi

- Memahami perbedaan pola komunikasi sinkron-ish (Request-Response) vs asinkron fan-out (Publish-Subscribe).
- Mengamati dampak parameter jaringan (latensi, kehilangan paket) terhadap performa sistem.
- Melatih interpretasi metrik komunikasi dalam skenario dunia nyata.

## 2) Komponen Sistem

### A. Request-Response
- Client: pengirim request.
- Server: penerima request, memproses, lalu mengirim response.
- Link dua arah Client <-> Server.

### B. Publish-Subscribe
- Publisher: mem-publish event.
- Broker: menerima event lalu mendistribusikan (fan-out).
- Subscriber (dinamis 1-6): menerima event dari broker.

## 3) Logika Interaksi yang Diimplementasikan

### Request-Response
1. Client kirim request #N.
2. Request melewati delay jaringan (dengan jitter).
3. Jika paket tidak hilang, server memproses.
4. Server mengirim response #N.
5. Response melewati delay jaringan.
6. Jika sampai ke client, dihitung latensi end-to-end dan urutan pesan.

### Publish-Subscribe
1. Publisher mengirim event #N ke broker.
2. Event melewati delay jaringan.
3. Jika tidak hilang, broker memproses.
4. Broker fan-out event #N ke semua subscriber aktif.
5. Tiap pengiriman ke subscriber punya delay sendiri dan peluang drop sendiri.
6. Tiap delivery yang sukses menambah metrik delivered dan latensi sampel.

## 4) Mekanisme Perbandingan

Panel metrik menampilkan dua model secara berdampingan:

- Sent: jumlah pesan/event yang diproduksi.
- Delivered: jumlah pesan/event yang berhasil diterima endpoint tujuan.
- Dropped: jumlah pesan/event yang hilang.
- Avg latency: rata-rata waktu tempuh end-to-end.
- Throughput: delivered per detik sejak model mulai aktif.
- Out-of-order: jumlah anomali urutan pesan.

Catatan interpretasi:
- Pada Request-Response, delivered merepresentasikan response yang sampai ke client.
- Pada Publish-Subscribe, delivered merepresentasikan total delivery ke semua subscriber (fan-out), sehingga bisa lebih besar per event.

## 5) Representasi Visual

- Node digambar sebagai lingkaran berlabel per peran.
- Edge menunjukkan jalur komunikasi.
- Paket bergerak sebagai animasi lingkaran kecil bernomor sequence.
- Log menampilkan urutan kejadian, termasuk drop packet.

## 6) Interaksi Pengguna

Kontrol utama:

- Model: pilih Request-Response atau Publish-Subscribe.
- Latensi Jaringan (ms): memengaruhi delay pengiriman.
- Waktu Proses Server/Broker (ms): memengaruhi processing delay.
- Probabilitas Paket Hilang (%): memengaruhi chance drop.
- Jumlah Subscriber: khusus mode Publish-Subscribe.
- Kirim 1 Pesan: trigger satu komunikasi.
- Burst 10 Pesan: trigger 10 komunikasi beruntun.
- Auto ON/OFF: kirim berkala otomatis.
- Reset Metrik: reset statistik per model.
- Bersihkan Log: membersihkan panel log.

## 7) Relevansi Skenario Dunia Nyata

- Request-Response cocok untuk API service (mis. frontend ke backend).
- Publish-Subscribe cocok untuk notifikasi real-time, event bus, IoT telemetry, dan streaming event.
- Efek drop dan latensi tinggi membantu memahami tantangan jaringan tidak andal.

## 8) Cara Menjalankan

Tidak butuh dependency tambahan.

### Opsi A: Buka langsung
1. Buka file `index.html` di browser.

### Opsi B: Jalankan server lokal sederhana (disarankan)
Jika ada Python:

```bash
python -m http.server 8000
```

Lalu buka:

```text
http://localhost:8000
```

## 9) Struktur File

- `index.html` : struktur UI simulasi.
- `styles.css` : gaya visual dan responsivitas.
- `app.js` : mesin simulasi, animasi paket, metrik, dan logika interaksi.
- `README.md` : dokumentasi tugas dan panduan.

## 10) Kaitan ke Rubrik Penilaian

- Pemilihan Model Komunikasi: dua model berbeda dengan karakteristik jelas.
- Komponen Sistem: node utama didefinisikan dan divisualisasikan.
- Implementasi Logika Interaksi: alur kirim-terima-proses-drop diimplementasi.
- Representasi Visual: animasi aliran pesan + topologi node.
- Desain Interaksi Pengguna: kontrol parameter, trigger, auto mode, reset.
- Mekanisme Perbandingan: panel metrik berdampingan dan log urutan.
- Dokumentasi: penjelasan tujuan, logika, interaksi, dan interpretasi hasil.
- Kreativitas/Relevansi: skenario API dan event-driven real-world.
