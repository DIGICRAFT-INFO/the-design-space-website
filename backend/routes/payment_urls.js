const express = require('express');
const router = express.Router();
const { 
  get_payments, 
  create_payment, 
  get_payment_detail, 
  update_payment, 
  delete_payment,
  get_payment_summary,
} = require('../controllers/payment_controller');

const { is_authenticated, is_finance_or_above } = require('../middleware/permissions');

// -------------------------------------------------------------
// GET /payments/summary/ — category-wise & status-wise totals
// Must be declared BEFORE /:pk/ to avoid 'summary' being matched as ID
// -------------------------------------------------------------
router.get('/summary/', is_authenticated, is_finance_or_above, get_payment_summary);

// -------------------------------------------------------------
// Django path: '' (PaymentListCreateView)
// GET: IsAuthenticated, POST: IsFinanceOrAbove
// -------------------------------------------------------------
router.route('/')
  .get(is_authenticated, get_payments)
  .post(is_authenticated, is_finance_or_above, create_payment);

// -------------------------------------------------------------
// Django path: '<uuid:pk>/' (PaymentDetailView)
// All Methods (GET, PUT, PATCH, DELETE): IsFinanceOrAbove
// -------------------------------------------------------------
router.route('/:pk/')
  .get(is_authenticated, is_finance_or_above, get_payment_detail)
  .put(is_authenticated, is_finance_or_above, update_payment)
  .patch(is_authenticated, is_finance_or_above, update_payment)
  .delete(is_authenticated, is_finance_or_above, delete_payment);

module.exports = router;