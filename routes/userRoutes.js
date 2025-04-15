import express from 'express';
import { registerUser, loginUser, applyForLoan, transferMoney, getTransactionHistory, verifyAtmPin, withdrawMoney, checkBalance, changeAtmPin, getAccountSummary, getLoanStatus, getUserProfile, logoutUser, generateCard } from '../controllers/userController.js';
import { checkTransactionLimit } from '../middlewares/transactionLimit.js';
import { customerOnly } from '../middlewares/roleMiddleware.js';
import { sendOtp } from '../utils/sendOtp.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);//

router.post('/login', loginUser);//

router.post('/applyforloan', protect, customerOnly, applyForLoan);//

router.post('/transfer', protect, customerOnly, checkTransactionLimit, transferMoney);

router.post('/verifypin', protect, customerOnly, verifyAtmPin);//

router.post('/changepin', protect, customerOnly, changeAtmPin);//

router.post('/sendotp', protect, customerOnly, sendOtp);

router.post("/generatecard",protect, customerOnly, generateCard);//

router.get('/transactions', protect, customerOnly, getTransactionHistory);

router.get('/accountsummary', protect, customerOnly, getAccountSummary);//

router.get('/loanstatus', protect, customerOnly, getLoanStatus);//

router.get('/profile', protect, customerOnly, getUserProfile);//

router.get('/balance',protect, customerOnly, checkBalance);//

router.get('/logout',logoutUser);

// These APIs should only be accessible after PIN verification 
router.post('/withdraw',protect, customerOnly, checkTransactionLimit, withdrawMoney);

export default router;