import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendInvoiceRequest {
  invoiceId: string;
  email: string;
}

interface InvoiceLine {
  date: string;
  heure_debut: string;
  heure_fin: string;
  description: string;
  prix_horaire: number;
  total: number;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { invoiceId, email }: SendInvoiceRequest = await req.json();
    console.log('Sending invoice email:', { invoiceId, email });

    // Fetch invoice with client info
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        clients (
          nom,
          prenom,
          email
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      throw new Error('Facture introuvable');
    }

    // Fetch company info
    const { data: company, error: companyError } = await supabase
      .from('company_info')
      .select('*')
      .single();

    if (companyError) {
      console.error('Error fetching company info:', companyError);
    }

    const lignes = invoice.lignes as InvoiceLine[] || [];
    const clientName = invoice.clients 
      ? `${invoice.clients.prenom} ${invoice.clients.nom}` 
      : 'Client';

    // Generate HTML for invoice lines
    const lignesHtml = lignes.map((ligne: InvoiceLine) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${ligne.date}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${ligne.heure_debut} - ${ligne.heure_fin}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${ligne.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${ligne.prix_horaire.toFixed(2)} €</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600;">${ligne.total.toFixed(2)} €</td>
      </tr>
    `).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Votre facture NannySitting</title>
        <style>
          /* Import de la police Quicksand */
          @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap');

          /* Reset styles pour compatibilité email */
          body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
          img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
          a { text-decoration: none; }
          
          /* Styles Responsive */
          @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FFF9F5; font-family: 'Quicksand', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2D3748;">

        <!-- Wrapper Principal -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF9F5;">
          <tr>
            <td align="center" style="padding: 40px 0;">
              
              <!-- Conteneur Blanc (Carte) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                
                <!-- En-tête Texte (Logo pur sans icône) -->
                <tr>
                  <td align="center" style="padding: 40px 0 20px 0;">
                    <!-- Logo Texte -->
                    <h1 style="margin: 0; font-family: 'Quicksand', sans-serif; font-size: 32px; color: #2D3748; font-weight: 700;">NannySitting</h1>
                    <!-- Slogan -->
                    <p style="margin: 5px 0 0 0; font-family: 'Quicksand', sans-serif; color: #F79B75; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Plus qu'une garde, une bulle de sérénité</p>
                  </td>
                </tr>

                <!-- Ligne de séparation douce -->
                <tr>
                  <td align="center">
                    <div style="height: 2px; width: 80%; background: linear-gradient(to right, #ffffff, #F79B75, #ffffff); opacity: 0.3;"></div>
                  </td>
                </tr>

                <!-- Corps du message -->
                <tr>
                  <td class="mobile-padding" style="padding: 40px 50px;">
                    <h1 style="margin: 0 0 20px 0; font-family: 'Quicksand', sans-serif; font-size: 24px; color: #2D3748; font-weight: 700; text-align: center;">Bonjour ${clientName},</h1>
                    
                    <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4A5568; text-align: center; font-family: 'Quicksand', sans-serif;">
                      J'espère que vous allez bien et que vos enfants se portent à merveille. ✨<br><br>
                      Veuillez trouver ci-joint votre facture correspondant aux prestations de garde du mois écoulé.
                    </p>

                    <!-- Carte Récapitulative de la Facture -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF5F0; border-radius: 12px; margin: 30px 0;">
                      <tr>
                        <td style="padding: 25px; text-align: center;">
                          
                          <!-- Numéro Facture -->
                          <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 12px; font-weight: bold; text-transform: uppercase; font-family: 'Quicksand', sans-serif;">Facture N°</p>
                          <p style="margin: 0 0 20px 0; color: #2D3748; font-size: 16px; font-weight: bold; font-family: 'Quicksand', sans-serif;">${invoice.numero}</p>
                          
                          <!-- Montant -->
                          <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 12px; font-weight: bold; text-transform: uppercase; font-family: 'Quicksand', sans-serif;">Montant à régler</p>
                          <p style="margin: 0 0 20px 0; color: #F79B75; font-size: 32px; font-weight: bold; font-family: 'Quicksand', sans-serif;">${invoice.montant_ttc?.toFixed(2)} €</p>
                          
                          <!-- Date d'échéance -->
                          <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 12px; font-weight: bold; text-transform: uppercase; font-family: 'Quicksand', sans-serif;">Date d'échéance</p>
                          <p style="margin: 0; color: #2D3748; font-size: 16px; font-weight: bold; font-family: 'Quicksand', sans-serif;">${invoice.date_echeance ? new Date(invoice.date_echeance).toLocaleDateString('fr-FR') : 'Non spécifiée'}</p>

                        </td>
                      </tr>
                    </table>

                    <p style="font-size: 16px; color: #2D3748; text-align: center; margin-bottom: 30px; font-family: 'Quicksand', sans-serif; font-weight: 500;">
                      📎 Vous trouverez le détail complet dans le fichier PDF en pièce jointe.
                    </p>
                    
                    <p style="font-size: 14px; color: #718096; text-align: center; margin-bottom: 10px; font-family: 'Quicksand', sans-serif;">
                      Merci de procéder au règlement avant la date d'échéance indiquée.
                    </p>

                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #2D3748; padding: 30px; text-align: center;">
                    <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px; font-weight: bold; font-family: 'Quicksand', sans-serif;">NannySitting</p>
                    <p style="margin: 0 0 20px 0; color: #A0AEC0; font-size: 12px; font-family: 'Quicksand', sans-serif;">Garde-Malade et Babysitting • Rue Emile Dury 164</p>
                    
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
                      <tr>
                        <td style="padding: 0 10px;">
                          <a href="mailto:contact@nannysitting.be" style="color: #F79B75; text-decoration: none; font-size: 12px; font-family: 'Quicksand', sans-serif;">Nous contacter</a>
                        </td>
                        <td style="padding: 0 10px;">
                          <a href="https://www.nannysitting.be" style="color: #F79B75; text-decoration: none; font-size: 12px; font-family: 'Quicksand', sans-serif;">Site Web</a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0 0 0; color: #718096; font-size: 10px; font-family: 'Quicksand', sans-serif;">
                      © 2025 NannySitting. Tous droits réservés.
                    </p>
                  </td>
                </tr>

              </table>
              
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container">
                <tr>
                  <td align="center" style="padding-top: 20px;">
                    <p style="font-size: 10px; color: #A0AEC0; font-family: 'Quicksand', sans-serif;">Ce message a été envoyé automatiquement.</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
    `;

    // Generate PDF with beautiful branding
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // ==================== HEADER WITH BRAND COLORS ====================
    // Top decorative band with salmon color
    doc.setFillColor(252, 159, 113); // salmon
    doc.rect(0, 0, pageWidth, 8, 'F');
    
    // Decorative circles
    doc.setFillColor(244, 232, 255); // lavender
    doc.circle(pageWidth - 20, 15, 12, 'F');
    doc.setFillColor(138, 186, 174); // sage
    doc.circle(15, 12, 8, 'F');
    
    // Company name - large and bold
    doc.setFontSize(28);
    doc.setTextColor(252, 159, 113); // salmon
    doc.setFont('helvetica', 'bold');
    doc.text('NannySitting', 20, 25);
    
    // Tagline
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'italic');
    doc.text('Plus qu\'une garde, une bulle de sérénité', 20, 31);
    
    // FACTURE title
    doc.setFontSize(32);
    doc.setTextColor(46, 54, 69); // dark text
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURE', pageWidth - 20, 25, { align: 'right' });
    
    // Invoice number in salmon color
    doc.setFontSize(14);
    doc.setTextColor(252, 159, 113); // salmon
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.numero, pageWidth - 20, 32, { align: 'right' });
    
    // ==================== COMPANY & CLIENT INFO BOXES ====================
    let yPos = 50;
    
    // Company info box with sage border
    doc.setDrawColor(138, 186, 174); // sage
    doc.setLineWidth(0.5);
    doc.roundedRect(20, yPos, 80, 35, 3, 3, 'S');
    
    doc.setFontSize(9);
    doc.setTextColor(252, 159, 113); // salmon
    doc.setFont('helvetica', 'bold');
    doc.text('DE', 25, yPos + 6);
    
    doc.setFontSize(10);
    doc.setTextColor(46, 54, 69); // dark text
    doc.setFont('helvetica', 'bold');
    if (company) {
      doc.text(company.denomination_sociale, 25, yPos + 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
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
    doc.setFillColor(244, 232, 255); // lavender
    doc.roundedRect(pageWidth - 100, yPos, 80, 35, 3, 3, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(252, 159, 113); // salmon
    doc.setFont('helvetica', 'bold');
    doc.text('FACTURÉ À', pageWidth - 95, yPos + 6);
    
    doc.setFontSize(10);
    doc.setTextColor(46, 54, 69); // dark text
    doc.setFont('helvetica', 'bold');
    doc.text(clientName, pageWidth - 95, yPos + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
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
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    
    // Date
    doc.setFillColor(252, 159, 113); // salmon
    doc.circle(22, yPos - 1, 1.5, 'F');
    doc.text('Date de facturation', 27, yPos);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(46, 54, 69); // dark text
    doc.text(new Date(invoice.created_at!).toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: 'long', 
      year: 'numeric' 
    }), 70, yPos);
    
    // Due date
    if (invoice.date_echeance) {
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.setFillColor(138, 186, 174); // sage
      doc.circle(22, yPos - 1, 1.5, 'F');
      doc.text('Date d\'échéance', 27, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 54, 69); // dark text
      doc.text(new Date(invoice.date_echeance).toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }), 70, yPos);
    }
    
    // ==================== DECORATIVE LINE ====================
    yPos = 115;
    doc.setDrawColor(252, 159, 113); // salmon
    doc.setLineWidth(1);
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    // ==================== TABLE HEADER ====================
    yPos = 125;
    
    // Gradient header background
    doc.setFillColor(252, 159, 113); // salmon
    doc.roundedRect(20, yPos - 6, pageWidth - 40, 10, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255); // white
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
        doc.setFillColor(252, 159, 113); // salmon
        doc.roundedRect(20, yPos - 6, pageWidth - 40, 10, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255); // white
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
      
      doc.setTextColor(46, 54, 69); // dark text
      doc.text(new Date(ligne.date).toLocaleDateString('fr-FR'), 25, yPos);
      doc.text(`${ligne.heure_debut} - ${ligne.heure_fin}`, 52, yPos);
      
      // Wrap description if too long
      const descLines = doc.splitTextToSize(ligne.description, 55);
      doc.text(descLines[0], 85, yPos);
      
      doc.text(`${ligne.prix_horaire.toFixed(2)} €`, 145, yPos);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(138, 186, 174); // sage
      doc.text(`${ligne.total.toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      
      yPos += 7;
    });
    
    // ==================== TOTALS SECTION ====================
    yPos += 5;
    
    // Decorative line before totals
    doc.setDrawColor(138, 186, 174); // sage
    doc.setLineWidth(0.5);
    doc.line(pageWidth - 100, yPos, pageWidth - 20, yPos);
    
    yPos += 8;
    
    // Subtotal
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.setFont('helvetica', 'normal');
    doc.text('Montant HT', pageWidth - 75, yPos);
    doc.setTextColor(46, 54, 69); // dark text
    doc.setFont('helvetica', 'bold');
    doc.text(`${invoice.montant_ht?.toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
    
    yPos += 6;
    
    // TVA
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`TVA (${invoice.tva}%)`, pageWidth - 75, yPos);
    doc.setTextColor(46, 54, 69); // dark text
    doc.setFont('helvetica', 'bold');
    doc.text(`${((invoice.montant_ttc || 0) - (invoice.montant_ht || 0)).toFixed(2)} €`, pageWidth - 25, yPos, { align: 'right' });
    
    yPos += 10;
    
    // Total box with salmon gradient
    doc.setFillColor(252, 159, 113); // salmon
    doc.roundedRect(pageWidth - 100, yPos - 8, 80, 15, 3, 3, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255); // white
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
      doc.setFillColor(244, 232, 255); // lavender
      const notesLines = doc.splitTextToSize(invoice.notes, pageWidth - 50);
      const notesHeight = notesLines.length * 4 + 10;
      doc.roundedRect(20, yPos - 5, pageWidth - 40, notesHeight, 3, 3, 'F');
      
      doc.setFontSize(10);
      doc.setTextColor(252, 159, 113); // salmon
      doc.setFont('helvetica', 'bold');
      doc.text('Notes', 25, yPos);
      
      doc.setFontSize(9);
      doc.setTextColor(46, 54, 69); // dark text
      doc.setFont('helvetica', 'normal');
      doc.text(notesLines, 25, yPos + 5);
    }
    
    // ==================== FOOTER ====================
    const footerY = pageHeight - 20;
    
    // Footer decorative line
    doc.setDrawColor(244, 232, 255); // lavender
    doc.setLineWidth(0.5);
    doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
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
      doc.setTextColor(100, 100, 100);
      doc.text(`Page ${i} sur ${pageCount}`, pageWidth - 20, footerY, { align: 'right' });
    }
    
    // Get PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    
    // Configure SMTP client for Gmail
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: Deno.env.get("GMAIL_USER") ?? "",
          password: Deno.env.get("GMAIL_APP_PASSWORD") ?? "",
        },
      },
    });

    // Convert base64 to Uint8Array for attachment
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));

    await client.send({
      from: company?.email || Deno.env.get("GMAIL_USER") || "contact@nannysitting.be",
      to: email,
      subject: `Facture ${invoice.numero}${company ? ` - ${company.denomination_sociale}` : ''}`,
      html: htmlContent,
      attachments: [
        {
          filename: `Facture-${invoice.numero}.pdf`,
          content: pdfBytes,
          contentType: "application/pdf",
          encoding: "binary",
        }
      ]
    });

    await client.close();

    console.log('Invoice email sent successfully via Gmail SMTP');

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error('Error in send-invoice-email function:', error);
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
