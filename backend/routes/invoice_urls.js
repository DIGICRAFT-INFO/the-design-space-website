const express = require("express");
const router = express.Router();
const { 
  get_invoices, create_invoice, get_invoice_detail, 
  update_invoice, delete_invoice, generate_invoice, get_invoice_pdf,
  send_invoice, mark_invoice_paid, copy_invoice
} = require('../controllers/invoice_controller');

const {
  is_authenticated,
  is_manager_or_above,
  is_finance_or_above,
} = require("../middleware/permissions");

// -------------------------------------------------------------
// Django path: 'generate/' (GenerateInvoiceView)
// Placed before :pk to avoid 'generate' being treated as ID
// Permission: IsManagerOrAbove
// -------------------------------------------------------------
router.post(
  "/generate/",
  is_authenticated,
  is_manager_or_above,
  generate_invoice,
);

// -------------------------------------------------------------
// Django path: '' (InvoiceListCreateView)
// GET: IsFinanceOrAbove, POST: IsManagerOrAbove
// -------------------------------------------------------------
router
  .route("/")
  .get(is_authenticated, is_finance_or_above, get_invoices)
  .post(is_authenticated, is_manager_or_above, create_invoice);

// -------------------------------------------------------------
// Django path: '<uuid:pk>/pdf/' (InvoicePDFView)
// Permission: IsAuthenticated
// -------------------------------------------------------------
router.get("/:pk/pdf/", is_authenticated, get_invoice_pdf);

router.post('/:pk/send/', is_authenticated, is_finance_or_above, send_invoice);
router.post('/:pk/mark_paid/', is_authenticated, is_finance_or_above, mark_invoice_paid);
router.post('/:pk/copy/', is_authenticated, is_manager_or_above, copy_invoice);
// -------------------------------------------------------------
// Django path: '<uuid:pk>/' (InvoiceDetailView)
// DELETE: IsManagerOrAbove, PUT/PATCH/GET: IsFinanceOrAbove
// -------------------------------------------------------------
router
  .route("/:pk/")
  .get(is_authenticated, is_finance_or_above, get_invoice_detail)
  .put(is_authenticated, is_finance_or_above, update_invoice) // ✅ allow finance to update status
  .patch(is_authenticated, is_finance_or_above, update_invoice)
  .delete(is_authenticated, is_manager_or_above, delete_invoice);

module.exports = router;
