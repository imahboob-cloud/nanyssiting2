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
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Nouvelle demande de contact</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif; background-color: #f6f9fc;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f6f9fc; padding: 40px 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #8B9C7C 0%, #7A8A6B 100%); padding: 40px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                      📧 Nouvelle demande de contact
                    </h1>
                    <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.9;">
                      NannySitting
                    </p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 24px;">
                      Vous avez reçu une nouvelle demande via le formulaire de contact de NannySitting.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 30px 0;">
                    
                    <!-- Contact Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                      <tr>
                        <td style="padding: 12px 0;">
                          <p style="margin: 0 0 5px 0; color: #8B5CF6; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                            👤 NOM
                          </p>
                          <p style="margin: 0; color: #333333; font-size: 16px;">
                            ${data.name}
                          </p>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 12px 0;">
                          <p style="margin: 0 0 5px 0; color: #8B5CF6; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                            📧 EMAIL
                          </p>
                          <p style="margin: 0; color: #333333; font-size: 16px;">
                            <a href="mailto:${data.email}" style="color: #8B5CF6; text-decoration: none;">
                              ${data.email}
                            </a>
                          </p>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 12px 0;">
                          <p style="margin: 0 0 5px 0; color: #8B5CF6; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                            📱 TÉLÉPHONE
                          </p>
                          <p style="margin: 0; color: #333333; font-size: 16px;">
                            <a href="tel:${data.phone}" style="color: #8B5CF6; text-decoration: none;">
                              ${data.phone}
                            </a>
                          </p>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 12px 0;">
                          <p style="margin: 0 0 5px 0; color: #8B5CF6; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                            🎯 SERVICE DEMANDÉ
                          </p>
                          <p style="margin: 0; color: #333333; font-size: 16px;">
                            ${data.service}
                          </p>
                        </td>
                      </tr>
                      
                      <tr>
                        <td style="padding: 12px 0;">
                          <p style="margin: 0 0 5px 0; color: #8B5CF6; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
                            💬 MESSAGE
                          </p>
                          <div style="margin: 0; color: #333333; font-size: 16px; background-color: #f6f9fc; padding: 16px; border-radius: 6px; border: 1px solid #e1e8ed; white-space: pre-wrap;">
                            ${data.message || 'Aucun message'}
                          </div>
                        </td>
                      </tr>
                    </table>
                    
                    <hr style="border: none; border-top: 1px solid #e1e8ed; margin: 30px 0;">
                    
                    <!-- Footer -->
                    <p style="margin: 0; color: #8898aa; font-size: 14px; text-align: center; line-height: 24px;">
                      NannySitting - Service de garde d'enfants professionnel<br>
                      <a href="mailto:contact@nannysitting.be" style="color: #8B5CF6; text-decoration: none;">contact@nannysitting.be</a>
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
