import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';
import { AddressAutocomplete } from '@/components/AddressAutocomplete';

const clientSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom est requis').max(100),
  prenom: z.string().trim().min(1, 'Le prénom est requis').max(100),
  email: z.string().trim().email('Email invalide').max(255).optional().or(z.literal('')),
  telephone: z.string().trim().max(20).optional().or(z.literal('')),
  adresse: z.string().trim().max(200).optional().or(z.literal('')),
  code_postal: z.string().trim().max(10).optional().or(z.literal('')),
  ville: z.string().trim().max(100).optional().or(z.literal('')),
  service_souhaite: z.string().trim().max(500).optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  statut: z.enum(['prospect', 'client']),
});

type ClientFormData = z.infer<typeof clientSchema>;
type Client = Tables<'clients'>;

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client;
  onSave: (data: ClientFormData) => Promise<void>;
  loading?: boolean;
}

export function ClientDialog({ open, onOpenChange, client, onSave, loading = false }: ClientDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      code_postal: '',
      ville: '',
      service_souhaite: '',
      message: '',
      notes: '',
      statut: 'prospect',
    },
  });

  const statut = watch('statut');

  useEffect(() => {
    if (client) {
      reset({
        nom: client.nom,
        prenom: client.prenom,
        email: client.email || '',
        telephone: client.telephone || '',
        adresse: client.adresse || '',
        code_postal: client.code_postal || '',
        ville: client.ville || '',
        service_souhaite: client.service_souhaite || '',
        message: client.message || '',
        notes: client.notes || '',
        statut: client.statut || 'prospect',
      });
    } else {
      reset({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        adresse: '',
        code_postal: '',
        ville: '',
        service_souhaite: '',
        message: '',
        notes: '',
        statut: 'prospect',
      });
    }
  }, [client, reset, open]);

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      reset();
    }
  };

  const onSubmit = async (data: ClientFormData) => {
    await onSave(data);
    if (!loading) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{client ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
          <DialogDescription>
            {client ? 'Modifiez les informations du client' : 'Ajoutez un nouveau client ou prospect'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom">
                Nom <span className="text-destructive">*</span>
              </Label>
              <Input id="nom" {...register('nom')} disabled={loading} />
              {errors.nom && <p className="text-sm text-destructive">{errors.nom.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prenom">
                Prénom <span className="text-destructive">*</span>
              </Label>
              <Input id="prenom" {...register('prenom')} disabled={loading} />
              {errors.prenom && <p className="text-sm text-destructive">{errors.prenom.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} disabled={loading} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" {...register('telephone')} disabled={loading} />
              {errors.telephone && <p className="text-sm text-destructive">{errors.telephone.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="adresse">Adresse (lieu de prestation)</Label>
              <AddressAutocomplete
                value={watch('adresse') || ''}
                onChange={(value) => setValue('adresse', value, { shouldDirty: true })}
                onPostalCodeChange={(value) => setValue('code_postal', value, { shouldDirty: true })}
                onCityChange={(value) => setValue('ville', value, { shouldDirty: true })}
                placeholder="Commencez à taper l'adresse..."
                disabled={loading}
              />
              {errors.adresse && <p className="text-sm text-destructive">{errors.adresse.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="code_postal">Code postal</Label>
              <Input id="code_postal" {...register('code_postal')} disabled={loading} />
              {errors.code_postal && <p className="text-sm text-destructive">{errors.code_postal.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ville">Ville</Label>
              <Input id="ville" {...register('ville')} disabled={loading} />
              {errors.ville && <p className="text-sm text-destructive">{errors.ville.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="service_souhaite">Service souhaité</Label>
              <Input
                id="service_souhaite"
                {...register('service_souhaite')}
                placeholder="Ex: Babysitting, garde à domicile..."
                disabled={loading}
              />
              {errors.service_souhaite && (
                <p className="text-sm text-destructive">{errors.service_souhaite.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="message">Message initial</Label>
              <Textarea
                id="message"
                {...register('message')}
                rows={3}
                placeholder="Message du client lors du premier contact"
                disabled={loading}
              />
              {errors.message && <p className="text-sm text-destructive">{errors.message.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes internes</Label>
              <Textarea
                id="notes"
                {...register('notes')}
                rows={3}
                placeholder="Notes privées sur le client"
                disabled={loading}
              />
              {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="statut">
                Statut <span className="text-destructive">*</span>
              </Label>
              <Select value={statut} onValueChange={(value) => setValue('statut', value as 'prospect' | 'client', { shouldDirty: true })} disabled={loading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              {errors.statut && <p className="text-sm text-destructive">{errors.statut.message}</p>}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !isDirty}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                'Enregistrer'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
