import pool from '../models/db.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/auth.js';

export const registerUser = async (req, res) => {
  const { full_name, email, password, aadhar_number, pan_number, user_photo_url } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO customers (full_name, email, password, aadhar_number, pan_number, user_photo, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id`,
      [full_name, email, hashedPassword, aadhar_number, pan_number, user_photo_url]
    );

    const userId = result.rows[0].id;
    const token = generateToken(userId);

    res.status(201).json({ message: 'Registered successfully', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error during registration' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

    const token = generateToken(user.id);
    res.json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed' });
  }
};

export const applyForLoan = async (req, res) => {
  const { customer_id, loan_amount, loan_type, purpose } = req.body;

  try {
    await pool.query(
      `INSERT INTO loan_applications (customer_id, loan_amount, loan_type, purpose)
       VALUES ($1, $2, $3, $4)`,
      [customer_id, loan_amount, loan_type, purpose]
    );

    res.status(201).json({ message: 'Loan application submitted successfully' });

  } catch (err) {
    console.error('Loan Apply Error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

export const transferMoney = async (req, res) => {
  const { from_customer_id, to_account_number, amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount. Must be greater than ₹0' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get sender's account
    const senderRes = await client.query('SELECT * FROM accounts WHERE customer_id = $1 FOR UPDATE', [from_customer_id]);
    const sender = senderRes.rows[0];
    if (!sender) return res.status(404).json({ message: 'Sender account not found' });

    if (sender.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Get receiver's account
    const receiverRes = await client.query('SELECT * FROM accounts WHERE account_number = $1 FOR UPDATE', [to_account_number]);
    const receiver = receiverRes.rows[0];
    if (!receiver) return res.status(404).json({ message: 'Receiver account not found' });

    // Perform balance updates
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE customer_id = $2', [amount, from_customer_id]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE account_number = $2', [amount, to_account_number]);

    // Log transactions
    await client.query(
      'INSERT INTO transactions (customer_id, transaction_type, amount, transaction_date) VALUES ($1, $2, $3, NOW())',
      [from_customer_id, 'debit', amount]
    );

    await client.query(
      'INSERT INTO transactions (customer_id, transaction_type, amount, transaction_date) VALUES ($1, $2, $3, NOW())',
      [receiver.customer_id, 'credit', amount]
    );

    await client.query('COMMIT');
    res.status(200).json({ message: `₹${amount} transferred successfully to account ${to_account_number}` });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Money transfer failed:', err);
    res.status(500).json({ message: 'Transfer failed. Try again later.' });
  } finally {
    client.release();
  }
};
//Transaction history
export const getTransactionHistory = async (req, res) => {
  const { customer_id } = req.params;
  const { type, start_date, end_date } = req.query;

  try {
    let query = 'SELECT * FROM transactions WHERE customer_id = $1';
    const values = [customer_id];

    if (type) {
      values.push(type);
      query += ` AND transaction_type = $${values.length}`;
    }

    if (start_date) {
      values.push(start_date);
      query += ` AND transaction_date >= $${values.length}`;
    }

    if (end_date) {
      values.push(end_date);
      query += ` AND transaction_date <= $${values.length}`;
    }

    query += ' ORDER BY transaction_date DESC';

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);

  } catch (err) {
    console.error('Transaction history error:', err);
    res.status(500).json({ message: 'Could not fetch transaction history' });
  }
};

//  Verify ATM PIN
export const verifyAtmPin = async (req, res) => {
  const { card_number, pin } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM atm_cards WHERE card_number = $1',
      [card_number]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Card not found' });
    }

    const card = result.rows[0];
    const isMatch = await bcrypt.compare(pin, card.hashed_pin);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid PIN' });
    }

    // Success ✅
    res.status(200).json({
      message: 'PIN verified successfully',
      customer_id: card.customer_id,
      account_number: card.account_number
    });

  } catch (err) {
    console.error('ATM PIN verification error:', err);
    res.status(500).json({ message: 'Error verifying PIN' });
  }
};
//  Withdraw money
export const withdrawMoney = async (req, res) => {
  const { account_number, amount } = req.body;

  try {
    // Get account balance
    const accRes = await pool.query(
      'SELECT * FROM savings_accounts WHERE account_number = $1',
      [account_number]
    );

    if (accRes.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const account = accRes.rows[0];

    if (account.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Deduct amount
    const newBalance = account.balance - amount;

    await pool.query(
      'UPDATE savings_accounts SET balance = $1 WHERE account_number = $2',
      [newBalance, account_number]
    );

    // Add transaction log
    await pool.query(
      'INSERT INTO transactions (customer_id, transaction_type, amount, transaction_date) VALUES ($1, $2, $3, NOW())',
      [account.customer_id, 'debit', amount]
    );

    res.status(200).json({ message: `₹${amount} withdrawn successfully`, balance: newBalance });

  } catch (err) {
    console.error('Withdraw error:', err);
    res.status(500).json({ message: 'Error processing withdrawal' });
  }
};
// Check balance
export const checkBalance = async (req, res) => {
  const { account_number } = req.body;

  try {
    const accRes = await pool.query(
      'SELECT balance FROM savings_accounts WHERE account_number = $1',
      [account_number]
    );

    if (accRes.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.status(200).json({
      message: 'Balance fetched successfully',
      balance: accRes.rows[0].balance
    });

  } catch (err) {
    console.error('Check balance error:', err);
    res.status(500).json({ message: 'Error fetching balance' });
  }
};
// Change ATM PIN
export const changeAtmPin = async (req, res) => {
  const { card_number, old_pin, new_pin } = req.body;

  try {
    const result = await pool.query(
      'SELECT * FROM atm_cards WHERE card_number = $1',
      [card_number]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Card not found' });
    }

    const card = result.rows[0];

    const isMatch = await bcrypt.compare(old_pin, card.hashed_pin);
    if (!isMatch) {
      return res.status(401).json({ message: 'Old PIN is incorrect' });
    }

    // Hash new PIN
    const salt = await bcrypt.genSalt(10);
    const hashedNewPin = await bcrypt.hash(new_pin, salt);

    await pool.query(
      'UPDATE atm_cards SET hashed_pin = $1 WHERE card_number = $2',
      [hashedNewPin, card_number]
    );

    res.status(200).json({ message: 'ATM PIN changed successfully' });

  } catch (err) {
    console.error('Change PIN error:', err);
    res.status(500).json({ message: 'Error changing ATM PIN' });
  }
};
// Get user account summary
export const getAccountSummary = async (req, res) => {
  const { customer_id } = req.user; 

  try {
    const result = await pool.query(
      `SELECT balance, account_number FROM accounts WHERE customer_id = $1`,
      [customer_id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching account summary:', err);
    res.status(500).json({ message: 'Error fetching account summary' });
  }
};

export const getLoanStatus = async (req, res) => {
  const { customer_id } = req.user;

  try {
    const result = await pool.query(
      `SELECT loan_status, loan_amount, application_date FROM loan_applications WHERE customer_id = $1`,
      [customer_id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching loan status:', err);
    res.status(500).json({ message: 'Error fetching loan status' });
  }
};

