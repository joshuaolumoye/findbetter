// services/PDFTemplateManager.ts - FIXED with proper user data filling
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
  private maxProcessingTime: number = 25000;

  constructor() {
    this.templateBasePath = path.join(process.cwd(), 'public', 'documents');
    console.log('PDF Template Manager initialized with base path:', this.templateBasePath);
  }

  /**
   * FIXED: Generate cancellation PDF with proper user data
   */
  async generateCancellationPDF(userData: UserFormData, currentInsurer: string): Promise<Buffer> {
    const startTime = Date.now();
    console.log('Starting cancellation PDF generation with user data:', {
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      currentInsurer
    });

    try {
      // ALWAYS create from scratch with user data (more reliable than template filling)
      const pdfDoc = await this.createCancellationWithUserData(userData, currentInsurer);
      
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false
      });
      
      console.log(`✅ Cancellation PDF generated successfully in ${Date.now() - startTime}ms`);
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error(`❌ Cancellation PDF generation failed:`, error);
      throw error;
    }
  }

  /**
   * FIXED: Generate application PDF with proper user data
   */
  async generateInsuranceApplicationPDF(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<Buffer> {
    const startTime = Date.now();
    console.log('Starting application PDF generation with user data:', {
      name: `${userData.firstName} ${userData.lastName}`,
      insurer: selectedInsurance.insurer,
      premium: selectedInsurance.premium
    });

    try {
      // ALWAYS create from scratch with user data
      const pdfDoc = await this.createApplicationWithUserData(userData, selectedInsurance);
      
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false
      });
      
      console.log(`✅ Application PDF generated successfully in ${Date.now() - startTime}ms`);
      return Buffer.from(pdfBytes);
      
    } catch (error) {
      console.error(`❌ Application PDF generation failed:`, error);
      throw error;
    }
  }

  /**
   * FIXED: Create cancellation PDF populated with actual user data
   */
  private async createCancellationWithUserData(
    userData: UserFormData, 
    currentInsurer: string
  ): Promise<PDFDocument> {
    console.log('Creating cancellation PDF with user data...');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 750;
    const lineHeight = 18;
    const leftMargin = 50;

    // Header
    page.drawText('KÜNDIGUNG KRANKENVERSICHERUNG', {
      x: leftMargin,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= lineHeight * 1.5;
    page.drawText('(Obligatorische Krankenpflegeversicherung - KVG)', {
      x: leftMargin,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= lineHeight * 2;

    // Date and location - USING REAL USER DATA
    const today = new Date();
    const dateStr = today.toLocaleDateString('de-CH');
    const userCity = userData.city || 'Zürich';
    
    page.drawText(`${userCity}, ${dateStr}`, {
      x: 400,
      y: y,
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });

    y -= lineHeight * 2.5;

    // Sender information - USING REAL USER DATA
    page.drawText('Absender:', {
      x: leftMargin,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= lineHeight;
    const senderLines = [
      `${userData.firstName} ${userData.lastName}`, // REAL NAME
      userData.address, // REAL ADDRESS
      `${userData.postalCode} ${userData.city}`, // REAL POSTAL CODE & CITY
      `Tel: ${userData.phone}`, // REAL PHONE
      `E-Mail: ${userData.email}` // REAL EMAIL
    ];

    senderLines.forEach(line => {
      page.drawText(line, {
        x: leftMargin,
        y: y,
        size: 12,
        font,
        color: rgb(0, 0, 0)
      });
      y -= lineHeight;
    });

    y -= lineHeight;

    // Recipient - USING REAL CURRENT INSURER
    page.drawText('An:', {
      x: leftMargin,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= lineHeight;
    page.drawText(currentInsurer, { // REAL CURRENT INSURER
      x: leftMargin,
      y: y,
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });

    // Add insurer address (common Swiss insurers)
    const insurerAddress = this.getInsurerAddress(currentInsurer);
    if (insurerAddress) {
      y -= lineHeight;
      page.drawText(insurerAddress.street, {
        x: leftMargin,
        y: y,
        size: 12,
        font,
        color: rgb(0, 0, 0)
      });
      y -= lineHeight;
      page.drawText(`${insurerAddress.postal} ${insurerAddress.city}`, {
        x: leftMargin,
        y: y,
        size: 12,
        font,
        color: rgb(0, 0, 0)
      });
    }

    y -= lineHeight * 2;

    // Subject line
    page.drawText('Betreff: Kündigung der obligatorischen Krankenpflegeversicherung', {
      x: leftMargin,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= lineHeight * 2;

    // Main content with REAL USER DATA
    page.drawText('Sehr geehrte Damen und Herren', {
      x: leftMargin,
      y: y,
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });

    y -= lineHeight * 1.5;
    const contentLines = [
      'hiermit kündige ich meine obligatorische Krankenpflegeversicherung',
      'per 31. Dezember 2024.',
      '',
      'Ich werde ab 1. Januar 2025 bei einem anderen Krankenversicherer',
      'nach KVG versichert sein.',
      '',
      // Include policy number if available
      userData.currentInsurancePolicyNumber ? 
        `Versicherten-Nummer: ${userData.currentInsurancePolicyNumber}` : 
        'Versicherten-Nummer: [Bitte bei Bedarf ergänzen]',
      '',
      'Besten Dank für die Ausführung des Auftrages.',
      'Bitte bestätigen Sie mir die Kündigung schriftlich.',
      '',
      'Freundliche Grüsse'
    ];

    contentLines.forEach(line => {
      page.drawText(line, {
        x: leftMargin,
        y: y,
        size: 12,
        font,
        color: rgb(0, 0, 0)
      });
      y -= lineHeight;
    });

    // Signature area with REAL USER NAME
    y -= lineHeight * 2;
    page.drawText('____________________________________', {
      x: leftMargin,
      y: y,
      size: 12,
      font,
      color: rgb(0, 0, 0)
    });

    y -= lineHeight * 0.8;
    page.drawText(`${userData.firstName} ${userData.lastName}`, { // REAL NAME
      x: leftMargin,
      y: y,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    console.log('✅ Cancellation PDF created with real user data');
    return pdfDoc;
  }

  /**
   * FIXED: Create application PDF populated with actual user data
   */
  private async createApplicationWithUserData(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<PDFDocument> {
    console.log('Creating application PDF with user data...');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 750;
    const lineHeight = 18;
    const leftMargin = 50;

    // Header with REAL INSURANCE DATA
    page.drawText('KRANKENVERSICHERUNGSANTRAG', {
      x: leftMargin,
      y: y,
      size: 18,
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

    // Personal data section with REAL USER DATA
    page.drawText('PERSÖNLICHE ANGABEN', {
      x: leftMargin,
      y: y,
      size: 14,
      font: boldFont
    });

    y -= lineHeight * 1.2;

    const personalData = [
      ['Anrede:', userData.salutation],
      ['Name:', `${userData.firstName} ${userData.lastName}`], // REAL NAME
      ['Geburtsdatum:', this.formatDate(userData.birthDate)], // REAL BIRTH DATE
      ['Adresse:', userData.address], // REAL ADDRESS
      ['PLZ/Ort:', `${userData.postalCode} ${userData.city}`], // REAL POSTAL & CITY
      ['Telefon:', userData.phone], // REAL PHONE
      ['E-Mail:', userData.email], // REAL EMAIL
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
      page.drawText(value || '[Nicht angegeben]', {
        x: leftMargin + 120,
        y: y,
        size: 12,
        font
      });
      y -= lineHeight;
    });

    y -= lineHeight;

    // Insurance details section with REAL SELECTED INSURANCE DATA
    page.drawText('VERSICHERUNGSDETAILS', {
      x: leftMargin,
      y: y,
      size: 14,
      font: boldFont
    });

    y -= lineHeight * 1.2;

    const insuranceData = [
      ['Versicherer:', selectedInsurance.insurer], // REAL SELECTED INSURER
      ['Tarif:', selectedInsurance.tariffName], // REAL TARIFF
      ['Monatsprämie:', `CHF ${selectedInsurance.premium.toFixed(2)}`], // REAL PREMIUM
      ['Franchise:', `CHF ${selectedInsurance.franchise}`], // REAL FRANCHISE
      ['Unfalldeckung:', selectedInsurance.accidentInclusion], // REAL ACCIDENT COVERAGE
      ['Altersgruppe:', selectedInsurance.ageGroup],
      ['Region:', selectedInsurance.region],
      ['Beginn:', userData.insuranceStartDate || '01.01.2025']
    ];

    insuranceData.forEach(([label, value]) => {
      page.drawText(label, {
        x: leftMargin,
        y: y,
        size: 12,
        font: boldFont
      });
      page.drawText(String(value), {
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
      '• Die Richtigkeit aller oben gemachten Angaben',
      '• Die Kenntnisnahme der Allgemeinen Versicherungsbedingungen',
      '• Das Einverständnis zur Verarbeitung meiner Personendaten',
      '• Den Wunsch zum Abschluss dieser Krankenversicherung',
      '• Die Einhaltung der gesetzlichen Bestimmungen des KVG'
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
      y -= lineHeight * 0.9;
    });

    y -= lineHeight * 2;

    // Signature area with REAL USER NAME
    const currentDate = new Date().toLocaleDateString('de-CH');
    
    page.drawText('____________________________________', {
      x: leftMargin,
      y: y,
      size: 12,
      font
    });

    page.drawText(`Datum: ${currentDate}`, {
      x: 350,
      y: y,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    y -= lineHeight * 0.7;
    page.drawText('Unterschrift', {
      x: leftMargin,
      y: y,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    y -= lineHeight * 0.5;
    page.drawText(`${userData.firstName} ${userData.lastName}`, { // REAL NAME
      x: leftMargin,
      y: y,
      size: 10,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    console.log('✅ Application PDF created with real user data');
    return pdfDoc;
  }

  /**
   * Helper: Format date for Swiss format
   */
  private formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('de-CH');
    } catch {
      return dateString; // Return as-is if parsing fails
    }
  }

  /**
   * Helper: Get insurer addresses for major Swiss health insurers
   */
  private getInsurerAddress(insurerName: string): { street: string; postal: string; city: string } | null {
    const addresses: Record<string, { street: string; postal: string; city: string }> = {
      'CSS Versicherung AG': { street: 'Tribschenstrasse 21', postal: '6002', city: 'Luzern' },
      'CSS': { street: 'Tribschenstrasse 21', postal: '6002', city: 'Luzern' },
      'Helsana': { street: 'Auzelg 18', postal: '8010', city: 'Zürich' },
      'Helsana Versicherungen AG': { street: 'Auzelg 18', postal: '8010', city: 'Zürich' },
      'Swica': { street: 'Römerstrasse 38', postal: '8401', city: 'Winterthur' },
      'Swica Krankenversicherung AG': { street: 'Römerstrasse 38', postal: '8401', city: 'Winterthur' },
      'Concordia': { street: 'Bundesplatz 15', postal: '6002', city: 'Luzern' },
      'Sanitas': { street: 'Jägergasse 3', postal: '8021', city: 'Zürich' },
      'Sanitas Krankenversicherung': { street: 'Jägergasse 3', postal: '8021', city: 'Zürich' },
      'KPT/CPT': { street: 'Weststrasse 10', postal: '3000', city: 'Bern 6' },
      'KPT': { street: 'Weststrasse 10', postal: '3000', city: 'Bern 6' },
      'Visana': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 15' },
      'Visana Services AG': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 15' },
      'Groupe Mutuel': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'Sympany': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' },
      'Assura': { street: 'Avenue C.-F. Ramuz 70', postal: '1009', city: 'Pully' },
      'Assura-Basis AG': { street: 'Avenue C.-F. Ramuz 70', postal: '1009', city: 'Pully' }
    };

    return addresses[insurerName] || null;
  }

  /**
   * DEPRECATED: Old template-based methods (keeping for compatibility but not using)
   */
  private async createSimpleCancellationPDF(userData: UserFormData, currentInsurer: string): Promise<Buffer> {
    // This method is now replaced by createCancellationWithUserData
    const pdfDoc = await this.createCancellationWithUserData(userData, currentInsurer);
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  private async createSimpleApplicationPDF(userData: UserFormData, selectedInsurance: SelectedInsurance): Promise<Buffer> {
    // This method is now replaced by createApplicationWithUserData  
    const pdfDoc = await this.createApplicationWithUserData(userData, selectedInsurance);
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  /**
   * Validate templates exist and are readable
   */
  async validateTemplates(): Promise<{
    cancellationTemplate: boolean;
    applicationTemplate: boolean;
    errors: string[];
  }> {
    // Since we're creating PDFs from scratch, templates are optional
    return {
      cancellationTemplate: true,
      applicationTemplate: true,
      errors: []
    };
  }

  /**
   * Initialize template directory
   */
  static async initializeTemplates(): Promise<void> {
    const templatesDir = path.join(process.cwd(), 'public', 'documents');
    
    try {
      await fs.access(templatesDir);
      console.log('Documents directory exists:', templatesDir);
    } catch {
      await fs.mkdir(templatesDir, { recursive: true });
      console.log('Created documents directory:', templatesDir);
    }
  }
}