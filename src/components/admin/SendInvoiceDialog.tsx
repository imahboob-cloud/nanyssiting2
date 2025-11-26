import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, Eye, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Invoice = Tables<"invoices">;
type InvoiceWithClient = Invoice & {
  clients: {
    nom: string;
    prenom: string;
    email: string | null;
  } | null;
};

interface SendInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithClient | null;
  onSuccess: () => void;
}

export function SendInvoiceDialog({ open, onOpenChange, invoice, onSuccess }: SendInvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<string | null>(null);
  const { toast } = useToast();

  // Update email when invoice changes
  useEffect(() => {
    if (invoice?.clients?.email) {
      setEmail(invoice.clients.email);
    } else {
      setEmail('');
    }
    // Reset PDF preview when invoice changes
    setPdfPreview(null);
  }, [invoice]);

  const handleGeneratePreview = async () => {
    if (!invoice) return;

    setGeneratingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invoice-pdf', {
        body: { invoiceId: invoice.id },
      });

      if (error) throw error;

      if (data?.pdf) {
        setPdfPreview(data.pdf);
        // Open preview in new tab
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`
            <html>
              <head><title>Aperçu Facture ${invoice.numero}</title></head>
              <body style="margin:0">
                <iframe src="${data.pdf}" style="width:100%;height:100vh;border:none"></iframe>
              </body>
            </html>
          `);
        }
      }
    } catch (error: any) {
      console.error('Error generating PDF preview:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de générer l\'aperçu PDF',
        variant: 'destructive',
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleSend = async () => {
    if (!invoice || !email) {
      toast({
        title: 'Erreur',
        description: 'Email manquant',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Call edge function to send email
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId: invoice.id,
          email: email,
        },
      });

      if (error) throw error;

      // Update invoice status to "envoyee" if it was "brouillon"
      if (invoice.statut === 'brouillon') {
        await supabase
          .from('invoices')
          .update({ statut: 'envoyee' })
          .eq('id', invoice.id);
      }

      toast({
        title: 'Facture envoyée',
        description: `La facture a été envoyée à ${email}`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer la facture',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendLater = () => {
    toast({
      title: 'Facture sauvegardée',
      description: 'La facture a été sauvegardée et pourra être envoyée plus tard',
    });
    onOpenChange(false);
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer la facture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePreview}
              disabled={generatingPdf}
              className="flex-1"
            >
              {generatingPdf ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Aperçu PDF
                </>
              )}
            </Button>
            {pdfPreview && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = pdfPreview;
                  link.download = `Facture-${invoice.numero}.pdf`;
                  link.click();
                }}
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="p-4 border rounded-lg space-y-2 bg-muted">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Numéro:</span>
              <span className="font-medium">{invoice.numero}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">
                {invoice.clients ? `${invoice.clients.prenom} ${invoice.clients.nom}` : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant TTC:</span>
              <span className="font-semibold">{invoice.montant_ttc?.toFixed(2)} €</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email du destinataire</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleSendLater}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Envoyer plus tard
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={loading || !email}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Envoyer maintenant
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}