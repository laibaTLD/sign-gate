# Agreement Template Documentation

## Overview

This package contains a complete agreement template system based on the DocuSign template for **Website Development and Marketing Services** between US Brand Booster LLC and clients.

## Files Included

### 1. `agreement_template.html`
- **Purpose:** Fully formatted HTML agreement with visual styling
- **Use Case:** 
  - View in web browser for presentation
  - Upload to DocuSign or other e-signature platforms
  - Print as PDF for physical signatures
  - Embed in web applications
- **Features:**
  - Professional styling with color-coded sections
  - Editable fields (contenteditable)
  - Signature blocks
  - Print-friendly CSS
  - Responsive design

### 2. `agreement_template.md`
- **Purpose:** Plain text markdown version
- **Use Case:**
  - Easy editing in any text editor
  - Version control with Git
  - Convert to other formats (PDF, DOCX, etc.)
  - Quick reference
- **Features:**
  - Clean, readable format
  - All content preserved
  - Easy to search and edit

### 3. `agreement_fields_mapping.json`
- **Purpose:** Structured data mapping of all agreement components
- **Use Case:**
  - API integration with DocuSign
  - Automated agreement generation
  - Database schema reference
  - Field validation
- **Features:**
  - Complete field definitions
  - DocuSign integration mappings
  - Service descriptions
  - Policy details
  - Timeline and deliverables

## Dynamic Fields Reference

### Required Fields (Must be filled before sending)

| Field Placeholder | Description | Example |
|------------------|-------------|---------|
| `[CLIENT_COMPANY_NAME]` | Legal name of client's business | Commercial Remodeling Contractors |
| `[BUSINESS_OWNER_NAME]` | Full name of business owner/managing member | David Rozenstein |
| `[CLIENT_DOMAIN_NAME]` | Client's website domain | Commercialremodelingcontractors.com |
| `[DATE]` | Signature date | 12/05/2025 |

### Editable Payment Fields

| Field | Default Value | Description |
|-------|--------------|-------------|
| Upfront Payment | $350 | Initial payment for website development |
| Remaining Payment | $650 | Payment when website goes live |
| Total Cost | $1000 | Total initial project cost |

## How to Use

### Method 1: Using the HTML Template

1. **Open the HTML file** in a web browser
2. **Click on the blue highlighted fields** to edit them directly
3. **Fill in all required information:**
   - Client company name
   - Business owner name
   - Client domain name
   - Payment amounts (if different from defaults)
4. **Print to PDF** or **save the page** for digital signing
5. **Upload to DocuSign** or your preferred e-signature platform

### Method 2: Using the Markdown Template

1. **Open** `agreement_template.md` in any text editor
2. **Find and replace** all placeholder fields:
   - Search for `[CLIENT_COMPANY_NAME]` and replace with actual name
   - Search for `[BUSINESS_OWNER_NAME]` and replace with actual name
   - Search for `[CLIENT_DOMAIN_NAME]` and replace with actual domain
3. **Convert to PDF** using tools like:
   - Pandoc: `pandoc agreement_template.md -o agreement.pdf`
   - Online converters
   - Markdown editors with export features
4. **Send for signature**

### Method 3: DocuSign API Integration

1. **Load** `agreement_fields_mapping.json`
2. **Use the DocuSign integration section** to map fields
3. **Create template** in DocuSign with anchor strings
4. **Automate** agreement generation using the field definitions

```javascript
// Example: Loading field mappings
const fieldMappings = require('./agreement_fields_mapping.json');
const dynamicFields = fieldMappings.dynamic_fields;
const signatureFields = fieldMappings.signature_fields;
```

## Agreement Structure

### 1. Parties Section
- Client information (dynamic)
- US Brand Booster LLC information (fixed)

### 2. Service Overview
- Tailored Content
- Geographic Targeting
- Complete Website (10 pages)
- ROI Reports

### 3. Payment Terms
- Upfront payment: $350
- Remaining payment: $650 (on website launch)
- Monthly services (to be agreed upon)

### 4. Services in Scope
- Mockup pages creation
- Google Business account setup
- 3 months free Web SEO
- Facebook page (1000 followers)
- Instagram account (1300 followers + 1 month free)
- Ongoing monthly services (optional)
- Credential management

### 5. Privacy Policy & Terms
- **Cancellation Policy:** 15-day notice required
- **Non-Refundable Policy:** All payments non-refundable
- **Cancellation Method:** Email to info@usbrandbooster.com

### 6. Signature Section
- Service Provider signature (Myra Dsouza)
- Client signature (Business Owner)
- Date fields for both parties

## Service Deliverables Timeline

### Phase 1: Website Development
- **Payment:** $350 upfront
- **Deliverables:**
  - Mockup pages
  - Client approval process
  - WordPress website development

### Phase 2: Website Launch
- **Payment:** $650 on completion
- **Deliverables:**
  - Live website on client domain
  - Google Business account setup
  - All credentials provided

### Phase 3: Social Media Setup
- **Payment:** Included in initial payment
- **Deliverables:**
  - Facebook page with 1000 followers
  - Instagram account with 1300 followers
  - 1 month free management

### Phase 4: Ongoing Services
- **Payment:** Monthly (amount to be agreed)
- **Deliverables:**
  - 3 months free Web SEO
  - Social media management
  - Content uploads
  - Keyword optimization
  - Monthly ROI reports

## Legal Compliance

### Important Policies

1. **No Long-Term Contracts:** Flexible, month-to-month arrangement
2. **15-Day Cancellation Notice:** Required for smooth transition
3. **Non-Refundable Payments:** Due to immediate fund allocation
4. **Credential Ownership:** Client owns all usernames and passwords
5. **Transparent Pricing:** No hidden fees

### Cancellation Process

1. Send email to: **info@usbrandbooster.com**
2. Subject line: **"CANCEL"**
3. Effective date: Start of next billing cycle
4. Credential transfer: All access transferred to client

## Customization Guide

### Changing Payment Amounts

If you need different payment amounts:

1. **In HTML:** Click on the payment fields and edit directly
2. **In Markdown:** Find `$350` and `$650` and replace with new amounts
3. **In JSON:** Update the `payment_terms` section

### Adding Additional Services

To add services not in the template:

1. Add to the "Services in Scope" section
2. Update the JSON mapping file
3. Adjust payment terms accordingly

### Modifying Policies

**⚠️ WARNING:** The privacy policy and terms are legal documents. Only modify if:
- You have legal authorization
- Changes are reviewed by legal counsel
- Both parties agree to modifications

## Technical Integration

### DocuSign API Example

```json
{
  "emailSubject": "Please sign: Website Development Agreement",
  "templateId": "YOUR_TEMPLATE_ID",
  "templateRoles": [
    {
      "email": "myra@usbrandbooster.com",
      "name": "Myra Dsouza",
      "roleName": "Service Provider"
    },
    {
      "email": "client@example.com",
      "name": "[BUSINESS_OWNER_NAME]",
      "roleName": "Client",
      "tabs": {
        "textTabs": [
          {
            "tabLabel": "ClientCompanyName",
            "value": "ABC Construction"
          },
          {
            "tabLabel": "BusinessOwnerName",
            "value": "John Smith"
          },
          {
            "tabLabel": "ClientDomain",
            "value": "abcconstruction.com"
          }
        ]
      }
    }
  ]
}
```

### Automated Field Population

Use the JSON mapping to automatically populate fields from your CRM or database:

```python
import json

# Load field mappings
with open('agreement_fields_mapping.json', 'r') as f:
    mappings = json.load(f)

# Load client data from your system
client_data = {
    'company_name': 'ABC Construction',
    'owner_name': 'John Smith',
    'domain': 'abcconstruction.com'
}

# Populate template
for field in mappings['dynamic_fields']:
    field_id = field['field_id']
    if field_id in client_data:
        # Replace placeholder with actual data
        pass
```

## Quality Checklist

Before sending the agreement, verify:

- [ ] All `[PLACEHOLDER]` fields are replaced
- [ ] Client company name is correct
- [ ] Business owner name is spelled correctly
- [ ] Domain name is accurate
- [ ] Payment amounts are correct
- [ ] Both signature blocks are present
- [ ] Date fields are ready
- [ ] Contact email (info@usbrandbooster.com) is correct
- [ ] All policies are intact and unmodified

## Support and Contact

**US Brand Booster LLC**
- Email: info@usbrandbooster.com
- Marketing Manager: Myra Dsouza

For questions about:
- Agreement terms: Contact Myra Dsouza
- Technical issues: Refer to this documentation
- Legal modifications: Consult legal counsel

## Version History

- **Version 1.0** (2025-12-05)
  - Initial template creation
  - Based on original DocuSign template
  - All fields and policies preserved exactly as specified

## License and Usage

This template is proprietary to US Brand Booster LLC. Use only for:
- Creating client agreements with US Brand Booster LLC
- Internal business purposes
- Authorized client engagements

Do not:
- Redistribute without permission
- Modify legal policies without authorization
- Use for competing services

---

*Template generated from: Docusign New Client- crc.pdf*  
*Last updated: December 5, 2025*
