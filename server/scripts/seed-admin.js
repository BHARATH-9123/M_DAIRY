import argon2 from 'argon2'; import { query, pool } from '../src/db.js';
const username=process.env.ADMIN_USERNAME, password=process.env.ADMIN_PASSWORD;
if (!username || !password || password.length < 12) throw new Error('Set ADMIN_USERNAME and an ADMIN_PASSWORD of at least 12 characters.');
const hash=await argon2.hash(password,{type:argon2.argon2id}); await query('INSERT INTO users(username,password_hash,display_name) VALUES (?,?,?) ON DUPLICATE KEY UPDATE password_hash=VALUES(password_hash)',[username,hash,'Administrator']); console.log('Administrator provisioned'); await pool.end();
