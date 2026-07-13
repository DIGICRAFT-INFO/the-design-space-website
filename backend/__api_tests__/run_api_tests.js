process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
process.env.PORT = 5321;

const mongoose = require('mongoose');
mongoose.connect = async () => ({ connection: { host: 'stub' } });

const jwt = require('jsonwebtoken');
const { patchModel } = require('./fake_db');

const User = require('../models/User');
const WebHome = require('../models/web_home');
const WebAbout = require('../models/web_about');
const WebServicePackage = require('../models/web_service_package');
const WebProduct = require('../models/web_product');
const WebSettings = require('../models/web_settings');
const Portfolio = require('../models/Portfolio');
const Enquiry = require('../models/enquiry_model');
const WebBlog = require('../models/web_blog');
const WebCareerJob = require('../models/web_career_job');
const WebCareerApplication = require('../models/web_career_application');
const WebSeo = require('../models/web_seo');
const WebPortfolioCategory = require('../models/web_portfolio_category');

const OWNER_ID = 'owner-test-id-001';

patchModel(User, [
  { _id: OWNER_ID, full_name: 'Test Owner', email: 'owner@test.com', role: 'owner', is_active: true, password: 'hashed' },
]);
patchModel(WebHome, []);
patchModel(WebAbout, []);
patchModel(WebServicePackage, []);
patchModel(WebProduct, []);
patchModel(WebSettings, []);
patchModel(Portfolio, []);
patchModel(Enquiry, []);
patchModel(WebBlog, []);
patchModel(WebCareerJob, []);
patchModel(WebCareerApplication, []);
patchModel(WebSeo, []);
patchModel(WebPortfolioCategory, []);

const app = require('../server.js');
const BASE = `http://localhost:${process.env.PORT}/api/v1`;
const TOKEN = jwt.sign({ id: OWNER_ID }, process.env.JWT_SECRET, { expiresIn: '1h' });
const AUTH = { Authorization: `Bearer ${TOKEN}` };

let pass = 0;
let fail = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    pass++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
  } catch (err) {
    fail++;
    failures.push({ name, err });
    console.log(`  \x1b[31m✗\x1b[0m ${name}\n      ${err.message}`);
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function assertTrue(cond, msg) {
  if (!cond) throw new Error(msg || 'Expected truthy value');
}

async function req(method, path, { body, headers = {}, isForm = false } = {}) {
  const opts = { method, headers: { ...headers } };
  if (body !== undefined) {
    if (isForm) {
      opts.body = body;
    } else {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(`${BASE}${path}`, opts);
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* no body */
  }
  return { status: res.status, json };
}

async function main() {
  console.log('\n── PUBLIC ENDPOINTS (no auth) ──────────────────────────');

  await check('GET /public/home returns 200 with hero defaults', async () => {
    const { status, json } = await req('GET', '/public/home');
    assertEqual(status, 200);
    assertTrue(json.hero && json.hero.main_title, 'hero.main_title missing');
    assertEqual(json.id, 'web_home_singleton');
  });

  await check('GET /public/about returns 200 with narrative defaults', async () => {
    const { status, json } = await req('GET', '/public/about');
    assertEqual(status, 200);
    assertTrue(json.narrative && json.narrative.philosophy_title === 'Crafting Quiet Luxury');
  });

  await check('GET /public/settings returns 200 with contact defaults', async () => {
    const { status, json } = await req('GET', '/public/settings');
    assertEqual(status, 200);
    assertTrue(!!json.contact);
  });

  await check('GET /public/services returns empty array initially', async () => {
    const { status, json } = await req('GET', '/public/services');
    assertEqual(status, 200);
    assertTrue(Array.isArray(json) && json.length === 0);
  });

  await check('GET /public/products returns empty array initially', async () => {
    const { status, json } = await req('GET', '/public/products');
    assertEqual(status, 200);
    assertTrue(Array.isArray(json) && json.length === 0);
  });

  await check('GET /public/portfolio returns empty array initially', async () => {
    const { status, json } = await req('GET', '/public/portfolio');
    assertEqual(status, 200);
    assertTrue(Array.isArray(json) && json.length === 0);
  });

  await check('POST /public/enquiry rejects missing name/phone (400)', async () => {
    const { status, json } = await req('POST', '/public/enquiry', { body: {} });
    assertEqual(status, 400);
    assertTrue(/required/i.test(json.error));
  });

  await check('POST /public/enquiry rejects an obviously invalid phone (400)', async () => {
    const { status, json } = await req('POST', '/public/enquiry', { body: { name: 'Asha', phone: '12' } });
    assertEqual(status, 400);
    assertTrue(/valid phone/i.test(json.error));
  });

  let enquiryId;
  await check('POST /public/enquiry accepts a valid submission (201) and tags source:website', async () => {
    const { status, json } = await req('POST', '/public/enquiry', {
      body: { name: 'Asha Mehta', phone: '9876543210', email: 'asha@test.com', budget_range: '₹25L – ₹50L', message: 'Interested in a 3BHK renovation.' },
    });
    assertEqual(status, 201);
    assertTrue(!!json.id, 'expected an id back');
    enquiryId = json.id;
    const stored = await Enquiry.findById(enquiryId);
    assertEqual(stored.source, 'website');
    assertEqual(stored.status, 'new');
    assertEqual(stored.client_name, 'Asha Mehta');
    assertEqual(stored.email, 'asha@test.com');
  });

  console.log('\n── AUTH GATE (web-cms) ──────────────────────────────────');

  await check('GET /web-cms/home without token → 401', async () => {
    const { status } = await req('GET', '/web-cms/home');
    assertEqual(status, 401);
  });

  await check('GET /web-cms/home with garbage token → 401', async () => {
    const { status } = await req('GET', '/web-cms/home', { headers: { Authorization: 'Bearer not-a-real-token' } });
    assertEqual(status, 401);
  });

  await check('GET /web-cms/home with valid owner token → 200', async () => {
    const { status } = await req('GET', '/web-cms/home', { headers: AUTH });
    assertEqual(status, 200);
  });

  console.log('\n── WEB-CMS: HOME ────────────────────────────────────────');

  await check('PUT /web-cms/home updates hero + bento cards + process steps', async () => {
    const payload = {
      hero: { mini_title: 'THE DESIGN SPACE', main_title: 'Bespoke Interiors', subtitle: 'Quiet luxury.', cta_label: 'Explore', cta_link: '/portfolio', video_url: '', poster_image: '' },
      grid_matrix: { mini_title: '01 / Work', cards: [{ image_title: 'Living Room', image_url: '/uploads/website/images/x.jpg', grid_span_class: 'lg:col-span-2', sort_order: 0 }] },
      process: { mini_title: '02 / Process', steps: [{ stage: '01', title: 'Consult', body: 'We listen.', associated_image: '', sort_order: 0 }] },
    };
    const { status, json } = await req('PUT', '/web-cms/home', { body: payload, headers: AUTH });
    assertEqual(status, 200);
    assertEqual(json.hero.main_title, 'Bespoke Interiors');
    assertEqual(json.grid_matrix.cards.length, 1);
    assertTrue(!!json.grid_matrix.cards[0].id, 'bento card should serialize an id');
    assertTrue(!json.grid_matrix.cards[0]._id, 'bento card should NOT expose _id');
    assertEqual(json.process.steps[0].title, 'Consult');
  });

  await check('GET /public/home now reflects the CMS update', async () => {
    const { json } = await req('GET', '/public/home');
    assertEqual(json.hero.main_title, 'Bespoke Interiors');
    assertEqual(json.grid_matrix.cards[0].image_title, 'Living Room');
  });

  console.log('\n── WEB-CMS: ABOUT + TEAM ────────────────────────────────');

  let memberId;
  await check('POST /web-cms/about/team adds a team member', async () => {
    const { status, json } = await req('POST', '/web-cms/about/team', { body: { name: 'Riya Kapoor', designation: 'Principal Designer' }, headers: AUTH });
    assertEqual(status, 201);
    assertEqual(json.team_members.length, 1);
    assertTrue(!!json.team_members[0].id);
    memberId = json.team_members[0].id;
  });

  await check('PATCH /web-cms/about/team/:id updates the member', async () => {
    const { status, json } = await req('PATCH', `/web-cms/about/team/${memberId}`, { body: { designation: 'Founder & Principal Designer' }, headers: AUTH });
    assertEqual(status, 200);
    assertEqual(json.team_members[0].designation, 'Founder & Principal Designer');
  });

  await check('GET /public/about reflects the new team member', async () => {
    const { json } = await req('GET', '/public/about');
    assertEqual(json.team_members.length, 1);
    assertEqual(json.team_members[0].name, 'Riya Kapoor');
  });

  await check('DELETE /web-cms/about/team/:id removes the member', async () => {
    const { status } = await req('DELETE', `/web-cms/about/team/${memberId}`, { headers: AUTH });
    assertEqual(status, 204);
    const { json } = await req('GET', '/public/about');
    assertEqual(json.team_members.length, 0);
  });

  console.log('\n── WEB-CMS: SERVICES ────────────────────────────────────');

  let serviceId;
  await check('POST /web-cms/services creates a package', async () => {
    const { status, json } = await req('POST', '/web-cms/services', {
      body: { package_name: 'Residential Masterclass', tier_classification: 'residential', scope_summary: 'Full-home design.', is_published: true },
      headers: AUTH,
    });
    assertEqual(status, 201);
    assertTrue(!!json.id);
    serviceId = json.id;
  });

  await check('rejects a service package with no name (400)', async () => {
    const { status } = await req('POST', '/web-cms/services', { body: { tier_classification: 'other' }, headers: AUTH });
    assertEqual(status, 400);
  });

  await check('GET /public/services shows only published packages', async () => {
    await req('POST', '/web-cms/services', { body: { package_name: 'Draft Package', is_published: false }, headers: AUTH });
    const { json } = await req('GET', '/public/services');
    assertEqual(json.length, 1);
    assertEqual(json[0].package_name, 'Residential Masterclass');
  });

  await check('GET /public/services?tier=residential filters correctly', async () => {
    const { json } = await req('GET', '/public/services?tier=commercial');
    assertEqual(json.length, 0);
  });

  await check('PATCH /web-cms/services/:id updates a package', async () => {
    const { status, json } = await req('PATCH', `/web-cms/services/${serviceId}`, { body: { price_estimation: 'From ₹1,800/sqft' }, headers: AUTH });
    assertEqual(status, 200);
    assertEqual(json.price_estimation, 'From ₹1,800/sqft');
  });

  await check('DELETE /web-cms/services/:id removes a package', async () => {
    const { status } = await req('DELETE', `/web-cms/services/${serviceId}`, { headers: AUTH });
    assertEqual(status, 204);
    const { json } = await req('GET', '/web-cms/services', { headers: AUTH });
    assertEqual(json.length, 1); // the draft one remains
  });

  console.log('\n── WEB-CMS: PRODUCTS ────────────────────────────────────');

  let productId;
  await check('POST /web-cms/products creates a product', async () => {
    const { status, json } = await req('POST', '/web-cms/products', {
      body: { title: 'Walnut Dining Table', category_tag: 'decor', dimensions: '180x90x75cm', is_published: true, is_in_stock: false },
      headers: AUTH,
    });
    assertEqual(status, 201);
    productId = json.id;
  });

  await check('GET /public/products shows the published product with is_in_stock false', async () => {
    const { json } = await req('GET', '/public/products');
    assertEqual(json.length, 1);
    assertEqual(json[0].is_in_stock, false);
  });

  await check('GET /public/products/:id returns 404 for unpublished/unknown id', async () => {
    const { status } = await req('GET', '/public/products/does-not-exist');
    assertEqual(status, 404);
  });

  await check('GET /public/products/:id returns the product when published', async () => {
    const { status, json } = await req('GET', `/public/products/${productId}`);
    assertEqual(status, 200);
    assertEqual(json.title, 'Walnut Dining Table');
  });

  await check('DELETE /web-cms/products/:id removes a product', async () => {
    const { status } = await req('DELETE', `/web-cms/products/${productId}`, { headers: AUTH });
    assertEqual(status, 204);
  });

  console.log('\n── WEB-CMS: PORTFOLIO (reused CRM model) ────────────────');

  let portfolioId;
  await check('POST /portfolio creates an entry (existing CRM endpoint)', async () => {
    const { status, json } = await req('POST', '/portfolio', { body: { title: 'Serene 3BHK', status: 'draft' }, headers: AUTH });
    assertEqual(status, 201);
    portfolioId = json.id;
  });

  await check('draft portfolio entries are hidden from /public/portfolio', async () => {
    const { json } = await req('GET', '/public/portfolio');
    assertEqual(json.length, 0);
  });

  await check('PATCH /portfolio/:id publishes + sets website fields (project_type, featured, metrics)', async () => {
    const { status, json } = await req('PATCH', `/portfolio/${portfolioId}`, {
      body: { status: 'published', project_type: 'residential', is_featured: true, metrics: { location: 'Mumbai', area_sqft: 2100, scope_duration: '6 months' } },
      headers: AUTH,
    });
    assertEqual(status, 200);
    assertEqual(json.status, 'published');
    assertEqual(json.project_type, 'residential');
  });

  await check('published + featured entry now appears on /public/portfolio', async () => {
    const { json } = await req('GET', '/public/portfolio');
    assertEqual(json.length, 1);
    assertEqual(json[0].title, 'Serene 3BHK');
    assertEqual(json[0].metrics.area_sqft, 2100);
  });

  await check('/public/portfolio?featured=true returns it', async () => {
    const { json } = await req('GET', '/public/portfolio?featured=true');
    assertEqual(json.length, 1);
  });

  await check('/public/portfolio?project_type=commercial excludes it', async () => {
    const { json } = await req('GET', '/public/portfolio?project_type=commercial');
    assertEqual(json.length, 0);
  });

  await check('/public/portfolio/:id returns the case-study detail', async () => {
    const { status, json } = await req('GET', `/public/portfolio/${portfolioId}`);
    assertEqual(status, 200);
    assertEqual(json.metrics.location, 'Mumbai');
  });

  await check('un-publishing hides it again from the public endpoint', async () => {
    await req('PATCH', `/portfolio/${portfolioId}`, { body: { status: 'draft' }, headers: AUTH });
    const { status } = await req('GET', `/public/portfolio/${portfolioId}`);
    assertEqual(status, 404);
  });

  console.log('\n── WEB-CMS: SETTINGS ────────────────────────────────────');

  await check('PUT /web-cms/settings updates contact info', async () => {
    const { status, json } = await req('PUT', '/web-cms/settings', {
      body: { contact: { office_address: 'Bandra, Mumbai', phone: '+91 98765 43210', email: 'hello@thedesignspace.in', working_hours: 'Mon–Sat, 10–7', map_embed_url: '' } },
      headers: AUTH,
    });
    assertEqual(status, 200);
    assertEqual(json.contact.office_address, 'Bandra, Mumbai');
  });

  await check('GET /public/settings reflects the update', async () => {
    const { json } = await req('GET', '/public/settings');
    assertEqual(json.contact.phone, '+91 98765 43210');
  });

  console.log('\n── UPLOAD ENDPOINTS ─────────────────────────────────────');

  await check('POST /web-cms/upload/image without a file → 400', async () => {
    const form = new FormData();
    const { status, json } = await req('POST', '/web-cms/upload/image', { body: form, isForm: true, headers: AUTH });
    assertEqual(status, 400);
    assertTrue(/no image/i.test(json.error));
  });

  await check('POST /web-cms/upload/image with a real file → 201 + file_url', async () => {
    const form = new FormData();
    const blob = new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xdb])], { type: 'image/jpeg' });
    form.append('file', blob, 'sample.jpg');
    const { status, json } = await req('POST', '/web-cms/upload/image', { body: form, isForm: true, headers: AUTH });
    assertEqual(status, 201);
    assertTrue(json.file_url.startsWith('/uploads/website/images/'), `unexpected file_url: ${json.file_url}`);
    const fs = require('fs');
    const path = require('path');
    assertTrue(fs.existsSync(path.join(__dirname, '..', json.file_url)), 'uploaded file not found on disk');
  });

  await check('POST /web-cms/upload/image rejects a non-image file (400)', async () => {
    const form = new FormData();
    const blob = new Blob([Buffer.from('not an image')], { type: 'text/plain' });
    form.append('file', blob, 'notes.txt');
    const { status } = await req('POST', '/web-cms/upload/image', { body: form, isForm: true, headers: AUTH });
    assertEqual(status, 400);
  });

  console.log('\n── WEB-CMS: PORTFOLIO CATEGORIES ────────────────────────');

  let categoryId;
  await check('POST /web-cms/portfolio-categories creates a category', async () => {
    const { status, json } = await req('POST', '/web-cms/portfolio-categories', { body: { name: 'Modular Kitchens' }, headers: AUTH });
    assertEqual(status, 201);
    categoryId = json.id;
  });

  await check('duplicate category name is rejected (400)', async () => {
    const { status } = await req('POST', '/web-cms/portfolio-categories', { body: { name: 'Modular Kitchens' }, headers: AUTH });
    assertEqual(status, 400);
  });

  await check('GET /public/portfolio-categories lists it', async () => {
    const { json } = await req('GET', '/public/portfolio-categories');
    assertEqual(json.length, 1);
    assertEqual(json[0].name, 'Modular Kitchens');
  });

  await check('portfolio entries can be tagged with a custom category and filtered publicly', async () => {
    const { json: created } = await req('POST', '/portfolio', { body: { title: 'Kitchen Reno', status: 'published', custom_categories: ['Modular Kitchens'] }, headers: AUTH });
    const { json: filtered } = await req('GET', '/public/portfolio?tag=Modular%20Kitchens');
    assertEqual(filtered.length, 1);
    assertEqual(filtered[0].title, 'Kitchen Reno');
  });

  await check('DELETE /web-cms/portfolio-categories/:id removes it', async () => {
    const { status } = await req('DELETE', `/web-cms/portfolio-categories/${categoryId}`, { headers: AUTH });
    assertEqual(status, 204);
  });

  console.log('\n── WEB-CMS: BLOG ─────────────────────────────────────────');

  let blogId;
  let blogSlug;
  await check('POST /web-cms/blog creates a draft post with an auto-generated slug', async () => {
    const { status, json } = await req('POST', '/web-cms/blog', { body: { title: '5 Trends Shaping Luxury Interiors in 2026' }, headers: AUTH });
    assertEqual(status, 201);
    assertEqual(json.status, 'draft');
    assertEqual(json.slug, '5-trends-shaping-luxury-interiors-in-2026');
    blogId = json.id;
    blogSlug = json.slug;
  });

  await check('a second post with the same title gets a de-duplicated slug', async () => {
    const { json } = await req('POST', '/web-cms/blog', { body: { title: '5 Trends Shaping Luxury Interiors in 2026' }, headers: AUTH });
    assertTrue(json.slug !== blogSlug, 'expected a different slug');
    await req('DELETE', `/web-cms/blog/${json.id}`, { headers: AUTH });
  });

  await check('draft posts are hidden from /public/blog', async () => {
    const { json } = await req('GET', '/public/blog');
    assertEqual(json.length, 0);
  });

  await check('draft posts 404 on /public/blog/:slug', async () => {
    const { status } = await req('GET', `/public/blog/${blogSlug}`);
    assertEqual(status, 404);
  });

  await check('PATCH /web-cms/blog/:id publishes the post and stamps published_at', async () => {
    const { status, json } = await req('PATCH', `/web-cms/blog/${blogId}`, {
      body: { status: 'published', excerpt: 'A look ahead.', content: '## Heading\n\nSome **bold** text.', category: 'Trends' },
      headers: AUTH,
    });
    assertEqual(status, 200);
    assertEqual(json.status, 'published');
    assertTrue(!!json.published_at, 'expected published_at to be set');
  });

  await check('published post now appears on /public/blog and /public/blog/:slug', async () => {
    const { json: list } = await req('GET', '/public/blog');
    assertEqual(list.length, 1);
    const { status, json: detail } = await req('GET', `/public/blog/${blogSlug}`);
    assertEqual(status, 200);
    assertEqual(detail.excerpt, 'A look ahead.');
  });

  await check('DELETE /web-cms/blog/:id removes the post', async () => {
    const { status } = await req('DELETE', `/web-cms/blog/${blogId}`, { headers: AUTH });
    assertEqual(status, 204);
    const { json } = await req('GET', '/public/blog');
    assertEqual(json.length, 0);
  });

  console.log('\n── WEB-CMS: CAREERS (JOBS + APPLICATIONS) ───────────────');

  let jobId;
  await check('POST /web-cms/jobs creates an open job posting', async () => {
    const { status, json } = await req('POST', '/web-cms/jobs', { body: { title: 'Senior Interior Designer', department: 'Design', employment_type: 'full_time' }, headers: AUTH });
    assertEqual(status, 201);
    jobId = json.id;
  });

  await check('GET /public/careers lists the open job', async () => {
    const { json } = await req('GET', '/public/careers');
    assertEqual(json.length, 1);
    assertEqual(json[0].title, 'Senior Interior Designer');
  });

  await check('POST /public/careers/apply rejects a submission with no resume (400)', async () => {
    const form = new FormData();
    form.append('name', 'Kabir Shah');
    form.append('email', 'kabir@test.com');
    form.append('phone', '9876500000');
    form.append('job_id', jobId);
    const { status, json } = await req('POST', '/public/careers/apply', { body: form, isForm: true });
    assertEqual(status, 400);
    assertTrue(/resume/i.test(json.error));
  });

  let applicationId;
  await check('POST /public/careers/apply accepts a valid submission with a PDF resume', async () => {
    const form = new FormData();
    form.append('name', 'Kabir Shah');
    form.append('email', 'kabir@test.com');
    form.append('phone', '9876500000');
    form.append('job_id', jobId);
    const pdfBlob = new Blob([Buffer.from('%PDF-1.4 fake resume content')], { type: 'application/pdf' });
    form.append('resume', pdfBlob, 'resume.pdf');
    const { status, json } = await req('POST', '/public/careers/apply', { body: form, isForm: true });
    assertEqual(status, 201);
    assertTrue(!!json.id);
    applicationId = json.id;
  });

  await check('applying with a non-PDF resume is rejected (400)', async () => {
    const form = new FormData();
    form.append('name', 'Test');
    form.append('email', 'test@test.com');
    form.append('phone', '9876500000');
    const notPdf = new Blob([Buffer.from('hello')], { type: 'text/plain' });
    form.append('resume', notPdf, 'resume.txt');
    const { status } = await req('POST', '/public/careers/apply', { body: form, isForm: true });
    assertEqual(status, 400);
  });

  await check('GET /web-cms/applications lists the application with the job title snapshot', async () => {
    const { status, json } = await req('GET', '/web-cms/applications', { headers: AUTH });
    assertEqual(status, 200);
    assertEqual(json.length, 1);
    assertEqual(json[0].job_title_snapshot, 'Senior Interior Designer');
  });

  await check('PATCH /web-cms/applications/:id updates status to reviewed', async () => {
    const { status, json } = await req('PATCH', `/web-cms/applications/${applicationId}`, { body: { status: 'reviewed' }, headers: AUTH });
    assertEqual(status, 200);
    assertEqual(json.status, 'reviewed');
  });

  await check('closing the job removes it from /public/careers', async () => {
    await req('PATCH', `/web-cms/jobs/${jobId}`, { body: { status: 'closed' }, headers: AUTH });
    const { json } = await req('GET', '/public/careers');
    assertEqual(json.length, 0);
  });

  console.log('\n── WEB-CMS: LEADS (aggregated enquiries + applications) ─');

  await check('GET /web-cms/leads returns both enquiries and applications, newest first', async () => {
    const { status, json } = await req('GET', '/web-cms/leads', { headers: AUTH });
    assertEqual(status, 200);
    const types = json.map((l) => l.type);
    assertTrue(types.includes('enquiry'), 'expected at least one enquiry lead');
    assertTrue(types.includes('application'), 'expected at least one application lead');
  });

  await check('GET /web-cms/leads?type=application filters correctly', async () => {
    const { json } = await req('GET', '/web-cms/leads?type=application', { headers: AUTH });
    assertTrue(json.every((l) => l.type === 'application'));
    assertTrue(json.length >= 1);
  });

  console.log('\n── WEB-CMS: CMS DASHBOARD OVERVIEW ──────────────────────');

  await check('GET /web-cms/overview returns stats + recent activity', async () => {
    const { status, json } = await req('GET', '/web-cms/overview', { headers: AUTH });
    assertEqual(status, 200);
    assertTrue(typeof json.stats.published_portfolio === 'number');
    assertTrue(Array.isArray(json.recent_activity));
    assertTrue(json.recent_activity.length > 0, 'expected some recent activity given the enquiry/application above');
  });

  console.log('\n── WEB-CMS: SEO MANAGER ──────────────────────────────────');

  await check('PUT /web-cms/seo upserts a route entry (create)', async () => {
    const { status, json } = await req('PUT', '/web-cms/seo', { body: { route_path: '/services', meta_title: 'Services — The Design Space', meta_description: 'Our design packages.' }, headers: AUTH });
    assertEqual(status, 200);
    assertEqual(json.meta_title, 'Services — The Design Space');
  });

  await check('PUT /web-cms/seo upserts the same route (update, not duplicate)', async () => {
    await req('PUT', '/web-cms/seo', { body: { route_path: '/services', meta_description: 'Updated description.' }, headers: AUTH });
    const { json } = await req('GET', '/web-cms/seo', { headers: AUTH });
    assertEqual(json.length, 1);
    assertEqual(json[0].meta_description, 'Updated description.');
  });

  await check('GET /public/seo exposes entries with no auth', async () => {
    const { status, json } = await req('GET', '/public/seo');
    assertEqual(status, 200);
    assertEqual(json.length, 1);
  });

  console.log('\n── WEB-CMS: MEDIA LIBRARY ────────────────────────────────');

  await check('GET /web-cms/media lists uploaded files (includes the earlier test upload)', async () => {
    const { status, json } = await req('GET', '/web-cms/media', { headers: AUTH });
    assertEqual(status, 200);
    assertTrue(Array.isArray(json));
    assertTrue(json.some((f) => f.folder === 'website/images'), 'expected at least one image from earlier upload tests');
  });

  await check('DELETE /web-cms/media rejects a path-traversal attempt (400)', async () => {
    const { status } = await req('DELETE', '/web-cms/media', { body: { folder: 'website/images', filename: '../../../etc/passwd' }, headers: AUTH });
    assertTrue(status === 400 || status === 404, `expected 400/404, got ${status}`);
  });

  await check('DELETE /web-cms/media removes a real file', async () => {
    const { json: files } = await req('GET', '/web-cms/media', { headers: AUTH });
    const target = files.find((f) => f.folder === 'website/images');
    const { status } = await req('DELETE', '/web-cms/media', { body: { folder: target.folder, filename: target.filename }, headers: AUTH });
    assertEqual(status, 204);
  });

  console.log('\n── WEB-CMS: HOME — extended sections ────────────────────');

  await check('PUT /web-cms/home accepts about_preview, careers_banner, section_visibility', async () => {
    const { status, json } = await req('PUT', '/web-cms/home', {
      body: {
        about_preview: { title: 'Our Story', body: 'Test body', cta_label: 'Read More' },
        careers_banner: { title: 'Join Us', subtitle: 'Great team', cta_label: 'Apply' },
        section_visibility: { map: false },
      },
      headers: AUTH,
    });
    assertEqual(status, 200);
    assertEqual(json.about_preview.title, 'Our Story');
    assertEqual(json.careers_banner.cta_label, 'Apply');
    assertEqual(json.section_visibility.map, false);
    assertEqual(json.section_visibility.hero, true, 'other visibility flags should keep their defaults');
  });

  console.log('\n── WEB-CMS: SETTINGS — legal text ───────────────────────');

  await check('PUT /web-cms/settings accepts legal text', async () => {
    const { status, json } = await req('PUT', '/web-cms/settings', { body: { legal: { privacy_policy: 'We respect your privacy.', copyright_terms: '© 2026 The Design Space.' } }, headers: AUTH });
    assertEqual(status, 200);
    assertEqual(json.legal.privacy_policy, 'We respect your privacy.');
  });

  await check('GET /public/settings exposes legal text', async () => {
    const { json } = await req('GET', '/public/settings');
    assertEqual(json.legal.copyright_terms, '© 2026 The Design Space.');
  });

  console.log('\n── PERMISSION BOUNDARIES ────────────────────────────────');

  await check('a non-manager role is rejected with 403 from web-cms', async () => {
    const staffId = 'staff-test-id-002';
    await User.create({ _id: staffId, full_name: 'Staff User', email: 'staff@test.com', role: 'designer', is_active: true, password: 'hashed' });
    const staffToken = jwt.sign({ id: staffId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const { status } = await req('GET', '/web-cms/home', { headers: { Authorization: `Bearer ${staffToken}` } });
    assertEqual(status, 403);
  });

  await check('an inactive user is rejected with 401', async () => {
    const inactiveId = 'inactive-test-id-003';
    await User.create({ _id: inactiveId, full_name: 'Inactive User', email: 'inactive@test.com', role: 'owner', is_active: false, password: 'hashed' });
    const inactiveToken = jwt.sign({ id: inactiveId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const { status } = await req('GET', '/web-cms/home', { headers: { Authorization: `Bearer ${inactiveToken}` } });
    assertEqual(status, 401);
  });

  console.log(`\n${'─'.repeat(58)}`);
  console.log(`RESULT: ${pass} passed, ${fail} failed (of ${pass + fail})`);
  if (fail > 0) {
    console.log('\nFailures:');
    failures.forEach((f) => console.log(`  - ${f.name}: ${f.err.message}`));
  }
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Test runner crashed:', e);
  process.exit(1);
});
