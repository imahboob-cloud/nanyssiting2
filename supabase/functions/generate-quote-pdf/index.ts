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

// Brand colors in RGB
const BRAND_COLORS = {
  salmon: { r: 252, g: 159, b: 113 },
  sage: { r: 138, g: 186, b: 174 },
  lavender: { r: 244, g: 232, b: 255 },
  darkText: { r: 46, g: 54, b: 69 },
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

    const { quoteId }: GenerateQuotePdfRequest = await req.json();
    console.log('Generating branded PDF for quote:', quoteId);

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
      .maybeSingle();

    const lignes = quote.lignes as QuoteLine[] || [];
    const clientName = quote.clients 
      ? `${quote.clients.prenom} ${quote.clients.nom}` 
      : 'Client';

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Top decorative band
    doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.rect(0, 0, pageWidth, 8, 'F');
    
    // Decorative circles
    doc.setFillColor(BRAND_COLORS.lavender.r, BRAND_COLORS.lavender.g, BRAND_COLORS.lavender.b);
    doc.circle(pageWidth - 20, 15, 12, 'F');
    doc.setFillColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
    doc.circle(15, 12, 8, 'F');
    
    // Company name
    doc.setFontSize(28);
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.setFont('helvetica', 'bold');
    doc.text('NannySitting', 20, 25);
    
    // Tagline
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    doc.setFont('helvetica', 'italic');
    doc.text('Plus qu\'une garde, une bulle de sérénité', 20, 31);
    
    // DEVIS title
    doc.setFontSize(32);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text('DEVIS', pageWidth - 20, 25, { align: 'right' });
    
    // Quote number
    doc.setFontSize(14);
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.text(quote.numero, pageWidth - 20, 32, { align: 'right' });
    
    let yPos = 50;
    
    // Company info box
    doc.setDrawColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPos, 80, 35, 3, 3, 'S');
    
    doc.setFontSize(9);
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.setFont('helvetica', 'bold');
    doc.text('DE', 25, yPos + 6);
    
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
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
    
    // Client info box
    doc.setFillColor(BRAND_COLORS.lavender.r, BRAND_COLORS.lavender.g, BRAND_COLORS.lavender.b);
    doc.roundedRect(pageWidth - 100, yPos, 80, 35, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.setFont('helvetica', 'bold');
    doc.text('POUR', pageWidth - 95, yPos + 6);
    
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.text(clientName, pageWidth - 95, yPos + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    let clientY = yPos + 17;
    if (quote.clients?.email) {
      doc.text(quote.clients.email, pageWidth - 95, clientY);
      clientY += 3.5;
    }
    if (quote.clients?.telephone) {
      doc.text(quote.clients.telephone, pageWidth - 95, clientY);
      clientY += 3.5;
    }
    if (quote.clients?.adresse) {
      const addressLines = doc.splitTextToSize(quote.clients.adresse, 70);
      doc.text(addressLines, pageWidth - 95, clientY);
      clientY += addressLines.length * 3.5;
    }
    if (quote.clients?.code_postal && quote.clients?.ville) {
      doc.text(`${quote.clients.code_postal} ${quote.clients.ville}`, pageWidth - 95, clientY);
    }
    
    yPos = 95;
    
    // Dates
    doc.setFontSize(9);
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.circle(22, yPos - 1, 1.5, 'F');
    doc.text('Date du devis', 27, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.text(new Date(quote.created_at!).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    }), 70, yPos);
    
    if (quote.date_validite) {
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
      doc.setFillColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
      doc.circle(22, yPos - 1, 1.5, 'F');
      doc.text('Date de validité', 27, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
      doc.text(new Date(quote.date_validite).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }), 70, yPos);
    }
    
    yPos = 115;
    doc.setDrawColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.setLineWidth(1);
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    yPos = 125;
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
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    lignes.forEach((ligne: QuoteLine, index: number) => {
      if (yPos > 250) {
        doc.addPage();
        yPos = 30;
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
      
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(20, yPos - 5, pageWidth - 40, 7, 'F');
      }
      
      doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
      doc.text(new Date(ligne.date).toLocaleDateString('fr-FR'), 25, yPos);
      doc.text(`${ligne.heure_debut} - ${ligne.heure_fin}`, 52, yPos);
      const descLines = doc.splitTextToSize(ligne.description, 55);
      doc.text(descLines[0], 85, yPos);
      doc.text(`${ligne.prix_horaire.toFixed(2)} €`, 145, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
      doc.text(`${ligne.total.toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      yPos += 7;
    });
    
    yPos += 5;
    doc.setDrawColor(BRAND_COLORS.sage.r, BRAND_COLORS.sage.g, BRAND_COLORS.sage.b);
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 100, yPos, pageWidth - 20, yPos);
    yPos += 8;
    
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    doc.setFont('helvetica', 'normal');
    doc.text('Montant HT', pageWidth - 75, yPos);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text(`${quote.montant_ht?.toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
    doc.text(`TVA (${quote.tva}%)`, pageWidth - 75, yPos);
    doc.setTextColor(BRAND_COLORS.darkText.r, BRAND_COLORS.darkText.g, BRAND_COLORS.darkText.b);
    doc.setFont('helvetica', 'bold');
    doc.text(`${((quote.montant_ttc || 0) - (quote.montant_ht || 0)).toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
    yPos += 10;
    
    doc.setFillColor(BRAND_COLORS.salmon.r, BRAND_COLORS.salmon.g, BRAND_COLORS.salmon.b);
    doc.roundedRect(pageWidth - 100, yPos - 8, 80, 15, 3, 3, 'F');
    doc.setFontSize(12);
    doc.setTextColor(BRAND_COLORS.white.r, BRAND_COLORS.white.g, BRAND_COLORS.white.b);
    doc.setFont('helvetica', 'bold');
    doc.text('MONTANT TOTAL TTC', pageWidth - 95, yPos);
    doc.setFontSize(16);
    doc.text(`${quote.montant_ttc?.toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
    
    if (quote.notes) {
      yPos += 20;
      if (yPos > 240) {
        doc.addPage();
        yPos = 30;
      }
      doc.setFillColor(BRAND_COLORS.lavender.r, BRAND_COLORS.lavender.g, BRAND_COLORS.lavender.b);
      const notesLines = doc.splitTextToSize(quote.notes, pageWidth - 50);
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
    
    const footerY = pageHeight - 20;
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
    
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(BRAND_COLORS.lightText.r, BRAND_COLORS.lightText.g, BRAND_COLORS.lightText.b);
      doc.text(`Page ${i} sur ${pageCount}`, pageWidth - 20, footerY, { align: 'right' });
    }
    
    const pdfBase64 = doc.output('datauristring');
    console.log('Beautiful branded quote PDF generated successfully');

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
