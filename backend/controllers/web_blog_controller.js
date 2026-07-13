const WebBlog = require('../models/web_blog');

function slugify(str) {
  return String(str)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function uniqueSlug(base, excludeId) {
  let slug = slugify(base) || 'post';
  let i = 1;
  while (true) {
    const filter = excludeId ? { slug, _id: { $ne: excludeId } } : { slug };
    // eslint-disable-next-line no-await-in-loop
    const existing = await WebBlog.findOne(filter);
    if (!existing) return slug;
    i += 1;
    slug = `${slugify(base)}-${i}`;
  }
}

// ── Admin ────────────────────────────────────────────────────────────────

exports.list_blog_admin = async (req, res) => {
  try {
    const posts = await WebBlog.find().sort({ created_at: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create_blog_post = async (req, res) => {
  try {
    const { title, excerpt, content, category, tags, author_name, read_time_minutes, cover_image, status } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required.' });
    const slug = await uniqueSlug(title);
    const post = await WebBlog.create({
      title,
      slug,
      excerpt: excerpt || '',
      content: content || '',
      category: category || '',
      tags: tags || [],
      author_name: author_name || 'The Design Space',
      read_time_minutes: read_time_minutes || 4,
      cover_image: cover_image || '',
      status: status || 'draft',
      published_at: status === 'published' ? new Date() : null,
      created_by: req.user ? req.user._id : null,
    });
    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.update_blog_post = async (req, res) => {
  try {
    const post = await WebBlog.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });

    const fields = ['title', 'excerpt', 'content', 'category', 'tags', 'author_name', 'read_time_minutes', 'cover_image'];
    fields.forEach((f) => { if (req.body[f] !== undefined) post[f] = req.body[f]; });

    if (req.body.title !== undefined && req.body.title !== post.title && !req.body.slug) {
      // title changed and caller didn't explicitly set a slug — keep existing slug stable
      // (avoids breaking already-shared links); slug can be changed explicitly below.
    }
    if (req.body.slug !== undefined && req.body.slug !== post.slug) {
      post.slug = await uniqueSlug(req.body.slug, post._id);
    }
    if (req.body.status !== undefined) {
      if (req.body.status === 'published' && post.status !== 'published') post.published_at = new Date();
      post.status = req.body.status;
    }

    await post.save();
    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.delete_blog_post = async (req, res) => {
  try {
    const post = await WebBlog.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    await WebBlog.deleteOne({ _id: post._id });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── Public ───────────────────────────────────────────────────────────────

exports.list_blog_public = async (req, res) => {
  try {
    const filter = { status: 'published' };
    if (req.query.category && req.query.category !== 'all') filter.category = req.query.category;
    const limit = req.query.limit ? Math.min(Number(req.query.limit), 50) : 0;
    let query = WebBlog.find(filter).sort({ published_at: -1 });
    const posts = await query;
    res.json(limit ? posts.slice(0, limit) : posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.get_blog_post_public = async (req, res) => {
  try {
    const post = await WebBlog.findOne({ slug: req.params.slug, status: 'published' });
    if (!post) return res.status(404).json({ error: 'Post not found.' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
