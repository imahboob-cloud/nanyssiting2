import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Quote = Tables<"quotes">;
type QuoteWithClient = Quote & {
  clients: {
    nom: string;
    prenom: string;
    email: string | null;
  } | null;
};

interface SendQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: QuoteWithClient | null;
  onSuccess: () => void;
}

export function SendQuoteDialog({ open, onOpenChange, quote, onSuccess }: SendQuoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const { toast } = useToast();

  // Update email when quote changes
  useEffect(() => {
    if (quote?.clients?.email) {
      setEmail(quote.clients.email);
    } else {
      setEmail('');
    }
  }, [quote]);

  const handleDownloadPdf = async () => {
    if (!quote) return;

    setDownloadingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quote-pdf', {
        body: { quoteId: quote.id },
      });

      if (error) throw error;

      if (data?.pdf) {
        const link = document.createElement('a');
        link.href = data.pdf;
        link.download = `Devis-${quote.numero}.pdf`;
        link.click();
        
        toast({
          title: 'PDF téléchargé',
          description: 'Le devis a été téléchargé avec succès',
        });
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSend = async () => {
    if (!quote || !email) {
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
      const { error } = await supabase.functions.invoke('send-quote-email', {
        body: {
          quoteId: quote.id,
          email: email,
        },
      });

      if (error) throw error;

      // Update quote status to "envoye" if it was "brouillon"
      if (quote.statut === 'brouillon') {
        await supabase
          .from('quotes')
          .update({ statut: 'envoye' })
          .eq('id', quote.id);
      }

      toast({
        title: 'Devis envoyé',
        description: `Le devis a été envoyé à ${email}`,
      });

      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Error sending quote:', error);
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer le devis',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendLater = () => {
    toast({
      title: 'Devis sauvegardé',
      description: 'Le devis a été sauvegardé et pourra être envoyé plus tard',
    });
    onOpenChange(false);
  };

  if (!quote) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer le devis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf}
            className="w-full"
          >
            {downloadingPdf ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Téléchargement...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Télécharger le PDF
              </>
            )}
          </Button>
          <div className="p-4 border rounded-lg space-y-2 bg-muted">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Numéro:</span>
              <span className="font-medium">{quote.numero}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Client:</span>
              <span className="font-medium">
                {quote.clients ? `${quote.clients.prenom} ${quote.clients.nom}` : '-'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Montant TTC:</span>
              <span className="font-semibold">{quote.montant_ttc?.toFixed(2)} €</span>
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
