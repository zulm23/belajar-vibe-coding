import { createApp } from "./app";

/**
 * Entry point utama aplikasi.
 * Menggunakan factory function createApp() untuk memisahkan konfigurasi
 * aplikasi dari proses listen(), sehingga memudahkan pengujian otomatis.
 */
const port = Number(process.env.PORT) || 3000;

const app = createApp().listen(port);

console.log(`🦊 Elysia server running at http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
