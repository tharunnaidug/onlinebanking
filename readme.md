# Online Banking API Documentation

This API provides a set of endpoints for managing the banking system. It includes routes for user authentication, user operations (like applying for loans, transferring money, etc.), admin operations (like approving users, managing accounts), and more.

## API Endpoints

### 1. Authentication Routes (`/api/auth`)

- **POST** `/api/auth/register`: Registers a new user.
- **POST** `/api/auth/login`: Logs in a user and generates a token.

### 2. User Routes (`/api/user`)

- **POST** `/api/user/register`: Registers a new customer.
- **POST** `/api/user/login`: Logs in an existing customer.
- **POST** `/api/user/applyforloan`: Allows customers to apply for a loan.
- **POST** `/api/user/transfer`: Transfers funds between accounts (Transaction limit middleware applies).
- **POST** `/api/user/verify-pin`: Verifies the ATM PIN for the user.
- **POST** `/api/user/change-pin`: Allows the user to change their ATM PIN.
- **POST** `/api/user/sendotp`: Sends OTP to the customer for verifying actions.
- **GET** `/api/user/transactions/:customer_id`: Fetches the transaction history for a customer.  
  *(Optional query params: `type=debit` or `credit`, `start_date=YYYY-MM-DD`, `end_date=YYYY-MM-DD`)*
- **GET** `/api/user/accountsummary`: Fetches account summary for the user.
- **GET** `/api/user/loanstatus`: Fetches the loan status for the user.
- **POST** `/api/user/withdraw`: Allows a customer to withdraw money (requires PIN verification and transaction limit).
- **POST** `/api/user/balance`: Fetches the current balance for the customer.

### 3. Admin Routes (`/api/admin`)

- **POST** `/api/admin/approve/:userId`: Approves a user (Admin Only).
- **POST** `/api/admin/approve/:customerId`: Approves a customer and creates an account (Admin Only).
- **POST** `/api/admin/generate-card/:accountId`: Generates an ATM card for the account (Admin Only).
- **PUT** `/api/admin/approveloan/:loan_id`: Approves a loan (Admin Only).
- **PUT** `/api/admin/freeze`: Freezes a customer's account (Admin Only).
- **PUT** `/api/admin/unfreeze`: Unfreezes a customer's account (Admin Only).
- **PUT** `/api/admin/deactivate`: Deactivates a customer's account (Admin Only).
- **GET** `/api/admin/loan-applications`: Fetches all loan applications (Admin Only).
- **PATCH** `/api/admin/rejectloan/:id`: Rejects a loan application (Admin Only).
- **GET** `/api/admin/transactions`: Fetches all transactions (Admin Only).

### 4. Transfer Routes (`/api/transfer`)

- **POST** `/api/transfer/transfer`: Handles transferring funds between accounts (Requires authentication).

### 5. Setup Routes (`/api`)

- **POST** `/api/setup`: Used to initialize the database and create necessary tables if not already created.

---

## Middleware

- **`adminOnly`**: Ensures that the user is an admin before accessing the route.
- **`customerOnly`**: Ensures that the user is a customer before accessing the route.
- **`checkTransactionLimit`**: Ensures the transaction doesn’t exceed the user’s transaction limit.

---

## Dependencies

- **express**: Web framework for Node.js
- **bcryptjs**: For hashing passwords.
- **jsonwebtoken**: For generating authentication tokens.
- **pg**: PostgreSQL client for Node.js
- **dotenv**: To load environment variables from `.env` file.
- **nodemailer**: For sending OTPs via email.

---
#   o n l i n e b a n k i n g  
 