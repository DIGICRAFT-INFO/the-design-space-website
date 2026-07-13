const Enquiry = require('../models/enquiry_model');
const WebCareerApplication = require('../models/web_career_application');
const WebBlog = require('../models/web_blog');
const WebCareerJob = require('../models/web_career_job');
const Portfolio = require('../models/Portfolio');

// GET /api/v1/web-cms/leads — unified feed of website Contact-form enquiries
// and Career applications, newest first, with an optional type filter.
exports.list_leads = async (req, res) => {
  try {
    const type = req.query.type; // 'enquiry' | 'application' | undefined (both)

    const [enquiries, applications] = await Promise.all([
      type === 'application' ? [] : Enquiry.find({ source: 'website' }).sort({ created_at: -1 }),
      type === 'enquiry' ? [] : WebCareerApplication.find().sort({ created_at: -1 }),
    ]);

    const leads = [
      ...enquiries.map((e) => ({
        id: e.id,
        type: 'enquiry',
        name: e.client_name,
        email: e.email,
        phone: e.mobile_number,
        detail: e.notes,
        status: e.status,
        created_at: e.created_at,
      })),
      ...applications.map((a) => ({
        id: a.id,
        type: 'application',
        name: a.applicant_name,
        email: a.email,
        phone: a.phone,
        detail: a.job_title_snapshot ? `Applied for: ${a.job_title_snapshot}` : a.cover_note,
        status: a.status,
        resume_url: a.resume_url,
        created_at: a.created_at,
      })),
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/v1/web-cms/overview — quick stats + recent activity for the CMS
// dashboard landing page ("CMS Main Dashboard Overview").
exports.get_overview = async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      publishedPortfolioCount,
      publishedBlogCount,
      openJobsCount,
      newLeadsWeek,
      recentEnquiries,
      recentApplications,
      recentPortfolio,
      recentBlog,
    ] = await Promise.all([
      Portfolio.find({ status: 'published' }).then((r) => r.length),
      WebBlog.find({ status: 'published' }).then((r) => r.length),
      WebCareerJob.find({ status: 'open' }).then((r) => r.length),
      Promise.all([
        Enquiry.find({ source: 'website', created_at: { $gte: sevenDaysAgo } }).then((r) => r.length).catch(() => 0),
        WebCareerApplication.find({ created_at: { $gte: sevenDaysAgo } }).then((r) => r.length).catch(() => 0),
      ]).then(([a, b]) => a + b),
      Enquiry.find({ source: 'website' }).sort({ created_at: -1 }),
      WebCareerApplication.find().sort({ created_at: -1 }),
      Portfolio.find().sort({ updated_at: -1 }),
      WebBlog.find().sort({ updated_at: -1 }),
    ]);

    const activity = [
      ...recentEnquiries.slice(0, 5).map((e) => ({ type: 'enquiry', label: `New enquiry from ${e.client_name}`, at: e.created_at })),
      ...recentApplications.slice(0, 5).map((a) => ({ type: 'application', label: `${a.applicant_name} applied${a.job_title_snapshot ? ` for ${a.job_title_snapshot}` : ''}`, at: a.created_at })),
      ...recentPortfolio.slice(0, 5).map((p) => ({ type: 'portfolio', label: `Portfolio "${p.title}" updated`, at: p.updated_at })),
      ...recentBlog.slice(0, 5).map((b) => ({ type: 'blog', label: `Blog "${b.title}" updated`, at: b.updated_at })),
    ]
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 10);

    res.json({
      stats: {
        published_portfolio: publishedPortfolioCount,
        published_blog_posts: publishedBlogCount,
        open_jobs: openJobsCount,
        new_leads_7d: newLeadsWeek,
      },
      recent_activity: activity,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
