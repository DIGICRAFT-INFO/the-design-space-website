const express = require('express');
const router = express.Router();
const webCmsController = require('../controllers/web_cms_controller');
const portfolioController = require('../controllers/portfolio_controller');
const enquiryController = require('../controllers/enquiry_controller');
const blogController = require('../controllers/web_blog_controller');
const careerController = require('../controllers/web_career_controller');
const seoController = require('../controllers/web_seo_controller');
const handleUpload = require('../middleware/handleUpload');

// Content reads — no auth, published-only data
router.get('/home', webCmsController.get_home);
router.get('/about', webCmsController.get_about_public);
router.get('/services', webCmsController.list_services_public);
router.get('/products', webCmsController.list_products_public);
router.get('/products/:id', webCmsController.get_product_public);
router.get('/portfolio', portfolioController.list_public_portfolios);
router.get('/portfolio/:id', portfolioController.get_public_portfolio_detail);
router.get('/portfolio-categories', webCmsController.list_portfolio_categories);
router.get('/settings', webCmsController.get_settings_public);
router.get('/seo', seoController.list_seo_public);

// Blog
router.get('/blog', blogController.list_blog_public);
router.get('/blog/:slug', blogController.get_blog_post_public);

// Careers
router.get('/careers', careerController.list_jobs_public);
router.post('/careers/apply', handleUpload(careerController.uploadResume.single('resume')), careerController.apply_to_job);

// Contact form → straight into the CRM Enquiries module
router.post('/enquiry', enquiryController.create_public_enquiry);

module.exports = router;
