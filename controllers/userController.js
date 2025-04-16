import pool from '../models/db.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/auth.js';

export const registerUser = async (req, res) => {
  const { full_name, email, phone, password, aadhar_number, pan_number, user_photo_url, pan_photo_url, aadhar_photo_url } = req.body;

  try {
    // Check for duplicate email
    const emailCheck = await pool.query(`SELECT id FROM customers WHERE email = $1`, [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check for duplicate phone number
    const phoneCheck = await pool.query(`SELECT id FROM customers WHERE phone = $1`, [phone]);
    if (phoneCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Phone number already exists' });
    }

    // Check for duplicate Aadhar number
    const aadharCheck = await pool.query(`SELECT id FROM customers WHERE aadhar_number = $1`, [aadhar_number]);
    if (aadharCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Aadhar number already exists' });
    }

    // Check for duplicate PAN number
    const panCheck = await pool.query(`SELECT id FROM customers WHERE pan_number = $1`, [pan_number]);
    if (panCheck.rows.length > 0) {
      return res.status(400).json({ message: 'PAN number already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new customer
    const result = await pool.query(
      `INSERT INTO customers (
        full_name, email, phone, password,
        aadhar_number, pan_number,
        user_photo, pan_photo, aadhar_photo,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending') RETURNING id`,
      [
        full_name, email, phone, hashedPassword,
        aadhar_number, pan_number,
        user_photo_url, pan_photo_url, aadhar_photo_url
      ]
    );

    const userId = result.rows[0].id;
    const token = generateToken(userId,'customer');

    res.status(201).cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000
    })
      .json({ message: 'Registered successfully', token });
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

    // Check account status
    if (user.status === 'frozen') {
      return res.status(403).json({ message: 'Account is frozen. Please contact support.' });
    }
    if (user.status === 'deactivated') {
      return res.status(403).json({ message: 'Account is deactivated.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

    const token = generateToken(user.id,'customer');
    res.cookie('token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000
    })
      .json({ message: 'Login successful', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};
export const logoutUser = (req, res) => {
  res.clearCookie('token').json({ message: 'Logged out successfully' });
};


export const applyForLoan = async (req, res) => {
  const{id}=req.user;
  const { loan_amount, loan_type, purpose } = req.body;

  try {
    await pool.query(
      `INSERT INTO loan_applications (customer_id, loan_amount, loan_type, purpose)
       VALUES ($1, $2, $3, $4)`,
      [id, loan_amount, loan_type, purpose]
    );

    res.status(201).json({ message: 'Loan application submitted successfully' });

  } catch (err) {
    console.error('Loan Apply Error:', err);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

export const transferMoney = async (req, res) => {
  const { from_account_number, to_account_number, amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid amount. Must be greater than ₹0' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch sender account
    const senderRes = await client.query(
      'SELECT * FROM accounts WHERE account_number = $1 FOR UPDATE',
      [from_account_number]
    );
    const sender = senderRes.rows[0];
    if (!sender) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Sender account not found' });
    }

    if (parseFloat(sender.balance) < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Fetch receiver account
    const receiverRes = await client.query(
      'SELECT * FROM accounts WHERE account_number = $1 FOR UPDATE',
      [to_account_number]
    );
    const receiver = receiverRes.rows[0];
    if (!receiver) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Receiver account not found' });
    }

    // Update balances
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE account_number = $2',
      [amount, from_account_number]
    );

    await client.query(
      'UPDATE accounts SET balance = balance + $1 WHERE account_number = $2',
      [amount, to_account_number]
    );

    // Insert sender transaction (debit)
    await client.query(
      'INSERT INTO transactions (from_account, to_account, amount, transaction_type, customer_id,type) VALUES ($1, $2, $3, $4, $5,$6)',
      [from_account_number, to_account_number, amount, 'debit', sender.customer_id,"CARD"]
    );

    // Insert receiver transaction (credit)
    await client.query(
      'INSERT INTO transactions (from_account, to_account, amount, transaction_type, customer_id,type) VALUES ($1, $2, $3, $4, $5,$6)',
      [from_account_number, to_account_number, amount, 'credit', receiver.customer_id,"CARD"]
    );

    await client.query('COMMIT');

    res.status(200).json({
      message: `₹${amount} transferred successfully from ${from_account_number} to ${to_account_number}`,
    });

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
  const { id } = req.user;
  const { type, start_date, end_date } = req.query;

  try {
    let query = 'SELECT * FROM transactions WHERE customer_id = $1';
    const values = [id];

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

    // Check if the card status is 'active'
    if (card.status !== 'active') {
      return res.status(403).json({ message: 'Card is not active' });
    }

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
      'SELECT * FROM accounts WHERE account_number = $1',
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
      'UPDATE accounts SET balance = $1 WHERE account_number = $2',
      [newBalance, account_number]
    );

    // Add transaction log
    await pool.query(
      'INSERT INTO transactions (customer_id, transaction_type, amount,type, transaction_date) VALUES ($1, $2, $3,$4, NOW())',
      [account.customer_id, 'debit', amount,"WITHDRAW"]
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
      'SELECT balance FROM accounts WHERE account_number = $1',
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
  const { id } = req.user;
  try {
    const result = await pool.query(
      `SELECT balance, account_number,account_type,status FROM accounts WHERE customer_id = $1`,
      [id]
    );
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching account summary:', err);
    res.status(500).json({ message: 'Error fetching account summary' });
  }
};

export const getLoanStatus = async (req, res) => {
  const { id } = req.user;

  try {
    const result = await pool.query(
      `SELECT loan_status, loan_amount, application_date FROM loan_applications WHERE customer_id = $1`,
      [id]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching loan status:', err);
    res.status(500).json({ message: 'Error fetching loan status' });
  }
};
export const getUserProfile = async (req, res) => {
  const { id } = req.user;
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, phone, aadhar_number, pan_number, user_photo, pan_photo, aadhar_photo, status, created_at FROM customers WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching user profile', error: err.message });
  }
};
// Generate ATM card
export const generateCard = async (req, res) => {
  const { id } = req.user;
  const { pin } = req.body;

  try {
    // Step 1: Get account_id from customer_id
    const accountResult = await pool.query(
      'SELECT id FROM accounts WHERE customer_id = $1',
      [id]
    );

    if (accountResult.rows.length === 0) {
      return res.status(404).json({ error: 'No account found for this customer' });
    }

    const account_id = accountResult.rows[0].id;

    // Step 2: Check if a card already exists
    const existingCard = await pool.query(
      'SELECT * FROM atm_cards WHERE account_id = $1',
      [account_id]
    );

    if (existingCard.rows.length > 0) {
      return res.status(400).json({ error: 'ATM card already exists for this account' });
    }

    // Step 3: Create new card
    const cardNumber = Math.floor(1000000000000000 + Math.random() * 9000000000000000);
    const hashedPin = await bcrypt.hash(pin, 10);
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 5);

    const result = await pool.query(
      `INSERT INTO atm_cards (account_id, card_number, hashed_pin, expiry_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [account_id, cardNumber, hashedPin, expiryDate]
    );

    res.status(201).json({
      message: 'ATM card generated successfully',
      card: result.rows[0],
    });

  } catch (err) {
    console.error('Error generating ATM card:', err);
    res.status(500).json({ error: 'Card generation failed' });
  }
};
