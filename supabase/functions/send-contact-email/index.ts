import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get('GMAIL_USER') as string;
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD') as string;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContactFormRequest {
  name: string;
  email: string;
  phone: string;
  address?: string;
  postalCode?: string;
  city?: string;
  service: string;
  message: string;
}

const createConfirmationEmailHTML = (data: ContactFormRequest) => {
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
  <title>Demande reçue - NannySitting</title>
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
      .col-mobile { display: block !important; width: 100% !important; padding-bottom: 10px; }
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
          
          <!-- En-tête Texte -->
          <tr>
            <td align="center" style="padding: 40px 0 20px 0;">
              <h1 style="margin: 0; font-family: 'Quicksand', sans-serif; font-size: 32px; color: #2D3748; font-weight: 700;">NannySitting</h1>
              <p style="margin: 5px 0 0 0; font-family: 'Quicksand', sans-serif; color: #F79B75; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Plus qu'une garde, une bulle de sérénité</p>
            </td>
          </tr>

          <!-- Ligne de séparation -->
          <tr>
            <td align="center">
              <div style="height: 2px; width: 80%; background: linear-gradient(to right, #ffffff, #F79B75, #ffffff); opacity: 0.3;"></div>
            </td>
          </tr>

          <!-- Corps du message -->
          <tr>
            <td class="mobile-padding" style="padding: 40px 50px;">
              <h1 style="margin: 0 0 20px 0; font-family: 'Quicksand', sans-serif; font-size: 24px; color: #2D3748; font-weight: 700; text-align: center;">Merci ${firstName}, c'est bien reçu ! ✨</h1>
              
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4A5568; text-align: center; font-family: 'Quicksand', sans-serif;">
                Nous avons bien pris en compte votre demande. Notre équipe coordinatrice l'analyse actuellement avec soin.
              </p>

              <!-- Message important de délai -->
              <div style="background-color: #E6FFFA; border: 1px solid #81B7A9; border-radius: 8px; padding: 15px; margin-bottom: 30px; text-align: center;">
                <p style="margin: 0; color: #2D3748; font-weight: 600; font-size: 14px; font-family: 'Quicksand', sans-serif;">
                  📞 Nous prendrons contact avec vous <span style="color: #F79B75; text-decoration: underline;">dans la journée</span> pour affiner vos besoins.
                </p>
              </div>

              <p style="font-size: 14px; color: #81B7A9; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; text-align: center; font-family: 'Quicksand', sans-serif;">
                Récapitulatif de vos informations
              </p>

              <!-- Tableau Récapitulatif des infos formulaire -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border-radius: 12px; overflow: hidden;">
                
                <!-- Identité -->
                <tr>
                  <td style="padding: 20px 25px; border-bottom: 1px solid #EDF2F7;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td class="col-mobile" width="50%" style="vertical-align: top;">
                          <p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0; text-transform: uppercase; font-weight: bold;">Nom complet</p>
                          <p style="margin: 0; font-size: 15px; color: #2D3748; font-weight: 600;">${firstName} ${lastName}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Contact -->
                <tr>
                  <td style="padding: 20px 25px; border-bottom: 1px solid #EDF2F7;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td class="col-mobile" width="50%" style="vertical-align: top; padding-right: 10px;">
                          <p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0; text-transform: uppercase; font-weight: bold;">Email</p>
                          <p style="margin: 0; font-size: 15px; color: #2D3748;">${data.email}</p>
                        </td>
                        <td class="col-mobile" width="50%" style="vertical-align: top;">
                          <p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0; text-transform: uppercase; font-weight: bold;">Téléphone</p>
                          <p style="margin: 0; font-size: 15px; color: #2D3748;">${data.phone}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                ${data.address || data.city ? `
                <!-- Lieu -->
                <tr>
                  <td style="padding: 20px 25px; border-bottom: 1px solid #EDF2F7;">
                    <p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0; text-transform: uppercase; font-weight: bold;">Lieu de prestation</p>
                    <p style="margin: 0; font-size: 15px; color: #2D3748;">${data.address || ''}</p>
                    <p style="margin: 2px 0 0 0; font-size: 15px; color: #2D3748;">${data.postalCode || ''} ${data.city || ''}</p>
                  </td>
                </tr>
                ` : ''}

                <!-- Détails / Message -->
                <tr>
                  <td style="padding: 20px 25px;">
                    <p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0; text-transform: uppercase; font-weight: bold;">Vos besoins / Détails</p>
                    <p style="margin: 0; font-size: 14px; color: #4A5568; line-height: 1.5; font-style: italic;">"${data.message || 'Non spécifié'}"</p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #2D3748; padding: 30px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px; font-weight: bold; font-family: 'Quicksand', sans-serif;">NannySitting</p>
              
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
                © 2025 NannySitting.
              </p>
            </td>
          </tr>

        </table>
        
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container">
           <tr>
             <td align="center" style="padding-top: 20px;">
               <p style="font-size: 10px; color: #A0AEC0; font-family: 'Quicksand', sans-serif;">Ceci est une notification automatique suite à votre demande sur notre site.</p>
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

                ${data.address || data.city ? `
                <!-- Row: Adresse -->
                <tr>
                  <td style="padding-bottom: 20px;">
                    <p style="margin: 0 0 5px 0; color: #81B7A9; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">Lieu de prestation</p>
                    <div style="background-color: #FFF9F5; padding: 12px; border-radius: 8px; color: #2D3748;">
                      ${data.address || ''}<br/>
                      ${data.postalCode || ''} ${data.city || ''}
                    </div>
                  </td>
                </tr>
                ` : ''}

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
    const { name, email, phone, address, postalCode, city, service, message }: ContactFormRequest = await req.json();

    console.log('Processing contact form submission:', { name, email, service });

    // Parse name into firstName and lastName
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Save prospect to database
    const { error: dbError } = await supabaseAdmin
      .from('clients')
      .insert({
        prenom: firstName,
        nom: lastName,
        email,
        telephone: phone,
        adresse: address || null,
        code_postal: postalCode || null,
        ville: city || null,
        service_souhaite: service,
        message,
        statut: 'prospect'
      });

    if (dbError) {
      console.error('Error saving prospect to database:', dbError);
      // Continue with email even if DB insert fails
    } else {
      console.log('Prospect saved to database successfully');
    }

    // Send notification email to company using Gmail
    try {
      const companySmtpClient = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: GMAIL_USER,
            password: GMAIL_APP_PASSWORD,
          },
        },
      });

      await companySmtpClient.send({
        from: GMAIL_USER,
        to: 'contact@nannysitting.be',
        replyTo: email,
        subject: `Nouvelle demande de ${name} - ${service}`,
        html: createEmailHTML({ name, email, phone, address, postalCode, city, service, message }),
      });

      await companySmtpClient.close();
      
      console.log('Company notification email sent successfully via Gmail');
    } catch (emailError: any) {
      console.error('Error sending company notification via Gmail:', emailError);
      throw emailError; // Critical error, stop execution
    }

    // Send confirmation email to client using Gmail
    try {
      const smtpClient = new SMTPClient({
        connection: {
          hostname: "smtp.gmail.com",
          port: 465,
          tls: true,
          auth: {
            username: GMAIL_USER,
            password: GMAIL_APP_PASSWORD,
          },
        },
      });

      await smtpClient.send({
        from: GMAIL_USER,
        to: email,
        subject: 'Votre demande a bien été reçue - NannySitting',
        html: createConfirmationEmailHTML({ name, email, phone, address, postalCode, city, service, message }),
      });

      await smtpClient.close();
      
      console.log('Client confirmation email sent successfully via Gmail');
    } catch (emailError: any) {
      console.error('Error sending confirmation email via Gmail:', emailError);
      // Continue even if confirmation email fails
    }

    return new Response(
      JSON.stringify({ success: true }),
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
