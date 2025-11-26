import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";
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
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f8f9fa; padding: 30px; border-radius: 8px; margin-bottom: 30px; }
            .invoice-info { display: flex; justify-content: space-between; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background-color: #f1f5f9; padding: 12px; text-align: left; font-weight: 600; }
            .totals { margin-top: 30px; }
            .total-row { display: flex; justify-content: space-between; padding: 10px 0; }
            .total-final { font-size: 1.2em; font-weight: bold; border-top: 2px solid #333; padding-top: 15px; }
            .footer { margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.9em; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #1f2937;">Facture ${invoice.numero}</h1>
              ${company ? `<p style="margin: 10px 0 0 0;">${company.denomination_sociale}</p>` : ''}
            </div>

            <div class="invoice-info">
              <div>
                <h3 style="margin: 0 0 10px 0;">Facturé à:</h3>
                <p style="margin: 5px 0;"><strong>${clientName}</strong></p>
              </div>
              <div style="text-align: right;">
                <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(invoice.created_at!).toLocaleDateString('fr-FR')}</p>
                ${invoice.date_echeance ? `<p style="margin: 5px 0;"><strong>Échéance:</strong> ${new Date(invoice.date_echeance).toLocaleDateString('fr-FR')}</p>` : ''}
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Horaires</th>
                  <th>Description</th>
                  <th style="text-align: right;">Prix/h</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${lignesHtml}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Montant HT:</span>
                <span>${invoice.montant_ht?.toFixed(2)} €</span>
              </div>
              <div class="total-row">
                <span>TVA (${invoice.tva}%):</span>
                <span>${((invoice.montant_ttc || 0) - (invoice.montant_ht || 0)).toFixed(2)} €</span>
              </div>
              <div class="total-row total-final">
                <span>Montant TTC:</span>
                <span>${invoice.montant_ttc?.toFixed(2)} €</span>
              </div>
            </div>

            ${invoice.notes ? `<div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
              <h3 style="margin: 0 0 10px 0;">Notes:</h3>
              <p style="margin: 0;">${invoice.notes}</p>
            </div>` : ''}

            <div class="footer">
              ${company ? `
                <p><strong>${company.denomination_sociale}</strong></p>
                ${company.adresse_siege ? `<p>${company.adresse_siege}</p>` : ''}
                ${company.numero_tva ? `<p>TVA: ${company.numero_tva}</p>` : ''}
                ${company.email ? `<p>Email: ${company.email}</p>` : ''}
                ${company.telephone ? `<p>Tél: ${company.telephone}</p>` : ''}
              ` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email using Resend
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    
    // Generate PDF
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text('FACTURE', 105, 20, { align: 'center' });
    
    if (company) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(company.denomination_sociale, 20, 35);
      if (company.adresse_siege) doc.text(company.adresse_siege, 20, 40);
      if (company.numero_tva) doc.text(`TVA: ${company.numero_tva}`, 20, 45);
    }
    
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`Facture N°: ${invoice.numero}`, 20, 60);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(invoice.created_at!).toLocaleDateString('fr-FR')}`, 20, 67);
    if (invoice.date_echeance) {
      doc.text(`Échéance: ${new Date(invoice.date_echeance).toLocaleDateString('fr-FR')}`, 20, 74);
    }
    
    doc.setFontSize(11);
    doc.text('Facturé à:', 140, 60);
    doc.setFontSize(10);
    doc.text(clientName, 140, 67);
    if (invoice.clients?.email) doc.text(invoice.clients.email, 140, 74);
    
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 85, 190, 85);
    
    let yPos = 95;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, 170, 8, 'F');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text('Date', 22, yPos);
    doc.text('Horaires', 50, yPos);
    doc.text('Description', 85, yPos);
    doc.text('Prix/h', 140, yPos);
    doc.text('Total', 170, yPos);
    
    yPos += 10;
    doc.setTextColor(40, 40, 40);
    lignes.forEach((ligne: InvoiceLine) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(new Date(ligne.date).toLocaleDateString('fr-FR'), 22, yPos);
      doc.text(`${ligne.heure_debut}-${ligne.heure_fin}`, 50, yPos);
      doc.text(ligne.description.substring(0, 25), 85, yPos);
      doc.text(`${ligne.prix_horaire.toFixed(2)} €`, 140, yPos);
      doc.text(`${ligne.total.toFixed(2)} €`, 170, yPos);
      yPos += 7;
    });
    
    yPos += 5;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text('Montant HT:', 140, yPos);
    doc.text(`${invoice.montant_ht?.toFixed(2)} €`, 170, yPos);
    yPos += 7;
    doc.text(`TVA (${invoice.tva}%):`, 140, yPos);
    doc.text(`${((invoice.montant_ttc || 0) - (invoice.montant_ht || 0)).toFixed(2)} €`, 170, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Montant TTC:', 140, yPos);
    doc.text(`${invoice.montant_ttc?.toFixed(2)} €`, 170, yPos);
    
    if (invoice.notes) {
      yPos += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Notes:', 20, yPos);
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, 20, yPos + 5);
    }
    
    // Get PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];
    
    const { error: emailError } = await resend.emails.send({
      from: company?.email || "onboarding@resend.dev",
      to: [email],
      subject: `Facture ${invoice.numero}${company ? ` - ${company.denomination_sociale}` : ''}`,
      html: htmlContent,
      attachments: [
        {
          filename: `Facture-${invoice.numero}.pdf`,
          content: pdfBase64,
        }
      ]
    });

    if (emailError) {
      console.error('Error sending email:', emailError);
      throw emailError;
    }

    console.log('Invoice email sent successfully');

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
