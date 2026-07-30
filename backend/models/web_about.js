const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const galleryImageSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    file_url: { type: String, required: true },
    caption: { type: String, default: '', maxLength: 200 },
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

const whoWeAreSchema = new mongoose.Schema(
  {
    title:            { type: String, default: '', maxLength: 200 },
    body:             { type: String, default: '' },
    background_image: { type: String, default: '' },
  },
  { _id: false }
);

const missionSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', maxLength: 200 },
    body:  { type: String, default: '' },
  },
  { _id: false }
);

const visionSchema = new mongoose.Schema(
  {
    title: { type: String, default: '', maxLength: 200 },
    body:  { type: String, default: '' },
  },
  { _id: false }
);

const valueItemSchema = new mongoose.Schema(
  {
    _id:         { type: String, default: uuidv4 },
    icon:        { type: String, default: '' },
    title:       { type: String, default: '', maxLength: 200 },
    description: { type: String, default: '' },
    sort_order:  { type: Number, default: 0 },
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

const industryItemSchema = new mongoose.Schema(
  {
    _id:          { type: String, default: uuidv4 },
    name:         { type: String, required: true, maxLength: 200 },
    icon_url:     { type: String, default: '' },
    description:  { type: String, default: '' },
    sort_order:   { type: Number, default: 0 },
    is_published: { type: Boolean, default: false },
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

const teamMemberSchema = new mongoose.Schema(
  {
    _id: { type: String, default: uuidv4 },
    name: { type: String, required: true, maxLength: 200 },
    designation: { type: String, default: '', maxLength: 200 },
    avatar_url: { type: String, default: '' },
    sort_order: { type: Number, default: 0 },
    is_founder:       { type: Boolean, default: false },
    bio:              { type: String, default: '' },
    social_instagram: { type: String, default: '' },
    social_linkedin:  { type: String, default: '' },
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

const webAboutSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'web_about_singleton' },

    narrative: {
      philosophy_title: { type: String, default: 'Crafting Quiet Luxury' },
      story_para_one: { type: String, default: '' },
      story_para_two: { type: String, default: '' },
      hero_image: { type: String, default: '' },
    },

    // ── Multi-slide hero for the About page
    //    When about_slides.length > 0, a full-screen slider is shown at the
    //    top of the About page instead of the static hero image.
    about_slides: [
      {
        _id: { type: String, default: uuidv4 },
        mini_title: { type: String, default: '' },
        main_title: { type: String, default: '' },
        subtitle: { type: String, default: '' },
        cta_label: { type: String, default: '' },
        cta_link: { type: String, default: '' },
        image_url: { type: String, default: '' },
        sort_order: { type: Number, default: 0 },
      },
    ],

    studio_gallery: [galleryImageSchema],
    studio_video_url: { type: String, default: '' },

    who_we_are: { type: whoWeAreSchema, default: () => ({}) },
    mission:    { type: missionSchema,  default: () => ({}) },
    vision:     { type: visionSchema,   default: () => ({}) },

    values:     [valueItemSchema],
    industries: [industryItemSchema],

    team_members: [teamMemberSchema],

    updated_by: { type: String, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'web_about',
  }
);

webAboutSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebAbout', webAboutSchema);
