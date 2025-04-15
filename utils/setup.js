import express from 'express';
import pool from '../models/db.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.get('/setup', async (req, res) => {
    try {
        // 1. Create customers
        await pool.query(`
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                full_name VARCHAR(100),
                email VARCHAR(100) UNIQUE,
                password TEXT,
                aadhar_number VARCHAR(20),
                pan_number VARCHAR(20),
                phone VARCHAR(15) UNIQUE,
                user_photo TEXT,
                pan_photo TEXT,
                aadhar_photo TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Create accounts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS accounts (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                account_number BIGINT UNIQUE NOT NULL,
                account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('savings', 'current')),
                balance DECIMAL(10, 2) DEFAULT 0.00,
                transaction_limit_per_day DECIMAL(10, 2) DEFAULT 1000.00,
                max_daily_transactions INTEGER DEFAULT 5,
                status VARCHAR(20) DEFAULT 'active',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 3. Create loans
        await pool.query(`
            CREATE TABLE IF NOT EXISTS loans (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                loan_amount NUMERIC(12, 2),
                loan_type VARCHAR(50),
                interest_rate NUMERIC(5, 2),
                duration_months INTEGER,
                status VARCHAR(20) DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Create atm_cards
        await pool.query(`
            CREATE TABLE IF NOT EXISTS atm_cards (
                id SERIAL PRIMARY KEY,
                account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
                card_number BIGINT UNIQUE,
                hashed_pin TEXT,
                expiry_date DATE,
                status VARCHAR(20) DEFAULT 'active'
            );
        `);

        // 5. Create transactions
        await pool.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id SERIAL PRIMARY KEY,
                from_account BIGINT,
                to_account BIGINT,
                amount NUMERIC(12, 2),
                type VARCHAR(20),
                customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                transaction_type VARCHAR(20),
                transaction_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 6. Create admins
        await pool.query(`
            CREATE TABLE IF NOT EXISTS admins (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE,
                password TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 7. Create loan_applications
        await pool.query(`
            CREATE TABLE IF NOT EXISTS loan_applications (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
                loan_amount NUMERIC(12, 2),
                loan_type VARCHAR(50),
                purpose TEXT,
                loan_status VARCHAR(20) DEFAULT 'pending',
                application_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                approval_date TIMESTAMPTZ,
                repayment_schedule JSONB
            );
        `);

        // ✅ Create default admin if not exists
        const existingAdmin = await pool.query(`SELECT * FROM admins WHERE username = 'admin'`);
        if (existingAdmin.rowCount === 0) {
            const hashedPassword = await bcrypt.hash('admin', 10);
            await pool.query(`
                INSERT INTO admins (username, password)
                VALUES ($1, $2)
            `, ['admin', hashedPassword]);
        }

        res.status(200).json({ message: '✅ All tables created and default admin added successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Error during setup', error: err.message });
    }
});

export default router;
