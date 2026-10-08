# Denah Video (maks 10 detik)

Ubah file JSON denah jadi video animasi 3D tampak atas (1080×1920, 30 fps) untuk Shorts/Reels/TikTok.
Alur animasi: sketsa dinding digambar → dinding naik jadi 3D → lantai & furnitur muncul → mobil masuk, orang berjalan → label & ukuran → chip info + nama channel.

## Cara pakai di GitHub (tanpa Vercel)
1. Buat repo baru di GitHub, upload semua isi folder ini (atau `git push`).
2. Buka tab **Actions** → **Render video denah** → **Run workflow**.
   - `plan`: `all` (semua file di `plans/`) atau mis. `plans/rumah-10x15.json`
   - `music`: kosong = acak dari `assets/music/` (kalau ada), `none` = tanpa musik, atau nama file.
3. Setelah selesai, unduh MP4 dari **Artifacts → video-denah**.
Workflow juga jalan otomatis tiap kamu push perubahan di folder `plans/`.

## Cara pakai di komputer sendiri
Butuh Node 20+ dan ffmpeg.
```
npm install
node render.js                       # semua plan
PLAN=plans/rumah-10x15.json node render.js
W=540 H=960 FPS=15 node render.js    # preview cepat (kecil)
```
Hasil: `out/<nama-plan>.mp4`.

## Membuat denah baru
Salin `plans/rumah-10x15.json`, ubah isinya. Satuan meter, titik (0,0) = pojok kiri-belakang lahan, sumbu z ke arah jalan (depan).
- `rooms`: `[nama, x1, z1, x2, z2, lantai, labelX, labelZ]` — lantai: `wood`, `tile`, `tileblue`, `concrete`. Nama kosong = tanpa label.
- `walls`: `[x1,z1,x2,z2]` (opsional elemen ke-5 = tinggi). Celah di dinding = pintu.
- `glass`: `[x1,z1,x2,z2,"g"]` dinding kaca, `"w"` jendela.
- `furniture`: `["b",x1,z1,x2,z2,tinggi,"#warna"]` kotak, `["c",x,z,radius,tinggi,"#warna"]` silinder.
- `car.to`: posisi parkir mobil; `people`: jalur orang `[[x,z],...]` + waktu `t0`,`t1` (detik).
- `dims`: garis ukuran `["h", z, x0, [lebar...]]` / `["v", x, z0, [panjang...]]`.
- `title`, `subtitle`, `chips`, `channel`: teks di video. **Ganti `@namachannel` dengan channelmu.**
Tampilan kamera dibuat untuk lahan ±15 m; lahan jauh lebih besar perlu menyesuaikan `hw`, `cx`, `cz` di `web/index.html`.

## Musik
Taruh file `.mp3/.m4a/.wav` di `assets/music/`. Hanya pakai musik berlisensi jelas dan catat di `assets/LICENSE-music.txt`.
Kalau repo publik, file musik ikut bisa diunduh orang — pastikan lisensinya mengizinkan.

## Catatan
- Durasi dibatasi 10 detik (`DURATION` tidak bisa lebih dari 10).
- Render memakai WebGL software (SwiftShader), jadi 300 frame full-HD butuh sekitar 10–20 menit.
- Struktur: `render.js` (Puppeteer + ffmpeg), `web/index.html` (scene three.js), `plans/` (data), `.github/workflows/render.yml`.
