import pool from "../models/db.js";

export const transferFunds = async (req, res) => {
  const { senderAccount, receiverAccount, amount } = req.body;

  // Get sender account balance
  const senderResult = await pool.query(
    `SELECT * FROM accounts WHERE account_number = $1 AND customer_id = $2`,
    [senderAccount, req.user.id]
  );

  if (senderResult.rows.length === 0)
    return res.status(404).json({ error: "Sender account not found" });

  const sender = senderResult.rows[0];
  if (sender.balance < amount)
    return res.status(400).json({ error: "Insufficient funds" });

  // Get receiver account
  const receiverResult = await pool.query(
    `SELECT * FROM accounts WHERE account_number = $1`,
    [receiverAccount]
  );

  if (receiverResult.rows.length === 0)
    return res.status(404).json({ error: "Receiver account not found" });

  const receiver = receiverResult.rows[0];

  // Deduct from sender and add to receiver
  await pool.query(
    `UPDATE accounts SET balance = balance - $1 WHERE account_number = $2`,
    [amount, senderAccount]
  );
  await pool.query(
    `UPDATE accounts SET balance = balance + $1 WHERE account_number = $2`,
    [amount, receiverAccount]
  );

  res.status(200).json({
    message: `Transferred ${amount} from ${senderAccount} to ${receiverAccount}`,
  });
};
