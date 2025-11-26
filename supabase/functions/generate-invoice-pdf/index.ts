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
    console.log('Generating PDF for invoice:', invoiceId);

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
    const { data: company } = await supabase
      .from('company_info')
      .select('*')
      .single();

    const lignes = invoice.lignes as InvoiceLine[] || [];
    const clientName = invoice.clients 
      ? `${invoice.clients.prenom} ${invoice.clients.nom}` 
      : 'Client';

    // Create PDF
    const doc = new jsPDF();
    
    // Set font
    doc.setFont('helvetica');
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(40, 40, 40);
    doc.text('FACTURE', 105, 20, { align: 'center' });
    
    // Company info
    if (company) {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(company.denomination_sociale, 20, 35);
      if (company.adresse_siege) {
        doc.text(company.adresse_siege, 20, 40);
      }
      if (company.numero_tva) {
        doc.text(`TVA: ${company.numero_tva}`, 20, 45);
      }
    }
    
    // Invoice info
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(`Facture N°: ${invoice.numero}`, 20, 60);
    doc.setFontSize(10);
    doc.text(`Date: ${new Date(invoice.created_at!).toLocaleDateString('fr-FR')}`, 20, 67);
    if (invoice.date_echeance) {
      doc.text(`Échéance: ${new Date(invoice.date_echeance).toLocaleDateString('fr-FR')}`, 20, 74);
    }
    
    // Client info
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text('Facturé à:', 140, 60);
    doc.setFontSize(10);
    doc.text(clientName, 140, 67);
    if (invoice.clients?.email) {
      doc.text(invoice.clients.email, 140, 74);
    }
    
    // Line separator
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 85, 190, 85);
    
    // Table header
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
    
    // Table rows
    doc.setFontSize(9);
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
    
    // Line separator
    yPos += 5;
    doc.setDrawColor(200, 200, 200);
    doc.line(20, yPos, 190, yPos);
    
    // Totals
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
    
    // Notes
    if (invoice.notes) {
      yPos += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text('Notes:', 20, yPos);
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, 20, yPos + 5);
    }
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.text(`Page ${i} sur ${pageCount}`, 105, 285, { align: 'center' });
    }
    
    // Generate PDF as base64
    const pdfBase64 = doc.output('datauristring');
    
    console.log('PDF generated successfully');

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
