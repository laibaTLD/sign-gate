import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Convert base64 to bytes
 */
function base64ToBytes(base64: string): Uint8Array {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = Buffer.from(cleanBase64, 'base64').toString('binary');
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert bytes to base64
 */
function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

/**
 * Embed a signature image into an existing PDF
 */
export const embedSignatureInPdf = async (
  base64Pdf: string,
  base64Signature: string,
  signerInfo?: {
    email?: string;
    signedAt?: number;
    clientCompanyName?: string;
    businessOwnerName?: string;
  },
  lastY?: number // Y position where content ended on the last page
): Promise<string> => {
  try {
    const pdfBytes = base64ToBytes(base64Pdf);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const certFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Calculate required height for certificate
    // Title (30) + Cust Info (~65) + Date/Signer (~40) + Header (20) + Box (80) + Footer (30)
    // Approximate strict height needed: 280
    const requiredHeight = 350; // generous buffer

    let certPage;
    let currentY;

    // Check if we can fit on the last page
    let addedNewPage = true;
    if (lastY !== undefined && lastY > requiredHeight) {
      // Use existing last page
      const pages = pdfDoc.getPages();
      certPage = pages[pages.length - 1];
      currentY = lastY - 50; // Start 50 units below last content
      addedNewPage = false;
    } else {
      // Add new page
      certPage = pdfDoc.addPage([595, 520]);
      currentY = 470;
    }

    if (addedNewPage) {
      certPage.drawText('DIGITAL SIGNATURE CERTIFICATE', {
        x: 50,
        y: currentY,
        size: 16,
        font: boldFont
      });
      currentY -= 40;
    } else {
      // If on same page, maybe a separator line or just the title
      certPage.drawLine({
        start: { x: 50, y: currentY + 20 },
        end: { x: 545, y: currentY + 20 },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      });

      certPage.drawText('DIGITAL SIGNATURE CERTIFICATE', {
        x: 50,
        y: currentY,
        size: 14,
        font: boldFont,
        color: rgb(0.3, 0.3, 0.3)
      });
      currentY -= 30;
    }

    if (signerInfo?.clientCompanyName || signerInfo?.businessOwnerName) {
      certPage.drawText('Customer Information', { x: 50, y: currentY, size: 12, font: boldFont });
      currentY -= 20;
      certPage.drawText(`Customer Business Name: ${signerInfo.clientCompanyName || 'N/A'}`, { x: 50, y: currentY, size: 10, font: certFont });
      currentY -= 15;
      certPage.drawText(`Business owner (Managing Member): ${signerInfo.businessOwnerName || 'N/A'}`, { x: 50, y: currentY, size: 10, font: certFont });
      currentY -= 30;
    }

    const signedDate = signerInfo?.signedAt
      ? new Date(signerInfo.signedAt).toLocaleDateString()
      : new Date().toLocaleDateString();
    const signedTime = signerInfo?.signedAt
      ? new Date(signerInfo.signedAt).toLocaleTimeString()
      : new Date().toLocaleTimeString();

    certPage.drawText(`Digitally Signed: ${signedDate} ${signedTime}`, {
      x: 50,
      y: currentY,
      size: 12,
      font: certFont
    });
    currentY -= 20;

    if (signerInfo?.email) {
      certPage.drawText(`Signed by: ${signerInfo.email}`, {
        x: 50,
        y: currentY,
        size: 12,
        font: certFont
      });
      currentY -= 30;
    } else {
      currentY -= 10;
    }

    certPage.drawText('Signature:', {
      x: 50,
      y: currentY,
      size: 14,
      font: boldFont
    });

    const sigBytes = base64ToBytes(base64Signature);
    const signatureImage = await pdfDoc.embedPng(sigBytes);
    const signatureDims = signatureImage.scale(0.4);

    certPage.drawImage(signatureImage, {
      x: 50,
      y: currentY - 80,
      width: Math.min(signatureDims.width, 200),
      height: Math.min(signatureDims.height, 80),
    });

    // Adjust footer position
    const footerY = addedNewPage ? 50 : (currentY - 100);

    certPage.drawText('This document has been digitally signed and secured via AutoSign.', {
      x: 50,
      y: footerY,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
      font: certFont
    });

    const savedBytes = await pdfDoc.save();
    return bytesToBase64(savedBytes);
  } catch (error) {
    console.error('Error embedding signature:', error);
    throw new Error('Failed to embed signature in PDF');
  }
};

/**
 * Generate a base PDF from document data
 */
export const generateBasePdf = async (docData: any): Promise<{ pdf: string, lastY: number }> => {
  try {
    const pdfDoc = await PDFDocument.create();

    // Load watermark image
    let watermarkImage = null;
    try {
      const watermarkPath = path.join(__dirname, '../../frontend/public/watermark.png');
      if (fs.existsSync(watermarkPath)) {
        const watermarkBytes = fs.readFileSync(watermarkPath);
        watermarkImage = await pdfDoc.embedPng(watermarkBytes);
      }
    } catch (error) {
      console.warn('Could not load watermark:', error);
    }

    // Helper to draw watermark
    const drawWatermark = (p: any) => {
      if (watermarkImage) {
        const { width, height } = p.getSize();
        const watermarkDims = watermarkImage.scale(0.3);
        p.drawImage(watermarkImage, {
          x: (width - watermarkDims.width) / 2,
          y: (height - watermarkDims.height) / 2,
          width: watermarkDims.width,
          height: watermarkDims.height,
          opacity: 0.1,
        });
      }
    };

    let page = pdfDoc.addPage([595, 842]); // A4 Size
    drawWatermark(page);

    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    const contentWidth = width - (margin * 2);
    let yPosition = height - margin;

    // --- LAYOUT HELPERS ---

    const computeLines = (text: string, font: any, size: number, maxWidth: number) => {
      if (!text) return [];
      const words = text.split(/\s+/);
      let lines: string[] = [];
      let currentLine = words[0];
      for (let i = 1; i < words.length; i++) {
        const width = font.widthOfTextAtSize(currentLine + ' ' + words[i], size);
        if (width < maxWidth) {
          currentLine += ' ' + words[i];
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }
      lines.push(currentLine);
      return lines;
    };

    const drawTextLine = (text: string, size: number, isBold = false, color = rgb(0.1, 0.1, 0.1)) => {
      if (yPosition < margin + 20) {
        page = pdfDoc.addPage([595, 842]);
        drawWatermark(page);
        yPosition = height - margin;
      }
      page.drawText(text, {
        x: margin,
        y: yPosition,
        size,
        font: isBold ? boldFont : font,
        color,
      });
      yPosition -= (size + 10);
    };

    const drawBlock = (
      title: string,
      items: { text: string; isBold?: boolean; size?: number; isBullet?: boolean }[]
    ) => {
      const padding = 15;
      const innerWidth = contentWidth - (padding * 2);

      // Measure Height
      let h = padding * 2;
      if (title) h += 25;

      items.forEach(item => {
        const txt = item.text || '';
        const f = item.isBold ? boldFont : font;
        const s = item.size || 10;
        const wAvailable = innerWidth - (item.isBullet ? 15 : 0);
        const lines = computeLines(txt, f, s, wAvailable);
        h += lines.length * (s * 1.4);
        h += 6;
      });

      // Page Break Check
      if (yPosition - h < margin) {
        page = pdfDoc.addPage([595, 842]);
        drawWatermark(page);
        yPosition = 842 - margin;
      }

      // NO BACKGROUND OR BORDER color
      // Just adjust yPosition based on height, but maybe less padding needed if no box?
      // Keeping spacing for consistency

      // Draw Content
      let cy = yPosition - padding;
      if (title) {
        page.drawText(title, {
          x: margin + padding, // Keep indentation
          y: cy,
          size: 11,
          font: boldFont,
          color: rgb(0.17, 0.24, 0.31),
        });
        cy -= 25;
      }

      items.forEach(item => {
        const txt = item.text || '';
        const f = item.isBold ? boldFont : font;
        const s = item.size || 10;
        const wAvailable = innerWidth - (item.isBullet ? 15 : 0);
        const lines = computeLines(txt, f, s, wAvailable);

        lines.forEach((l, i) => {
          page.drawText(l, {
            x: margin + padding + (item.isBullet ? 15 : 0),
            y: cy,
            size: s,
            font: f,
            color: rgb(0.1, 0.1, 0.1),
          });
          if (item.isBullet && i === 0) {
            page.drawText('•', {
              x: margin + padding + 5,
              y: cy,
              size: s,
              font: boldFont,
              color: rgb(0, 0, 0),
            });
          }
          cy -= (s * 1.4);
        });
        cy -= 6;
      });

      yPosition -= (h + 20);
    };

    // --- CONTENT GENERATION ---

    drawTextLine('DIGITAL MARKETING AGREEMENT', 18, true, rgb(0.17, 0.24, 0.31));
    yPosition -= 15;

    // Underline
    page.drawRectangle({
      x: margin,
      y: yPosition + 10,
      width: contentWidth,
      height: 2,
      color: rgb(0.20, 0.60, 0.86)
    });

    drawTextLine(`Date: ${new Date().toLocaleDateString()}`, 10);
    yPosition -= 20;

    const isUSBrandBooster = docData.templateId === 'us-brand-booster' ||
      (docData.templateName && docData.templateName.includes('US Brand Booster')) ||
      docData.clientCompanyName ||
      docData.businessOwnerName;

    // 1. PARTIES
    const partiesItems: any[] = [];
    if (isUSBrandBooster) {
      partiesItems.push({ text: 'Service Provider: US Brand Booster LLC', isBold: true, size: 11 });
      partiesItems.push({ text: 'Address: 30 N Gould St Ste R, Sheridan, WY 82801' });
      partiesItems.push({ text: 'Marketing Manager: Myra Dsouza' });
      partiesItems.push({ text: '' });
      partiesItems.push({ text: 'Client:', isBold: true, size: 11 });
      partiesItems.push({ text: `Business Name: ${docData.clientCompanyName || docData.clientCompany || 'N/A'}` });
      partiesItems.push({ text: `Business Owner: ${docData.businessOwnerName || docData.clientName || 'N/A'}` });
      partiesItems.push({ text: `Email: ${docData.clientEmail || 'N/A'}` });
    } else {
      partiesItems.push({ text: `Service Provider: ${docData.agencyName || 'SignDesk Agency'}` });
      partiesItems.push({ text: `Client: ${docData.clientName || 'N/A'}` });
    }
    drawBlock('PARTIES TO THIS AGREEMENT', partiesItems);

    // 2. CLIENT DETAILS / CONTACT INFO
    const clientItems: any[] = [];
    clientItems.push({ text: `Client Name: ${docData.clientName || docData.businessOwnerName || 'N/A'}` });
    clientItems.push({ text: `Company: ${docData.clientCompanyName || docData.clientCompany || 'N/A'}` });
    if (docData.clientEmail) clientItems.push({ text: `Email: ${docData.clientEmail}` });
    if (docData.clientPhone) clientItems.push({ text: `Phone: ${docData.clientPhone}` });
    if (docData.clientAddress) clientItems.push({ text: `Address: ${docData.clientAddress}` });
    if (docData.clientCityStateZip) clientItems.push({ text: `City / State / Zip: ${docData.clientCityStateZip}` });
    if (docData.clientCountry) clientItems.push({ text: `Country: ${docData.clientCountry}` });
    if (clientItems.length) {
      drawBlock('CLIENT DETAILS', clientItems);
    }

    // 3. PROJECT DETAILS
    const projectItems: any[] = [];
    projectItems.push({ text: `Document Title: ${docData.title || 'Service Agreement'}` });
    if (docData.projectName) projectItems.push({ text: `Project: ${docData.projectName}` });
    if (docData.startDate) projectItems.push({ text: `Start Date: ${docData.startDate}` });
    if (docData.endDate) projectItems.push({ text: `End / Delivery Date: ${docData.endDate}` });
    if (docData.clientDomain) projectItems.push({ text: `Client Domain: ${docData.clientDomain}` });
    if (projectItems.length) {
      drawBlock('PROJECT DETAILS', projectItems);
    }

    if (isUSBrandBooster) {
      // 4. OVERVIEW
      const ovItems: any[] = [];
      const ovText = docData.serviceOverviewDetails || `- Tailored Content: Unique content aligned with your business nature and target audience.
- Geographic Targeting: Optimize Google Guarantee for specific cities of your choice, expanding your local reach – rely on chosen list of zip codes of the supplied services. The customer will supply a list.
- Complete Website (10 Page website): Standard set of the pages and the galleries of the services on top.
- ROI Reports: Receive monthly reports on the return on investment (ROI) generated by the US BB marketing efforts. Partner with US BB on a flexible, transparent basis with no contracts or hidden fees.`;

      ovText.split('\n').forEach((l: string) => {
        if (!l.trim()) return;
        const idx = l.indexOf(':');
        if (idx > -1 && l.trim().startsWith('-')) {
          ovItems.push({ text: l.substring(1, idx + 1).trim(), isBold: true, isBullet: true });
          ovItems.push({ text: l.substring(idx + 1).trim() });
        } else {
          ovItems.push({ text: l.replace(/^-/, '').trim(), isBullet: l.trim().startsWith('-') });
        }
      });
      drawBlock('SERVICE OVERVIEW', ovItems);

      // 5. PAYMENT
      const payItems: any[] = [];
      const cCo = docData.clientCompanyName || docData.clientCompany || 'Client';
      const upf = docData.upfrontPayment || '350';
      const rem = docData.remainingPayment || '650';
      const dom = docData.clientDomain || 'domain.com';

      payItems.push({ text: `The ${cCo} is going to pay $${upf} upfront for website development.` });
      payItems.push({ text: `The ${cCo} is going to pay remaining $${rem} when the US BB makes the website live on ${cCo} domain (${dom}).` });
      payItems.push({ text: 'The Web-site will be developed on Word Press platform.' });

      drawBlock('PAYMENT TERMS', payItems);

      // 6. SCOPE
      const scItems: any[] = [];
      scItems.push({ text: 'Following are the services in scope:', size: 10 });
      const scText = docData.servicesInScopeDetails || `- Create the Mockup pages for the ${cCo} verification and approval. Supply 3 reviews before uploading the live pages to the Web.
- US BB will assist in creating the Google Business account.
- As soon as the Web-Site is created a 3 months Web SEO free service will start
- The US BB and the ${cCo} should agree on the monthly payment for the following services:
- Facebook Maintenance and support, like posts and pictures upload activities
- Instagram – uploading the pictures and videos
- Web-site pictures and videos uploads
- Changing the keywords every period of time.
- Creating the landing pages on the ${cCo} domain
- US BB will create a Facebook Dedicated page and apply the ownership to ${cCo}. US BB will create 1000 facebook followers
- US BB will create the Instagram dedicated account for ${cCo}. US BB will create 1300 insta followers + 1 month social media. After 1 month social media platforms will be charged.
- The US BB will upload any pictures and videos related to construction supplied by the ${cCo} to Website, Facebook, Instagram.
- All the Credentials of all the accounts will be defined with the agreement by the ${cCo}, including the usernames and passwords.`;
      scText.split('\n').forEach((l: string) => {
        if (l.trim()) scItems.push({ text: l.replace(/^-/, '').trim(), isBullet: true });
      });
      drawBlock('SERVICES IN SCOPE', scItems);

      // 7. POLICY (Light Red)
      const polItems: any[] = [];
      polItems.push({ text: 'Cancellation Policy', isBold: true });
      polItems.push({ text: 'At US Brand Booster LLC, we do not require a long-term contract. However, we do ask for a 15-day cancellation notice to ensure a smooth transition of all domain, hosting, and social platform credentials to your ownership.', isBullet: true });
      polItems.push({ text: 'Non-Refundable Policy:', isBold: true });
      polItems.push({ text: 'Due to the immediate allocation of funds for service execution, all payments are non-refundable unless otherwise required by law. By making a payment, you waive any right to chargebacks or refunds unless expressly permitted in writing by the Company.', isBullet: true });

      drawBlock('PRIVACY POLICY & TERMS & CONDITION', polItems);

    } else {
      // Generic layout for non-US Brand Booster templates
      if (docData.scopeOfWork) {
        drawBlock('SCOPE OF WORK', [{ text: docData.scopeOfWork }]);
      }
      if (docData.paymentTerms) {
        drawBlock('PAYMENT TERMS', [{ text: docData.paymentTerms }]);
      }
      if (docData.specialNotes) {
        drawBlock('SPECIAL NOTES / CLAUSES', [{ text: docData.specialNotes }]);
      }

      if (yPosition < 200) {
        page = pdfDoc.addPage([595, 842]);
        drawWatermark(page);
        yPosition = 800;
      }
      yPosition -= 20;
      drawTextLine('AGREEMENT SIGNATURES', 12, true);
      drawTextLine(`Service Provider: ${docData.agencyName || 'Agency'}`, 10);
      drawTextLine(`Client: ${docData.clientName || 'Client'}`, 10);
      yPosition -= 30;
      drawTextLine('Signatures are collected digitally.', 10, false, rgb(0.5, 0.5, 0.5));
    }

    if (isUSBrandBooster) {
      if (yPosition < 300) { page = pdfDoc.addPage([595, 842]); drawWatermark(page); yPosition = 800; }
      yPosition -= 30;

      // AGREEMENT SIGNATURES (US Brand Booster Specific)
      drawTextLine('AGREEMENT SIGNATURES', 12, true, rgb(0.17, 0.24, 0.31));
      yPosition -= 10;

      // Agent Section
      drawTextLine('Services Supplier: US Brand Booster LLC', 10, true);
      drawTextLine(`Marketing Manager: ${docData.agentName || 'Myra Dsouza'}`, 10);

      yPosition -= 15;
      drawTextLine('Signature:', 10, true);

      if (docData.agentSignature) {
        try {
          // Normalize base64
          const sigBase64 = docData.agentSignature.includes(',') ? docData.agentSignature.split(',')[1] : docData.agentSignature;
          const sigBytes = base64ToBytes(sigBase64);
          let sigImage;
          try {
            sigImage = await pdfDoc.embedPng(sigBytes);
          } catch {
            sigImage = await pdfDoc.embedJpg(sigBytes);
          }

          if (sigImage) {
            const dims = sigImage.scale(1);
            // Scale down to fit height of approx 40-50
            const scale = Math.min(200 / dims.width, 50 / dims.height);
            const scaledDims = { width: dims.width * scale, height: dims.height * scale };

            page.drawImage(sigImage, {
              x: margin,
              y: yPosition - 45,
              width: scaledDims.width,
              height: scaledDims.height,
            });
          }
        } catch (e) {
          console.warn('Failed to embed agent signature:', e);
        }
      } else {
        // Empty line
        page.drawLine({
          start: { x: margin, y: yPosition - 30 },
          end: { x: margin + 250, y: yPosition - 30 },
          thickness: 1,
          color: rgb(0, 0, 0),
        });
      }
      yPosition -= 50;
      drawTextLine('Date: ________________________________', 10);

      yPosition -= 30;
    }

    if (yPosition < 50) { page = pdfDoc.addPage([595, 842]); drawWatermark(page); yPosition = 800; }
    yPosition -= 30;
    page.drawText('This agreement is legally binding upon signature by both parties.', { x: margin, y: yPosition, size: 8, color: rgb(0.5, 0.5, 0.5), font });
    page.drawText('Generated via SignDesk', { x: margin, y: yPosition - 10, size: 8, color: rgb(0.5, 0.5, 0.5), font });

    const pdfBytes = await pdfDoc.save();
    return { pdf: bytesToBase64(pdfBytes), lastY: yPosition };
  } catch (error) {
    console.error('Error generating base PDF:', error);
    throw new Error('Failed to generate base PDF');
  }
};