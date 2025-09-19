// services/PDFTemplateManager.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
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

  constructor() {
    // Support both development and production paths
    this.templateBasePath = process.env.NODE_ENV === 'production' 
      ? path.join(process.cwd(), 'public', 'documents')
      : path.join(process.cwd(), 'public', 'documents');
  }

  /**
   * Generate pre-filled cancellation PDF
   */
  async generateCancellationPDF(userData: UserFormData, currentInsurer: string): Promise<Buffer> {
    let pdfDoc: PDFDocument;
    let useTemplate = false;

    try {
      // Try to load existing template
      const templatePath = path.join(this.templateBasePath, '08_Kuendigung_template.pdf');
      
      if (fs.existsSync(templatePath)) {
        console.log('Loading cancellation template from:', templatePath);
        const templateBytes = fs.readFileSync(templatePath);
        pdfDoc = await PDFDocument.load(templateBytes);
        useTemplate = true;

        // Try to fill form fields if template has them
        try {
          const form = pdfDoc.getForm();
          const fields = form.getFields();
          
          console.log('Available form fields:', fields.map(field => field.getName()));

          // Common field names to try
          const fieldMappings = [
            { fieldName: 'Name', value: `${userData.firstName} ${userData.lastName}` },
            { fieldName: 'Vorname', value: userData.firstName },
            { fieldName: 'Nachname', value: userData.lastName },
            { fieldName: 'firstName', value: userData.firstName },
            { fieldName: 'lastName', value: userData.lastName },
            { fieldName: 'senderName', value: `${userData.firstName} ${userData.lastName}` },
            { fieldName: 'Adresse', value: userData.address },
            { fieldName: 'address', value: userData.address },
            { fieldName: 'senderAddress', value: userData.address },
            { fieldName: 'PLZ', value: userData.postalCode },
            { fieldName: 'Ort', value: userData.city },
            { fieldName: 'Stadt', value: userData.city },
            { fieldName: 'city', value: userData.city },
            { fieldName: 'Krankenversicherung', value: currentInsurer },
            { fieldName: 'currentInsurer', value: currentInsurer },
            { fieldName: 'Versicherer', value: currentInsurer },
            { fieldName: 'Versicherten_Nummer', value: userData.currentInsurancePolicyNumber || '' },
            { fieldName: 'policyNumber', value: userData.currentInsurancePolicyNumber || '' },
            { fieldName: 'Policenummer', value: userData.currentInsurancePolicyNumber || '' }
          ];

          // Try to fill available fields
          for (const mapping of fieldMappings) {
            try {
              if (form.hasTextField(mapping.fieldName)) {
                const field = form.getTextField(mapping.fieldName);
                field.setText(mapping.value);
                console.log(`Filled field ${mapping.fieldName} with: ${mapping.value}`);
              }
            } catch (fieldError) {
              console.warn(`Could not fill field ${mapping.fieldName}:`, fieldError);
            }
          }

          // Flatten form to prevent further editing
          form.flatten();
        } catch (formError) {
          console.warn('Template has no fillable form fields or form processing failed:', formError);
          // Continue with template as-is
        }
      }
    } catch (templateError) {
      console.warn('Could not load cancellation template:', templateError);
      useTemplate = false;
    }

    // If no template or template loading failed, create from scratch
    if (!useTemplate) {
      console.log('Creating cancellation PDF from scratch');
      pdfDoc = await this.createCancellationFromScratch(userData, currentInsurer);
    }

    return Buffer.from(await pdfDoc.save());
  }

  /**
   * Generate insurance application PDF
   */
  async generateInsuranceApplicationPDF(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<Buffer> {
    let pdfDoc: PDFDocument;
    let useTemplate = false;

    try {
      // Try to load application template
      const templatePath = path.join(this.templateBasePath, 'Versicherungsantrag_template.pdf');
      
      if (fs.existsSync(templatePath)) {
        console.log('Loading application template from:', templatePath);
        const templateBytes = fs.readFileSync(templatePath);
        pdfDoc = await PDFDocument.load(templateBytes);
        useTemplate = true;

        // Fill form fields if available
        try {
          const form = pdfDoc.getForm();
          
          const applicationFieldMappings = [
            { fieldName: 'firstName', value: userData.firstName },
            { fieldName: 'lastName', value: userData.lastName },
            { fieldName: 'birthDate', value: userData.birthDate },
            { fieldName: 'address', value: userData.address },
            { fieldName: 'email', value: userData.email },
            { fieldName: 'phone', value: userData.phone },
            { fieldName: 'ahvNumber', value: userData.ahvNumber || '' },
            { fieldName: 'insurer', value: selectedInsurance.insurer },
            { fieldName: 'tariff', value: selectedInsurance.tariffName },
            { fieldName: 'premium', value: `CHF ${selectedInsurance.premium.toFixed(2)}` },
            { fieldName: 'franchise', value: `CHF ${selectedInsurance.franchise}` },
            { fieldName: 'startDate', value: userData.insuranceStartDate || '01.01.2025' }
          ];

          for (const mapping of applicationFieldMappings) {
            try {
              if (form.hasTextField(mapping.fieldName)) {
                const field = form.getTextField(mapping.fieldName);
                field.setText(mapping.value);
              }
            } catch (fieldError) {
              console.warn(`Could not fill application field ${mapping.fieldName}:`, fieldError);
            }
          }

          form.flatten();
        } catch (formError) {
          console.warn('Application template form processing failed:', formError);
        }
      }
    } catch (templateError) {
      console.warn('Could not load application template:', templateError);
      useTemplate = false;
    }

    // Create from scratch if no template
    if (!useTemplate) {
      console.log('Creating application PDF from scratch');
      pdfDoc = await this.createApplicationFromScratch(userData, selectedInsurance);
    }

    return Buffer.from(await pdfDoc.save());
  }

  /**
   * Create cancellation PDF from scratch
   */
  private async createCancellationFromScratch(
    userData: UserFormData, 
    currentInsurer: string
  ): Promise<PDFDocument> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
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

    // Important notice
    yPosition -= 40;
    page.drawText('Bemerkung: Es wird empfohlen, diesen Brief per Einschreiben zu versenden', {
      x: 50,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.7, 0, 0),
    });

    return pdfDoc;
  }

  /**
   * Create application PDF from scratch
   */
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

    // Personal information
    let yPosition = 680;
    page.drawText('Persönliche Angaben:', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 25;
    const personalFields = [
      ['Anrede:', userData.salutation],
      ['Vorname:', userData.firstName],
      ['Nachname:', userData.lastName],
      ['Geburtsdatum:', userData.birthDate],
      ['Adresse:', userData.address],
      ['PLZ/Ort:', `${userData.postalCode} ${userData.city}`],
      ['Telefon:', userData.phone],
      ['E-Mail:', userData.email],
      ['AHV-Nummer:', userData.ahvNumber || 'Wird nachgereicht'],
      ['Staatsangehörigkeit:', userData.nationality || 'Schweiz']
    ];

    personalFields.forEach(([label, value]) => {
      page.drawText(label, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      page.drawText(value, {
        x: 200,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });

      yPosition -= 20;
    });

    // Insurance details
    yPosition -= 20;
    page.drawText('Versicherungsdetails:', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    yPosition -= 25;
    const insuranceFields = [
      ['Versicherer:', selectedInsurance.insurer],
      ['Tarif:', selectedInsurance.tariffName],
      ['Monatsprämie:', `CHF ${selectedInsurance.premium.toFixed(2)}`],
      ['Franchise:', `CHF ${selectedInsurance.franchise}`],
      ['Unfalldeckung:', selectedInsurance.accidentInclusion],
      ['Versicherungsbeginn:', userData.insuranceStartDate || '01.01.2025']
    ];

    insuranceFields.forEach(([label, value]) => {
      page.drawText(label, {
        x: 50,
        y: yPosition,
        size: fontSize,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      page.drawText(value, {
        x: 200,
        y: yPosition,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });

      yPosition -= 20;
    });

    // Legal text
    yPosition -= 30;
    const legalText = [
      'Mit meiner Unterschrift bestätige ich:',
      '• Die Richtigkeit und Vollständigkeit aller Angaben',
      '• Die Kenntnisnahme der Allgemeinen Versicherungsbedingungen',
      '• Das Einverständnis zur Datenverarbeitung gemäss Datenschutzerklärung',
      '• Den Wunsch zum Abschluss der oben genannten Versicherung'
    ];

    legalText.forEach(line => {
      page.drawText(line, {
        x: 50,
        y: yPosition,
        size: 10,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
      yPosition -= 15;
    });

    // Signature area
    yPosition -= 30;
    page.drawText('____________________________________', {
      x: 50,
      y: yPosition,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
    });

    yPosition -= 15;
    page.drawText('Unterschrift', {
      x: 50,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Date
    const today = new Date();
    const dateStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    
    page.drawText(`Datum: ${dateStr}`, {
      x: 300,
      y: yPosition,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5),
    });

    return pdfDoc;
  }

  /**
   * Initialize template directory and copy default templates
   */
  static async initializeTemplates(): Promise<void> {
    const templatesDir = path.join(process.cwd(), 'public', 'documents');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(templatesDir)) {
      fs.mkdirSync(templatesDir, { recursive: true });
      console.log('Created documents directory:', templatesDir);
    }

    console.log('Templates should be placed in:', templatesDir);
    console.log('Expected files:');
    console.log('- 08_Kuendigung_template.pdf (cancellation template)');
    console.log('- Versicherungsantrag_template.pdf (application template)');
  }
}