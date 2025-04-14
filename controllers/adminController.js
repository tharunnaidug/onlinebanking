import pool from '../models/db.js';
import bcrypt from "bcrypt";

export const approveUser = async (req, res) => {
    const { userId } = req.params;

    try {
        await pool.query(
            'UPDATE customers SET status = $1 WHERE id = $2',
            ['approved', userId]
        );
        res.json({ message: 'User approved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error approving user' });
    }
};

// Approve customer and create account
export const approveCustomer = async (req, res) => {
    const { customerId } = req.params;
    const { account_type } = req.body;

    try {
        await pool.query(`UPDATE customers SET status = 'approved' WHERE id = $1`, [customerId]);

        const accountNumber = 1000000000 + parseInt(customerId);

        const result = await pool.query(
            `INSERT INTO accounts (customer_id, account_number, type)
       VALUES ($1, $2, $3) RETURNING *`,
            [customerId, accountNumber, account_type]
        );

        res.status(200).json({
            message: 'Customer approved and account created.',
            account: result.rows[0],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Approval failed' });
    }
};

// Generate ATM card
export const generateCard = async (req, res) => {
    const { accountId } = req.params;
    const { pin } = req.body;

    try {
        const cardNumber = Math.floor(1000000000000000 + Math.random() * 9000000000000000);
        const hashedPin = await bcrypt.hash(pin, 10);
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 5);

        const result = await pool.query(
            `INSERT INTO atm_cards (account_id, card_number, hashed_pin, expiry_date)
       VALUES ($1, $2, $3, $4) RETURNING *`,
            [accountId, cardNumber, hashedPin, expiryDate]
        );

        res.status(201).json({
            message: 'ATM card generated successfully.',
            card: result.rows[0],
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Card generation failed' });
    }
};
export const approveLoan = async (req, res) => {
    const { loan_id } = req.params;

    try {
        // Check if the loan exists and is pending
        const loanResult = await pool.query('SELECT * FROM loan_applications WHERE id = $1 AND loan_status = $2', [loan_id, 'pending']);
        if (!loanResult.rows.length) {
            return res.status(404).json({ message: 'Loan application not found or already approved.' });
        }

        // Approve the loan by updating the status
        const approvalDate = new Date();
        const loan = loanResult.rows[0];
        await pool.query('UPDATE loan_applications SET loan_status = $1, approval_date = $2 WHERE id = $3', ['approved', approvalDate, loan.id]);

        // Optionally, credit the loan amount to the customer's account (in rupees)
        await pool.query('UPDATE accounts SET balance = balance + $1 WHERE customer_id = $2', [loan.loan_amount, loan.customer_id]);

        res.status(200).json({ message: 'Loan approved successfully and credited to customer account.' });
    } catch (err) {
        console.error('Error approving loan:', err);
        res.status(500).json({ message: 'Server error' });
    }
};
//Freeze an account
export const freezeAccount = async (req, res) => {
    const { account_number } = req.body;
    try {
        await pool.query('UPDATE accounts SET status = $1 WHERE account_number = $2', ['frozen', account_number]);
        res.status(200).json({ message: `Account ${account_number} has been frozen.` });
    } catch (err) {
        console.error('Freeze account error:', err);
        res.status(500).json({ message: 'Unable to freeze account.' });
    }
};

//  Unfreeze account
export const unfreezeAccount = async (req, res) => {
    const { account_number } = req.body;
    try {
        await pool.query('UPDATE accounts SET status = $1 WHERE account_number = $2', ['active', account_number]);
        res.status(200).json({ message: `Account ${account_number} is now active.` });
    } catch (err) {
        console.error('Unfreeze account error:', err);
        res.status(500).json({ message: 'Unable to unfreeze account.' });
    }
};

//  Deactivate account
export const deactivateAccount = async (req, res) => {
    const { account_number } = req.body;
    try {
        await pool.query('UPDATE accounts SET status = $1 WHERE account_number = $2', ['deactivated', account_number]);
        res.status(200).json({ message: `Account ${account_number} has been deactivated.` });
    } catch (err) {
        console.error('Deactivate account error:', err);
        res.status(500).json({ message: 'Unable to deactivate account.' });
    }
};
// Get all loan applications
export const getLoanApplications = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM loan_applications');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching loan applications:', err);
    res.status(500).json({ message: 'Error fetching loan applications' });
  }
};

// Reject loan
export const rejectLoan = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE loan_applications SET loan_status = 'rejected', approval_date = CURRENT_TIMESTAMP 
      WHERE id = $1 RETURNING *`, [id]
    );
    res.status(200).json({ message: 'Loan rejected', loan: result.rows[0] });
  } catch (err) {
    console.error('Error rejecting loan:', err);
    res.status(500).json({ message: 'Error rejecting loan' });
  }
};

// Get all transactions 
export const getTransactions = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM transactions');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Error fetching transactions' });
  }
};
