/**
 * update_terms.js
 * Run once on server: node scripts/update_terms.js
 * Updates the invoice_terms in DB to the correct 12-point terms.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { TermsTemplate } = require('../models/settings');

const INVOICE_TERMS = `1. This invoice covers only the services specifically mentioned herein and/or in the approved quotation/proposal. Any additional services shall be charged separately.
2. Payment shall be made within the due date mentioned on the invoice. Delay in payment may result in suspension of services and/or corresponding extension of the project timeline.
3. The quoted fee includes only the agreed scope of work. Additional revisions, changes in requirements, or work outside the approved scope may attract additional charges.
4. Project timelines are subject to timely receipt of required information, approvals, drawings, selections and decisions from the client.
5. All drawings, designs, concepts, 3D views, specifications and related documents prepared by The Design Space remain its intellectual property unless otherwise agreed in writing.
6. Design documents shall be used only for the project for which they are issued and shall not be reproduced, modified or reused for another project without written permission.
7. Any additional site visits, travel, statutory approvals, specialist consultants, testing, printing or third-party expenses not specifically included in the agreed scope shall be charged separately.
8. Design and execution decisions are based on the information and site conditions available at the time. Unforeseen site conditions or changes by other agencies may require additional work and charges.
9. Applicable GST and other statutory taxes/charges shall be levied as per prevailing regulations.
10. In case of cancellation or termination of the project, fees for all services completed or work in progress up to the date of termination shall remain payable.
11. Any invoice-related discrepancy should be communicated within 7 days of receipt of the invoice.
12. This invoice shall be read together with the approved quotation/proposal/agreement governing the project. In case of conflict, the terms of the signed agreement shall prevail.`;

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const existing = await TermsTemplate.findOne();
  if (existing) {
    existing.invoice_terms = INVOICE_TERMS;
    await existing.save();
    console.log('✅ invoice_terms updated in existing TermsTemplate document');
  } else {
    await TermsTemplate.create({ invoice_terms: INVOICE_TERMS });
    console.log('✅ New TermsTemplate document created with invoice_terms');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(e => { console.error(e); process.exit(1); });
