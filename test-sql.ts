import { Pool } from 'pg';

const pool = new Pool({
  user: 'admin',
  password: 'local_dev_password_123',
  host: 'localhost',
  port: 5432,
  database: 'declared_system'
});

async function testSql() {
  try {
    await pool.query(`INSERT INTO journal_entries (raw_text) VALUES ('Hello world! This is a test. Hello universe.'), ('Another test! World is great.')`);
    const result = await pool.query(`
      SELECT NULLIF(regexp_replace(lower(word), '[^a-z0-9]', '', 'g'), '') as word, count(*) as size
      FROM (
        SELECT regexp_split_to_table(raw_text, '\\s+') as word
        FROM journal_entries
      ) w
      WHERE word IS NOT NULL AND word != ''
      GROUP BY NULLIF(regexp_replace(lower(word), '[^a-z0-9]', '', 'g'), '')
      HAVING NULLIF(regexp_replace(lower(word), '[^a-z0-9]', '', 'g'), '') IS NOT NULL
    `);
    console.log(result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
testSql();
