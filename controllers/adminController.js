import pool from '../models/db.js';
import bcrypt from "bcrypt";
import { generateToken } from '../utils/auth.js';


export const loginAdmin = async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);
        const admin = result.rows[0];

        if (!admin) return res.status(404).json({ message: 'Admin not found' });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid password' });

        const token = generateToken(admin.id, 'admin');
        res.status(200).cookie('token', token, {
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 60 * 60 * 1000
        }).json({ message: 'Login successful', token });
    } catch (err) {
        console.error('Admin Login Error:', err);
        res.status(500).json({ message: 'Login failed' });
    }
};
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
            `INSERT INTO accounts (customer_id, account_number, account_type)
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
//  Reactivate account
export const reactivateAccount = async (req, res) => {
    const { account_number } = req.body;
    try {
        await pool.query('UPDATE accounts SET status = $1 WHERE account_number = $2', ['active', account_number]);
        res.status(200).json({ message: `Account ${account_number} has been reactivated.` });
    } catch (err) {
        console.error('Reactivate account error:', err);
        res.status(500).json({ message: 'Unable to reactivate account.' });
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
export const getAdminSummary = async (req, res) => {
    try {
        const customers = await pool.query('SELECT COUNT(*) FROM customers');
        const activeAccounts = await pool.query("SELECT COUNT(*) FROM accounts WHERE status = 'active'");
        const frozenAccounts = await pool.query("SELECT COUNT(*) FROM accounts WHERE status = 'frozen'");
        const loans = await pool.query('SELECT COUNT(*) FROM loans');
        const transactions = await pool.query('SELECT COUNT(*) FROM transactions');

        res.status(200).json({
            customers: customers.rows[0].count,
            activeAccounts: activeAccounts.rows[0].count,
            frozenAccounts: frozenAccounts.rows[0].count,
            loans: loans.rows[0].count,
            transactions: transactions.rows[0].count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Error fetching summary', error: err.message });
    }
};
export const getAllCustomers = async (req, res) => {
    const { status, search } = req.query; // status can be 'active', 'pending', 'frozen'

    let query = 'SELECT * FROM customers WHERE TRUE';
    const params = [];

    if (status) {
        query += ' AND status = $1';
        params.push(status);
    }

    if (search) {
        query += ' AND (full_name ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)';
        params.push(`%${search}%`);
    }

    try {
        const result = await pool.query(query, params);
        res.status(200).json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Error fetching customers', error: err.message });
    }
};
export const getCustomerDetails = async (req, res) => {
    const { id } = req.params;

    try {
        const customerResult = await pool.query('SELECT * FROM customers WHERE id = $1', [id]);
        if (!customerResult.rows.length) return res.status(404).json({ message: 'Customer not found' });

        const accountResult = await pool.query('SELECT * FROM accounts WHERE customer_id = $1', [id]);
        const loanResult = await pool.query('SELECT * FROM loans WHERE customer_id = $1', [id]);

        res.status(200).json({
            customer: customerResult.rows[0],
            accounts: accountResult.rows,
            loans: loanResult.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Error fetching customer details', error: err.message });
    }
};
export const blockATMCard = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('UPDATE atm_cards SET status = $1 WHERE id = $2 RETURNING *', ['blocked', id]);
        if (!result.rows.length) return res.status(404).json({ message: 'ATM card not found' });

        res.status(200).json({ message: 'ATM card blocked successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '❌ Error blocking ATM card', error: err.message });
    }
};
