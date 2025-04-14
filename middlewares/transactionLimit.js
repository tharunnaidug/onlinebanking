import pool from '../models/db.js';

export const checkTransactionLimit = async (req, res, next) => {
  const { customer_id, amount } = req.body; // Amount is the transaction amount

  try {
    // Get today's transaction count and total amount from the transactions table
    const transactionResult = await pool.query(`
      SELECT COUNT(*) as transaction_count, SUM(amount) as total_amount
      FROM transactions
      WHERE customer_id = $1 AND DATE(transaction_date) = CURRENT_DATE
    `, [customer_id]);

    const { transaction_count, total_amount } = transactionResult.rows[0];

    // Fetch customer account limits
    const accountResult = await pool.query('SELECT * FROM accounts WHERE customer_id = $1', [customer_id]);
    const account = accountResult.rows[0];

    if (transaction_count >= account.max_daily_transactions) {
      return res.status(400).json({ message: 'Transaction limit exceeded for the day.' });
    }

    if (total_amount + amount > account.transaction_limit_per_day) {
      return res.status(400).json({ message: 'Total transaction amount exceeded for the day.' });
    }

    // If everything is fine, proceed with the transaction
    next();

  } catch (err) {
    console.error('Error checking transaction limits:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
