import express from 'express';
import { registerUser, loginUser, applyForLoan, transferMoney, getTransactionHistory, verifyAtmPin, withdrawMoney, checkBalance, changeAtmPin, getAccountSummary, getLoanStatus } from '../controllers/userController.js';
import { checkTransactionLimit } from '../middlewares/transactionLimit.js';
import { customerOnly } from '../middlewares/roleMiddleware.js';
import { sendOtp } from '../utils/sendOtp.js';

const router = express.Router();

router.post('/register', registerUser);

router.post('/login', loginUser);

router.post('/applyforloan', customerOnly, applyForLoan);

router.post('/transfer', customerOnly, checkTransactionLimit, transferMoney);

router.post('/verify-pin', customerOnly, verifyAtmPin);

router.post('/change-pin', customerOnly, changeAtmPin);

router.post('/sendotp', customerOnly, sendOtp);

router.get('/transactions/:customer_id', customerOnly, getTransactionHistory);//Optional query params:type=debit or type=credit start_date=2024-01-01 end_date=2024-12-31

router.get('/accountsummary', customerOnly, getAccountSummary);

router.get('/loanstatus', customerOnly, getLoanStatus);

// These APIs should only be accessible after PIN verification 
router.post('/withdraw', customerOnly, checkTransactionLimit, withdrawMoney);
router.post('/balance', customerOnly, checkBalance);

export default router;