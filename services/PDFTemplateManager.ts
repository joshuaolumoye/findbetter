// services/PDFTemplateManager.ts - FIXED OLD INSURER DISPLAY ON CANCELLATION PDF
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
  oldInsurer: string; // ✅ OLD INSURER CODE (from calculator - the one they're cancelling)
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
   * COMPLETE INSURANCE COMPANY CODE TO NAME MAPPING
   * Maps insurance company codes to their display names
   */
  private getInsurerNameByCode(code: string): string | null {
    const insuranceMapping: Record<string, string> = {
      "0": "None",
      "1560": "Agrisano",
      "1507": "AMB Assurances SA",
      "0032": "Aquilana",
      "1569": "Arcosana (CSS)",
      "1542": "Assura",
      "0312": "Atupri",
      "0343": "Avenir (Groupe Mutuel)",
      "1322": "Birchmeier",
      "1575": "Compact",
      "0290": "Concordia",
      "0008": "CSS",
      "0774": "Easy Sana (Groupe Mutuel)",
      "0881": "EGK",
      "0134": "Einsiedler",
      "1386": "Galenos",
      "0780": "Glarner",
      "1562": "Helsana",
      "1142": "Ingenbohl",
      "1529": "Intras (CSS)",
      "0829": "KluG",
      "0762": "Kolping (Sympany)",
      "0376": "KPT",
      "0558": "KVF",
      "0820": "Lumneziana",
      "0360": "Luzerner Hinterland",
      "0057": "Moove (Sympany)",
      "1479": "Mutuel",
      "0455": "ÖKK",
      "1535": "Philos (Groupe Mutuel)",
      "1998": "Prezisa",
      "0994": "Progrès",
      "0182": "Provita",
      "1401": "Rhenusana",
      "1568": "sana24",
      "1577": "Sanagate (CSS)",
      "0901": "Sanavals",
      "1509": "Sanitas",
      "0923": "SLKK",
      "0941": "Sodalis",
      "0246": "Steffisburg",
      "1331": "Stoffel Mels",
      "0194": "Sumiswalder",
      "0062": "Supra",
      "1384": "Swica",
      "0509": "Sympany",
      "1113": "Vallée d'Entremont",
      "1555": "Visana",
      "1040": "Visperterminen",
      "0966": "Vita",
      "1570": "Vivacare",
      "1318": "Wädenswil"
    };
    
    // Try direct lookup
    if (insuranceMapping[code]) {
      return insuranceMapping[code];
    }
    
    // Try without leading zeros
    const normalizedCode = code.replace(/^0+/, '');
    if (insuranceMapping[normalizedCode]) {
      return insuranceMapping[normalizedCode];
    }
    
    // Try with leading zeros
    const paddedCode = code.padStart(4, '0');
    if (insuranceMapping[paddedCode]) {
      return insuranceMapping[paddedCode];
    }
    
    return null;
  }

  /**
   * ✅ Generate cancellation PDF - USES OLD INSURER (the one being cancelled)
   * @param userData - User's personal information (must contain oldInsurer CODE)
   * @param oldInsurerCode - The insurance company CODE they are CANCELLING (from calculator)
   */
  async generateCancellationPDF(userData: UserFormData, oldInsurerCode: string): Promise<Buffer> {
    const startTime = Date.now();
    
    console.log('🔹 === CANCELLATION PDF GENERATION START ===');
    
    // Validate required fields
    if (!userData.firstName || !userData.lastName) {
      throw new Error('PDF generation failed: Missing required user name fields');
    }

    if (!oldInsurerCode && !userData.oldInsurer) {
      throw new Error('PDF generation failed: Missing old insurer information');
    }
    
    console.log('🔹 Input parameters:', {
      oldInsurerCode: oldInsurerCode,
      userDataOldInsurer: userData.oldInsurer,
      userName: `${userData.firstName} ${userData.lastName}`
    });
    
    // ✅ PRIORITY 1: Use the oldInsurerCode parameter (passed explicitly)
    // ✅ PRIORITY 2: Fall back to userData.oldInsurer if parameter is missing
    const codeToConvert = oldInsurerCode || userData.oldInsurer;
    
    console.log('🔹 Code to convert:', codeToConvert);
    
    // ✅ Convert OLD insurer code to name for display on PDF
    let oldInsurerName = this.getInsurerNameByCode(codeToConvert);
    
    console.log('🔹 Conversion result:', {
      inputCode: codeToConvert,
      outputName: oldInsurerName,
      conversionSuccess: !!oldInsurerName
    });
    
    // If code conversion fails, use the code itself as fallback
    if (!oldInsurerName) {
      console.warn('⚠️ Could not convert code to name, using code as fallback');
      oldInsurerName = codeToConvert;
    }
    
    console.log('🔹 Final OLD INSURER name for PDF:', oldInsurerName);
    console.log('🔹 This will appear on the RIGHT SIDE of the cancellation PDF');

    try {
      const pdfDoc = await this.createCancellationWithUserData(userData, oldInsurerName);
      
      const pdfBytes = await pdfDoc.save({
        useObjectStreams: false,
        addDefaultPage: false
      });
      
      console.log(`✅ Cancellation PDF generated successfully in ${Date.now() - startTime}ms`);
      console.log(`✅ OLD INSURER on PDF: ${oldInsurerName}`);
      console.log('🔹 === CANCELLATION PDF GENERATION END ===');
      
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
    
    // Validate required fields
    if (!userData.firstName || !userData.lastName) {
      throw new Error('PDF generation failed: Missing required user name fields');
    }

    if (!userData.email || !userData.phone) {
      throw new Error('PDF generation failed: Missing required contact information');
    }

    if (!selectedInsurance.insurer) {
      throw new Error('PDF generation failed: Missing selected insurance information');
    }

    console.log('Starting application PDF generation with data:', {
      userName: `${userData.firstName} ${userData.lastName}`,
      selectedInsurer: selectedInsurance.insurer,
      timestamp: new Date().toISOString()
    });
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
   * ✅ Create cancellation PDF with OLD INSURER on the right side
   * This is the insurance company the user is CANCELLING (from the calculator)
   */
  private async createCancellationWithUserData(
    userData: UserFormData, 
    oldInsurerName: string
  ): Promise<PDFDocument> {
    console.log('🔹 Creating cancellation PDF with OLD INSURER on right side...');
    console.log('🔹 Old insurer name to display:', oldInsurerName);
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4 size
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ============= PAGE LAYOUT SETUP =============
    const MARGIN_LEFT = 50;
    const MARGIN_RIGHT = 50;
    const PAGE_WIDTH = 595;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
    const COLUMN_DIVIDE = 270;
    const LINE_HEIGHT = 14;
    
    const leftColumnWidth = COLUMN_DIVIDE - MARGIN_LEFT - 10;
    const rightColumnWidth = PAGE_WIDTH - COLUMN_DIVIDE - MARGIN_RIGHT;
    
    let currentY = 790;

    // ============= HEADER INSTRUCTIONS =============
    page.drawText('Tragen Sie Ihren Absender ein:', {
      x: MARGIN_LEFT,
      y: currentY,
      size: 8,
      font,
      color: rgb(0.5, 0.5, 0.5)
    });

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

    // ============= LEFT COLUMN - SENDER INFO (USER) =============
    let leftY = currentY;
    
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

    // ============= RIGHT COLUMN - OLD INSURANCE COMPANY (BEING CANCELLED) =============
    let rightY = currentY;
    
    console.log('🔹 === RIGHT COLUMN RENDERING ===');
    console.log('🔹 Displaying OLD INSURER on right column:', oldInsurerName);
    
    page.drawText('Name der Krankenversicherung', {
      x: COLUMN_DIVIDE,
      y: rightY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    rightY -= LINE_HEIGHT;
    
    // Wrap old insurer name if too long
    const insurerNameLines = this.wrapText(oldInsurerName, rightColumnWidth, 10, font);
    console.log('🔹 Wrapped insurer name lines:', insurerNameLines);
    
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

    // ✅ Get address for OLD insurer (the one being cancelled)
    const insurerAddress = this.getInsurerAddress(oldInsurerName);
    
    console.log('🔹 OLD Insurance address lookup:', {
      oldInsurer: oldInsurerName,
      found: !!insurerAddress,
      address: insurerAddress
    });

    page.drawText('Strasse, Nummer', {
      x: COLUMN_DIVIDE,
      y: rightY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    rightY -= LINE_HEIGHT;
    
    const streetText = insurerAddress?.street || '[Strasse eintragen]';
    page.drawText(streetText, {
      x: COLUMN_DIVIDE,
      y: rightY,
      size: 10,
      font,
      color: insurerAddress ? rgb(0, 0, 0) : rgb(0.5, 0.5, 0.5)
    });
    rightY -= LINE_HEIGHT;

    page.drawText('Postleitzahl, Ort', {
      x: COLUMN_DIVIDE,
      y: rightY,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
    rightY -= LINE_HEIGHT;
    
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

    console.log('🔹 === RIGHT COLUMN COMPLETE ===');

    // ============= MAIN CONTENT SECTION =============
    currentY = Math.min(leftY, rightY) - 40;

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

    page.drawText('Sehr geehrte Damen und Herren', {
      x: MARGIN_LEFT,
      y: currentY,
      size: 11,
      font,
      color: rgb(0, 0, 0)
    });

    currentY -= 20;

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

    console.log('✅ Cancellation PDF created with OLD INSURER:', {
      oldInsurerName: oldInsurerName,
      insurerAddressFound: !!insurerAddress,
      address: insurerAddress
    });
    
    return pdfDoc;
  }

  /**
   * Create application PDF - ALIGNED TEXT BELOW AUFTRAGGEBER/IN
   */
  private async createApplicationWithUserData(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<PDFDocument> {
    console.log('Creating application PDF with aligned positioning...');
    
    try {
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

      const topLeftMargin = 62;
      const topSectionStartY = 700;
      const lineSpacing = 14;
      
      firstPage.drawText(`${userData.salutation}`, {
        x: topLeftMargin,
        y: topSectionStartY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });

      firstPage.drawText(`${userData.firstName} ${userData.lastName}`, {
        x: topLeftMargin,
        y: topSectionStartY - lineSpacing,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      
      const streetText = userData.street && userData.street.trim() 
        ? userData.street 
        : userData.address;
      
      firstPage.drawText(streetText, {
        x: topLeftMargin,
        y: topSectionStartY - (lineSpacing * 2),
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      
      firstPage.drawText(`${userData.postalCode} ${userData.city}`, {
        x: topLeftMargin,
        y: topSectionStartY - (lineSpacing * 3),
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });

      const currentDate = new Date().toLocaleDateString('de-CH');
      const bottomLeftMargin = 118;
      
      const ortDatumY = 300;
      firstPage.drawText(`${userData.address}, ${currentDate}`, {
        x: bottomLeftMargin,
        y: ortDatumY,
        size: 10,
        font,
        color: rgb(0, 0, 0)
      });
      // Also draw the current date on the same line but right-aligned
      try {
        const rightMargin = 188; // distance from right edge
        const dateText = currentDate;
        const dateSize = 10;
        // measure text width using embedded font
        const dateWidth = font.widthOfTextAtSize(dateText, dateSize);
        const pageWidth = firstPage.getWidth();
        const rightX = pageWidth - rightMargin - dateWidth;

        // Only draw if there is space (avoid overlapping left text)
        if (rightX > bottomLeftMargin + 20) {
          firstPage.drawText(dateText, {
            x: rightX,
            y: ortDatumY,
            size: dateSize,
            font,
            color: rgb(0, 0, 0)
          });
        }
      } catch (err) {
        // If measurement fails for any reason, fall back to drawing at a fixed position
        firstPage.drawText(currentDate, {
          x: 450,
          y: ortDatumY,
          size: 10,
          font,
          color: rgb(0, 0, 0)
        });
      }
      
      const nameLineY = ortDatumY - lineSpacing;
      firstPage.drawText(` `, {
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
   */
  private getInsurerAddress(insurerName: string): { street: string; postal: string; city: string } | null {
    const normalizedName = insurerName.toLowerCase().trim();
    
    const addresses: Record<string, { street: string; postal: string; city: string }> = {
      'agrisano': { street: 'Laurstrasse 10', postal: '5201', city: 'Brugg AG' },
      'agrisano krankenkasse ag': { street: 'Laurstrasse 10', postal: '5201', city: 'Brugg AG' },
      'amb': { street: 'Route de Verbier 13', postal: '1934', city: 'Le Châble' },
      'amb assurances sa': { street: 'Route de Verbier 13', postal: '1934', city: 'Le Châble' },
      'aquilana': { street: 'Bruggerstrasse 46', postal: '5401', city: 'Baden' },
      'aquilana versicherungen': { street: 'Bruggerstrasse 46', postal: '5401', city: 'Baden' },
      'assura': { street: 'Avenue C.-F. Ramuz 70', postal: '1009', city: 'Pully' },
      'assura-basis sa': { street: 'Avenue C.-F. Ramuz 70', postal: '1009', city: 'Pully' },
      'assura-basis ag': { street: 'Avenue C.-F. Ramuz 70', postal: '1009', city: 'Pully' },
      'atupri': { street: 'Zieglerstr. 29', postal: '3001', city: 'Bern' },
      'atupri gesundheitsversicherung': { street: 'Zieglerstr. 29', postal: '3001', city: 'Bern' },
      'avenir': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'avenir (groupe mutuel)': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'avenir assurance maladie sa': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'lumneziaina': { street: 'Postfach 22', postal: '7144', city: 'Vella' },
      'cassa da malsauns lumneziaina': { street: 'Postfach 22', postal: '7144', city: 'Vella' },
      'cm de la vallée d\'entremont': { street: 'Place Centrale 5', postal: '1937', city: 'Orsières' },
      'vallée d\'entremont': { street: 'Place Centrale 5', postal: '1937', city: 'Orsières' },
      'cmveo': { street: 'Place Centrale 5', postal: '1937', city: 'Orsières' },
      'concordia': { street: 'Bundesplatz 15', postal: '6002', city: 'Luzern' },
      'concordia schweiz': { street: 'Bundesplatz 15', postal: '6002', city: 'Luzern' },
      'concordia kranken- und unfallversicherung ag': { street: 'Bundesplatz 15', postal: '6002', city: 'Luzern' },
      'css': { street: 'Postfach 2568', postal: '6002', city: 'Luzern' },
      'css kranken-versicherung ag': { street: 'Postfach 2568', postal: '6002', city: 'Luzern' },
      'css versicherung ag': { street: 'Postfach 2568', postal: '6002', city: 'Luzern' },
      'arcosana (css)': { street: 'Postfach 2568', postal: '6002', city: 'Luzern' },
      'intras (css)': { street: 'Postfach 2568', postal: '6002', city: 'Luzern' },
      'sanagate (css)': { street: 'Postfach 2568', postal: '6002', city: 'Luzern' },
      'egk': { street: 'Birspark 1', postal: '4242', city: 'Laufen' },
      'egk grundversicherungen ag': { street: 'Birspark 1', postal: '4242', city: 'Laufen' },
      'einsiedler': { street: 'Kronenstrasse 19', postal: '8840', city: 'Einsiedeln' },
      'einsiedler krankenkasse': { street: 'Kronenstrasse 19', postal: '8840', city: 'Einsiedeln' },
      'galenos': { street: 'Militärstrasse 36', postal: '8021', city: 'Zürich' },
      'galenos ag': { street: 'Militärstrasse 36', postal: '8021', city: 'Zürich' },
      'glarner': { street: 'Abläsch 8', postal: '8762', city: 'Schwanden' },
      'glarner krankenversicherung': { street: 'Abläsch 8', postal: '8762', city: 'Schwanden' },
      'helsana': { street: 'Postfach', postal: '8081', city: 'Zürich' },
      'helsana versicherungen ag': { street: 'Postfach', postal: '8081', city: 'Zürich' },
      'klug': { street: 'Gubelstrasse 22', postal: '6300', city: 'Zug' },
      'krankenkasse klug': { street: 'Gubelstrasse 22', postal: '6300', city: 'Zug' },
      'kpt': { street: 'Postfach', postal: '3001', city: 'Bern' },
      'kpt krankenkasse ag': { street: 'Postfach', postal: '3001', city: 'Bern' },
      'kpt/cpt': { street: 'Postfach', postal: '3001', city: 'Bern' },
      'birchmeier': { street: 'Hauptstrasse 22', postal: '5444', city: 'Künten' },
      'krankenkasse birchmeier': { street: 'Hauptstrasse 22', postal: '5444', city: 'Künten' },
      'luzerner hinterland': { street: 'Luzernstrasse 19', postal: '6144', city: 'Zell LU' },
      'krankenkasse luzerner hinterland': { street: 'Luzernstrasse 19', postal: '6144', city: 'Zell LU' },
      'slkk': { street: 'Hofwiesenstrasse 370', postal: '8050', city: 'Zürich' },
      'krankenkasse slkk': { street: 'Hofwiesenstrasse 370', postal: '8050', city: 'Zürich' },
      'steffisburg': { street: 'Unterdorfstrasse 37', postal: '3612', city: 'Steffisburg' },
      'krankenkasse steffisburg': { street: 'Unterdorfstrasse 37', postal: '3612', city: 'Steffisburg' },
      'visperterminen': { street: 'Dorfstrasse 66', postal: '3932', city: 'Visperterminen' },
      'krankenkasse visperterminen': { street: 'Dorfstrasse 66', postal: '3932', city: 'Visperterminen' },
      'wädenswil': { street: 'Industriestrasse 15', postal: '8820', city: 'Wädenswil' },
      'krankenkasse wädenswil': { street: 'Industriestrasse 15', postal: '8820', city: 'Wädenswil' },
      'mutuel': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'mutuel assurance maladie sa': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'groupe mutuel': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'easy sana (groupe mutuel)': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'ökk': { street: 'Bahnhofstrasse 13', postal: '7302', city: 'Landquart' },
      'oekk': { street: 'Bahnhofstrasse 13', postal: '7302', city: 'Landquart' },
      'ökk kranken- und unfallversicherungen ag': { street: 'Bahnhofstrasse 13', postal: '7302', city: 'Landquart' },
      'philos': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'philos (groupe mutuel)': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'philos assurance maladie sa': { street: 'Rue des Cèdres 5', postal: '1919', city: 'Martigny' },
      'rhenusana': { street: 'Widnauerstrasse 69', postal: '9435', city: 'Heerbrugg' },
      'sana24': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 16' },
      'sanavals': { street: 'Valéstrasse 146E', postal: '7132', city: 'Vals' },
      'sanavals gesundheitskasse': { street: 'Valéstrasse 146E', postal: '7132', city: 'Vals' },
      'sanitas': { street: 'Jägergasse 3', postal: '8021', city: 'Zürich' },
      'sanitas grundversicherungen ag': { street: 'Jägergasse 3', postal: '8021', city: 'Zürich' },
      'sanitas krankenversicherung': { street: 'Jägergasse 3', postal: '8021', city: 'Zürich' },
      'sodalis': { street: 'Balfrinstr. 15', postal: '3930', city: 'Visp' },
      'sodalis gesundheitsgruppe': { street: 'Balfrinstr. 15', postal: '3930', city: 'Visp' },
      'sumiswalder': { street: 'Spitalstrasse 47', postal: '3454', city: 'Sumiswald' },
      'sumiswalder krankenkasse': { street: 'Spitalstrasse 47', postal: '3454', city: 'Sumiswald' },
      'swica': { street: 'Römerstrasse 38', postal: '8400', city: 'Winterthur' },
      'swica krankenversicherung ag': { street: 'Römerstrasse 38', postal: '8400', city: 'Winterthur' },
      'sympany': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' },
      'vivao sympany ag': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' },
      'vivao': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' },
      'moove (sympany)': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' },
      'kolping (sympany)': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' },
      'visana': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 16' },
      'visana services ag': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 16' },
      'vita': { street: 'Bahnhofstrasse 33', postal: '7130', city: 'Ilanz' },
      'vita surselva': { street: 'Bahnhofstrasse 33', postal: '7130', city: 'Ilanz' },
      'vivacare': { street: 'Weltpoststrasse 19', postal: '3000', city: 'Bern 16' },
      'compact': { street: 'Bundesplatz 15', postal: '6002', city: 'Luzern' },
      'ingenbohl': { street: 'Paracelsuspark 2', postal: '6047', city: 'Kastanienbaum' },
      'kvf': { street: 'Weingartenstrasse 38', postal: '8810', city: 'Horgen' },
      'prezisa': { street: 'Rue St-Martin 26', postal: '1003', city: 'Lausanne' },
      'progrès': { street: 'Rue St-Martin 26', postal: '1003', city: 'Lausanne' },
      'provita': { street: 'Rue St-Martin 26', postal: '1003', city: 'Lausanne' },
      'stoffel mels': { street: 'Grossfeldstrasse 79', postal: '8887', city: 'Mels' },
      'supra': { street: 'Peter Merian-Weg 4', postal: '4002', city: 'Basel' }
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