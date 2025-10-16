// services/PDFTemplateManager.ts - UPDATED APPLICATION PDF WITH TEMPLATE LOADING
import { PDFDocument, rgb, StandardFonts, PDFImage } from 'pdf-lib';
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
  street?: string;
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
  private logoPath: string;

  constructor() {
    this.templateBasePath = path.join(process.cwd(), 'public', 'documents');
    this.logoPath = path.join(process.cwd(), 'public', 'images', 'howden-logo.png');
    console.log('PDF Template Manager initialized with base path:', this.templateBasePath);
  }

  /**
   * Generate cancellation PDF matching exact template
   */
  async generateCancellationPDF(userData: UserFormData, currentInsurer: string): Promise<Buffer> {
    const startTime = Date.now();
    console.log('Starting cancellation PDF generation with user data:', {
      name: `${userData.firstName} ${userData.lastName}`,
      email: userData.email,
      currentInsurer,
      insuranceStartDate: userData.insuranceStartDate,
      street: userData.street,
      address: userData.address
    });

    try {
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
   * Generate application PDF using the new simple template
   */
  async generateInsuranceApplicationPDF(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<Buffer> {
    const startTime = Date.now();
    console.log('Starting application PDF generation with user data:', {
      name: `${userData.firstName} ${userData.lastName}`,
      insurer: selectedInsurance.insurer,
      premium: selectedInsurance.premium,
      street: userData.street,
      address: userData.address
    });

    try {
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
   * Create cancellation PDF - FIXED ADDRESS FORMAT
   * Format: Name, Street, Postal Code + City (NO "CH-8001 - Zurich")
   * THIS METHOD REMAINS UNCHANGED
   */
  private async createCancellationWithUserData(
    userData: UserFormData, 
    currentInsurer: string
  ): Promise<PDFDocument> {
    console.log('Creating cancellation PDF with FIXED address format...');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 790;
    const lineHeight = 14;
    const leftMargin = 50;
    const rightColumnX = 320;

    // Header instructions (light gray, smaller font)
    page.drawText('Tragen Sie Ihren Absender ein:', {
      x: leftMargin,
      y: y,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    page.drawText('Tragen Sie die Adresse Ihrer', {
      x: rightColumnX,
      y: y,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    y -= 10;
    page.drawText('Krankenversicherung ein:', {
      x: rightColumnX,
      y: y,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    y -= 20;

    // Left column - Sender information
    let leftY = y;
    
    // Policy number if available
    if (userData.currentInsurancePolicyNumber) {
      page.drawText('Versicherten Nummer', {
        x: leftMargin,
        y: leftY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      leftY -= lineHeight;
      page.drawText(userData.currentInsurancePolicyNumber, {
        x: leftMargin,
        y: leftY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      leftY -= lineHeight;
    }

    // Name
    page.drawText('Name', {
      x: leftMargin,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= lineHeight;
    page.drawText(userData.lastName, {
      x: leftMargin,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= lineHeight;

    page.drawText('Vorname', {
      x: leftMargin,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= lineHeight;
    page.drawText(userData.firstName, {
      x: leftMargin,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= lineHeight;

    // Street field (if available)
    if (userData.street && userData.street.trim()) {
      page.drawText('Strasse, Nummer', {
        x: leftMargin,
        y: leftY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      leftY -= lineHeight;
      page.drawText(userData.street, {
        x: leftMargin,
        y: leftY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      leftY -= lineHeight;
    }

    // Address (just the street name/number if no separate street field)
    if (!userData.street || !userData.street.trim()) {
      page.drawText('Strasse, Nummer', {
        x: leftMargin,
        y: leftY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      leftY -= lineHeight;
      page.drawText(userData.address, {
        x: leftMargin,
        y: leftY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      leftY -= lineHeight;
    }

    // Postal code and city (NO "CH-" prefix)
    page.drawText('Postleitzahl, Wohnort', {
      x: leftMargin,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= lineHeight;
    page.drawText(`${userData.postalCode} ${userData.city}`, {
      x: leftMargin,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });

    // Right column - Insurance company
    let rightY = y;
    page.drawText('Name der Krankenversicherung', {
      x: rightColumnX,
      y: rightY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    rightY -= lineHeight;
    page.drawText(currentInsurer, {
      x: rightColumnX,
      y: rightY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    rightY -= lineHeight;

    const insurerAddress = this.getInsurerAddress(currentInsurer);
    if (insurerAddress) {
      page.drawText('Strasse, Nummer', {
        x: rightColumnX,
        y: rightY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      rightY -= lineHeight;
      page.drawText(insurerAddress.street, {
        x: rightColumnX,
        y: rightY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      rightY -= lineHeight;

      page.drawText('Postleitzahl, Ort', {
        x: rightColumnX,
        y: rightY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      rightY -= lineHeight;
      page.drawText(`${insurerAddress.postal} ${insurerAddress.city}`, {
        x: rightColumnX,
        y: rightY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
    }

    // Move to next section
    y = Math.min(leftY, rightY) - 30;

    // Date and location
    const today = new Date();
    const dateStr = today.toLocaleDateString('de-CH');
    
    page.drawText('Ort, Datum', {
      x: leftMargin,
      y: y,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    y -= lineHeight;
    page.drawText(`${userData.city}, ${dateStr}`, {
      x: leftMargin,
      y: y,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 30;

    // Title - Bold and larger
    page.drawText('Kundigung der obligatorischen Krankenpflegeversicherung', {
      x: leftMargin,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= 16;
    page.drawText('(Grundversicherung)', {
      x: leftMargin,
      y: y,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= 25;

    // Greeting
    page.drawText('Sehr geehrte Damen und Herren', {
      x: leftMargin,
      y: y,
      size: 11,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 20;

    // Calculate dates from insuranceStartDate
    const insuranceStartDate = userData.insuranceStartDate || '2026-01-01';
    const startDate = new Date(insuranceStartDate);
    
    const cancellationDate = new Date(startDate);
    cancellationDate.setDate(cancellationDate.getDate() - 1);
    
    const cancellationDay = cancellationDate.getDate();
    const cancellationMonth = this.getGermanMonth(cancellationDate.getMonth());
    const cancellationYear = cancellationDate.getFullYear();
    
    const startDay = startDate.getDate();
    const startMonth = startDate.getMonth() + 1;
    const startYear = startDate.getFullYear();

    // Main content
    const line1 = `Hiermit kundige ich meine Grundversicherung per ${cancellationDay}. ${cancellationMonth} ${cancellationYear}. Ich werde ab ${startDay}.${startMonth}.${startYear} bei einem anderen`;
    const line2 = 'Krankenversicherer nach KVG versichert sein.';

    page.drawText(line1, {
      x: leftMargin,
      y: y,
      size: 11,
      font,
      color: rgb(0, 0, 0)
    });
    y -= 14;
    page.drawText(line2, {
      x: leftMargin,
      y: y,
      size: 11,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 20;

    // Closing
    page.drawText('Besten Dank fur die Ausfuhrung des Auftrages. Bitte stellen Sie mir eine entsprechende schriftliche Bestatigung zu.', {
      x: leftMargin,
      y: y,
      size: 11,
      font,
      color: rgb(0, 0, 0),
      maxWidth: 495
    });

    y -= 25;

    page.drawText('Freundliche Grusse', {
      x: leftMargin,
      y: y,
      size: 11,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 35;

    // Signature section - two columns
    page.drawText('Name, Vorname', {
      x: leftMargin,
      y: y,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });

    page.drawText('Unterschrift', {
      x: rightColumnX,
      y: y,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });

    y -= lineHeight;
    page.drawText(`${userData.lastName}, ${userData.firstName}`, {
      x: leftMargin,
      y: y,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 40;

    // Remark
    page.drawText('Bemerkung:', {
      x: leftMargin,
      y: y,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= 12;
    page.drawText('Es wird empfohlen, diesen Brief per Einschreiben zu versenden', {
      x: leftMargin,
      y: y,
      size: 9,
      font,
      color: rgb(0.4, 0.4, 0.4)
    });

    console.log('✅ Cancellation PDF created with FIXED address format');
    return pdfDoc;
  }

  /**
   * Create application PDF - ALIGNED TEXT BELOW AUFTRAGGEBER/IN
   * Loads template PDF and fills in user data aligned with template text
   */
  private async createApplicationWithUserData(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<PDFDocument> {
    console.log('Creating application PDF with aligned positioning...');
    
    try {
      // Load the template PDF
      const templatePath = path.join(this.templateBasePath, 'Versicherungsantrag_template.pdf');
      
      console.log('Loading template from:', templatePath);
      const templateExists = await fs.access(templatePath).then(() => true).catch(() => false);
      
      if (!templateExists) {
        throw new Error(`Template not found at: ${templatePath}`);
      }
      
      const templateBytes = await fs.readFile(templatePath);
      const pdfDoc = await PDFDocument.load(templateBytes);
      
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      console.log('Template loaded successfully, filling in user data...');

      // TOP SECTION: Fill in details right below "Auftraggeber/in"
      // These go between "Auftraggeber/in" and "Beauftragte"
      const topLeftMargin = 86; // Left margin to align with template text
      const topSectionStartY = 670; // Y position right below "Auftraggeber/in"
      const lineSpacing = 14;
      
      // Line 1: First name Last name
      firstPage.drawText(`${userData.firstName} ${userData.lastName}`, {
        x: topLeftMargin,
        y: topSectionStartY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      
      // Line 2: Street
      const streetText = userData.street && userData.street.trim() 
        ? userData.street 
        : userData.address;
      
      firstPage.drawText(streetText, {
        x: topLeftMargin,
        y: topSectionStartY - lineSpacing,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      
      // Line 3: Postal Code + City
      firstPage.drawText(`${userData.postalCode} ${userData.city}`, {
        x: topLeftMargin,
        y: topSectionStartY - (lineSpacing * 2),
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });

      // BOTTOM SECTION: Fill in "Ort, Datum" on the left side
      const currentDate = new Date().toLocaleDateString('de-CH');
      const bottomLeftMargin = 125; // Same left margin as top section
      
      // Line 1: City and Date on the line below first "Ort, Datum"
      const ortDatumY = 274; // Y position on the line below "Ort, Datum"
      firstPage.drawText(`${userData.city}, ${currentDate}`, {
        x: bottomLeftMargin,
        y: ortDatumY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      
      // Line 2: User's name below the address line
      const nameLineY = ortDatumY - lineSpacing; // Below the date line
      firstPage.drawText(`${userData.firstName} ${userData.lastName}`, {
        x: bottomLeftMargin,
        y: nameLineY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });

      console.log('✅ Application PDF filled with aligned user data:', {
        name: `${userData.firstName} ${userData.lastName}`,
        street: streetText,
        address: `${userData.postalCode} ${userData.city}`,
        date: `${userData.city}, ${currentDate}`,
        topSection: `(${topLeftMargin}, ${topSectionStartY})`,
        bottomOrtDatum: `(${bottomLeftMargin}, ${ortDatumY})`,
        bottomName: `(${bottomLeftMargin}, ${nameLineY})`
      });
      
      return pdfDoc;
      
    } catch (error) {
      console.error('Error creating application PDF from template:', error);
      throw new Error(`Failed to create application PDF: ${error.message}`);
    }
  }

  private getGermanMonth(monthIndex: number): string {
    const months = [
      'Januar', 'Februar', 'Marz', 'April', 'Mai', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    return months[monthIndex];
  }

  private getInsurerAddress(insurerName: string): { street: string; postal: string; city: string } | null {
    const addresses: Record<string, { street: string; postal: string; city: string }> = {
      'CSS Versicherung AG': { street: 'Tribschenstrasse 21', postal: '6002', city: 'Luzern' },
      'CSS': { street: 'Tribschenstrasse 21', postal: '6002', city: 'Luzern' },
      'Helsana': { street: 'Auzelg 18', postal: '8010', city: 'Zurich' },
      'Helsana Versicherungen AG': { street: 'Auzelg 18', postal: '8010', city: 'Zurich' },
      'Swica': { street: 'Romerstrasse 38', postal: '8401', city: 'Winterthur' },
      'Swica Krankenversicherung AG': { street: 'Romerstrasse 38', postal: '8401', city: 'Winterthur' },
      'Concordia': { street: 'Bundesplatz 15', postal: '6002', city: 'Luzern' },
      'Sanitas': { street: 'Jagergasse 3', postal: '8021', city: 'Zurich' },
      'Sanitas Krankenversicherung': { street: 'Jagergasse 3', postal: '8021', city: 'Zurich' },
      'KPT/CPT': { street: 'Weststrasse 10', postal: '3000', city: 'Bern 6' },
      'KPT': { street: 'Weststrasse 10', postal: '3000', city: 'Bern 6' },
      'Visana': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 15' },
      'Visana Services AG': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 15' },
      'Groupe Mutuel': { street: 'Rue des Cedres 5', postal: '1919', city: 'Martigny' },
      'Sympany': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' },
      'Assura': { street: 'Avenue C.-F. Ramuz 70', postal: '1009', city: 'Pully' },
      'Assura-Basis AG': { street: 'Avenue C.-F. Ramuz 70', postal: '1009', city: 'Pully' }
    };
    return addresses[insurerName] || null;
  }

  async validateTemplates(): Promise<{
    cancellationTemplate: boolean;
    applicationTemplate: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];
    let cancellationTemplate = true;
    let applicationTemplate = true;

    try {
      const templatePath = path.join(this.templateBasePath, 'Versicherungsantrag_template.pdf');
      await fs.access(templatePath);
      console.log('✅ Application template found');
    } catch {
      applicationTemplate = false;
      errors.push('Application template not found: Versicherungsantrag_template.pdf');
    }

    return {
      cancellationTemplate,
      applicationTemplate,
      errors
    };
  }

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