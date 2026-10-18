require('dotenv').config();
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log('Connecting to Turso:', process.env.TURSO_DATABASE_URL);

  try {
    // Add new columns to users table
    const alterStatements = [
      'ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0',
      'ALTER TABLE users ADD COLUMN emailVerifyToken TEXT',
      'ALTER TABLE users ADD COLUMN emailVerifyExpires TEXT',
      'ALTER TABLE users ADD COLUMN passwordResetToken TEXT',
      'ALTER TABLE users ADD COLUMN passwordResetExpires TEXT',
    ];

    for (const sql of alterStatements) {
      try {
        await client.execute(sql);
        console.log('SUCCESS:', sql.substring(0, 60) + '...');
      } catch (e) {
        if (e.message.includes('duplicate column')) {
          console.log('SKIP (already exists):', sql.substring(0, 50) + '...');
        } else {
          console.error('ERROR:', e.message);
        }
      }
    }

    // Verify columns were added
    const result = await client.execute("PRAGMA table_info(users)");
    console.log('\nUsers table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.type})`);
    });

    console.log('\nMigration complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

migrate();
