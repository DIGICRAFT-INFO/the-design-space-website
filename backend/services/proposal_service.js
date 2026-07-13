const Proposal = require('../models/proposal');
const BrandTheme = require('../models/brand_theme'); // Assumed setting model

// Generate Proposal Number
exports.generate_proposal_number = async () => {
  const year = new Date().getFullYear();
  const prefix = `PROP-${year}-`;
  
  const lastProposal = await Proposal.findOne({ prop_number: new RegExp(`^${prefix}`) })
    .sort({ prop_number: -1 });

  let seq = 1;
  if (lastProposal) {
    const parts = lastProposal.prop_number.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }
  
  return `${prefix}${String(seq).padStart(3, '0')}`;
};

// Render Template Content
exports.render_template_content = async (template, project) => {
  const brand = await BrandTheme.findOne();
  let content = template.content;

  // Map property type display (Capitalizing the raw enum value)
  const propTypeDisplay = project.property_type 
    ? project.property_type.charAt(0).toUpperCase() + project.property_type.slice(1) 
    : '';

  const replacements = {
    '{{client_name}}': project.client ? project.client.full_name : '', //
    '{{project_name}}': project.name, //
    '{{firm_name}}': brand ? brand.firm_name : '', //
    '{{property_type}}': propTypeDisplay, //
    '{{area_sqft}}': project.area_sqft ? String(project.area_sqft) : '', //
    '{{budget_range}}': project.budget_range || '', //
  };

  // Replace all occurrences
  for (const [placeholder, value] of Object.entries(replacements)) {
    // Regex globally replaces the exact placeholder
    const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'); 
    content = content.replace(regex, value);
  }

  return content;
};