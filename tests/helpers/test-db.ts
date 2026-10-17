import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../src/infrastructure/db/schema";
import { sessions, users, healthChecks } from "../../src/infrastructure/db/schema";

/**
 * Koneksi database terpisah khusus untuk environment pengujian.
 * Dibuat sebagai koneksi independen agar tidak konflik dengan koneksi
 * singleton yang digunakan oleh repository di src/infrastructure/db/index.ts.
 *
 * Catatan penting: koneksi ini TIDAK boleh ditutup di afterAll() karena
 * bun test menjalankan semua file dalam satu proses; memanggil client.end()
 * akan menutup pool postgres global dan menyebabkan test berikutnya gagal.
 * Proses Bun akan otomatis membersihkan koneksi saat semua test selesai.
 */
const testConnectionString =
  process.env.DATABASE_URL ||
  "postgres://postgres:Rahasia12345@localhost:5432/vibe_coding_db";

const testClient = postgres(testConnectionString, { max: 5 });
const testDb = drizzle(testClient, { schema });

/**
 * Membersihkan seluruh data dari tabel relasional sebelum setiap skenario pengujian.
 * Urutan penghapusan penting: tabel anak (sessions) dihapus dulu sebelum tabel induk (users).
 * Memastikan setiap test berjalan pada kondisi database yang bersih dan konsisten.
 */
export async function cleanDatabase(): Promise<void> {
  // 1. Hapus tabel anak terlebih dahulu (foreign key: sessions.user_id -> users.id)
  await testDb.delete(sessions);
  // 2. Hapus tabel induk
  await testDb.delete(users);
  // 3. Hapus tabel monitoring
  await testDb.delete(healthChecks);
}

/**
 * Mengekspos testDb untuk keperluan query langsung ke DB pada skenario tertentu
 * (misal verifikasi record sessions setelah login, atau setelah DELETE cascade).
 */
export { testDb };
