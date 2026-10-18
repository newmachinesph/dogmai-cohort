import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join } from "path";

// Load .env file manually
const envPath = join(__dirname, "..", ".env");
const envContent = readFileSync(envPath, "utf-8");
const envLines = envContent.split("\n");
for (const line of envLines) {
  const match = line.match(/^([^=]+)=["']?([^"'\r\n]*)["']?$/);
  if (match) {
    process.env[match[1]] = match[2];
  }
}

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

console.log("TURSO_DATABASE_URL:", tursoUrl);
console.log("TURSO_AUTH_TOKEN:", tursoToken?.substring(0, 20) + "...");

if (!tursoUrl || !tursoToken) {
  console.error("Error: TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set");
  process.exit(1);
}

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

async function main() {
  console.log("\nTesting Turso connection...");

  try {
    // Test simple query
    const result = await client.execute("SELECT 1 as test");
    console.log("Connection successful!", result);

    // Try to list tables
    const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("\nExisting tables:", tables.rows);

    // Try creating a simple test table
    console.log("\nCreating test table...");
    await client.execute("CREATE TABLE IF NOT EXISTS test_table (id TEXT PRIMARY KEY, name TEXT)");
    console.log("Test table created!");

    // Verify it exists
    const verify = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='test_table'");
    console.log("Verification:", verify.rows);

    // Clean up
    await client.execute("DROP TABLE IF EXISTS test_table");
    console.log("Test table dropped.");

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    client.close();
  });
