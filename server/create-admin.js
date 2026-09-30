import bcrypt from 'bcryptjs';
import pg from 'pg';
import readline from 'node:readline/promises';
import { Writable } from 'node:stream';
import { randomUUID } from 'node:crypto';

const email = String(process.argv[2] || '').trim().toLowerCase();
const name = String(process.argv[3] || 'Administrator').trim();
if (!process.env.DATABASE_URL || !/^\S+@\S+\.\S+$/.test(email) || email.length > 255 || !name || name.length > 100 || !process.stdin.isTTY) {
  console.error('Usage in the Coolify application terminal: npm run admin:create -- admin@example.com "Your Name"');
  process.exit(1);
}

const silentOutput = new Writable({ write(_chunk, _encoding, done) { done(); } });
const prompt = readline.createInterface({ input: process.stdin, output: silentOutput, terminal: true });
async function secret(label) {
  process.stdout.write(label);
  const answer = await prompt.question('');
  process.stdout.write('\n');
  return answer;
}

let pool;
try {
  const password = await secret('New admin password (at least 12 characters): ');
  const confirmation = await secret('Confirm admin password: ');
  prompt.close();
  if (password.length < 12 || password.length > 128 || password !== confirmation) throw new Error('Passwords must match and contain 12 to 128 characters');
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`INSERT INTO organizers(id,name,email,password_hash,role,status)
      VALUES($1,$2,$3,$4,'ADMIN','ACTIVE')
      ON CONFLICT(email) DO UPDATE SET name=excluded.name,password_hash=excluded.password_hash,role='ADMIN',status='ACTIVE'
      RETURNING id`, [randomUUID(), name, email, await bcrypt.hash(password, 12)]);
    await client.query('DELETE FROM sessions WHERE organizer_id=$1', [result.rows[0].id]);
    await client.query('COMMIT');
    console.log(`Admin account ready: ${email}. Sign in with the password you just entered.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  prompt.close();
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool?.end();
}
