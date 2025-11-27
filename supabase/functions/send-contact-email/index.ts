import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

// Validation schema avec Zod - SÉCURITÉ STRICTE
const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis").max(100, "Le nom ne peut pas dépasser 100 caractères"),
  email: z.string().trim().email("Email invalide").max(255, "L'email ne peut pas dépasser 255 caractères"),
  phone: z.string().trim().max(20, "Le téléphone ne peut pas dépasser 20 caractères").optional(),
  address: z.string().trim().max(200, "L'adresse ne peut pas dépasser 200 caractères").optional(),
  postalCode: z.string().trim().max(10, "Le code postal ne peut pas dépasser 10 caractères").optional(),
  city: z.string().trim().max(100, "La ville ne peut pas dépasser 100 caractères").optional(),
  service: z.string().trim().min(1, "Le service est requis").max(100, "Le service ne peut pas dépasser 100 caractères"),
  message: z.string().trim().max(2000, "Le message ne peut pas dépasser 2000 caractères").optional(),
  honeypot: z.string().max(0, "Spam détecté").optional(), // Honeypot anti-bot
  recaptchaToken: z.string().min(1, "Token reCAPTCHA requis") // reCAPTCHA v3
});

interface ContactFormRequest {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  service: string;
  message?: string;
  honeypot?: string;
  recaptchaToken?: string; // Optionnel car utilisé seulement pour validation
}

// Rate limiting storage (en mémoire, réinitialise à chaque redémarrage)
const rateLimitStore = new Map<string, { count: number; firstRequest: number }>();

// Configuration du rate limiting
const RATE_LIMIT = {
  MAX_REQUESTS: 3, // Maximum 3 requêtes
  WINDOW_MS: 60 * 60 * 1000, // Par heure (60 minutes)
  BLOCK_DURATION_MS: 24 * 60 * 60 * 1000, // Bloquer pendant 24h si dépassé
};

function checkRateLimit(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record) {
    rateLimitStore.set(ip, { count: 1, firstRequest: now });
    return { allowed: true };
  }

  const timeSinceFirst = now - record.firstRequest;

  // Si la fenêtre a expiré, réinitialiser
  if (timeSinceFirst > RATE_LIMIT.WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, firstRequest: now });
    return { allowed: true };
  }

  // Si dépassement du rate limit
  if (record.count >= RATE_LIMIT.MAX_REQUESTS) {
    const blockUntil = record.firstRequest + RATE_LIMIT.BLOCK_DURATION_MS;
    if (now < blockUntil) {
      const minutesLeft = Math.ceil((blockUntil - now) / (60 * 1000));
      return { 
        allowed: false, 
        reason: `Trop de requêtes. Réessayez dans ${minutesLeft} minutes.` 
      };
    } else {
      // Le blocage a expiré, réinitialiser
      rateLimitStore.set(ip, { count: 1, firstRequest: now });
      return { allowed: true };
    }
  }

  // Incrémenter le compteur
  record.count++;
  rateLimitStore.set(ip, record);
  return { allowed: true };
}

function sanitizeHtml(text: string): string {
  return text
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// 🛡️ DÉTECTION DE PATTERNS D'EMAILS SUSPECTS
function extractEmailPattern(email: string): { prefix: string; domain: string; hasNumber: boolean } {
  const [localPart, domain] = email.toLowerCase().split('@');
  
  // Retirer les chiffres pour obtenir le préfixe de base
  const prefix = localPart.replace(/\d+/g, '');
  const hasNumber = /\d/.test(localPart);
  
  return { prefix, domain: domain || '', hasNumber };
}

async function checkSuspiciousEmailPattern(email: string, clientIp: string): Promise<{ suspicious: boolean; reason?: string }> {
  const pattern = extractEmailPattern(email);
  
  // Ignorer les emails sans chiffres (moins suspects)
  if (!pattern.hasNumber) {
    return { suspicious: false };
  }

  // Vérifier les soumissions récentes (dernières 24h) avec pattern similaire
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 24);
  
  const { data: recentClients, error } = await supabaseAdmin
    .from('clients')
    .select('email, created_at')
    .gte('created_at', oneDayAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(100);

  if (error || !recentClients) {
    console.warn('⚠️ Impossible de vérifier les patterns d\'emails:', error);
    return { suspicious: false }; // Ne pas bloquer en cas d'erreur DB
  }

  // Compter combien d'emails récents ont le même pattern (préfixe + domaine)
  let matchingPatternCount = 0;
  const matchingEmails: string[] = [];

  for (const client of recentClients) {
    const clientPattern = extractEmailPattern(client.email);
    
    // Pattern suspect: même préfixe (sans chiffres) + même domaine + contient des chiffres
    if (
      clientPattern.prefix === pattern.prefix &&
      clientPattern.domain === pattern.domain &&
      clientPattern.hasNumber
    ) {
      matchingPatternCount++;
      matchingEmails.push(client.email);
    }
  }

  // 🚨 SEUIL D'ALERTE: Si plus de 3 emails avec même pattern en 24h = SUSPECT
  if (matchingPatternCount >= 3) {
    return {
      suspicious: true,
      reason: `Pattern suspect détecté: ${matchingPatternCount} emails similaires (${pattern.prefix}*@${pattern.domain}) en 24h. Exemples: ${matchingEmails.slice(0, 3).join(', ')}`
    };
  }

  return { suspicious: false };
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
<p style="margin: 0; font-size: 15px; color: #2D3748 !important;">${data.phone || 'Non renseigné'}</p>
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
<p style="margin: 0; font-size: 15px; color: #2D3748 !important;"><a href="tel:${data.phone}" style="color: #2D3748 !important; text-decoration: underline;">${data.phone || 'Non renseigné'}</a></p>
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
  const startTime = Date.now();
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Récupérer l'IP du client
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';

  console.log('📥 Nouvelle requête de contact:', {
    ip: clientIp,
    timestamp: new Date().toISOString(),
    userAgent: req.headers.get('user-agent')?.substring(0, 100),
  });

  try {
    // 1. RATE LIMITING - Vérifier avant toute autre opération
    const rateLimitCheck = checkRateLimit(clientIp);
    if (!rateLimitCheck.allowed) {
      console.warn('🚫 RATE LIMIT EXCEEDED:', {
        ip: clientIp,
        reason: rateLimitCheck.reason,
        timestamp: new Date().toISOString(),
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Trop de tentatives. Veuillez réessayer plus tard.',
          details: rateLimitCheck.reason 
        }),
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. VALIDATION DES DONNÉES avec Zod
    const rawData = await req.json();
    
    // Vérifier le honeypot (champ caché anti-spam)
    if (rawData.honeypot && rawData.honeypot.length > 0) {
      console.warn('🍯 HONEYPOT TRIGGERED - Spam bot détecté:', {
        ip: clientIp,
        honeypot: rawData.honeypot,
        timestamp: new Date().toISOString(),
      });
      
      // Retourner un succès pour tromper le bot
      return new Response(
        JSON.stringify({ success: true, message: 'Demande envoyée avec succès' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validationResult = contactFormSchema.safeParse(rawData);
    
    if (!validationResult.success) {
      console.warn('❌ VALIDATION FAILED:', {
        ip: clientIp,
        errors: validationResult.error.errors,
        timestamp: new Date().toISOString(),
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Données invalides', 
          details: validationResult.error.errors 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== 🛡️ VALIDATION RECAPTCHA V3 ==========
    console.log('🔒 Validation reCAPTCHA v3...');
    const recaptchaSecret = Deno.env.get("RECAPTCHA_SECRET_KEY");
    
    if (!recaptchaSecret) {
      console.error('❌ RECAPTCHA_SECRET_KEY non configurée');
      return new Response(
        JSON.stringify({ error: 'Configuration serveur manquante' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecret}&response=${validationResult.data.recaptchaToken}&remoteip=${clientIp}`;
    
    const recaptchaResponse = await fetch(recaptchaVerifyUrl, {
      method: 'POST'
    });

    const recaptchaResult = await recaptchaResponse.json();

    console.log('📊 Résultat reCAPTCHA:', {
      success: recaptchaResult.success,
      score: recaptchaResult.score,
      action: recaptchaResult.action,
      ip: clientIp
    });

    // ❌ Token invalide
    if (!recaptchaResult.success) {
      console.warn('🚫 reCAPTCHA ÉCHEC:', {
        ip: clientIp,
        errors: recaptchaResult["error-codes"],
        timestamp: new Date().toISOString()
      });
      return new Response(
        JSON.stringify({ error: 'Vérification de sécurité échouée' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ⚠️ Score trop bas (bot probable)
    const scoreThreshold = 0.5; // Score minimum acceptable (0.0 = bot, 1.0 = humain)
    if (recaptchaResult.score < scoreThreshold) {
      console.warn('🤖 BOT DÉTECTÉ (score reCAPTCHA faible):', {
        ip: clientIp,
        score: recaptchaResult.score,
        threshold: scoreThreshold,
        timestamp: new Date().toISOString()
      });
      // Retourner un 200 pour tromper le bot
      return new Response(
        JSON.stringify({ success: true, message: 'Formulaire reçu' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ reCAPTCHA validé:', { score: recaptchaResult.score });

    const {
      name,
      email,
      phone = '',
      address = '',
      postalCode = '',
      city = '',
      service,
      message = '',
    } = validationResult.data;

    // ========== 🔍 DÉTECTION PATTERN D'EMAILS SUSPECTS ==========
    console.log('🔍 Vérification pattern email...');
    const emailPatternCheck = await checkSuspiciousEmailPattern(email, clientIp);
    
    if (emailPatternCheck.suspicious) {
      console.warn('🚨 PATTERN SUSPECT DÉTECTÉ:', {
        ip: clientIp,
        email: email,
        reason: emailPatternCheck.reason,
        timestamp: new Date().toISOString()
      });
      
      // Bloquer la requête
      return new Response(
        JSON.stringify({ error: 'Trop de demandes similaires détectées. Veuillez réessayer plus tard.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Pattern email validé');

    // 3. SANITIZATION - Nettoyer les données avant insertion
    const sanitizedData = {
      nom: sanitizeHtml(name.split(' ').pop() || name),
      prenom: sanitizeHtml(name.split(' ')[0] || ''),
      email: email.toLowerCase().trim(),
      telephone: phone ? sanitizeHtml(phone) : null,
      adresse: address ? sanitizeHtml(address) : null,
      code_postal: postalCode ? sanitizeHtml(postalCode) : null,
      ville: city ? sanitizeHtml(city) : null,
      service_souhaite: sanitizeHtml(service),
      message: message ? sanitizeHtml(message) : null,
      statut: 'prospect' as const
    };

    console.log('✅ Données validées et nettoyées:', {
      ip: clientIp,
      email: sanitizedData.email,
      service: sanitizedData.service_souhaite,
    });

    // 4. INSERT dans Supabase
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert(sanitizedData)
      .select()
      .single();

    if (clientError) {
      console.error('❌ ERREUR DATABASE:', {
        ip: clientIp,
        error: clientError,
        timestamp: new Date().toISOString(),
      });
      throw new Error(`Database error: ${clientError.message}`);
    }

    console.log('✅ Client inséré avec succès:', {
      clientId: clientData.id,
      ip: clientIp,
      email: sanitizedData.email,
      processingTime: Date.now() - startTime,
    });

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

    // Run email sending in background (non-blocking)
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
      EdgeRuntime.waitUntil(sendEmails());
    } else {
      sendEmails().catch(console.error);
    }

    console.log('✅ REQUÊTE COMPLÉTÉE:', {
      clientId: clientData.id,
      ip: clientIp,
      totalTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, message: 'Demande envoyée avec succès' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('❌ ERREUR CRITIQUE:', {
      ip: clientIp,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
    
    return new Response(
      JSON.stringify({ error: 'Une erreur est survenue. Veuillez réessayer.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
