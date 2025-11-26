import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendQuoteRequest {
  quoteId: string;
  email: string;
}

interface QuoteLine {
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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { quoteId, email }: SendQuoteRequest = await req.json();

    console.log("Fetching quote:", quoteId);

    // Fetch quote details with client info
    const { data: quote, error: quoteError } = await supabaseClient
      .from("quotes")
      .select(`
        *,
        clients (
          nom,
          prenom,
          email,
          adresse,
          code_postal,
          ville
        )
      `)
      .eq("id", quoteId)
      .single();

    if (quoteError || !quote) {
      console.error("Error fetching quote:", quoteError);
      throw new Error("Devis introuvable");
    }

    console.log("Quote found:", quote.numero);

    // Fetch company info
    const { data: company } = await supabaseClient
      .from("company_info")
      .select("*")
      .single();

    // Format the quote lines
    const lignes = (quote.lignes as QuoteLine[]) || [];
    const lignesHtml = lignes
      .map(
        (ligne) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${ligne.date}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${ligne.heure_debut} - ${ligne.heure_fin}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${ligne.description || "-"}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${ligne.prix_horaire.toFixed(2)} €</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${ligne.total.toFixed(2)} €</td>
      </tr>
    `
      )
      .join("");

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
            .quote-number { font-size: 24px; font-weight: bold; color: #2563eb; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f8f9fa; padding: 12px; text-align: left; font-weight: 600; }
            .totals { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .total-row { display: flex; justify-content: space-between; margin: 8px 0; }
            .total-amount { font-size: 20px; font-weight: bold; color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              ${company?.denomination_sociale ? `<h2>${company.denomination_sociale}</h2>` : ""}
              ${company?.adresse_siege ? `<p>${company.adresse_siege}</p>` : ""}
              ${company?.numero_tva ? `<p>TVA: ${company.numero_tva}</p>` : ""}
            </div>

            <h1>Devis ${quote.numero}</h1>
            
            <div style="margin: 20px 0;">
              <h3>Client</h3>
              <p>
                ${quote.clients?.prenom} ${quote.clients?.nom}<br>
                ${quote.clients?.adresse ? `${quote.clients.adresse}<br>` : ""}
                ${quote.clients?.code_postal || ""} ${quote.clients?.ville || ""}<br>
                ${quote.clients?.email || ""}
              </p>
            </div>

            ${quote.date_validite ? `<p><strong>Date de validité:</strong> ${new Date(quote.date_validite).toLocaleDateString("fr-FR")}</p>` : ""}

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
                <span>${quote.montant_ht?.toFixed(2)} €</span>
              </div>
              <div class="total-row">
                <span>TVA (${quote.tva}%):</span>
                <span>${((quote.montant_ht || 0) * (quote.tva || 0) / 100).toFixed(2)} €</span>
              </div>
              <div class="total-row" style="border-top: 2px solid #333; padding-top: 10px; margin-top: 10px;">
                <span class="total-amount">Montant TTC:</span>
                <span class="total-amount">${quote.montant_ttc?.toFixed(2)} €</span>
              </div>
            </div>

            ${quote.notes ? `<div style="margin-top: 30px; padding: 15px; background: #f8f9fa; border-radius: 8px;"><h4>Notes</h4><p>${quote.notes}</p></div>` : ""}

            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 14px;">
              <p>Merci de votre confiance !</p>
              ${company?.email ? `<p>Pour toute question: ${company.email}</p>` : ""}
            </div>
          </div>
        </body>
      </html>
    `;

    console.log("Sending email to:", email);

    const emailResponse = await resend.emails.send({
      from: company?.email ? `${company.denomination_sociale} <onboarding@resend.dev>` : "Devis <onboarding@resend.dev>",
      to: [email],
      subject: `Devis ${quote.numero}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-quote-email function:", error);
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
