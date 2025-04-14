import express from 'express';
import { approveUser, approveCustomer, generateCard, freezeAccount, unfreezeAccount, deactivateAccount, approveLoan, rejectLoan, getLoanApplications, getTransactions } from '../controllers/adminController.js';
import { adminOnly } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.post('/approve/:userId', adminOnly, approveUser);

router.post("/approve/:customerId", adminOnly, approveCustomer);

router.post("/generate-card/:accountId", adminOnly, generateCard);

router.put('/approveloan/:loan_id', adminOnly, approveLoan);

router.put('/freeze', adminOnly, freezeAccount);

router.put('/unfreeze', adminOnly, unfreezeAccount);

router.put('/deactivate', adminOnly, deactivateAccount);

router.get('/loan-applications', adminOnly, getLoanApplications);

router.patch('/rejectloan/:id', adminOnly, rejectLoan);

router.get('/transactions', adminOnly, getTransactions);

export default router;