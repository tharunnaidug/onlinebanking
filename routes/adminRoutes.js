import express from 'express';
import { approveUser, approveCustomer,  freezeAccount, unfreezeAccount, deactivateAccount, approveLoan, rejectLoan, getLoanApplications, getTransactions, getAdminSummary, getAllCustomers, getCustomerDetails, blockATMCard, loginAdmin, reactivateAccount } from '../controllers/adminController.js';
import { adminOnly } from '../middlewares/roleMiddleware.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();


router.post('/login', loginAdmin);//

// router.post('/approve/:userId',protect, adminOnly, approveUser);

router.post("/approve/:customerId",protect, adminOnly, approveCustomer);//

router.put('/approveloan/:loan_id',protect, adminOnly, approveLoan);//

router.put('/freeze',protect, adminOnly, freezeAccount);//

router.put('/unfreeze',protect, adminOnly, unfreezeAccount);//

router.put('/deactivate',protect, adminOnly, deactivateAccount);//

router.put('/reactivate',protect, adminOnly, reactivateAccount);//

router.get('/loanapplications',protect, adminOnly, getLoanApplications);//

router.patch('/rejectloan/:id',protect, adminOnly, rejectLoan);//

router.get('/transactions',protect, adminOnly, getTransactions);

router.get('/summary',protect, adminOnly, getAdminSummary);//

router.get('/customers',protect, adminOnly, getAllCustomers);//

router.get('/customer/:id',protect, adminOnly, getCustomerDetails);//

router.put('/card/block/:id',protect, adminOnly, blockATMCard);

export default router;