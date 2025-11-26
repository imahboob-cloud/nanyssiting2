import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

const nannysitterSchema = z.object({
  nom: z.string().trim().min(1, 'Le nom est requis').max(100),
  prenom: z.string().trim().min(1, 'Le prénom est requis').max(100),
  email: z.string().trim().email('Email invalide').max(255).optional().or(z.literal('')),
  telephone: z.string().trim().max(20).optional().or(z.literal('')),
  tarif_horaire: z.string().optional().or(z.literal('')),
  competences: z.string().trim().max(1000).optional().or(z.literal('')),
  actif: z.boolean(),
});

type NannySitterFormData = z.infer<typeof nannysitterSchema>;
type NannySitter = Tables<'nannysitters'>;

interface NannySitterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nannysitter?: NannySitter;
  onSave: (data: NannySitterFormData) => Promise<void>;
  loading?: boolean;
}

export function NannySitterDialog({ open, onOpenChange, nannysitter, onSave, loading = false }: NannySitterDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<NannySitterFormData>({
    resolver: zodResolver(nannysitterSchema),
    defaultValues: {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      tarif_horaire: '',
      competences: '',
      actif: true,
    },
  });

  const actif = watch('actif');

  useEffect(() => {
    if (nannysitter) {
      reset({
        nom: nannysitter.nom,
        prenom: nannysitter.prenom,
        email: nannysitter.email || '',
        telephone: nannysitter.telephone || '',
        tarif_horaire: nannysitter.tarif_horaire?.toString() || '',
        competences: nannysitter.competences || '',
        actif: nannysitter.actif ?? true,
      });
    } else {
      reset({
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        tarif_horaire: '',
        competences: '',
        actif: true,
      });
    }
  }, [nannysitter, reset, open]);

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false);
      reset();
    }
  };

  const onSubmit = async (data: NannySitterFormData) => {
    await onSave(data);
    if (!loading) {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{nannysitter ? 'Modifier la babysitter' : 'Nouvelle babysitter'}</DialogTitle>
          <DialogDescription>
            {nannysitter ? 'Modifiez les informations de la babysitter' : 'Ajoutez une nouvelle babysitter à votre équipe'}
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
              <Label htmlFor="tarif_horaire">Tarif horaire (€)</Label>
              <Input
                id="tarif_horaire"
                type="number"
                step="0.01"
                {...register('tarif_horaire')}
                placeholder="15.00"
                disabled={loading}
              />
              {errors.tarif_horaire && (
                <p className="text-sm text-destructive">{errors.tarif_horaire.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="competences">Compétences et expérience</Label>
              <Textarea
                id="competences"
                {...register('competences')}
                rows={4}
                placeholder="Ex: 5 ans d'expérience, premiers secours, activités créatives, anglais courant..."
                disabled={loading}
              />
              {errors.competences && (
                <p className="text-sm text-destructive">{errors.competences.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="actif">Babysitter active</Label>
                  <p className="text-sm text-muted-foreground">
                    Disponible pour de nouvelles missions
                  </p>
                </div>
                <Switch
                  id="actif"
                  checked={actif}
                  onCheckedChange={(checked) => setValue('actif', checked, { shouldDirty: true })}
                  disabled={loading}
                />
              </div>
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
