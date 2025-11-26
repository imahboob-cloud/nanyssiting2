import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateInvoicePdfRequest {
  invoiceId: string;
}

interface InvoiceLine {
  date: string;
  heure_debut: string;
  heure_fin: string;
  description: string;
  prix_horaire: number;
  total: number;
}

// Brand colors in RGB (converted from HSL)
const BRAND_COLORS = {
  salmon: { r: 252, g: 159, b: 113 }, // #FC9F71 - HSL(18, 87%, 73%)
  sage: { r: 138, g: 186, b: 174 }, // #8ABAAE - HSL(164, 28%, 60%)
  lavender: { r: 244, g: 232, b: 255 }, // #F4E8FF - HSL(254, 100%, 89%)
  darkText: { r: 46, g: 54, b: 69 }, // #2E3645
  lightText: { r: 100, g: 100, b: 100 },
  white: { r: 255, g: 255, b: 255 }
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

    const { invoiceId }: GenerateInvoicePdfRequest = await req.json();
    console.log('Generating branded PDF for invoice:', invoiceId);

    // Fetch invoice with client info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
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
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      throw new Error('Facture introuvable');
    }

    // Fetch company info
    const { data: company } = await supabase
      .from('company_info')
      .select('*')
      .single();

    const lignes = invoice.lignes as InvoiceLine[] || [];
    const clientName = invoice.clients 
      ? `${invoice.clients.prenom} ${invoice.clients.nom}` 
      : 'Client';

    // Create PDF with beautiful branding
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // ==================== HEADER WITH BRAND COLORS ====================
    // Top decorative band with salmon color
    doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.rect(0, 0, pageWidth, 8, 'F');
    
    // Decorative circles
    doc.setFillColor(BRAND_COLORS.lavender.r, BRAND_COLORS.lavender.g, BRAND_COLORS.lavender.b);
    doc.circle(pageWidth - 20, 15, 12, 'F');
    doc.setFillColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
    doc.circle(15, 12, 8, 'F');
    
    // Company name - large and bold
    doc.setFontSize(28);
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.setFont('helvetica', 'bold');
    doc.text('NannySitting', 20, 25);
    
    // Tagline
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    doc.setFont('helvetica', 'italic');
    doc.text('Plus qu\'une garde, une bulle de sérénité', 20, 31);
    
    // FACTURE title
    doc.setFontSize(32);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE', pageWidth - 20, 25, { align: 'right' });
    
    // Invoice number in salmon color
    doc.setFontSize(14);
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.numero, pageWidth - 20, 32, { align: 'right' });
    
    // ==================== COMPANY & CLIENT INFO BOXES ====================
    let yPos = 50;
    
    // Company info box with sage border
    doc.setDrawColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPos, 80, 35, 3, 3, 'S');
    
    doc.setFontSize(9);
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.setFont('helvetica', 'bold');
    doc.text('DE', 25, yPos + 6);
    
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    if (company) {
      doc.text(company.denomination_sociale, 25, yPos + 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
      let companyY = yPos + 17;
      if (company.adresse_siege) {
        const lines = doc.splitTextToSize(company.adresse_siege, 70);
        doc.text(lines, 25, companyY);
        companyY += lines.length * 3.5;
      }
      if (company.numero_tva) {
        doc.text(`TVA: ${company.numero_tva}`, 25, companyY);
        companyY += 3.5;
      }
      if (company.telephone) {
        doc.text(`Tél: ${company.telephone}`, 25, companyY);
      }
    }
    
    // Client info box with lavender background
    doc.setFillColor(BRAND_COLORS.lavender.r, BRAND_COLORS.lavender.g, BRAND_COLORS.lavender.b);
    doc.roundedRect(pageWidth - 100, yPos, 80, 35, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURÉ À', pageWidth - 95, yPos + 6);
    
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text(clientName, pageWidth - 95, yPos + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    let clientY = yPos + 17;
    if (invoice.clients?.email) {
      doc.text(invoice.clients.email, pageWidth - 95, clientY);
      clientY += 3.5;
    }
    if (invoice.clients?.telephone) {
      doc.text(invoice.clients.telephone, pageWidth - 95, clientY);
      clientY += 3.5;
    }
    if (invoice.clients?.adresse) {
      const addressLines = doc.splitTextToSize(invoice.clients.adresse, 70);
      doc.text(addressLines, pageWidth - 95, clientY);
      clientY += addressLines.length * 3.5;
    }
    if (invoice.clients?.code_postal && invoice.clients?.ville) {
      doc.text(`${invoice.clients.code_postal} ${invoice.clients.ville}`, pageWidth - 95, clientY);
    }
    
    // ==================== DATES SECTION ====================
    yPos = 95;
    
    // Dates with icons effect
    doc.setFontSize(9);
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    doc.setFont('helvetica', 'normal');
    
    // Date
    doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.circle(22, yPos - 1, 1.5, 'F');
    doc.text('Date de facturation', 27, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.text(new Date(invoice.created_at!).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    }), 70, yPos);
    
    // Due date
    if (invoice.date_echeance) {
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
      doc.setFillColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
      doc.circle(22, yPos - 1, 1.5, 'F');
      doc.text('Date d\'échéance', 27, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
      doc.text(new Date(invoice.date_echeance).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }), 70, yPos);
    }
    
    // ==================== DECORATIVE LINE ====================
    yPos = 115;
    doc.setDrawColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.setLineWidth(1);
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    // ==================== TABLE HEADER ====================
    yPos = 125;
    
    // Gradient header background
    doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.roundedRect(20, yPos - 6, pageWidth - 40, 10, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(BRAND_COLORS.white.r, BRAND_COLORS.white.g, BRAND_COLORS.white.b);
    doc.setFont('helvetica', 'bold');
    doc.text('DATE', 25, yPos);
    doc.text('HORAIRES', 52, yPos);
    doc.text('DESCRIPTION', 85, yPos);
    doc.text('PRIX/H', 145, yPos);
    doc.text('TOTAL', pageWidth - 25, yPos, { align: 'right' });
    
    // ==================== TABLE ROWS ====================
    yPos += 8;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    lignes.forEach((ligne: InvoiceLine, index: number) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
        
        // Repeat header on new page
        doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
        doc.roundedRect(20, yPos - 6, pageWidth - 40, 10, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(BRAND_COLORS.white.r, BRAND_COLORS.white.g, BRAND_COLORS.white.b);
        doc.setFont('helvetica', 'bold');
        doc.text('DATE', 25, yPos);
        doc.text('HORAIRES', 52, yPos);
        doc.text('DESCRIPTION', 85, yPos);
        doc.text('PRIX/H', 145, yPos);
        doc.text('TOTAL', pageWidth - 25, yPos, { align: 'right' });
        yPos += 8;
        doc.setFont('helvetica', 'normal');
      }
      
      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, yPos - 5, pageWidth - 40, 7, 'F');
      }
      
      doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
      doc.text(new Date(ligne.date).toLocaleDateString('fr-FR'), 25, yPos);
      doc.text(`${ligne.heure_debut} - ${ligne.heure_fin}`, 52, yPos);
      
      // Wrap description if too long
      const descLines = doc.splitTextToSize(ligne.description, 55);
      doc.text(descLines[0], 85, yPos);
      
      doc.text(`${ligne.prix_horaire.toFixed(2)} €`, 145, yPos);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
      doc.text(`${ligne.total.toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      
      yPos += 7;
    });
    
    // ==================== TOTALS SECTION ====================
    yPos += 5;
    
    // Decorative line before totals
    doc.setDrawColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 100, yPos, pageWidth - 20, yPos);
    
    yPos += 8;
    
    // Subtotal
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    doc.setFont('helvetica', 'normal');
    doc.text('Montant HT', pageWidth - 75, yPos);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text(`${invoice.montant_ht?.toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
    
    yPos += 6;
    
    // TVA
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    doc.text(`TVA (${invoice.tva}%)`, pageWidth - 75, yPos);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text(`${((invoice.montant_ttc || 0) - (invoice.montant_ht || 0)).toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
    
    yPos += 10;
    
    // Total box with salmon gradient
    doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.roundedRect(pageWidth - 100, yPos - 8, 80, 15, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(BRAND_COLORS.white.r, BRAND_COLORS.white.g, BRAND_COLORS.white.b);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTANT TOTAL TTC', pageWidth - 95, yPos);
    
    doc.setFontSize(16);
    doc.text(`${invoice.montant_ttc?.toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
    
    // ==================== NOTES SECTION ====================
    if (invoice.notes) {
      yPos += 20;
      
      if (yPos > 240) {
        doc.addPage();
        yPos = 30;
      }
      
      // Notes box with lavender background
      doc.setFillColor(BRAND_COLORS.lavender.r, BRAND_COLORS.lavender.g, BRAND_COLORS.lavender.b);
      const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 50);
      const notesHeight = notesLines.length * 4 + 10;
      doc.roundedRect(20, yPos - 5, pageWidth - 40, notesHeight, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes', 25, yPos);
      
      doc.setFontSize(9);
      doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
      doc.setFont('helvetica', 'normal');
      doc.text(notesLines, 25, yPos + 5);
    }
    
    // ==================== FOOTER ====================
    const footerY = pageHeight - 20;
    
    // Footer decorative line
    doc.setDrawColor(BRAND_COLORS.lavender.r, BRAND_COLORS.lavender.g, BRAND_COLORS.lavender.b);
    doc.setLineWidth(0.5);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    doc.setFont('helvetica', 'italic');
    
    if (company?.email || company?.site_web) {
      let footerText = '';
      if (company.email) footerText += company.email;
      if (company.site_web) footerText += (footerText ? ' • ' : '') + company.site_web;
      doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
    }
    
    // Page numbers
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
      doc.text(`Page ${i} sur ${pageCount}`, pageWidth - 20, footerY, { align: 'right' });
    }
    
    // Generate PDF as base64
    const pdfBase64 = doc.output('datauristring');
    
    console.log('Beautiful branded PDF generated successfully');

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
    console.error('Error in generate-invoice-pdf function:', error);
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
