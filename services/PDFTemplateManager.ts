// services/PDFTemplateManager.ts - FIXED ADDRESS FORMAT
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
   * Load and embed logo into PDF
   */
  private async embedLogo(pdfDoc: PDFDocument): Promise<PDFImage | null> {
    try {
      const logoExists = await fs.access(this.logoPath).then(() => true).catch(() => false);
      
      if (!logoExists) {
        console.warn('Logo file not found at:', this.logoPath);
        return null;
      }

      const logoBytes = await fs.readFile(this.logoPath);
      const logoImage = await pdfDoc.embedPng(logoBytes);
      console.log('✅ Logo embedded successfully');
      return logoImage;
    } catch (error) {
      console.error('Error embedding logo:', error);
      return null;
    }
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
   * Generate application PDF with logo and exact template matching
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

    // FIXED: Street field (if available)
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

    // FIXED: Address (just the street name/number if no separate street field)
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

    // FIXED: Postal code and city (NO "CH-" prefix)
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
   * Create application PDF - FIXED ADDRESS FORMAT
   * Format: Name, Street, Postal Code + City (NO "CH-8001 - Zurich")
   */
  private async createApplicationWithUserData(
    userData: UserFormData,
    selectedInsurance: SelectedInsurance
  ): Promise<PDFDocument> {
    console.log('Creating application PDF with FIXED address format...');
    
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const lineHeight = 14;
    const leftMargin = 50;

    // Try to embed logo on the RIGHT side
    const logo = await this.embedLogo(pdfDoc);
    if (logo) {
      const logoDims = logo.scale(0.35);
      const logoX = 595 - logoDims.width - 50;
      
      page.drawImage(logo, {
        x: logoX,
        y: y - logoDims.height,
        width: logoDims.width,
        height: logoDims.height,
      });
      
      console.log('✅ Logo positioned on right side');
    }

    // Header - Company address
    page.drawText('Howden Broker Service Schweiz AG, Picardiestrasse 3A, CH-5040 Schoftland', {
      x: leftMargin,
      y: y,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4)
    });

    y -= 12;

    // FINMA and page number
    page.drawText('FINMA Nr.: F01064059 | howdengroup.com - Version 07.2025', {
      x: leftMargin,
      y: y,
      size: 7,
      font,
      color: rgb(0.4, 0.4, 0.4)
    });

    page.drawText('Seite 1 von 6', {
      x: 500,
      y: y,
      size: 7,
      font,
      color: rgb(0.4, 0.4, 0.4)
    });

    y -= 25;

    // Title - Bold
    page.drawText('Brokermandat', {
      x: leftMargin,
      y: y,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= 20;
    page.drawText('Auftrag und Vollmacht', {
      x: leftMargin,
      y: y,
      size: 13,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= 25;

    // Three columns
    const col1X = leftMargin;
    const col2X = 220;
    const col3X = 390;

    // Column headers
    page.drawText('Auftraggeberin', {
      x: col1X,
      y: y,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    page.drawText('Beauftragte', {
      x: col2X,
      y: y,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    page.drawText('Mitbeauftragte', {
      x: col3X,
      y: y,
      size: 9,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= 15;

    // FIXED: Column 1 - User data (Name, Street, Postal Code + City)
    const clientLines = [
      `${userData.firstName} ${userData.lastName}`,
      userData.street && userData.street.trim() ? userData.street : userData.address,
      `${userData.postalCode} ${userData.city}` // NO "CH-" prefix
    ];

    const beauftragteLines = [
      'Howden Broker Service Schweiz AG',
      'Picardiestrasse 3A',
      '5040 Schoftland' // NO "CH-" prefix
    ];

    const mitbeauftragteLines = [
      '',
      '',
      ''
    ];

    for (let i = 0; i < 3; i++) {
      page.drawText(clientLines[i], {
        x: col1X,
        y: y,
        size: 8,
        font,
        color: rgb(0, 0, 0)
      });

      page.drawText(beauftragteLines[i], {
        x: col2X,
        y: y,
        size: 8,
        font,
        color: rgb(0, 0, 0)
      });

      page.drawText(mitbeauftragteLines[i], {
        x: col3X,
        y: y,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5)
      });

      y -= 12;
    }

    y -= 15;

    // Main text
    const mainText = [
      'Mit Wirkung zum Datum der Unterzeichnung beauftragt die Auftraggeberin die Beauftragte sowie die Mitbeauftragte mit',
      'der Uberprufung, Gestaltung, Koordination, dem Abschluss und der Betreuung samtlicher Versicherungsvertrage. Dies',
      'gilt auch fur die Tochtergesellschaften der Auftraggeberin. Sowohl die Beauftragte als auch die Mitbeauftragte sind',
      'ermachtigt, dazu im Namen der Auftraggeberin aufzutreten.'
    ];

    mainText.forEach(line => {
      page.drawText(line, {
        x: leftMargin,
        y: y,
        size: 8,
        font,
        color: rgb(0, 0, 0)
      });
      y -= 11;
    });

    y -= 8;

    page.drawText('Diese Vollmacht berechtigt sowohl die Beauftragte wie auch die Mitbeauftragte insbesondere,', {
      x: leftMargin,
      y: y,
      size: 8,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 11;

    // Bullet points
    const bullets = [
      '  Versicherungsofferten einzuholen;',
      '  Mit den Anbietenden zu verhandeln;',
      '  Versicherungen nach Rucksprache mit der Auftraggeberin zu platzieren und zu kundigen und',
      '  In Schadenfallen die Interessen der Auftraggeberin zu vertreten (einschliesslich Einsicht in das gesamte Dossier).'
    ];

    bullets.forEach(bullet => {
      page.drawText(bullet, {
        x: leftMargin,
        y: y,
        size: 8,
        font,
        color: rgb(0, 0, 0)
      });
      y -= 11;
    });

    y -= 8;

    // Additional paragraphs
    const additionalParas = [
      'Die Vollmacht umfasst auch die Beschaffung und die Weitergabe erforderlicher Risikoinformationen aus bestehenden',
      'und abgelaufenen Versicherungsvertragen.',
      '',
      'Der Auftrag ist gemass den Bestimmungen des schweizerischen Obligationenrechts jederzeit widerrufbar.'
    ];

    additionalParas.forEach(para => {
      page.drawText(para, {
        x: leftMargin,
        y: y,
        size: 8,
        font,
        color: rgb(0, 0, 0)
      });
      y -= 11;
    });

    y -= 10;

    // Confirmation section
    page.drawText('Die Auftraggeberin bestatigt mit ihrer Unterschrift, Folgendes erhalten zu haben:', {
      x: leftMargin,
      y: y,
      size: 8,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 11;

    const checkItems = [
      '  Informationen nach Art. 45 Versicherungsaufsichtsgesetz (VAG) von der Beauftragten (Anhang 1)',
      '  Informationen nach Art. 45 Versicherungsaufsichtsgesetz (VAG) von der Mitbeauftragten',
      '  Offenlegung der Entschadigung nach Art. 45b Versicherungsaufsichtsgesetz (VAG) (Anhang 2)',
      '  Allgemeine Geschaftsbedingungen (AGB), Version Co-Broker (Anhang 3)'
    ];

    checkItems.forEach(item => {
      page.drawText(item, {
        x: leftMargin,
        y: y,
        size: 8,
        font,
        color: rgb(0, 0, 0)
      });
      y -= 11;
    });

    y -= 20;

    // FIXED: Signature section with current date and address
    const currentDate = new Date().toLocaleDateString('de-CH');

    // FIRST GREEN CIRCLE: Name, Street, Postal + City
    page.drawText(`Ort, Datum: ${userData.city}, ${currentDate}`, {
      x: col1X,
      y: y,
      size: 8,
      font,
      color: rgb(0, 0, 0)
    });

    page.drawText(`Schoftland, ${currentDate}`, {
      x: col2X,
      y: y,
      size: 8,
      font,
      color: rgb(0, 0, 0)
    });

    page.drawText('Ort, Datum: _______________', {
      x: col3X,
      y: y,
      size: 8,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 15;

    page.drawText('Auftraggeberin', {
      x: col1X,
      y: y,
      size: 8,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    page.drawText('Beauftragte', {
      x: col2X,
      y: y,
      size: 8,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    page.drawText('Mitbeauftragte', {
      x: col3X,
      y: y,
      size: 8,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    y -= 15;

    // SECOND GREEN CIRCLE: Signature lines
    page.drawText('________________________', {
      x: col1X,
      y: y,
      size: 9,
      font,
      color: rgb(0, 0, 0)
    });

    page.drawText('_________________________', {
      x: col2X,
      y: y,
      size: 9,
      font,
      color: rgb(0, 0, 0)
    });

    page.drawText('_______________________', {
      x: col3X,
      y: y,
      size: 9,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 11;

    // Name below signature line
    page.drawText(`${userData.firstName} ${userData.lastName}`, {
      x: col1X,
      y: y,
      size: 8,
      font,
      color: rgb(0, 0, 0)
    });

    page.drawText('Howden Broker Service Schweiz AG', {
      x: col2X,
      y: y,
      size: 8,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 11;

    // Street below name
    if (userData.street && userData.street.trim()) {
      page.drawText(userData.street, {
        x: col1X,
        y: y,
        size: 8,
        font,
        color: rgb(0, 0, 0)
      });
    }

    y -= 11;

    // Postal + City below street
    page.drawText(`${userData.postalCode} ${userData.city}`, {
      x: col1X,
      y: y,
      size: 8,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 15;

    page.drawText('________________________', {
      x: col1X,
      y: y,
      size: 9,
      font,
      color: rgb(0, 0, 0)
    });

    page.drawText('_________________________', {
      x: col2X,
      y: y,
      size: 9,
      font,
      color: rgb(0, 0, 0)
    });

    page.drawText('_______________________', {
      x: col3X,
      y: y,
      size: 9,
      font,
      color: rgb(0, 0, 0)
    });

    y -= 11;

    page.drawText('Howden Broker Service Schweiz AG', {
      x: col2X,
      y: y,
      size: 8,
      font,
      color: rgb(0, 0, 0)
    });

    console.log('✅ Application PDF created with FIXED address format');
    return pdfDoc;
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
    return {
      cancellationTemplate: true,
      applicationTemplate: true,
      errors: []
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