process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret';
process.env.PORT = 5000;

const mongoose = require('mongoose');
mongoose.connect = async () => ({ connection: { host: 'stub' } });

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

patchModel(User, [{ _id: 'owner-1', full_name: 'Test Owner', email: 'owner@test.com', role: 'owner', is_active: true, password: 'x' }]);
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

require('../server.js');

async function seed() {
  const home = await WebHome.create({
    _id: 'web_home_singleton',
    hero: {
      mini_title: 'THE DESIGN SPACE',
      main_title: 'We Design Your Luxury Space',
      subtitle: 'Bespoke interiors for those who see home as an art form.',
      cta_label: 'Explore Spaces',
      cta_link: '/portfolio',
      video_url: '',
      poster_image: '',
    },
    grid_matrix: { mini_title: ' Selected Architecture', cards: [] },
    process: {
      mini_title: 'How We Work',
      steps: [{ stage: '01', title: 'Consultation', body: 'We listen first.', associated_image: '', sort_order: 0 }],
    },
  });

  await WebAbout.create({
    _id: 'web_about_singleton',
    narrative: {
      philosophy_title: 'Crafting Quiet Luxury',
      story_para_one: 'The Design Space was founded on a simple belief.',
      story_para_two: 'Over a decade, that belief has shaped homes across the country.',
      hero_image: '',
    },
    studio_gallery: [],
    team_members: [{ name: 'Riya Kapoor', designation: 'Founder & Principal Designer', avatar_url: '', sort_order: 0 }],
  });

  await WebServicePackage.create({
    package_name: 'Residential Masterclass',
    tier_classification: 'residential',
    scope_summary: 'End-to-end residential design from concept to styling.',
    price_estimation: 'From ₹1,800/sqft',
    highlights: ['Concept & mood boards', 'Material sourcing', 'On-site execution'],
    is_published: true,
  });

  await WebProduct.create({
    title: 'Walnut Dining Table',
    category_tag: 'decor',
    material_specs: 'Solid walnut, brass inlay',
    dimensions: '180 × 90 × 75 cm',
    is_published: true,
    is_in_stock: true,
    item_images: [],
  });

  const portfolio = await Portfolio.create({
    title: 'Serene 3BHK, Bandra',
    description: 'A considered response to a young family\'s brief for calm, tactile interiors.',
    status: 'published',
    project_type: 'residential',
    is_featured: true,
    metrics: { location: 'Mumbai', area_sqft: 2100, scope_duration: '6 months' },
    images: [{ file_url: '/logo.png', caption: 'Living room' }],
  });

  await WebSettings.create({
    _id: 'web_settings_singleton',
    contact: {
      office_address: 'Bandra West, Mumbai 400050',
      phone: '+91 98765 43210',
      email: 'hello@thedesignspace.in',
      working_hours: 'Mon – Sat, 10:00 AM – 7:00 PM',
      map_embed_url: '',
    },
    social_links: { instagram: 'https://instagram.com/test', linkedin: '', facebook: '', pinterest: '' },
    footer_text: 'Bespoke interior design for residences and commercial spaces.',
    legal: {
      privacy_policy: 'We respect your privacy. This is the seeded privacy policy text.',
      copyright_terms: '© 2026 The Design Space. All rights reserved (seeded terms text).',
    },
  });

  const category = await WebPortfolioCategory.create({ name: 'Modular Kitchens' });
  await Portfolio.findById(portfolio.id).then(async (p) => {
    p.custom_categories = ['Modular Kitchens'];
    await p.save();
  });

  const blogPost = await WebBlog.create({
    title: '5 Trends Shaping Luxury Interiors in 2026',
    slug: '5-trends-shaping-luxury-interiors-in-2026',
    excerpt: 'A look at what quiet luxury means for interiors this year.',
    content: '## Quiet luxury, loudly considered\n\nThis is the **seeded** article body with some *markdown* formatting.',
    category: 'Trends',
    tags: ['trends', 'materials'],
    author_name: 'The Design Space',
    read_time_minutes: 5,
    status: 'published',
    published_at: new Date(),
  });

  const job = await WebCareerJob.create({
    title: 'Senior Interior Designer',
    department: 'Design',
    location: 'Mumbai, India',
    employment_type: 'full_time',
    description: 'Seeded job description text.',
    requirements: ['5+ years experience', 'Portfolio of residential work'],
    status: 'open',
  });

  await WebSeo.create({
    route_path: '/services',
    meta_title: 'Seeded SEO Title for Services',
    meta_description: 'Seeded SEO description for the services page.',
    meta_keywords: ['interior design', 'luxury'],
  });

  console.log('SEEDED_OK', JSON.stringify({ homeId: home.id, portfolioId: portfolio.id, blogSlug: blogPost.slug, jobId: job.id, categoryId: category.id }));
}

seed().catch((e) => {
  console.error('SEED_FAILED', e);
  process.exit(1);
});
