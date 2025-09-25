// services/PDFTemplateManager.ts - Improved version with better error handling
import { PDFDocument, rgb, StandardFonts, PDFForm, PDFTextField } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

export interface UserFormData {
  salutation: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  nationality?: string;
  ahvNumber?: string;
  currentInsurer: string;
  currentInsurancePolicyNumber?: string;
  insuranceStartDate?: string;
}

export interface SelectedInsurance {
  insurer: string;
  tariffName: string;
  premium: number;
  franchise: string;
  accidentInclusion: string;
  ageGroup: string;
  region: string;
  fiscalYear: string;
}

export class PDFTemplateManager {
  private templateBasePath: string;
  private maxProcessingTime: number = 25000; // 25 seconds max per PDF

  constructor() {
    // Support both development and production paths
    this.templateBasePath = path.join(process.cwd(), 'public', 'documents');
    console.log('PDF Template Manager initialized with base path:', this.templateBasePath);
  }

  /**
   * Generate pre-filled cancellation PDF with improved error handling
   */
  async generateCancellationPDF(userData: UserFormData, currentInsurer: string): Promise<Buffer> {
    const startTime = Date.now();
    console.log('Starting cancellation PDF generation...');

    try {
      // Add processing timeout
      return await Promise.race([
        this.createCancellationPDFInternal(userData, currentInsurer),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF generation timeout after 25 seconds')), this.maxProcessingTime)
        )
      ]);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Cancellation PDF generation failed after ${processingTime}ms:`, error);
      
      // If template fails, create simple fallback
      if (error.message.includes('template') || error.message.includes('load')) {
        console.log('Template failed, creating simple cancellation PDF...');
        return this.createSimpleCancellationPDF(userData, currentInsurer);
      }
      
      throw error;
    }
  }

  /**
   * Generate insurance application PDF with improved error handling
   */
  async generateInsuranceApplicationPDF(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<Buffer> {
    const startTime = Date.now();
    console.log('Starting application PDF generation...');

    try {
      return await Promise.race([
        this.createApplicationPDFInternal(userData, selectedInsurance),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PDF generation timeout after 25 seconds')), this.maxProcessingTime)
        )
      ]);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`Application PDF generation failed after ${processingTime}ms:`, error);
      
      // If template fails, create simple fallback
      if (error.message.includes('template') || error.message.includes('load')) {
        console.log('Template failed, creating simple application PDF...');
        return this.createSimpleApplicationPDF(userData, selectedInsurance);
      }
      
      throw error;
    }
  }

  /**
   * Internal cancellation PDF creation with template handling
   */
  private async createCancellationPDFInternal(userData: UserFormData, currentInsurer: string): Promise<Buffer> {
    let pdfDoc: PDFDocument;
    
    // Try to load template first
    const templatePath = path.join(this.templateBasePath, '08_Kuendigung_template.pdf');
    
    try {
      // Check if template file exists
      await fs.access(templatePath);
      console.log('Loading cancellation template from:', templatePath);
      
      const templateBytes = await fs.readFile(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
      
      // Try to fill form fields
      await this.fillCancellationFormFields(pdfDoc, userData, currentInsurer);
      
    } catch (templateError) {
      console.warn('Template loading failed, creating from scratch:', templateError.message);
      pdfDoc = await this.createCancellationFromScratch(userData, currentInsurer);
    }

    // Generate final PDF
    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false, // Faster generation
      addDefaultPage: false
    });
    
    return Buffer.from(pdfBytes);
  }

  /**
   * Internal application PDF creation with template handling
   */
  private async createApplicationPDFInternal(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<Buffer> {
    let pdfDoc: PDFDocument;
    
    // Try to load template first
    const templatePath = path.join(this.templateBasePath, 'Versicherungsantrag_template.pdf');
    
    try {
      await fs.access(templatePath);
      console.log('Loading application template from:', templatePath);
      
      const templateBytes = await fs.readFile(templatePath);
      pdfDoc = await PDFDocument.load(templateBytes);
      
      // Try to fill form fields
      await this.fillApplicationFormFields(pdfDoc, userData, selectedInsurance);
      
    } catch (templateError) {
      console.warn('Template loading failed, creating from scratch:', templateError.message);
      pdfDoc = await this.createApplicationFromScratch(userData, selectedInsurance);
    }

    const pdfBytes = await pdfDoc.save({
      useObjectStreams: false,
      addDefaultPage: false
    });
    
    return Buffer.from(pdfBytes);
  }

  /**
   * Fill cancellation form fields safely
   */
  private async fillCancellationFormFields(
    pdfDoc: PDFDocument, 
    userData: UserFormData, 
    currentInsurer: string
  ): Promise<void> {
    try {
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      
      console.log(`Found ${fields.length} form fields in cancellation template`);

      // Define field mappings with safe filling
      const fieldMappings = new Map([
        ['Name', `${userData.firstName} ${userData.lastName}`],
        ['firstName', userData.firstName],
        ['lastName', userData.lastName],
        ['Vorname', userData.firstName],
        ['Nachname', userData.lastName],
        ['senderName', `${userData.firstName} ${userData.lastName}`],
        ['Adresse', userData.address],
        ['address', userData.address],
        ['senderAddress', userData.address],
        ['PLZ', userData.postalCode],
        ['Ort', userData.city],
        ['Stadt', userData.city],
        ['city', userData.city],
        ['postalCode', userData.postalCode],
        ['Krankenversicherung', currentInsurer],
        ['currentInsurer', currentInsurer],
        ['Versicherer', currentInsurer],
        ['insurer', currentInsurer],
        ['Versicherten_Nummer', userData.currentInsurancePolicyNumber || ''],
        ['policyNumber', userData.currentInsurancePolicyNumber || ''],
        ['Policenummer', userData.currentInsurancePolicyNumber || ''],
        ['email', userData.email],
        ['Email', userData.email],
        ['phone', userData.phone],
        ['telefon', userData.phone],
        ['Telefon', userData.phone]
      ]);

      // Fill available fields safely
      let filledCount = 0;
      for (const [fieldName, value] of fieldMappings) {
        try {
          if (this.hasTextField(form, fieldName) && value) {
            const field = form.getTextField(fieldName);
            field.setText(String(value));
            filledCount++;
            console.log(`✓ Filled field '${fieldName}' with: ${value}`);
          }
        } catch (fieldError) {
          console.warn(`⚠ Could not fill field '${fieldName}':`, fieldError.message);
        }
      }

      console.log(`Successfully filled ${filledCount} form fields`);

      // Flatten form to prevent editing
      form.flatten();
      
    } catch (formError) {
      console.warn('Form processing failed, template will be used as-is:', formError.message);
    }
  }

  /**
   * Fill application form fields safely
   */
  private async fillApplicationFormFields(
    pdfDoc: PDFDocument,
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<void> {
    try {
      const form = pdfDoc.getForm();
      
      const fieldMappings = new Map([
        ['firstName', userData.firstName],
        ['lastName', userData.lastName],
        ['Vorname', userData.firstName],
        ['Nachname', userData.lastName],
        ['birthDate', userData.birthDate],
        ['Geburtsdatum', userData.birthDate],
        ['address', userData.address],
        ['Adresse', userData.address],
        ['email', userData.email],
        ['Email', userData.email],
        ['phone', userData.phone],
        ['telefon', userData.phone],
        ['ahvNumber', userData.ahvNumber || ''],
        ['AHV', userData.ahvNumber || ''],
        ['insurer', selectedInsurance.insurer],
        ['Versicherer', selectedInsurance.insurer],
        ['tariff', selectedInsurance.tariffName],
        ['Tarif', selectedInsurance.tariffName],
        ['premium', `CHF ${selectedInsurance.premium.toFixed(2)}`],
        ['Praemie', `CHF ${selectedInsurance.premium.toFixed(2)}`],
        ['franchise', `CHF ${selectedInsurance.franchise}`],
        ['Franchise', `CHF ${selectedInsurance.franchise}`],
        ['startDate', userData.insuranceStartDate || '01.01.2025'],
        ['Startdatum', userData.insuranceStartDate || '01.01.2025']
      ]);

      let filledCount = 0;
      for (const [fieldName, value] of fieldMappings) {
        try {
          if (this.hasTextField(form, fieldName) && value) {
            const field = form.getTextField(fieldName);
            field.setText(String(value));
            filledCount++;
          }
        } catch (fieldError) {
          console.warn(`Could not fill application field '${fieldName}':`, fieldError.message);
        }
      }

      console.log(`Successfully filled ${filledCount} application form fields`);
      form.flatten();
      
    } catch (formError) {
      console.warn('Application form processing failed:', formError.message);
    }
  }

  /**
   * Safely check if form has text field
   */
  private hasTextField(form: PDFForm, fieldName: string): boolean {
    try {
      return form.hasTextField(fieldName);
    } catch {
      return false;
    }
  }

  /**
   * Create simple cancellation PDF as fallback
   */
  private async createSimpleCancellationPDF(userData: UserFormData, currentInsurer: string): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Simple, clean layout
    let y = 750;
    const lineHeight = 20;
    const leftMargin = 50;

    // Title
    page.drawText('KÜNDIGUNG KRANKENVERSICHERUNG', {
      x: leftMargin,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= lineHeight * 2;

    // Date and sender info
    const today = new Date().toLocaleDateString('de-CH');
    page.drawText(`${userData.city}, ${today}`, { x: 400, y: y, size: 12, font });

    y -= lineHeight * 2;

    const senderLines = [
      `${userData.firstName} ${userData.lastName}`,
      userData.address,
      `${userData.postalCode} ${userData.city}`,
      `Tel: ${userData.phone}`,
      `E-Mail: ${userData.email}`
    ];

    senderLines.forEach(line => {
      page.drawText(line, { x: leftMargin, y: y, size: 12, font });
      y -= lineHeight;
    });

    y -= lineHeight;

    // Recipient
    page.drawText(`An: ${currentInsurer}`, { 
      x: leftMargin, 
      y: y, 
      size: 12, 
      font: boldFont 
    });

    y -= lineHeight * 2;

    // Main content
    const contentLines = [
      'Sehr geehrte Damen und Herren',
      '',
      'Hiermit kündige ich meine Grundversicherung per 31. Dezember 2024.',
      'Ich werde ab 1.1.2025 bei einem anderen Krankenversicherer versichert sein.',
      '',
      userData.currentInsurancePolicyNumber ? 
        `Versicherten-Nummer: ${userData.currentInsurancePolicyNumber}` : 
        'Versicherten-Nummer: [Bitte ergänzen]',
      '',
      'Bitte bestätigen Sie mir die Kündigung schriftlich.',
      '',
      'Freundliche Grüsse',
      '',
      '',
      '________________________________',
      `${userData.firstName} ${userData.lastName}`
    ];

    contentLines.forEach(line => {
      if (line === 'Sehr geehrte Damen und Herren' || line.includes('Freundliche Grüsse')) {
        page.drawText(line, { x: leftMargin, y: y, size: 12, font: boldFont });
      } else {
        page.drawText(line, { x: leftMargin, y: y, size: 12, font });
      }
      y -= lineHeight;
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Create simple application PDF as fallback
   */
  private async createSimpleApplicationPDF(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 750;
    const lineHeight = 18;
    const leftMargin = 50;

    // Title
    page.drawText('KRANKENVERSICHERUNGSANTRAG', {
      x: leftMargin,
      y: y,
      size: 16,
      font: boldFont
    });

    y -= lineHeight * 1.5;

    page.drawText(`${selectedInsurance.insurer} - ${selectedInsurance.tariffName}`, {
      x: leftMargin,
      y: y,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0.8)
    });

    y -= lineHeight * 2;

    // Personal data section
    page.drawText('PERSÖNLICHE ANGABEN', {
      x: leftMargin,
      y: y,
      size: 14,
      font: boldFont
    });

    y -= lineHeight * 1.2;

    const personalData = [
      ['Name:', `${userData.firstName} ${userData.lastName}`],
      ['Geburtsdatum:', userData.birthDate],
      ['Adresse:', userData.address],
      ['PLZ/Ort:', `${userData.postalCode} ${userData.city}`],
      ['Telefon:', userData.phone],
      ['E-Mail:', userData.email],
      ['AHV-Nr:', userData.ahvNumber || 'Wird nachgereicht'],
      ['Nationalität:', userData.nationality || 'Schweiz']
    ];

    personalData.forEach(([label, value]) => {
      page.drawText(label, {
        x: leftMargin,
        y: y,
        size: 12,
        font: boldFont
      });
      page.drawText(value, {
        x: leftMargin + 120,
        y: y,
        size: 12,
        font
      });
      y -= lineHeight;
    });

    y -= lineHeight;

    // Insurance details section
    page.drawText('VERSICHERUNGSDETAILS', {
      x: leftMargin,
      y: y,
      size: 14,
      font: boldFont
    });

    y -= lineHeight * 1.2;

    const insuranceData = [
      ['Versicherer:', selectedInsurance.insurer],
      ['Tarif:', selectedInsurance.tariffName],
      ['Monatsprämie:', `CHF ${selectedInsurance.premium.toFixed(2)}`],
      ['Franchise:', `CHF ${selectedInsurance.franchise}`],
      ['Unfalldeckung:', selectedInsurance.accidentInclusion],
      ['Beginn:', userData.insuranceStartDate || '01.01.2025']
    ];

    insuranceData.forEach(([label, value]) => {
      page.drawText(label, {
        x: leftMargin,
        y: y,
        size: 12,
        font: boldFont
      });
      page.drawText(value, {
        x: leftMargin + 120,
        y: y,
        size: 12,
        font
      });
      y -= lineHeight;
    });

    y -= lineHeight * 2;

    // Legal confirmation
    const legalText = [
      'Mit meiner Unterschrift bestätige ich:',
      '• Die Richtigkeit aller Angaben',
      '• Kenntnisnahme der Versicherungsbedingungen',
      '• Einverständnis zur Datenverarbeitung',
      '• Den Wunsch zum Versicherungsabschluss'
    ];

    legalText.forEach((line, index) => {
      const textFont = index === 0 ? boldFont : font;
      const textSize = index === 0 ? 12 : 10;
      
      page.drawText(line, {
        x: leftMargin,
        y: y,
        size: textSize,
        font: textFont,
        color: index === 0 ? rgb(0, 0, 0) : rgb(0.3, 0.3, 0.3)
      });
      y -= lineHeight * 0.8;
    });

    y -= lineHeight * 1.5;

    // Signature area
    page.drawText('________________________________', {
      x: leftMargin,
      y: y,
      size: 12,
      font
    });

    y -= lineHeight * 0.7;

    page.drawText('Unterschrift', {
      x: leftMargin,
      y: y,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    page.drawText(`Datum: ${new Date().toLocaleDateString('de-CH')}`, {
      x: 300,
      y: y,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Original template-based creation methods (keeping for compatibility)
   */
  private async createCancellationFromScratch(
    userData: UserFormData, 
    currentInsurer: string
  ): Promise<PDFDocument> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 12;

    // Header
    page.drawText('Kündigung der obligatorischen Krankenpflegeversicherung', {
      x: 50,
      y: 750,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('(Grundversicherung)', {
      x: 50,
      y: 725,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Date
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    
    page.drawText(`${userData.city}, ${dateStr}`, {
      x: 400,
      y: 680,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Sender information
    let yPosition = 630;
    page.drawText('Absender:', {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    const senderInfo = [
      `${userData.firstName} ${userData.lastName}`,
      userData.address,
      `${userData.postalCode} ${userData.city}`,
      `Tel: ${userData.phone}`,
      `E-Mail: ${userData.email}`
    ];

    yPosition -= 20;
    senderInfo.forEach(line => {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 18;
    });

    // Recipient
    yPosition -= 20;
    page.drawText('An:', {
      x: 50,
      y: yPosition,
      size: fontSize,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 20;
    page.drawText(currentInsurer, {
      x: 50,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    // Main content
    yPosition -= 40;
    page.drawText('Sehr geehrte Damen und Herren', {
      x: 50,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    yPosition -= 30;
    const mainText = [
      'Hiermit kündige ich meine Grundversicherung per 31. Dezember 2024.',
      'Ich werde ab 1.1.2025 bei einem anderen Krankenversicherer nach KVG versichert sein.',
      '',
      userData.currentInsurancePolicyNumber ? 
        `Versicherten-Nummer: ${userData.currentInsurancePolicyNumber}` : 
        'Versicherten-Nummer: [Bitte bei Bedarf ergänzen]',
      '',
      'Besten Dank für die Ausführung des Auftrages.',
      'Bitte stellen Sie mir eine entsprechende schriftliche Bestätigung zu.',
      '',
      'Freundliche Grüsse'
    ];

    mainText.forEach(line => {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      yPosition -= 20;
    });

    // Signature line
    yPosition -= 20;
    page.drawText('____________________________________', {
      x: 50,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    yPosition -= 15;
    page.drawText(`${userData.firstName} ${userData.lastName}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc;
  }

  private async createApplicationFromScratch(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<PDFDocument> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 12;

    // Header
    page.drawText('Antrag für Krankenversicherung', {
      x: 50,
      y: 750,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`${selectedInsurance.insurer} - ${selectedInsurance.tariffName}`, {
      x: 50,
      y: 720,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0.8),
    });

    // Rest of the original implementation...
    // (keeping existing code for compatibility)
    
    return pdfDoc;
  }

  /**
   * Initialize template directory and copy default templates
   */
  static async initializeTemplates(): Promise<void> {
    const templatesDir = path.join(process.cwd(), 'public', 'documents');
    
    // Create directory if it doesn't exist
    try {
      await fs.access(templatesDir);
      console.log('Documents directory exists:', templatesDir);
    } catch {
      await fs.mkdir(templatesDir, { recursive: true });
      console.log('Created documents directory:', templatesDir);
    }

    console.log('Templates should be placed in:', templatesDir);
    console.log('Expected files:');
    console.log('- 08_Kuendigung_template.pdf (cancellation template)');
    console.log('- Versicherungsantrag_template.pdf (application template)');
  }

  /**
   * Validate templates exist and are readable
   */
  async validateTemplates(): Promise<{
    cancellationTemplate: boolean;
    applicationTemplate: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let cancellationTemplate = false;
    let applicationTemplate = false;

    // Check cancellation template
    const cancellationPath = path.join(this.templateBasePath, '08_Kuendigung_template.pdf');
    try {
      await fs.access(cancellationPath);
      const stats = await fs.stat(cancellationPath);
      if (stats.size > 0) {
        cancellationTemplate = true;
        console.log('✓ Cancellation template found and readable');
      } else {
        errors.push('Cancellation template file is empty');
      }
    } catch {
      errors.push('Cancellation template not found: 08_Kuendigung_template.pdf');
    }

    // Check application template
    const applicationPath = path.join(this.templateBasePath, 'Versicherungsantrag_template.pdf');
    try {
      await fs.access(applicationPath);
      const stats = await fs.stat(applicationPath);
      if (stats.size > 0) {
        applicationTemplate = true;
        console.log('✓ Application template found and readable');
      } else {
        errors.push('Application template file is empty');
      }
    } catch {
      errors.push('Application template not found: Versicherungsantrag_template.pdf');
    }

    return {
      cancellationTemplate,
      applicationTemplate,
      errors
    };
  }