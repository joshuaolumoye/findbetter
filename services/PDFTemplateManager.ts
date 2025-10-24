// services/PDFTemplateManager.ts - COMPLETE SWISS INSURANCE ADDRESS DATABASE
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
   * Helper function to wrap text within a maximum width
   */
  private wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, fontSize);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Create cancellation PDF with proper equal left and right margins
   * Right column displays insurance company name, street, and address
   */
  private async createCancellationWithUserData(
    userData: UserFormData, 
    currentInsurer: string
  ): Promise<PDFDocument> {
    console.log('Creating cancellation PDF with equal left and right margins...');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ============= PAGE LAYOUT SETUP =============
    const MARGIN_LEFT = 50;
    const MARGIN_RIGHT = 50;
    const PAGE_WIDTH = 595;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 495
    const COLUMN_DIVIDE = 270; // Where right column starts (from left edge)
    const LINE_HEIGHT = 14;
    
    // Calculate available width for each column with proper right margin
    const leftColumnWidth = COLUMN_DIVIDE - MARGIN_LEFT - 10; // 210 (with 10px gap)
    const rightColumnWidth = PAGE_WIDTH - COLUMN_DIVIDE - MARGIN_RIGHT; // 275
    
    let currentY = 790;

    // ============= HEADER INSTRUCTIONS =============
    page.drawText('Tragen Sie Ihren Absender ein:', {
      x: MARGIN_LEFT,
      y: currentY,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Right column header - wrap if needed
    const rightHeaderLines = this.wrapText(
      'Tragen Sie die Adresse Ihrer Krankenversicherung ein:',
      rightColumnWidth,
      8,
      font
    );

    for (let i = 0; i < rightHeaderLines.length; i++) {
      page.drawText(rightHeaderLines[i], {
        x: COLUMN_DIVIDE,
        y: currentY - (i * 10),
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5)
      });
    }

    currentY -= 30;

    // ============= LEFT COLUMN - SENDER INFO =============
    let leftY = currentY;
    
    // Policy number (if available)
    if (userData.currentInsurancePolicyNumber) {
      page.drawText('Versicherten Nummer', {
        x: MARGIN_LEFT,
        y: leftY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      leftY -= LINE_HEIGHT;
      page.drawText(userData.currentInsurancePolicyNumber, {
        x: MARGIN_LEFT,
        y: leftY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      leftY -= LINE_HEIGHT;
    }

    // Last name
    page.drawText('Name', {
      x: MARGIN_LEFT,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= LINE_HEIGHT;
    page.drawText(userData.lastName, {
      x: MARGIN_LEFT,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= LINE_HEIGHT;

    // First name
    page.drawText('Vorname', {
      x: MARGIN_LEFT,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= LINE_HEIGHT;
    page.drawText(userData.firstName, {
      x: MARGIN_LEFT,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= LINE_HEIGHT;

    // Street
    const streetToUse = userData.street && userData.street.trim() 
      ? userData.street 
      : userData.address;
      
    page.drawText('Strasse, Nummer', {
      x: MARGIN_LEFT,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= LINE_HEIGHT;
    page.drawText(streetToUse, {
      x: MARGIN_LEFT,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= LINE_HEIGHT;

    // Postal code and city
    page.drawText('Postleitzahl, Wohnort', {
      x: MARGIN_LEFT,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    leftY -= LINE_HEIGHT;
    page.drawText(`${userData.postalCode} ${userData.city}`, {
      x: MARGIN_LEFT,
      y: leftY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });

    // ============= RIGHT COLUMN - INSURANCE COMPANY INFO =============
    let rightY = currentY;
    
    // Insurance company name
    page.drawText('Name der Krankenversicherung', {
      x: COLUMN_DIVIDE,
      y: rightY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    rightY -= LINE_HEIGHT;
    
    // Wrap insurer name if too long
    const insurerNameLines = this.wrapText(currentInsurer, rightColumnWidth, 10, font);
    for (const line of insurerNameLines) {
      page.drawText(line, {
        x: COLUMN_DIVIDE,
        y: rightY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      rightY -= LINE_HEIGHT;
    }

    // Get insurer address from comprehensive database
    const insurerAddress = this.getInsurerAddress(currentInsurer);
    
    console.log('Insurance address lookup:', {
      insurer: currentInsurer,
      found: !!insurerAddress,
      address: insurerAddress
    });

    // Always display street field
    page.drawText('Strasse, Nummer', {
      x: COLUMN_DIVIDE,
      y: rightY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    rightY -= LINE_HEIGHT;
    
    // Display street or placeholder
    const streetText = insurerAddress?.street || '[Strasse eintragen]';
    page.drawText(streetText, {
      x: COLUMN_DIVIDE,
      y: rightY,
      size: 10,
      font,
      color: insurerAddress ? rgb(0, 0, 0) : rgb(0.5, 0.5, 0.5)
    });
    rightY -= LINE_HEIGHT;

    // Always display postal code and city field
    page.drawText('Postleitzahl, Ort', {
      x: COLUMN_DIVIDE,
      y: rightY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    rightY -= LINE_HEIGHT;
    
    // Display postal code and city or placeholder
    const postalText = insurerAddress 
      ? `${insurerAddress.postal} ${insurerAddress.city}` 
      : '[PLZ, Ort eintragen]';
    
    page.drawText(postalText, {
      x: COLUMN_DIVIDE,
      y: rightY,
      size: 10,
      font,
      color: insurerAddress ? rgb(0, 0, 0) : rgb(0.5, 0.5, 0.5)
    });

    // ============= MAIN CONTENT SECTION =============
    currentY = Math.min(leftY, rightY) - 40;

    // Date and location
    const today = new Date();
    const dateStr = today.toLocaleDateString('de-CH');
    
    page.drawText('Ort, Datum', {
      x: MARGIN_LEFT,
      y: currentY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    currentY -= LINE_HEIGHT;
    page.drawText(`${userData.city}, ${dateStr}`, {
      x: MARGIN_LEFT,
      y: currentY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });

    currentY -= 30;

    // Title - wrap if needed
    const titleLine1 = 'Kundigung der obligatorischen Krankenpflegeversicherung';
    page.drawText(titleLine1, {
      x: MARGIN_LEFT,
      y: currentY,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    currentY -= 16;
    page.drawText('(Grundversicherung)', {
      x: MARGIN_LEFT,
      y: currentY,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    currentY -= 25;

    // Greeting
    page.drawText('Sehr geehrte Damen und Herren', {
      x: MARGIN_LEFT,
      y: currentY,
      size: 11,
      font,
      color: rgb(0, 0, 0)
    });

    currentY -= 20;

    // Calculate cancellation dates
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

    // Cancellation text - wrap properly to respect right margin
    const cancellationText = `Hiermit kundige ich meine Grundversicherung per ${cancellationDay}. ${cancellationMonth} ${cancellationYear}. Ich werde ab ${startDay}.${startMonth}.${startYear} bei einem anderen Krankenversicherer nach KVG versichert sein.`;
    
    const cancellationLines = this.wrapText(cancellationText, CONTENT_WIDTH, 11, font);
    
    for (const line of cancellationLines) {
      page.drawText(line, {
        x: MARGIN_LEFT,
        y: currentY,
        size: 11,
        font,
        color: rgb(0, 0, 0)
      });
      currentY -= 14;
    }

    currentY -= 6;

    // Closing text - wrap properly to respect right margin
    const closingText = 'Besten Dank fur die Ausfuhrung des Auftrages. Bitte stellen Sie mir eine entsprechende schriftliche Bestatigung zu.';
    const closingLines = this.wrapText(closingText, CONTENT_WIDTH, 11, font);
    
    for (const line of closingLines) {
      page.drawText(line, {
        x: MARGIN_LEFT,
        y: currentY,
        size: 11,
        font,
        color: rgb(0, 0, 0)
      });
      currentY -= 14;
    }

    currentY -= 11;

    page.drawText('Freundliche Grusse', {
      x: MARGIN_LEFT,
      y: currentY,
      size: 11,
      font,
      color: rgb(0, 0, 0)
    });

    currentY -= 50;

    // ============= SIGNATURE SECTION =============
    page.drawText('Name, Vorname', {
      x: MARGIN_LEFT,
      y: currentY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });

    page.drawText('Unterschrift', {
      x: COLUMN_DIVIDE,
      y: currentY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });

    currentY -= LINE_HEIGHT;
    page.drawText(`${userData.lastName}, ${userData.firstName}`, {
      x: MARGIN_LEFT,
      y: currentY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });

    currentY -= 45;

    // ============= REMARK =============
    page.drawText('Bemerkung:', {
      x: MARGIN_LEFT,
      y: currentY,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    currentY -= 12;
    
    // Wrap remark text to respect right margin
    const remarkText = 'Es wird empfohlen, diesen Brief per Einschreiben zu versenden';
    const remarkLines = this.wrapText(remarkText, CONTENT_WIDTH, 9, font);
    
    for (const line of remarkLines) {
      page.drawText(line, {
        x: MARGIN_LEFT,
        y: currentY,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4)
      });
      currentY -= 11;
    }

    console.log('✅ Cancellation PDF created with proper equal margins and right column address:', {
      leftMargin: MARGIN_LEFT,
      rightMargin: MARGIN_RIGHT,
      contentWidth: CONTENT_WIDTH,
      leftColumnWidth,
      rightColumnWidth,
      pageWidth: PAGE_WIDTH,
      insurerAddressFound: !!insurerAddress
    });
    
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
      const topLeftMargin = 86;
      const topSectionStartY = 670;
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

      // BOTTOM SECTION: Fill in "Ort, Datum"
      const currentDate = new Date().toLocaleDateString('de-CH');
      const bottomLeftMargin = 125;
      
      const ortDatumY = 274;
      firstPage.drawText(`${userData.address}, ${currentDate}`, {
        x: bottomLeftMargin,
        y: ortDatumY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      
      const nameLineY = ortDatumY - lineSpacing;
      firstPage.drawText(`${userData.firstName} ${userData.lastName}`, {
        x: bottomLeftMargin,
        y: nameLineY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });

      console.log('✅ Application PDF filled with aligned user data');
      
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

  /**
   * COMPLETE SWISS INSURANCE COMPANY ADDRESS DATABASE (2025)
   * Source: Federal Office of Public Health (BAG/OFSP) - Official List
   */
  private getInsurerAddress(insurerName: string): { street: string; postal: string; city: string } | null {
    // Normalize insurer name for better matching
    const normalizedName = insurerName.toLowerCase().trim();
    
    const addresses: Record<string, { street: string; postal: string; city: string }> = {
      // Agrisano
      'agrisano': { street: 'Laurstrasse 10', postal: '5201', city: 'Brugg AG' },
      'agrisano krankenkasse ag': { street: 'Laurstrasse 10', postal: '5201', city: 'Brugg AG' },
      
      // AMB
      'amb': { street: 'Route de Verbier 13', postal: '1934', city: 'Le Châble' },
      'amb assurances sa': { street: 'Route de Verbier 13', postal: '1934', city: 'Le Châble' },
      
      // Aquilana
      'aquilana': { street: 'Bruggerstrasse 46', postal: '5401', city: 'Baden' },
      'aquilana versicherungen': { street: 'Bruggerstrasse 46', postal: '5401', city: 'Baden' },
      
      // Assura
      'assura': { street: 'Avenue C.-F. Ramuz 70', postal: '1009', city: 'Pully' },
      'assura-basis sa': { street: 'Avenue C.-F. Ramuz 70', postal: '1009', city: 'Pully' },
      'assura-basis ag': { street: 'Avenue C.-F. Ramuz 70', postal: '1009', city: 'Pully' },
      
      // Atupri
      'atupri': { street: 'Zieglerstr. 29', postal: '3001', city: 'Bern' },
      'atupri gesundheitsversicherung': { street: 'Zieglerstr. 29', postal: '3001', city: 'Bern' },
      
      // Avenir (Groupe Mutuel)
      'avenir': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'avenir assurance maladie sa': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      
      // Cassa da malsauns Lumneziaina
      'lumneziaina': { street: 'Postfach 22', postal: '7144', city: 'Vella' },
      'cassa da malsauns lumneziaina': { street: 'Postfach 22', postal: '7144', city: 'Vella' },
      
      // CM Vallée d'Entremont
      'cm de la vallée d\'entremont': { street: 'Place Centrale 5', postal: '1937', city: 'Orsières' },
      'cmveo': { street: 'Place Centrale 5', postal: '1937', city: 'Orsières' },
      
      // Concordia
      'concordia': { street: 'Bundesplatz 15', postal: '6002', city: 'Luzern' },
      'concordia schweiz': { street: 'Bundesplatz 15', postal: '6002', city: 'Luzern' },
      'concordia kranken- und unfallversicherung ag': { street: 'Bundesplatz 15', postal: '6002', city: 'Luzern' },
      
      // CSS
      'css': { street: 'Postfach 2568', postal: '6002', city: 'Luzern' },
      'css kranken-versicherung ag': { street: 'Postfach 2568', postal: '6002', city: 'Luzern' },
      'css versicherung ag': { street: 'Postfach 2568', postal: '6002', city: 'Luzern' },
      
      // EGK
      'egk': { street: 'Birspark 1', postal: '4242', city: 'Laufen' },
      'egk grundversicherungen ag': { street: 'Birspark 1', postal: '4242', city: 'Laufen' },
      
      // Einsiedler
      'einsiedler': { street: 'Kronenstrasse 19', postal: '8840', city: 'Einsiedeln' },
      'einsiedler krankenkasse': { street: 'Kronenstrasse 19', postal: '8840', city: 'Einsiedeln' },
      
      // Galenos
      'galenos': { street: 'Militärstrasse 36', postal: '8021', city: 'Zürich' },
      'galenos ag': { street: 'Militärstrasse 36', postal: '8021', city: 'Zürich' },
      
      // Glarner
      'glarner': { street: 'Abläsch 8', postal: '8762', city: 'Schwanden' },
      'glarner krankenversicherung': { street: 'Abläsch 8', postal: '8762', city: 'Schwanden' },
      
      // Helsana
      'helsana': { street: 'Postfach', postal: '8081', city: 'Zürich' },
      'helsana versicherungen ag': { street: 'Postfach', postal: '8081', city: 'Zürich' },
      
      // KLuG
      'klug': { street: 'Gubelstrasse 22', postal: '6300', city: 'Zug' },
      'klug krankenversicherung': { street: 'Gubelstrasse 22', postal: '6300', city: 'Zug' },
      
      // KPT
      'kpt': { street: 'Postfach', postal: '3001', city: 'Bern' },
      'kpt krankenkasse ag': { street: 'Postfach', postal: '3001', city: 'Bern' },
      'kpt/cpt': { street: 'Postfach', postal: '3001', city: 'Bern' },
      
      // Krankenkasse Birchmeier
      'birchmeier': { street: 'Hauptstrasse 22', postal: '5444', city: 'Künten' },
      'krankenkasse birchmeier': { street: 'Hauptstrasse 22', postal: '5444', city: 'Künten' },
      
      // Krankenkasse Luzerner Hinterland
      'luzerner hinterland': { street: 'Luzernstrasse 19', postal: '6144', city: 'Zell LU' },
      'krankenkasse luzerner hinterland': { street: 'Luzernstrasse 19', postal: '6144', city: 'Zell LU' },
      
      // SLKK
      'slkk': { street: 'Hofwiesenstrasse 370', postal: '8050', city: 'Zürich' },
      'krankenkasse slkk': { street: 'Hofwiesenstrasse 370', postal: '8050', city: 'Zürich' },
      
      // Steffisburg
      'steffisburg': { street: 'Unterdorfstrasse 37', postal: '3612', city: 'Steffisburg' },
      'krankenkasse steffisburg': { street: 'Unterdorfstrasse 37', postal: '3612', city: 'Steffisburg' },
      
      // Visperterminen
      'visperterminen': { street: 'Dorfstrasse 66', postal: '3932', city: 'Visperterminen' },
      'krankenkasse visperterminen': { street: 'Dorfstrasse 66', postal: '3932', city: 'Visperterminen' },
      
      // Wädenswil
      'wädenswil': { street: 'Industriestrasse 15', postal: '8820', city: 'Wädenswil' },
      'krankenkasse wädenswil': { street: 'Industriestrasse 15', postal: '8820', city: 'Wädenswil' },
      
      // Mutuel (Groupe Mutuel)
      'mutuel': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'mutuel assurance maladie sa': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      
      // Groupe Mutuel
      'groupe mutuel': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      
      // ÖKK
      'ökk': { street: 'Bahnhofstrasse 13', postal: '7302', city: 'Landquart' },
      'oekk': { street: 'Bahnhofstrasse 13', postal: '7302', city: 'Landquart' },
      'ökk kranken- und unfallversicherungen ag': { street: 'Bahnhofstrasse 13', postal: '7302', city: 'Landquart' },
      
      // Philos (Groupe Mutuel)
      'philos': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'philos assurance maladie sa': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      
      // Rhenusana
      'rhenusana': { street: 'Widnauerstrasse 69', postal: '9435', city: 'Heerbrugg' },
      
      // Sana24 (Visana Group)
      'sana24': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 16' },
      
      // Sanavals
      'sanavals': { street: 'Valéstrasse 146E', postal: '7132', city: 'Vals' },
      'sanavals gesundheitskasse': { street: 'Valéstrasse 146E', postal: '7132', city: 'Vals' },
      
      // Sanitas
      'sanitas': { street: 'Jägergasse 3', postal: '8021', city: 'Zürich' },
      'sanitas grundversicherungen ag': { street: 'Jägergasse 3', postal: '8021', city: 'Zürich' },
      'sanitas krankenversicherung': { street: 'Jägergasse 3', postal: '8021', city: 'Zürich' },
      
      // Sodalis
      'sodalis': { street: 'Balfrinstr. 15', postal: '3930', city: 'Visp' },
      'sodalis gesundheitsgruppe': { street: 'Balfrinstr. 15', postal: '3930', city: 'Visp' },
      
      // Sumiswalder
      'sumiswalder': { street: 'Spitalstrasse 47', postal: '3454', city: 'Sumiswald' },
      'sumiswalder krankenkasse': { street: 'Spitalstrasse 47', postal: '3454', city: 'Sumiswald' },
      
      // SWICA
      'swica': { street: 'Römerstrasse 38', postal: '8400', city: 'Winterthur' },
      'swica krankenversicherung ag': { street: 'Römerstrasse 38', postal: '8400', city: 'Winterthur' },
      
      // Visana
      'visana': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 16' },
      'visana services ag': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 16' },
      
      // Vita Surselva
      'vita surselva': { street: 'Bahnhofstrasse 33', postal: '7130', city: 'Ilanz' },
      
      // Vivacare (Visana Group)
      'vivacare': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 16' },
      
      // Sympany
      'sympany': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' },
      'vivao sympany ag': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' },
      'vivao': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' }
    };
    
    // Try exact match first
    if (addresses[normalizedName]) {
      console.log(`✅ Exact match found for: ${insurerName}`);
      return addresses[normalizedName];
    }
    
    // Try partial match (if insurer name contains any key)
    for (const [key, value] of Object.entries(addresses)) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        console.log(`✅ Partial match found: ${key} for ${insurerName}`);
        return value;
      }
    }
    
    console.warn(`⚠️ No address found for insurer: ${insurerName}`);
    console.warn(`   Normalized search term: ${normalizedName}`);
    return null;
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