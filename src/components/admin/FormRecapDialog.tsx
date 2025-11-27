import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { Tables } from '@/integrations/supabase/types';

type Client = Tables<'clients'>;

interface FormRecapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function FormRecapDialog({ open, onOpenChange, client }: FormRecapDialogProps) {
  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby="form-recap-description">
        <DialogHeader>
          <DialogTitle>Récapitulatif du formulaire</DialogTitle>
          <p id="form-recap-description" className="sr-only">
            Détails complets du formulaire de contact soumis par le client
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* En-tête avec nom */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold text-lg mb-1">
              {client.prenom} {client.nom}
            </h3>
            <p className="text-sm text-muted-foreground">
              Soumis le {new Date(client.created_at!).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Informations de contact */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
              Coordonnées
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {client.email && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">{client.email}</p>
                </div>
              )}
              {client.telephone && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Téléphone</p>
                  <p className="font-medium">{client.telephone}</p>
                </div>
              )}
            </div>
          </div>

          {/* Localisation */}
          {(client.adresse || client.ville) && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Lieu de prestation
              </h4>
              <div className="bg-muted/50 p-4 rounded-lg">
                {client.adresse && <p className="mb-1">{client.adresse}</p>}
                {(client.code_postal || client.ville) && (
                  <p className="text-muted-foreground">
                    {client.code_postal} {client.ville}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Service souhaité */}
          {client.service_souhaite && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Service souhaité
              </h4>
              <Badge className="text-sm px-3 py-1" variant="secondary">
                {client.service_souhaite}
              </Badge>
            </div>
          )}

          {/* Message/Détails */}
          {client.message && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Détails et besoins
              </h4>
              <div className="bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
                <p className="text-sm italic leading-relaxed">"{client.message}"</p>
              </div>
            </div>
          )}

          {/* Notes internes */}
          {client.notes && (
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Notes internes
              </h4>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-900">
                <p className="text-sm">{client.notes}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
