// Aplica todas as migrations de supabase/migrations/*.sql em ordem.
// Uso: DATABASE_URL="postgres://..." node scripts/run-migration.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "supabase", "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL. Ex.: DATABASE_URL='postgres://...' node scripts/run-migration.mjs");
  process.exit(1);
}

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const f of files) {
    const sql = readFileSync(join(dir, f), "utf8");
    process.stdout.write(`\n>>> Rodando ${f} ... `);
    await client.query(sql);
    console.log("OK");
  }
  // Confere as tabelas criadas
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name"
  );
  console.log("\nTabelas em public:", rows.map((r) => r.table_name).join(", "));
  console.log("\nMigration concluída com sucesso. ✅");
} catch (e) {
  console.error("\nERRO na migration:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
