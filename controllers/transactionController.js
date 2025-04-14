import pool from "../models/db.js";

// Log a transaction (either deposit, withdrawal, or transfer)
export const logTransaction = async (type, senderAccount, receiverAccount, amount) => {
    await pool.query(
        `INSERT INTO transactions (transaction_type, sender_account, receiver_account, amount)
     VALUES ($1, $2, $3, $4)`,
        [type, senderAccount, receiverAccount, amount]
    );
};
