import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') as string;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactFormRequest {
  name: string;
  email: string;
  phone: string;
  service: string;
  message: string;
}

const createEmailHTML = (data: ContactFormRequest) => {
  // Split name into firstName and lastName
  const nameParts = data.name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #FFF9F5; font-family: 'Verdana', sans-serif;">

  <!-- Main Container -->
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFF9F5; padding: 40px 0;">
    <tr>
      <td align="center">
        
        <!-- Card -->
        <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); max-width: 90%;">
          
          <!-- Header Brandé (Style Site Web) -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 30px 20px 30px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <!-- Logo Container -->
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <!-- Icone Cercle -->
                  <td style="padding-right: 10px;">
                    <div style="width: 40px; height: 40px; background-color: #F79B75; border-radius: 50%; text-align: center; line-height: 40px; color: #ffffff; font-size: 20px;">
                      👶
                    </div>
                  </td>
                  <!-- Texte Logo -->
                  <td style="font-family: 'Trebuchet MS', sans-serif; font-size: 24px; font-weight: bold; color: #2D3748;">
                    NannySitting
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Intro Message -->
          <tr>
            <td style="padding: 30px 40px 20px 40px;">
              <h2 style="margin: 0 0 10px 0; color: #2D3748; font-size: 22px; text-align: center;">Nouvelle demande de contact ! ✨</h2>
              <p style="margin: 0; color: #718096; line-height: 1.5; text-align: center;">
                Une famille est intéressée par vos services. Voici les détails pour votre CRM.
              </p>
            </td>
          </tr>

          <!-- Details Section -->
          <tr>
            <td style="padding: 0 40px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                
                <!-- Row: Prénom & Nom (Séparés) -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <!-- Champ Prénom -->
                        <td width="50%" style="vertical-align: top; padding-right: 10px;">
                          <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Prénom</p>
                          <div style="background-color: #FFF9F5; padding: 10px; border-radius: 8px; color: #2D3748; font-weight: 600;">
                            ${firstName}
                          </div>
                        </td>
                        <!-- Champ Nom -->
                        <td width="50%" style="vertical-align: top; padding-left: 10px;">
                          <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Nom</p>
                          <div style="background-color: #FFF9F5; padding: 10px; border-radius: 8px; color: #2D3748; font-weight: 600;">
                            ${lastName}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Row: Service -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Service souhaité</p>
                    <span style="display: inline-block; border: 2px solid #F79B75; color: #F79B75; padding: 8px 16px; border-radius: 50px; font-size: 14px; font-weight: bold;">
                      ${data.service}
                    </span>
                  </td>
                </tr>

                <!-- Row: Coordonnées -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td width="50%" style="vertical-align: top; padding-right: 10px;">
                          <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Email</p>
                          <a href="mailto:${data.email}" style="margin: 0; color: #2D3748; text-decoration: none; border-bottom: 1px dotted #2D3748; font-size: 14px;">${data.email}</a>
                        </td>
                        <td width="50%" style="vertical-align: top; padding-left: 10px;">
                          <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Téléphone</p>
                          <a href="tel:${data.phone}" style="margin: 0; color: #2D3748; text-decoration: none; font-weight: bold; font-size: 14px;">${data.phone}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Row: Message Box -->
                <tr>
                  <td style="padding-top: 10px; padding-bottom: 30px;">
                    <p style="margin: 0 0 10px 0; color: #81B7A9; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Détails & Message</p>
                    <div style="background-color: #F8FAFC; border-left: 4px solid #F79B75; padding: 20px; border-radius: 4px; color: #4A5568; line-height: 1.6; font-style: italic;">
                      "${data.message || 'Aucun message spécifique'}"
                    </div>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Action Button Area -->
          <tr>
            <td align="center" style="padding: 0 40px 40px 40px;">
              <a href="mailto:${data.email}?subject=Réponse à votre demande NannySitting - ${data.service}" style="background-color: #F79B75; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 50px; font-weight: bold; display: inline-block; font-family: sans-serif;">
                Répondre à la famille
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #2D3748; padding: 20px; text-align: center;">
              <p style="margin: 0; color: #A0AEC0; font-size: 12px;">
                © 2025 NannySitting - Données prêtes pour automatisation.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, service, message }: ContactFormRequest = await req.json();

    console.log('Sending contact form email:', { name, email, service });

    // Send email using Resend API directly
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'NannySitting <onboarding@resend.dev>',
        to: ['contact@nannysitting.be'],
        reply_to: email,
        subject: `Nouvelle demande de ${name} - ${service}`,
        html: createEmailHTML({ name, email, phone, service, message }),
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Error from Resend:', resendData);
      throw new Error(resendData.message || 'Failed to send email');
    }

    console.log('Email sent successfully:', resendData);

    return new Response(
      JSON.stringify({ success: true, data: resendData }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in send-contact-email function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
