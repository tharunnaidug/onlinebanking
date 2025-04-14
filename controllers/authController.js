import pool from "../models/db.js";
import pkg from "bcrypt";
import jwt from "jsonwebtoken";

const { hash, compare } = pkg;

const SECRET_KEY = process.env.JWT_SECRET;

export const register = async (req, res) => {
  const { name, email, password, aadhar_no, pan_no } = req.body;

  try {
    const hashedPassword = await hash(password, 10);

    const result = await pool.query(
      `INSERT INTO customers (name, email, password, aadhar_no, pan_no, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [name, email, hashedPassword, aadhar_no, pan_no]
    );

    res.status(201).json({ message: "Registered! Wait for approval.", customer: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query(`SELECT * FROM customers WHERE email = $1`, [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = result.rows[0];
    const isMatch = await compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    if (user.status !== 'approved') return res.status(403).json({ error: "Not approved yet" });

    const token = jwt.sign({ id: user.id, role: 'customer' }, SECRET_KEY, { expiresIn: '1d' });

    res.json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};
