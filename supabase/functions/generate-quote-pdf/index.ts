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
  heure_debut?: string;
  heure_fin?: string;
  description: string;
  prix_horaire?: number;
  total: number;
}

// Brand colors (Matching the Invoice Design)
const COLORS = {
  salmon: [247, 155, 117], // #F79B75
  sage: [129, 183, 169],   // #81B7A9
  lavender: [210, 199, 255], // #D2C7FF
  textDark: [45, 55, 72],  // #2D3748
  textGray: [113, 128, 150], // #718096
  bgLight: [255, 249, 245], // #FFF9F5
  white: [255, 255, 255],
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
    console.log('Generating premium quote PDF for:', quoteId);

    // 1. Fetch Data
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select(`
        *,
        clients (
          nom, prenom, email, telephone, adresse, code_postal, ville
        )
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('Error fetching quote:', quoteError);
      throw new Error('Devis introuvable');
    }

    // Fetch company info
    const { data: companyData } = await supabase.from('company_info').select('*').single();
    const company = companyData || {
      denomination_sociale: 'Garde-Malade et Babysitting',
      adresse_siege: 'Rue Emile Dury 164',
      numero_tva: 'BE74293324792',
      telephone: '+971 58 598 4937',
      email: 'contact@nannysitting.be',
      site_web: 'www.nannysitting.be',
      iban: '',
      logo_url: null
    };

    console.log('Company info loaded:', {
      denomination: company.denomination_sociale,
      tva: company.numero_tva,
      iban: company.iban,
      has_logo: !!company.logo_url
    });

    const lignes = quote.lignes as QuoteLine[] || [];
    const clientName = quote.clients 
      ? `${quote.clients.prenom} ${quote.clients.nom}` 
      : 'Client';
    
    // 2. Initialize PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // --- HELPER FUNCTIONS ---
    const setFontBrand = (style: 'bold' | 'normal' | 'light' = 'normal', size = 10, color = COLORS.textDark) => {
      doc.setFont("helvetica", style);
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
    };

    // --- DESIGN ELEMENT: HEADER BACKGROUNDS ---
    // Top strip
    doc.setFillColor(COLORS.salmon[0], COLORS.salmon[1], COLORS.salmon[2]);
    doc.rect(0, 0, pageWidth, 4, 'F');

    // Organic Shapes (Blobs simulation using circles with lighter colors for transparency effect)
    doc.setFillColor(252, 234, 226); // Light salmon
    doc.circle(pageWidth, 0, 60, 'F'); 

    doc.setFillColor(229, 242, 238); // Light sage
    doc.circle(0, 40, 40, 'F'); 

    // --- HEADER CONTENT ---
    let yPos = 30;

    // Logo (Text based)
    setFontBrand('bold', 28, COLORS.textDark);
    doc.text("NannySitting", margin, yPos);
    
    // Slogan
    setFontBrand('normal', 10, COLORS.salmon);
    doc.text("Plus qu'une garde, une bulle de sérénité", margin, yPos + 6);

    // Company Info
    yPos += 25;
    setFontBrand('bold', 9, COLORS.textDark);
    doc.text(company.denomination_sociale || 'Garde-Malade et Babysitting', margin, yPos);
    setFontBrand('normal', 9, COLORS.textGray);
    doc.text(company.adresse_siege || '', margin, yPos + 5);
    doc.text(`TVA: ${company.numero_tva || ''}`, margin, yPos + 10);
    doc.text(`Tel: ${company.telephone || ''}`, margin, yPos + 15);
    if (company.email && company.email !== 'contact@nannysitting.be') {
      doc.text(`Email: ${company.email}`, margin, yPos + 20);
    }
    if (company.iban) {
      doc.text(`IBAN: ${company.iban}`, margin, yPos + 25);
    }

    // Quote Title & Number
    const rightMargin = pageWidth - margin;
    setFontBrand('bold', 32, [226, 232, 240]); 
    doc.text("DEVIS", rightMargin, 30, { align: 'right' });

    // Quote Number Pill
    doc.setFillColor(COLORS.salmon[0], COLORS.salmon[1], COLORS.salmon[2]);
    doc.roundedRect(rightMargin - 60, 35, 60, 10, 5, 5, 'F');
    setFontBrand('bold', 12, COLORS.white);
    doc.text(`N° ${quote.numero || 'PROJET'}`, rightMargin - 5, 41.5, { align: 'right' });

    // --- CLIENT CARD ---
    yPos = 85;
    
    // Background Card
    doc.setFillColor(COLORS.bgLight[0], COLORS.bgLight[1], COLORS.bgLight[2]);
    doc.setDrawColor(254, 215, 170); 
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPos, 90, 45, 3, 3, 'FD');

    // Label
    setFontBrand('bold', 8, COLORS.sage);
    doc.text("DEVIS POUR", margin + 5, yPos - 3);

    // Content
    setFontBrand('bold', 11, COLORS.textDark);
    doc.text(clientName, margin + 5, yPos + 10);
    
    setFontBrand('normal', 10, COLORS.textGray);
    const clientAddress = quote.clients ? quote.clients.adresse : '';
    const clientCity = quote.clients ? `${quote.clients.code_postal} ${quote.clients.ville}` : '';
    doc.text(clientAddress || '', margin + 5, yPos + 18);
    doc.text(clientCity || '', margin + 5, yPos + 24);
    
    // Contact info
    if (quote.clients?.email) {
      setFontBrand('normal', 8, COLORS.textGray);
      doc.text(`Email: ${quote.clients.email}`, margin + 5, yPos + 34);
    }
    if (quote.clients?.telephone) {
      setFontBrand('normal', 8, COLORS.textGray);
      doc.text(`Tel: ${quote.clients.telephone}`, margin + 5, yPos + 40);
    }

    // --- DATES ---
    const dateX = 130;
    const dateY = yPos + 5;
    
    setFontBrand('normal', 10, COLORS.textGray);
    doc.text("Date du devis", dateX, dateY);
    setFontBrand('bold', 10, COLORS.textDark);
    const dateEmission = new Date(quote.created_at!).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    doc.text(dateEmission, rightMargin, dateY, { align: 'right' });

    // Ligne separator
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    doc.line(dateX, dateY + 4, rightMargin, dateY + 4);

    setFontBrand('normal', 10, COLORS.textGray);
    doc.text("Valable jusqu'au", dateX, dateY + 12);
    setFontBrand('bold', 10, COLORS.salmon);
    if (quote.date_validite) {
      const dateValidite = new Date(quote.date_validite).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      doc.text(dateValidite, rightMargin, dateY + 12, { align: 'right' });
    } else {
      doc.text('-', rightMargin, dateY + 12, { align: 'right' });
    }

    // Note box
    if (quote.notes) {
      doc.setFillColor(249, 250, 251); // Gray 50
      doc.roundedRect(dateX, dateY + 20, rightMargin - dateX, 15, 2, 2, 'F');
      setFontBrand('normal', 8, COLORS.textGray);
      const noteLines = doc.splitTextToSize(`Notes: ${quote.notes}`, rightMargin - dateX - 6);
      doc.text(noteLines.slice(0, 2), dateX + 3, dateY + 28);
    }

    // --- TABLE ---
    yPos = 145;

    // Header Background
    doc.setFillColor(COLORS.sage[0], COLORS.sage[1], COLORS.sage[2]);
    doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 2, 2, 'F');

    // Headers Text
    setFontBrand('bold', 9, COLORS.white);
    doc.text("DATE", margin + 5, yPos + 6.5);
    doc.text("HORAIRES", margin + 40, yPos + 6.5);
    doc.text("DESCRIPTION", margin + 80, yPos + 6.5);
    doc.text("PRIX/H", pageWidth - 45, yPos + 6.5, { align: 'right' });
    doc.text("TOTAL", rightMargin - 5, yPos + 6.5, { align: 'right' });

    yPos += 10;

    // Rows
    lignes.forEach((ligne, index) => {
      // Check page break
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = 20;
        
        // Re-draw header on new page
        doc.setFillColor(COLORS.sage[0], COLORS.sage[1], COLORS.sage[2]);
        doc.roundedRect(margin, yPos, pageWidth - (margin * 2), 10, 2, 2, 'F');
        setFontBrand('bold', 9, COLORS.white);
        doc.text("DATE", margin + 5, yPos + 6.5);
        doc.text("HORAIRES", margin + 40, yPos + 6.5);
        doc.text("DESCRIPTION", margin + 80, yPos + 6.5);
        doc.text("PRIX/H", pageWidth - 45, yPos + 6.5, { align: 'right' });
        doc.text("TOTAL", rightMargin - 5, yPos + 6.5, { align: 'right' });
        yPos += 10;
      }

      // Zebra striping
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252); // Very light gray
        doc.rect(margin, yPos, pageWidth - (margin * 2), 10, 'F');
      }

      // Subtle row separator
      doc.setDrawColor(245, 245, 245);
      doc.setLineWidth(0.1);
      doc.line(margin, yPos + 10, pageWidth - margin, yPos + 10);

      setFontBrand('normal', 9, COLORS.textDark);
      
      // Date
      const dateLine = new Date(ligne.date).toLocaleDateString('fr-FR');
      doc.text(dateLine, margin + 5, yPos + 6.5);

      // Horaires
      const horaires = ligne.heure_debut && ligne.heure_fin 
        ? `${ligne.heure_debut.slice(0,5)} - ${ligne.heure_fin.slice(0,5)}` 
        : '-';
      setFontBrand('normal', 9, COLORS.textGray);
      doc.text(horaires, margin + 40, yPos + 6.5);

      // Description (Truncate if too long)
      setFontBrand('bold', 9, COLORS.textDark);
      let desc = ligne.description;
      if (desc.length > 35) desc = desc.substring(0, 32) + '...';
      doc.text(desc, margin + 80, yPos + 6.5);

      // Prix/h
      setFontBrand('normal', 9, COLORS.textGray);
      const prix = ligne.prix_horaire ? `${ligne.prix_horaire.toFixed(2)} €` : '-';
      doc.text(prix, pageWidth - 45, yPos + 6.5, { align: 'right' });

      // Total Line
      setFontBrand('bold', 9, COLORS.salmon);
      doc.text(`${ligne.total.toFixed(2)} €`, rightMargin - 5, yPos + 6.5, { align: 'right' });

      yPos += 10;
    });

    // --- TOTALS SECTION ---
    yPos += 10;
    const totalsX = pageWidth - 80;

    // Total HT
    setFontBrand('normal', 10, COLORS.textGray);
    doc.text("Total HT", totalsX, yPos);
    setFontBrand('bold', 10, COLORS.textDark);
    doc.text(`${quote.montant_ht?.toFixed(2) || '0.00'} €`, rightMargin, yPos, { align: 'right' });

    yPos += 8;
    
    // TVA
    setFontBrand('normal', 10, COLORS.textGray);
    doc.text(`TVA (${quote.tva || 0}%)`, totalsX, yPos);
    setFontBrand('bold', 10, COLORS.textDark);
    const montantTva = ((quote.montant_ttc || 0) - (quote.montant_ht || 0));
    doc.text(`${montantTva.toFixed(2)} €`, rightMargin, yPos, { align: 'right' });

    // Separator
    yPos += 5;
    doc.setDrawColor(COLORS.sage[0], COLORS.sage[1], COLORS.sage[2]);
    doc.setLineWidth(0.5);
    doc.line(totalsX, yPos, rightMargin, yPos);

    // Total TTC
    yPos += 10;
    setFontBrand('bold', 14, COLORS.textDark);
    doc.text("Total TTC", totalsX, yPos);
    setFontBrand('bold', 16, COLORS.salmon);
    doc.text(`${quote.montant_ttc?.toFixed(2) || '0.00'} €`, rightMargin, yPos, { align: 'right' });

    // --- FOOTER ---
    const footerY = pageHeight - 20;
    
    // Decorative bottom gradient bar
    doc.setFillColor(COLORS.salmon[0], COLORS.salmon[1], COLORS.salmon[2]);
    doc.rect(0, pageHeight - 2, pageWidth / 2, 2, 'F');
    doc.setFillColor(COLORS.lavender[0], COLORS.lavender[1], COLORS.lavender[2]);
    doc.rect(pageWidth / 2, pageHeight - 2, pageWidth / 2, 2, 'F');

    // Footer separator line
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    setFontBrand('normal', 8, COLORS.textGray);
    const footerText = `${company.site_web || 'www.nannysitting.be'}  |  ${company.email || 'contact@nannysitting.be'}`;
    doc.text(footerText, pageWidth / 2, footerY, { align: 'center' });
    
    doc.setFontSize(7);
    doc.setTextColor(200, 200, 200);
    doc.text("DEVIS VALABLE 30 JOURS SAUF MENTION CONTRAIRE", pageWidth / 2, footerY + 5, { align: 'center' });

    // Page number
    const pageCount = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(COLORS.textGray[0], COLORS.textGray[1], COLORS.textGray[2]);
    doc.text(`Page 1 sur ${pageCount}`, rightMargin, footerY, { align: 'right' });

    // 3. Return PDF as base64 data URI
    const pdfBase64 = doc.output('datauristring');
    
    console.log('Premium branded quote PDF generated successfully');

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
