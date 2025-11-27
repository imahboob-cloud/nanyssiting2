import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil(promise: Promise<any>): void;
} | undefined;

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
  const nameParts = data.name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>Demande reçue - NannySitting</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap');
body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
a { text-decoration: none; }
@media only screen and (max-width: 600px) {
.container { width: 100% !important; }
.mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
.col-mobile { display: block !important; width: 100% !important; padding-bottom: 10px; }
}
:root { color-scheme: light only; supported-color-schemes: light; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF !important; font-family: 'Quicksand', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2D3748 !important;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FFFFFF" style="background-color: #FFFFFF !important;">
<tr>
<td align="center" style="padding: 40px 0; background-color: #FFFFFF !important;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container" bgcolor="#FFFFFF" style="background-color: #ffffff !important; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
<tr>
<td align="center" style="padding: 40px 0 20px 0; background-color: #ffffff !important;">
<h1 style="margin: 0; font-family: 'Quicksand', sans-serif; font-size: 32px; color: #2D3748 !important; font-weight: 700;">NannySitting</h1>
<p style="margin: 5px 0 0 0; font-family: 'Quicksand', sans-serif; color: #F79B75 !important; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Plus qu'une garde, une bulle de sérénité</p>
</td>
</tr>
<tr>
<td align="center" style="background-color: #ffffff !important;">
<div style="height: 2px; width: 80%; background: linear-gradient(to right, #ffffff, #F79B75, #ffffff); opacity: 0.3;"></div>
</td>
</tr>
<tr>
<td class="mobile-padding" style="padding: 40px 50px; background-color: #ffffff !important;">
<h1 style="margin: 0 0 20px 0; font-family: 'Quicksand', sans-serif; font-size: 24px; color: #2D3748 !important; font-weight: 700; text-align: center;">Merci ${firstName}, c'est bien reçu ! ✨</h1>
<p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4A5568 !important; text-align: center; font-family: 'Quicksand', sans-serif;">Nous avons bien pris en compte votre demande. Notre équipe coordinatrice l'analyse actuellement avec soin.</p>
<div style="background-color: #E6FFFA !important; border: 1px solid #81B7A9; border-radius: 8px; padding: 15px; margin-bottom: 30px; text-align: center;">
<p style="margin: 0; color: #2D3748 !important; font-weight: 600; font-size: 14px; font-family: 'Quicksand', sans-serif;">📞 Nous prendrons contact avec vous <span style="color: #F79B75 !important; text-decoration: underline;">dans la journée</span> pour affiner vos besoins.</p>
</div>
<p style="font-size: 14px; color: #81B7A9 !important; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; text-align: center; font-family: 'Quicksand', sans-serif;">Récapitulatif de vos informations</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF !important; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
<tr>
<td style="padding: 20px 25px; border-bottom: 1px solid #EDF2F7; background-color: #FFFFFF !important;">
<table width="100%" border="0" cellspacing="0" cellpadding="0">
<tr>
<td class="col-mobile" width="50%" style="vertical-align: top;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Nom complet</p>
<p style="margin: 0; font-size: 15px; color: #2D3748 !important; font-weight: 600;">${firstName} ${lastName}</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding: 20px 25px; border-bottom: 1px solid #EDF2F7; background-color: #FFFFFF !important;">
<table width="100%" border="0" cellspacing="0" cellpadding="0">
<tr>
<td class="col-mobile" width="50%" style="vertical-align: top; padding-right: 10px;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Email</p>
<p style="margin: 0; font-size: 15px; color: #2D3748 !important;">${data.email}</p>
</td>
<td class="col-mobile" width="50%" style="vertical-align: top;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Téléphone</p>
<p style="margin: 0; font-size: 15px; color: #2D3748 !important;">${data.phone}</p>
</td>
</tr>
</table>
</td>
</tr>
${data.address || data.city ? `<tr>
<td style="padding: 20px 25px; border-bottom: 1px solid #EDF2F7; background-color: #FFFFFF !important;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Lieu de prestation</p>
<p style="margin: 0; font-size: 15px; color: #2D3748 !important;">${data.address || ''}</p>
<p style="margin: 2px 0 0 0; font-size: 15px; color: #2D3748 !important;">${data.postalCode || ''} ${data.city || ''}</p>
</td>
</tr>` : ''}
<tr>
<td style="padding: 20px 25px; background-color: #FFFFFF !important;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Vos besoins / Détails</p>
<p style="margin: 0; font-size: 14px; color: #4A5568 !important; line-height: 1.5; font-style: italic;">"${data.message || 'Non spécifié'}"</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="background-color: #2D3748 !important; padding: 30px; text-align: center;">
<p style="margin: 0 0 10px 0; color: #ffffff !important; font-size: 14px; font-weight: bold; font-family: 'Quicksand', sans-serif;">NannySitting</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
<tr>
<td style="padding: 0 10px;">
<a href="mailto:contact@nannysitting.be" style="color: #F79B75 !important; text-decoration: none; font-size: 12px; font-family: 'Quicksand', sans-serif;">Nous contacter</a>
</td>
<td style="padding: 0 10px;">
<a href="https://www.nannysitting.be" style="color: #F79B75 !important; text-decoration: none; font-size: 12px; font-family: 'Quicksand', sans-serif;">Site Web</a>
</td>
</tr>
</table>
<p style="margin: 20px 0 0 0; color: #718096 !important; font-size: 10px; font-family: 'Quicksand', sans-serif;">© 2025 NannySitting.</p>
</td>
</tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container">
<tr>
<td align="center" style="padding-top: 20px; background-color: #FFFFFF !important;">
<p style="font-size: 10px; color: #A0AEC0 !important; font-family: 'Quicksand', sans-serif;">Ceci est une notification automatique suite à votre demande sur notre site.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
};

const createEmailHTML = (data: ContactFormRequest) => {
  const nameParts = data.name.trim().split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';
  
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>Nouvelle demande - NannySitting</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@500;700&display=swap');
body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
a { text-decoration: none; }
@media only screen and (max-width: 600px) {
.container { width: 100% !important; }
.mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
.col-mobile { display: block !important; width: 100% !important; padding-bottom: 10px; }
}
:root { color-scheme: light only; supported-color-schemes: light; }
</style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF !important; font-family: 'Quicksand', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2D3748 !important;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FFFFFF" style="background-color: #FFFFFF !important;">
<tr>
<td align="center" style="padding: 40px 0; background-color: #FFFFFF !important;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container" bgcolor="#FFFFFF" style="background-color: #ffffff !important; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
<tr>
<td align="center" style="padding: 40px 0 20px 0; background-color: #ffffff !important;">
<h1 style="margin: 0; font-family: 'Quicksand', sans-serif; font-size: 32px; color: #2D3748 !important; font-weight: 700;">NannySitting</h1>
<p style="margin: 5px 0 0 0; font-family: 'Quicksand', sans-serif; color: #F79B75 !important; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Plus qu'une garde, une bulle de sérénité</p>
</td>
</tr>
<tr>
<td align="center" style="background-color: #ffffff !important;">
<div style="height: 2px; width: 80%; background: linear-gradient(to right, #ffffff, #F79B75, #ffffff); opacity: 0.3;"></div>
</td>
</tr>
<tr>
<td class="mobile-padding" style="padding: 40px 50px; background-color: #ffffff !important;">
<h1 style="margin: 0 0 20px 0; font-family: 'Quicksand', sans-serif; font-size: 24px; color: #2D3748 !important; font-weight: 700; text-align: center;">Nouvelle demande de ${firstName} ${lastName} ! ✨</h1>
<p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #4A5568 !important; text-align: center; font-family: 'Quicksand', sans-serif;">Une famille a rempli le formulaire de contact sur votre site. Voici les détails de sa demande.</p>
<div style="background-color: #FFF4ED !important; border: 1px solid #F79B75; border-radius: 8px; padding: 15px; margin-bottom: 30px; text-align: center;">
<p style="margin: 0; color: #2D3748 !important; font-weight: 600; font-size: 14px; font-family: 'Quicksand', sans-serif;">📋 Service demandé : <span style="color: #F79B75 !important; font-weight: 700;">${data.service}</span></p>
</div>
<p style="font-size: 14px; color: #81B7A9 !important; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; text-align: center; font-family: 'Quicksand', sans-serif;">Informations du client</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FFFFFF !important; border: 2px solid #E5E7EB; border-radius: 12px; overflow: hidden;">
<tr>
<td style="padding: 20px 25px; border-bottom: 1px solid #EDF2F7; background-color: #FFFFFF !important;">
<table width="100%" border="0" cellspacing="0" cellpadding="0">
<tr>
<td class="col-mobile" width="50%" style="vertical-align: top; padding-right: 10px;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Prénom</p>
<p style="margin: 0; font-size: 15px; color: #2D3748 !important; font-weight: 600;">${firstName}</p>
</td>
<td class="col-mobile" width="50%" style="vertical-align: top;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Nom</p>
<p style="margin: 0; font-size: 15px; color: #2D3748 !important; font-weight: 600;">${lastName}</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="padding: 20px 25px; border-bottom: 1px solid #EDF2F7; background-color: #FFFFFF !important;">
<table width="100%" border="0" cellspacing="0" cellpadding="0">
<tr>
<td class="col-mobile" width="50%" style="vertical-align: top; padding-right: 10px;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Email</p>
<p style="margin: 0; font-size: 15px; color: #2D3748 !important;"><a href="mailto:${data.email}" style="color: #2D3748 !important; text-decoration: underline;">${data.email}</a></p>
</td>
<td class="col-mobile" width="50%" style="vertical-align: top;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Téléphone</p>
<p style="margin: 0; font-size: 15px; color: #2D3748 !important;"><a href="tel:${data.phone}" style="color: #2D3748 !important; text-decoration: underline;">${data.phone}</a></p>
</td>
</tr>
</table>
</td>
</tr>
${data.address || data.city ? `<tr>
<td style="padding: 20px 25px; border-bottom: 1px solid #EDF2F7; background-color: #FFFFFF !important;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Lieu de prestation</p>
<p style="margin: 0; font-size: 15px; color: #2D3748 !important;">${data.address || ''}</p>
<p style="margin: 2px 0 0 0; font-size: 15px; color: #2D3748 !important;">${data.postalCode || ''} ${data.city || ''}</p>
</td>
</tr>` : ''}
<tr>
<td style="padding: 20px 25px; background-color: #FFFFFF !important;">
<p style="margin: 0 0 5px 0; font-size: 11px; color: #A0AEC0 !important; text-transform: uppercase; font-weight: bold;">Détails / Message</p>
<p style="margin: 0; font-size: 14px; color: #4A5568 !important; line-height: 1.5; font-style: italic;">"${data.message || 'Aucun message spécifique'}"</p>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td style="background-color: #2D3748 !important; padding: 30px; text-align: center;">
<p style="margin: 0 0 10px 0; color: #ffffff !important; font-size: 14px; font-weight: bold; font-family: 'Quicksand', sans-serif;">NannySitting</p>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center">
<tr>
<td style="padding: 0 10px;">
<a href="mailto:contact@nannysitting.be" style="color: #F79B75 !important; text-decoration: none; font-size: 12px; font-family: 'Quicksand', sans-serif;">Nous contacter</a>
</td>
<td style="padding: 0 10px;">
<a href="https://www.nannysitting.be" style="color: #F79B75 !important; text-decoration: none; font-size: 12px; font-family: 'Quicksand', sans-serif;">Site Web</a>
</td>
</tr>
</table>
<p style="margin: 20px 0 0 0; color: #718096 !important; font-size: 10px; font-family: 'Quicksand', sans-serif;">© 2025 NannySitting.</p>
</td>
</tr>
</table>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="container">
<tr>
<td align="center" style="padding-top: 20px; background-color: #FFFFFF !important;">
<p style="font-size: 10px; color: #A0AEC0 !important; font-family: 'Quicksand', sans-serif;">Notification automatique - Nouvelle demande client.</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, phone, address, postalCode, city, service, message }: ContactFormRequest = await req.json();
    console.log('Processing contact form submission:', { name, email, service });

    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Save prospect to database (FAST - only this is awaited)
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
      throw new Error('Erreur lors de l\'enregistrement');
    }

    console.log('Prospect saved successfully');

    // Send emails in BACKGROUND (non-blocking)
    const sendEmails = async () => {
      try {
        // Vérifier que les credentials Gmail sont configurés
        if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
          console.error('Gmail credentials not configured:', { 
            hasUser: !!GMAIL_USER, 
            hasPassword: !!GMAIL_APP_PASSWORD 
          });
          return;
        }

        console.log('Starting email sending with Gmail SMTP...');

        // Send notification to company
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

        console.log('Sending company notification email...');
        await companySmtpClient.send({
          from: GMAIL_USER,
          to: 'contact@nannysitting.be',
          replyTo: email,
          subject: `Nouvelle demande de ${name} - ${service}`,
          html: createEmailHTML({ name, email, phone, address, postalCode, city, service, message }),
        });

        await companySmtpClient.close();
        console.log('Company notification sent successfully');

        // Send confirmation to client
        const clientSmtpClient = new SMTPClient({
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

        console.log('Sending client confirmation email...');
        await clientSmtpClient.send({
          from: GMAIL_USER,
          to: email,
          subject: 'Votre demande a bien été reçue - NannySitting',
          html: createConfirmationEmailHTML({ name, email, phone, address, postalCode, city, service, message }),
        });

        await clientSmtpClient.close();
        console.log('Client confirmation sent successfully');
      } catch (emailError: any) {
        console.error('Error sending emails in background:', {
          message: emailError.message,
          stack: emailError.stack,
          name: emailError.name
        });
      }
    };

    // Use EdgeRuntime.waitUntil for background task
    if (typeof EdgeRuntime !== 'undefined') {
      EdgeRuntime.waitUntil(sendEmails());
    } else {
      // Fallback if EdgeRuntime not available
      sendEmails().catch(console.error);
    }

    // Return IMMEDIATELY after DB insert
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
