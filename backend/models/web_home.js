const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Singleton document — there is only ever one Home-page content record.
// The Web-CMS "/web-cms/home" screen reads and PUTs to this same document.

const bentoCardSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    image_title: { type: String, default: '', maxLength: 200 },
    image_url: { type: String, default: '' },
    grid_span_class: { type: String, default: 'col-span-1 row-span-1' },
    sort_order: { type: Number, default: 0 },
  },
  {
    _id: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

const processStepSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    stage: { type: String, default: '', maxLength: 50 }, // e.g. "01"
    title: { type: String, default: '', maxLength: 200 },
    body: { type: String, default: '', maxLength: 1000 },
    associated_image: { type: String, default: '' },
    sort_order: { type: Number, default: 0 },
  },
  {
    _id: true,
    toJSON: {
      transform: (doc, ret) => {
        ret.id = ret._id;
        delete ret._id;
      },
    },
  }
);

const webHomeSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'web_home_singleton' },

    hero: {
      mini_title: { type: String, default: 'THE DESIGN SPACE' },
      main_title: { type: String, default: 'We Design Your Luxury Space' },
      subtitle: {
        type: String,
        default: 'Bespoke interiors for those who see home as an art form.',
      },
      cta_label: { type: String, default: 'Explore Spaces' },
      cta_link: { type: String, default: '/portfolio' },
      video_url: { type: String, default: '' },
      poster_image: { type: String, default: '' },
    },

    // ── Multi-slide hero: when hero_slides.length > 0 the slider is shown
    //    instead of the single hero above. Each slide has its own image,
    //    titles and CTA so marketing can rotate campaigns without a deploy.
    hero_slides: [
      {
        _id: { type: String, default: uuidv4 },
        mini_title: { type: String, default: '' },
        main_title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        cta_label: { type: String, default: 'Explore Spaces' },
        cta_link: { type: String, default: '/portfolio' },
        image_url: { type: String, default: '' },
        sort_order: { type: Number, default: 0 },
      },
    ],

    grid_matrix: {
      mini_title: { type: String, default: 'Selected Architecture ' },
      cards: [bentoCardSchema],
    },

    process: {
      mini_title: { type: String, default: 'How We Work' },
      steps: [processStepSchema],
    },

    about_preview: {
      title: { type: String, default: 'Our Legacy' },
      body: { type: String, default: 'A decade of quiet, considered luxury interiors across residences and commercial spaces.' },
      cta_label: { type: String, default: 'Discover Our Legacy' },
      image: { type: String, default: '' },
    },

    careers_banner: {
      title: { type: String, default: 'We are hiring visionary designers' },
      subtitle: { type: String, default: 'Join a studio that treats every space as a craft, not a commodity.' },
      cta_label: { type: String, default: 'View Open Roles' },
    },

    section_visibility: {
      hero: { type: Boolean, default: true },
      about_preview: { type: Boolean, default: true },
      services_grid: { type: Boolean, default: true },
      bento_portfolio: { type: Boolean, default: true },
      products_carousel: { type: Boolean, default: true },
      blog_highlights: { type: Boolean, default: true },
      careers_banner: { type: Boolean, default: true },
      map: { type: Boolean, default: true },
    },

    updated_by: { type: String, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'web_home',
  }
);

webHomeSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebHome', webHomeSchema);
