import express from 'express';
import pool from '../models/db.js';

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
        user_photo TEXT,
        pan_photo TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 2. Create accounts
        await pool.query(`
            CREATE TABLE IF NOT EXISTS accounts (
              id SERIAL PRIMARY KEY,
              customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
              account_number BIGINT UNIQUE NOT NULL,
              account_type VARCHAR(20) NOT NULL,  -- Savings, Current, etc.
              balance DECIMAL(10, 2) DEFAULT 0.00,
              transaction_limit_per_day DECIMAL(10, 2) DEFAULT 1000.00,  -- Max daily amount
              max_daily_transactions INTEGER DEFAULT 5,  -- Max transactions per day
              status VARCHAR(20) DEFAULT 'active',
              created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
          `);

        // 3. Create loans
        await pool.query(`
      CREATE TABLE IF NOT EXISTS loans (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER REFERENCES customers(id),
        loan_amount NUMERIC(12, 2),
        loan_type VARCHAR(50),
        interest_rate NUMERIC(5, 2),
        duration_months INTEGER,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 4. Create atm_cards
        await pool.query(`
      CREATE TABLE IF NOT EXISTS atm_cards (
        id SERIAL PRIMARY KEY,
        account_id INTEGER REFERENCES accounts(id),
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // 6. Create admins
        await pool.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE,
        password TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // 7. Loan Applications
        await pool.query(`
        CREATE TABLE IF NOT EXISTS loan_applications (
          id SERIAL PRIMARY KEY,
          customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
          loan_amount DECIMAL(10, 2) NOT NULL,
          loan_type VARCHAR(50),
          purpose TEXT,
          loan_status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
          application_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          approval_date TIMESTAMPTZ,
          repayment_schedule JSONB
        )
      `);

        res.status(200).json({ message: '✅ All tables created successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Error creating tables', error: err.message });
    }
});

export default router;