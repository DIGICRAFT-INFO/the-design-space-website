const express = require('express');
const router = express.Router();
const controller = require('../controllers/web_cms_controller');
const blogController = require('../controllers/web_blog_controller');
const careerController = require('../controllers/web_career_controller');
const seoController = require('../controllers/web_seo_controller');
const mediaController = require('../controllers/web_media_controller');
const leadsController = require('../controllers/web_leads_controller');
const { is_authenticated, is_manager_or_above } = require('../middleware/permissions');
const handleUpload = require('../middleware/handleUpload');

// All Web-CMS routes require a logged-in manager/owner — same guard used by
// the existing Portfolio module (is_manager_or_above).
router.use(is_authenticated, is_manager_or_above);

// ── CMS Dashboard Overview ──────────────────────────────────────────────────
router.get('/overview', leadsController.get_overview);

// ── Generic media upload (returns a file_url to embed in any CMS form) ─────
router.post('/upload/image', controller.handleUpload(controller.uploadImage.single('file')), controller.upload_image);
router.post('/upload/video', controller.handleUpload(controller.uploadVideo.single('file')), controller.upload_video);

// ── Home (singleton) ────────────────────────────────────────────────────────
router.route('/home')
  .get(controller.get_home)
  .put(controller.update_home)
  .patch(controller.update_home);

// ── About (singleton + team sub-CRUD) ──────────────────────────────────────
router.route('/about')
  .get(controller.get_about)
  .put(controller.update_about)
  .patch(controller.update_about);

router.post('/about/team', controller.add_team_member);
router.route('/about/team/:memberId')
  .patch(controller.update_team_member)
  .delete(controller.delete_team_member);

// ── Services (packages CRUD) ───────────────────────────────────────────────
router.route('/services')
  .get(controller.list_services_admin)
  .post(controller.create_service);

router.route('/services/:id')
  .patch(controller.update_service)
  .put(controller.update_service)
  .delete(controller.delete_service);

// ── Products (catalog CRUD) ────────────────────────────────────────────────
router.route('/products')
  .get(controller.list_products_admin)
  .post(controller.create_product);

router.route('/products/:id')
  .patch(controller.update_product)
  .put(controller.update_product)
  .delete(controller.delete_product);

// Note: Portfolio CRUD is intentionally NOT duplicated here — the Web-CMS
// "/web-cms/portfolio" screen in the dashboard calls the existing, already
// full-featured /api/v1/portfolio/* endpoints (images, docs, PDF, send).

// ── Portfolio Categories (admin-managed free-form tags) ────────────────────
router.route('/portfolio-categories')
  .get(controller.list_portfolio_categories)
  .post(controller.create_portfolio_category);
router.delete('/portfolio-categories/:id', controller.delete_portfolio_category);

// ── Blog Editorial Suite ────────────────────────────────────────────────────
router.route('/blog')
  .get(blogController.list_blog_admin)
  .post(blogController.create_blog_post);
router.route('/blog/:id')
  .patch(blogController.update_blog_post)
  .put(blogController.update_blog_post)
  .delete(blogController.delete_blog_post);

// ── Careers: Job Board ──────────────────────────────────────────────────────
router.route('/jobs')
  .get(careerController.list_jobs_admin)
  .post(careerController.create_job);
router.route('/jobs/:id')
  .patch(careerController.update_job)
  .put(careerController.update_job)
  .delete(careerController.delete_job);

// ── Careers: Applicant Tracker ──────────────────────────────────────────────
router.get('/applications', careerController.list_applications_admin);
router.patch('/applications/:id', careerController.update_application_status);
router.delete('/applications/:id', careerController.delete_application);

// ── Leads (aggregated enquiries + applications) ─────────────────────────────
router.get('/leads', leadsController.list_leads);

// ── SEO Manager ──────────────────────────────────────────────────────────────
router.get('/seo', seoController.list_seo_admin);
router.put('/seo', seoController.upsert_seo);
router.delete('/seo/:id', seoController.delete_seo);

// ── Media Library ────────────────────────────────────────────────────────────
router.get('/media', mediaController.list_media);
router.delete('/media', mediaController.delete_media);

// ── Settings (singleton) ────────────────────────────────────────────────────
router.route('/settings')
  .get(controller.get_settings)
  .put(controller.update_settings)
  .patch(controller.update_settings);

module.exports = router;
