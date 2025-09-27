import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import { writeFile, mkdir, readFile } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface SignatureProcessingOptions {
  documentData: any;
  userData: any;
  signatureImage: Buffer;
  outputPath: string;
}

class SignatureProcessor {
  /**
   * Process uploaded signature image and prepare for PDF application
   */
  async processSignatureImage(imageBuffer: Buffer): Promise<{
    processedImage: Buffer;
    dimensions: { width: number; height: number };
  }> {
    try {
      // Process the signature image with Sharp
      const processedBuffer = await sharp(imageBuffer)
        .resize(300, 100, { 
          fit: 'inside', 
          withoutEnlargement: true,
          background: { r: 255, g: 255, b: 255, alpha: 0 } 
        })
        .png({ 
          compressionLevel: 9,
          palette: false,
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .toBuffer();

      // Get image metadata
      const metadata = await sharp(processedBuffer).metadata();
      
      return {
        processedImage: processedBuffer,
        dimensions: {
          width: metadata.width || 300,
          height: metadata.height || 100
        }
      };
    } catch (error) {
      console.error('Error processing signature image:', error);
      throw new Error('Failed to process signature image');
    }
  }

  /**
   * Apply signature to cancellation PDF
   */
  async applyCancellationSignature(options: SignatureProcessingOptions): Promise<Buffer> {
    try {
      // Create or load the cancellation PDF template
      const pdfDoc = await this.createCancellationPDF(options.documentData, options.userData);
      
      // Process signature image
      const { processedImage, dimensions } = await this.processSignatureImage(options.signatureImage);
      
      // Embed signature image in PDF
      const signatureImageEmbed = await pdfDoc.embedPng(processedImage);
      
      // Get the first (and likely only) page
      const pages = pdfDoc.getPages();
      const page = pages[0];
      
      // Calculate signature position (bottom right area)
      const pageWidth = page.getWidth();
      const pageHeight = page.getHeight();
      
      // Position signature in the signature area
      const signatureX = 50; // Left margin for signature line
      const signatureY = 150; // Bottom area where signature goes
      const signatureWidth = Math.min(dimensions.width, 200);
      const signatureHeight = Math.min(dimensions.height, 50);
      
      // Draw signature image
      page.drawImage(signatureImageEmbed, {
        x: signatureX,
        y: signatureY,
        width: signatureWidth,
        height: signatureHeight,
      });
      
      // Add signature date
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const currentDate = new Date().toLocaleDateString('de-CH');
      
      page.drawText(`Datum: ${currentDate}`, {
        x: signatureX + signatureWidth + 20,
        y: signatureY + 10,
        size: 10,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Save PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error('Error applying cancellation signature:', error);
      throw new Error('Failed to apply signature to cancellation document');
    }
  }

  /**
   * Apply signature to insurance application PDF
   */
  async applyApplicationSignature(options: SignatureProcessingOptions): Promise<Buffer> {
    try {
      // Create or load the application PDF
      const pdfDoc = await this.createApplicationPDF(options.documentData, options.userData);
      
      // Process signature image
      const { processedImage, dimensions } = await this.processSignatureImage(options.signatureImage);
      
      // Embed signature image
      const signatureImageEmbed = await pdfDoc.embedPng(processedImage);
      
      // Apply signature to the document
      const pages = pdfDoc.getPages();
      const page = pages[0];
      
      // Position signature appropriately
      const signatureX = 50;
      const signatureY = 100; // Adjust based on your application form layout
      const signatureWidth = Math.min(dimensions.width, 200);
      const signatureHeight = Math.min(dimensions.height, 50);
      
      page.drawImage(signatureImageEmbed, {
        x: signatureX,
        y: signatureY,
        width: signatureWidth,
        height: signatureHeight,
      });
      
      // Add signature date
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const currentDate = new Date().toLocaleDateString('de-CH');
      
      page.drawText(`Unterschrift, ${currentDate}`, {
        x: signatureX,
        y: signatureY - 15,
        size: 10,
        font,
        color: rgb(0.5, 0.5, 0.5),
      });
      
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error('Error applying application signature:', error);
      throw new Error('Failed to apply signature to application document');
    }
  }

  /**
   * Create cancellation PDF with form data
   */
  private async createCancellationPDF(formData: any, userData: any): Promise<PDFDocument> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 12;

    let yPosition = 750;

    // Header
    page.drawText('Kündigung der obligatorischen Krankenpflegeversicherung', {
      x: 50,
      y: yPosition,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });
    
    yPosition -= 25;
    page.drawText('(Grundversicherung)', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 40;

    // Date and location
    page.drawText(`${formData.postalCodeCity?.split(' ').slice(1).join(' ') || 'Zürich'}, ${formData.currentDate}`, {
      x: 400,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    yPosition -= 40;

    // Sender information
    page.drawText('Absender:', {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: boldFont,
    });

    yPosition -= 20;
    const senderLines = [
      formData.fullName,
      formData.street,
      formData.postalCodeCity,
      userData.phone ? `Tel: ${userData.phone}` : '',
      userData.email ? `E-Mail: ${userData.email}` : ''
    ].filter(line => line);

    senderLines.forEach(line => {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font,
      });
      yPosition -= 18;
    });

    yPosition -= 20;

    // Recipient
    page.drawText('An:', {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: boldFont,
    });

    yPosition -= 20;
    const recipientLines = [
      formData.insuranceName,
      formData.insuranceStreet || '[Adresse wird ergänzt]',
      formData.insurancePostalCode || '[PLZ Ort wird ergänzt]'
    ];

    recipientLines.forEach(line => {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font,
      });
      yPosition -= 18;
    });

    yPosition -= 30;

    // Main content
    page.drawText('Sehr geehrte Damen und Herren', {
      x: 50,
      y: yPosition,
      size: fontSize,
      font,
    });

    yPosition -= 30;
    const contentLines = [
      'Hiermit kündige ich meine Grundversicherung per 31. Dezember 2024.',
      'Ich werde ab 1.1.2025 bei einem anderen Krankenversicherer nach KVG versichert sein.',
      '',
      formData.policyNumber ? `Versicherten-Nummer: ${formData.policyNumber}` : 'Versicherten-Nummer: [Falls vorhanden bitte ergänzen]',
      '',
      'Besten Dank für die Ausführung des Auftrages.',
      'Bitte stellen Sie mir eine entsprechende schriftliche Bestätigung zu.',
      '',
      'Freundliche Grüsse'
    ];

    contentLines.forEach(line => {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font,
      });
      yPosition -= 20;
    });

    // Signature area (signature will be applied here)
    yPosition -= 30;
    page.drawText('____________________________________', {
      x: 50,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0.7, 0.7, 0.7),
    });

    yPosition -= 15;
    page.drawText('Unterschrift', {
      x: 50,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc;
  }

  /**
   * Create application PDF with user data
   */
  private async createApplicationPDF(formData: any, userData: any): Promise<PDFDocument> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPosition = 750;

    // Header
    page.drawText('Antrag für Krankenversicherung', {
      x: 50,
      y: yPosition,
      size: 18,
      font: boldFont,
    });

    yPosition -= 30;
    page.drawText(`${userData.selectedInsurance?.insurer || 'Neue Krankenversicherung'}`, {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0.8),
    });

    yPosition -= 40;

    // Personal information section
    page.drawText('PERSÖNLICHE ANGABEN', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
    });

    yPosition -= 25;

    const personalInfo = [
      ['Name:', formData.fullName],
      ['Geburtsdatum:', userData.birthDate || '[Bitte ergänzen]'],
      ['Adresse:', formData.street],
      ['PLZ/Ort:', formData.postalCodeCity],
      ['Telefon:', userData.phone || '[Bitte ergänzen]'],
      ['E-Mail:', userData.email || '[Bitte ergänzen]'],
      ['AHV-Nummer:', userData.ahvNumber || '[Wird nachgereicht]']
    ];

    personalInfo.forEach(([label, value]) => {
      page.drawText(label, {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
      });
      page.drawText(value, {
        x: 170,
        y: yPosition,
        size: 12,
        font,
      });
      yPosition -= 20;
    });

    yPosition -= 20;

    // Insurance details section
    page.drawText('VERSICHERUNGSDETAILS', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
    });

    yPosition -= 25;

    const insuranceInfo = [
      ['Versicherer:', userData.selectedInsurance?.insurer || '[Neue Versicherung]'],
      ['Tarif:', userData.selectedInsurance?.model || '[Standard]'],
      ['Monatsprämie:', userData.selectedInsurance?.premium ? `CHF ${userData.selectedInsurance.premium}` : '[Gemäss Offerte]'],
      ['Franchise:', userData.selectedInsurance?.franchise ? `CHF ${userData.selectedInsurance.franchise}` : 'CHF 300'],
      ['Unfalldeckung:', userData.selectedInsurance?.accident || '[Gemäss Wahl]'],
      ['Beginn:', formData.insuranceStartDate || '01.01.2025']
    ];

    insuranceInfo.forEach(([label, value]) => {
      page.drawText(label, {
        x: 50,
        y: yPosition,
        size: 12,
        font: boldFont,
      });
      page.drawText(value, {
        x: 170,
        y: yPosition,
        size: 12,
        font,
      });
      yPosition -= 20;
    });

    yPosition -= 30;

    // Legal confirmation
    const legalLines = [
      'Mit meiner Unterschrift bestätige ich:',
      '• Die Richtigkeit aller Angaben',
      '• Kenntnisnahme der Versicherungsbedingungen',
      '• Einverständnis zur Datenverarbeitung',
      '• Den Wunsch zum Versicherungsabschluss'
    ];

    legalLines.forEach((line, index) => {
      const textFont = index === 0 ? boldFont : font;
      const textSize = index === 0 ? 12 : 10;
      
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: textSize,
        font: textFont,
        color: index === 0 ? rgb(0, 0, 0) : rgb(0.3, 0.3, 0.3)
      });
      yPosition -= 18;
    });

    yPosition -= 30;

    // Signature area
    page.drawText('____________________________________', {
      x: 50,
      y: yPosition,
      size: 12,
      font,
      color: rgb(0.7, 0.7, 0.7),
    });

    yPosition -= 15;
    page.drawText('Unterschrift', {
      x: 50,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc;
  }

  /**
   * Save signed documents
   */
  async saveSignedDocuments(userId: string, cancellationPdf: Buffer, applicationPdf: Buffer): Promise<{
    cancellationPath: string;
    applicationPath: string;
  }> {
    const timestamp = Date.now();
    const documentsDir = path.join(process.cwd(), 'public', 'uploads', 'signed-documents', userId);
    
    // Ensure directory exists
    await mkdir(documentsDir, { recursive: true });
    
    const cancellationPath = path.join(documentsDir, `signed_cancellation_${timestamp}.pdf`);
    const applicationPath = path.join(documentsDir, `signed_application_${timestamp}.pdf`);
    
    // Save both documents
    await Promise.all([
      writeFile(cancellationPath, cancellationPdf),
      writeFile(applicationPath, applicationPdf)
    ]);
    
    return {
      cancellationPath: `/uploads/signed-documents/${userId}/signed_cancellation_${timestamp}.pdf`,
      applicationPath: `/uploads/signed-documents/${userId}/signed_application_${timestamp}.pdf`
    };
  }
}

// API Route Handler
export async function POST(request: NextRequest) {
  console.log('Processing signature application...');
  
  try {
    const formData = await request.formData();
    
    // Extract form data
    const signatureFile = formData.get('signature') as File;
    const documentDataStr = formData.get('documentData') as string;
    const userDataStr = formData.get('userData') as string;
    
    if (!signatureFile || !documentDataStr || !userDataStr) {
      return NextResponse.json(
        { error: 'Missing required fields: signature file, document data, or user data' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!signatureFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Signature file must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (5MB max)
    if (signatureFile.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Signature file too large (max 5MB)' },
        { status: 400 }
      );
    }

    // Parse JSON data
    const documentData = JSON.parse(documentDataStr);
    const userData = JSON.parse(userDataStr);

    // Convert file to buffer
    const signatureBuffer = Buffer.from(await signatureFile.arrayBuffer());

    // Initialize signature processor
    const processor = new SignatureProcessor();

    // Generate user ID for file organization
    const userId = userData.userId || `user_${Date.now()}`;

    // Process both documents with signatures
    const [signedCancellationPdf, signedApplicationPdf] = await Promise.all([
      processor.applyCancellationSignature({
        documentData,
        userData,
        signatureImage: signatureBuffer,
        outputPath: ''
      }),
      processor.applyApplicationSignature({
        documentData,
        userData,
        signatureImage: signatureBuffer,
        outputPath: ''
      })
    ]);

    // Save signed documents
    const savedPaths = await processor.saveSignedDocuments(
      userId,
      signedCancellationPdf,
      signedApplicationPdf
    );

    console.log('Documents successfully signed and saved');

    return NextResponse.json({
      success: true,
      message: 'Signature applied successfully to both documents',
      documents: {
        cancellation: savedPaths.cancellationPath,
        application: savedPaths.applicationPath
      },
      userId,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Signature processing error:', error);
    
    // Handle specific error types
    if (error.message.includes('signature image')) {
      return NextResponse.json(
        { 
          error: 'Invalid signature image',
          details: 'Please provide a clear signature image in PNG, JPG, or JPEG format',
          code: 'INVALID_SIGNATURE'
        },
        { status: 400 }
      );
    }

    if (error.message.includes('PDF')) {
      return NextResponse.json(
        { 
          error: 'PDF processing failed',
          details: 'There was an error creating or processing the PDF documents',
          code: 'PDF_ERROR'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Signature processing failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again or contact support',
        code: 'PROCESSING_ERROR'
      },
      { status: 500 }
    );
  }
}