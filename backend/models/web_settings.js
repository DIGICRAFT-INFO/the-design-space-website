const mongoose = require('mongoose');

// Singleton — website-wide info (distinct from models/settings.js which
// holds invoicing/tax/bank settings for the CRM's PDF documents).

const webSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'web_settings_singleton' },

    contact: {
      office_address: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      working_hours: { type: String, default: 'Mon – Sat, 10:00 AM – 7:00 PM' },
      map_embed_url: { type: String, default: '' },
    },

    social_links: {
      instagram: { type: String, default: '' },
      pinterest: { type: String, default: '' },
      linkedin: { type: String, default: '' },
      facebook: { type: String, default: '' },
      youtube: { type: String, default: '' },
    },

    footer_text: { type: String, default: '' },
    seo_default_title: { type: String, default: 'The Design Space — Luxury Interior Design' },
    seo_default_description: { type: String, default: '' },

    // Navbar visibility — if nav_products_label is non-empty, the Products/Designs
    // link appears in the navbar with this label. If blank, the link is hidden.
    nav_products_label: { type: String, default: '' },

    legal: {
      privacy_policy: {
        type: String,
        default: `# Privacy Policy

**Effective Date:** January 1, 2024
**Last Updated:** July 2025

## 1. Introduction

The Design Space ("we", "our", or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you visit our website at thedesignspace.in or contact us for our interior design services.

## 2. Information We Collect

We may collect the following information:

- **Personal details** — Name, phone number, email address
- **Project details** — Location, budget range, requirements you share with us
- **Usage data** — Pages visited, time spent, browser/device information (via cookies)

## 3. How We Use Your Information

We use the information to:

- Respond to your enquiries and provide design consultation
- Prepare proposals, quotations, and project documentation
- Send relevant updates about your project
- Improve our website and services

We do **not** sell, rent, or trade your personal information to third parties.

## 4. Data Security

Your data is stored securely. We use industry-standard practices to protect your information from unauthorised access, disclosure, or misuse.

## 5. Cookies

Our website may use cookies to enhance your browsing experience. You can disable cookies in your browser settings at any time.

## 6. Third-Party Services

We may use trusted third-party services (e.g., Google Maps, email delivery) that have their own privacy policies. We are not responsible for their practices.

## 7. Your Rights

You have the right to:
- Request access to the personal data we hold about you
- Request correction or deletion of your data
- Withdraw consent at any time

To exercise these rights, contact us at **hello@thedesignspace.in** or call **+91 93001 20500**.

## 8. Changes to This Policy

We may update this policy periodically. The latest version will always be available on this page.

## 9. Contact Us

**The Design Space**
Raipur, Chhattisgarh 492001
📞 +91 93001 20500
📧 hello@thedesignspace.in
`
      },
      copyright_terms: {
        type: String,
        default: `# Copyright & Terms of Use

**Effective Date:** January 1, 2024
**Last Updated:** July 2025

## 1. Ownership

All content on this website — including but not limited to text, images, photographs, design concepts, project portfolios, logos, and graphics — is the exclusive intellectual property of **The Design Space**, Raipur, Chhattisgarh, India, unless otherwise stated.

## 2. Copyright Notice

© 2024–2025 The Design Space. All rights reserved.

Unauthorised reproduction, distribution, or commercial use of any content from this website is strictly prohibited without prior written permission from The Design Space.

## 3. Portfolio & Project Images

All interior design projects, photographs, and rendered images displayed on this website are the original work of The Design Space. These images may not be reproduced, copied, or used without explicit written consent.

## 4. Website Usage

You are permitted to:
- Browse and view the website for personal, non-commercial use
- Share links to pages on our website

You are **not** permitted to:
- Copy or reproduce content for commercial purposes
- Scrape, download, or bulk-extract content from this website
- Misrepresent our work as your own

## 5. Design Services & Contracts

Engagement of our design services is governed by separate project agreements signed between the client and The Design Space. These terms of use do not constitute a service contract.

## 6. Disclaimer

The information on this website is provided in good faith. We do not guarantee that all content is always up to date. Pricing, availability, and project timelines are subject to change.

## 7. Governing Law

These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Raipur, Chhattisgarh.

## 8. Contact for Permissions

For licensing, reproduction requests, or any other enquiries:

**The Design Space**
Raipur, Chhattisgarh 492001
📞 +91 93001 20500
📧 hello@thedesignspace.in
`
      },
    },

    updated_by: { type: String, ref: 'User', default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    collection: 'web_settings',
  }
);

webSettingsSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  },
});

module.exports = mongoose.model('WebSettings', webSettingsSchema);
