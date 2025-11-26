import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const supabaseServiceClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

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

    // Generate PDF using service role client
    console.log("Generating PDF for quote:", quote.id);
    const { data: pdfData, error: pdfError } = await supabaseServiceClient.functions.invoke(
      'generate-quote-pdf',
      {
        body: { quoteId: quote.id },
      }
    );

    if (pdfError) {
      console.error("Error generating PDF:", pdfError);
      throw new Error("Impossible de générer le PDF du devis");
    }

    if (!pdfData?.pdf) {
      throw new Error("PDF non généré");
    }

    console.log("PDF generated successfully");

    // Convert data URI to base64
    const base64Pdf = pdfData.pdf.split(',')[1];

    // Prepare template data
    const clientName = `${quote.clients?.prenom || ''} ${quote.clients?.nom || ''}`.trim();
    const dateValidite = quote.date_validite 
      ? new Date(quote.date_validite).toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })
      : 'Non spécifiée';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre devis NannySitting</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap');
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    a { text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFF9F5; font-family: 'Quicksand', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2D3748;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF9F5;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
          <tr>
            <td align="center" style="padding: 40px 0 20px 0;">
              <h1 style="margin: 0; font-family: 'Quicksand', sans-serif; font-size: 32px; color: #2D3748; font-weight: 700;">NannySitting</h1>
              <p style="margin: 5px 0 0 0; font-family: 'Quicksand', sans-serif; color: #F79B75; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Plus qu'une garde, une bulle de sérénité</p>
            </td>
          </tr>
          <tr>
            <td align="center">
              <div style="height: 2px; width: 80%; background: linear-gradient(to right, #ffffff, #F79B75, #ffffff); opacity: 0.3;"></div>
            </td>
          </tr>
          <tr>
            <td class="mobile-padding" style="padding: 40px 50px;">
              <h1 style="margin: 0 0 20px 0; font-family: 'Quicksand', sans-serif; font-size: 24px; color: #2D3748; font-weight: 700; text-align: center;">Bonjour ${clientName},</h1>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4A5568; text-align: center; font-family: 'Quicksand', sans-serif;">
                Suite à notre échange concernant vos besoins de garde, j'ai le plaisir de vous transmettre votre proposition personnalisée ci-joint. ✨
              </p>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFF5F0; border-radius: 12px; margin: 30px 0;">
                <tr>
                  <td style="padding: 25px; text-align: center;">
                    <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 12px; font-weight: bold; text-transform: uppercase; font-family: 'Quicksand', sans-serif;">Devis N°</p>
                    <p style="margin: 0 0 20px 0; color: #2D3748; font-size: 16px; font-weight: bold; font-family: 'Quicksand', sans-serif;">${quote.numero}</p>
                    <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 12px; font-weight: bold; text-transform: uppercase; font-family: 'Quicksand', sans-serif;">Montant Total</p>
                    <p style="margin: 0 0 20px 0; color: #F79B75; font-size: 32px; font-weight: bold; font-family: 'Quicksand', sans-serif;">${quote.montant_ttc?.toFixed(2)} €</p>
                    <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 12px; font-weight: bold; text-transform: uppercase; font-family: 'Quicksand', sans-serif;">Valable jusqu'au</p>
                    <p style="margin: 0; color: #2D3748; font-size: 16px; font-weight: bold; font-family: 'Quicksand', sans-serif;">${dateValidite}</p>
                  </td>
                </tr>
              </table>
              <p style="font-size: 16px; color: #2D3748; text-align: center; margin-bottom: 30px; font-family: 'Quicksand', sans-serif; font-weight: 500;">
                📎 Vous trouverez le détail complet dans le fichier PDF en pièce jointe.
              </p>
              <p style="font-size: 14px; color: #718096; text-align: center; margin-bottom: 10px; font-family: 'Quicksand', sans-serif;">
                Pour valider ce devis, merci de nous le retourner signé par retour de mail.
              </p>
            </td>
          </tr>
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

    console.log("Sending email to:", email);

    const emailResponse = await resend.emails.send({
      from: company?.email ? `${company.denomination_sociale} <onboarding@resend.dev>` : "NannySitting <onboarding@resend.dev>",
      to: [email],
      subject: `Votre devis NannySitting - N° ${quote.numero}`,
      html: emailHtml,
      attachments: [
        {
          filename: `Devis-${quote.numero}.pdf`,
          content: base64Pdf,
        },
      ],
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
