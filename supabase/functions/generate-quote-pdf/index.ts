import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateQuotePdfRequest {
  quoteId: string;
}

interface QuoteLine {
  date: string;
  heure_debut: string;
  heure_fin: string;
  description: string;
  prix_horaire: number;
  total: number;
}

// Brand colors matching the new design
const BRAND_COLORS = {
  salmon: { r: 247, g: 155, b: 117 }, // #F79B75
  sage: { r: 129, g: 183, b: 169 }, // #81B7A9
  lavender: { r: 210, g: 199, b: 255 }, // #D2C7FF
  darkText: { r: 45, g: 55, b: 72 }, // #2D3748
  lightGray: { r: 156, g: 163, b: 175 }, // #9CA3AF
  lightBg: { r: 255, g: 249, b: 245 }, // #FFF9F5
  white: { r: 255, g: 255, b: 255 },
  gray50: { r: 249, g: 250, b: 251 }, // #F9FAFB
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { quoteId }: GenerateQuotePdfRequest = await req.json();
    console.log('Generating new branded quote PDF for:', quoteId);

    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        clients (
          nom,
          prenom,
          email,
          telephone,
          adresse,
          code_postal,
          ville
        )
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('Error fetching quote:', quoteError);
      throw new Error('Devis introuvable');
    }

    const { data: company } = await supabase
      .from('company_info')
      .select('*')
      .single();

    const lignes = quote.lignes as QuoteLine[] || [];
    const clientName = quote.clients 
      ? `${quote.clients.prenom} ${quote.clients.nom}` 
      : 'Client';

    // Create PDF with new design
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // ==================== TOP COLOR BAND ====================
    doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.rect(0, 0, pageWidth, 4, 'F');
    
    // ==================== DECORATIVE SHAPES ====================
    // Top right salmon circle (opacity effect via lighter color)
    doc.setFillColor(252, 234, 226); // Lighter salmon for opacity effect
    doc.circle(pageWidth - 30, 15, 15, 'F');
    
    // Top left sage circle
    doc.setFillColor(229, 242, 238); // Lighter sage for opacity effect
    doc.circle(15, 15, 12, 'F');
    
    // ==================== HEADER ====================
    let yPos = 20;
    
    // Logo: NannySitting
    doc.setFontSize(28);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text('NannySitting', 20, yPos);
    
    // Slogan
    doc.setFontSize(9);
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.setFont('helvetica', 'normal');
    doc.text('Plus qu\'une garde, une bulle de sérénité', 20, yPos + 4);
    
    // Company details
    doc.setFontSize(8);
    doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
    doc.setFont('helvetica', 'normal');
    let companyY = yPos + 12;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.text('Garde-Malade et Babysitting', 20, companyY);
    companyY += 4;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
    if (company) {
      if (company.adresse_siege) {
        doc.text(company.adresse_siege, 20, companyY);
        companyY += 4;
      }
      if (company.numero_tva) {
        doc.text(`TVA: ${company.numero_tva}`, 20, companyY);
        companyY += 4;
      }
      if (company.telephone) {
        doc.text(`Tél: ${company.telephone}`, 20, companyY);
      }
    }
    
    // DEVIS title (big and light)
    doc.setFontSize(45);
    doc.setTextColor(226, 232, 240); // Very light gray
    doc.setFont('helvetica', 'bold');
    doc.text('DEVIS', pageWidth - 20, yPos + 5, { align: 'right' });
    
    // Quote number badge
    yPos += 10;
    doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    const quoteNumWidth = doc.getTextWidth(`N° ${quote.numero}`) + 8;
    doc.roundedRect(pageWidth - 20 - quoteNumWidth, yPos - 3, quoteNumWidth, 6, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(BRAND_COLORS.white.r, BRAND_COLORS.white.g, BRAND_COLORS.white.b);
    doc.setFont('helvetica', 'bold');
    doc.text(`N° ${quote.numero}`, pageWidth - 20 - quoteNumWidth / 2, yPos, { align: 'center' });
    
    // ==================== CLIENT & DATES SECTION ====================
    yPos = 60;
    const boxWidth = 85;
    const boxHeight = 40;
    
    // Client box (left) with light background
    doc.setFillColor(BRAND_COLORS.lightBg.r, BRAND_COLORS.lightBg.g, BRAND_COLORS.lightBg.b);
    doc.setDrawColor(247, 192, 163); // Light salmon border
    doc.setLineWidth(0.3);
    doc.roundedRect(20, yPos, boxWidth, boxHeight, 4, 4, 'FD');
    
    doc.setFontSize(8);
    doc.setTextColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
    doc.setFont('helvetica', 'bold');
    doc.text('POUR', 25, yPos + 6);
    
    doc.setFontSize(11);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text(clientName, 25, yPos + 12);
    
    doc.setFontSize(8);
    doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
    doc.setFont('helvetica', 'normal');
    let clientY = yPos + 17;
    if (quote.clients?.adresse) {
      doc.text(quote.clients.adresse, 25, clientY);
      clientY += 3.5;
    }
    if (quote.clients?.code_postal && quote.clients?.ville) {
      doc.text(`${quote.clients.code_postal} ${quote.clients.ville}`, 25, clientY);
      clientY += 3.5;
    }
    
    // Separator line in client box
    if (clientY < yPos + boxHeight - 8) {
      doc.setDrawColor(247, 192, 163);
      doc.setLineWidth(0.2);
      doc.line(25, clientY + 1, 100, clientY + 1);
      clientY += 4;
    }
    
    if (quote.clients?.email) {
      doc.setFontSize(7);
      doc.text(`✉ ${quote.clients.email}`, 25, clientY);
      clientY += 3;
    }
    if (quote.clients?.telephone) {
      doc.setFontSize(7);
      doc.text(`☎ ${quote.clients.telephone}`, 25, clientY);
    }
    
    // Dates section (right)
    const rightX = pageWidth - 20 - boxWidth;
    let dateY = yPos + 8;
    
    // Date du devis
    doc.setFontSize(8);
    doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
    doc.setFont('helvetica', 'normal');
    doc.text('Date du devis', rightX, dateY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.text(new Date(quote.created_at!).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    }), pageWidth - 20, dateY, { align: 'right' });
    
    // Separator
    dateY += 5;
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    doc.line(rightX, dateY, pageWidth - 20, dateY);
    
    // Date de validité
    dateY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
    doc.text('Date de validité', rightX, dateY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    if (quote.date_validite) {
      doc.text(new Date(quote.date_validite).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }), pageWidth - 20, dateY, { align: 'right' });
    } else {
      doc.text('-', pageWidth - 20, dateY, { align: 'right' });
    }
    
    // Notes box
    if (quote.notes) {
      dateY += 8;
      doc.setFillColor(BRAND_COLORS.gray50.r, BRAND_COLORS.gray50.g, BRAND_COLORS.gray50.b);
      doc.roundedRect(rightX, dateY - 3, boxWidth, 12, 2, 2, 'F');
      doc.setFontSize(7);
      doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
      doc.setFont('helvetica', 'normal');
      const notesLines = doc.splitTextToSize(`Notes: ${quote.notes}`, boxWidth - 4);
      doc.text(notesLines.slice(0, 2), rightX + 2, dateY);
    }
    
    // ==================== TABLE ====================
    yPos = 110;
    
    // Table header with sage background
    doc.setFillColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
    doc.roundedRect(20, yPos, pageWidth - 40, 8, 2, 2, 'F');
    
    doc.setFontSize(8);
    doc.setTextColor(BRAND_COLORS.white.r, BRAND_COLORS.white.g, BRAND_COLORS.white.b);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE', 24, yPos + 5);
    doc.text('HORAIRES', 48, yPos + 5);
    doc.text('DESCRIPTION', 80, yPos + 5);
    doc.text('PRIX/H', 140, yPos + 5, { align: 'right' });
    doc.text('TOTAL', pageWidth - 24, yPos + 5, { align: 'right' });
    
    // Table rows
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    lignes.forEach((ligne: QuoteLine, index: number) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
        
        // Repeat header
        doc.setFillColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
        doc.roundedRect(20, yPos, pageWidth - 40, 8, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(BRAND_COLORS.white.r, BRAND_COLORS.white.g, BRAND_COLORS.white.b);
        doc.setFont('helvetica', 'bold');
        doc.text('DATE', 24, yPos + 5);
        doc.text('HORAIRES', 48, yPos + 5);
        doc.text('DESCRIPTION', 80, yPos + 5);
        doc.text('PRIX/H', 140, yPos + 5, { align: 'right' });
        doc.text('TOTAL', pageWidth - 24, yPos + 5, { align: 'right' });
        yPos += 10;
        doc.setFont('helvetica', 'normal');
      }
      
      // Alternating row background with hover effect
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(20, yPos - 3, pageWidth - 40, 7, 'F');
      
      // Row separator
      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.1);
      doc.line(20, yPos + 4, pageWidth - 20, yPos + 4);
      
      doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
      doc.text(new Date(ligne.date).toLocaleDateString('fr-FR'), 24, yPos);
      
      doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
      doc.text(`${ligne.heure_debut} - ${ligne.heure_fin}`, 48, yPos);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
      const descLines = doc.splitTextToSize(ligne.description, 55);
      doc.text(descLines[0], 80, yPos);
      doc.setFont('helvetica', 'normal');
      
      doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
      doc.text(`${ligne.prix_horaire.toFixed(2)} €`, 140, yPos, { align: 'right' });
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
      doc.text(`${ligne.total.toFixed(2)} €`, pageWidth - 24, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      
      yPos += 7;
    });
    
    // ==================== TOTALS ====================
    yPos += 8;
    const totalsX = pageWidth - 80;
    
    // Total HT
    doc.setFontSize(9);
    doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
    doc.setFont('helvetica', 'normal');
    doc.text('Total HT', totalsX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.text(`${quote.montant_ht?.toFixed(2)} €`, pageWidth - 20, yPos, { align: 'right' });
    
    yPos += 5;
    
    // TVA
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
    doc.text(`TVA (${quote.tva}%)`, totalsX, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(`${((quote.montant_ttc || 0) - (quote.montant_ht || 0)).toFixed(2)} €`, pageWidth - 20, yPos, { align: 'right' });
    
    // Separator line
    yPos += 2;
    doc.setDrawColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
    doc.setLineWidth(0.2);
    doc.line(totalsX, yPos, pageWidth - 20, yPos);
    
    yPos += 6;
    
    // Total TTC
    doc.setFontSize(12);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text('Total TTC', totalsX, yPos);
    
    doc.setFontSize(16);
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.text(`${quote.montant_ttc?.toFixed(2)} €`, pageWidth - 20, yPos, { align: 'right' });
    
    // ==================== FOOTER ====================
    const footerY = pageHeight - 20;
    
    // Bottom gradient bar
    doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.rect(0, pageHeight - 2, pageWidth / 2, 2, 'F');
    doc.setFillColor(BRAND_COLORS.lavender.r, BRAND_COLORS.lavender.g, BRAND_COLORS.lavender.b);
    doc.rect(pageWidth / 2, pageHeight - 2, pageWidth / 2, 2, 'F');
    
    // Footer separator
    doc.setDrawColor(BRAND_COLORS.gray50.r, BRAND_COLORS.gray50.g, BRAND_COLORS.gray50.b);
    doc.setLineWidth(0.3);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
    
    // Footer content
    doc.setFontSize(7);
    doc.setTextColor(BRAND_COLORS.lightGray.r, BRAND_COLORS.lightGray.g, BRAND_COLORS.lightGray.b);
    doc.setFont('helvetica', 'normal');
    
    if (company?.site_web || company?.email) {
      let footerLeft = '';
      if (company.site_web) footerLeft += `🌐 ${company.site_web}`;
      if (company.email) footerLeft += (footerLeft ? '   ✉ ' : '✉ ') + company.email;
      doc.text(footerLeft, 20, footerY);
    }
    
    // Page number
    const pageCount = doc.getNumberOfPages();
    doc.text(`Page 1 sur ${pageCount}`, pageWidth - 20, footerY, { align: 'right' });
    
    // Bottom message
    doc.setFontSize(6);
    doc.setTextColor(210, 210, 210);
    doc.text('MERCI POUR VOTRE CONFIANCE', pageWidth / 2, footerY + 4, { align: 'center' });
    
    // Generate PDF as base64
    const pdfBase64 = doc.output('datauristring');
    
    console.log('New branded quote PDF generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        pdf: pdfBase64
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-quote-pdf function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
