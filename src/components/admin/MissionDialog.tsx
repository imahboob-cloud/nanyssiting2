import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const missionSchema = z.object({
  client_id: z.string().min(1, 'Client requis'),
  nannysitter_id: z.string().optional(),
  date_debut: z.string().min(1, 'Date de début requise'),
  date_fin: z.string().min(1, 'Date de fin requise'),
  description: z.string().optional(),
  montant: z.string().optional(),
  statut: z.enum(['planifie', 'en_cours', 'termine', 'annule']),
});

type MissionFormData = z.infer<typeof missionSchema>;

interface MissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission?: any;
  selectedDate?: Date;
  onSuccess: () => void;
}

export function MissionDialog({ open, onOpenChange, mission, selectedDate, onSuccess }: MissionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [nannysitters, setNannysitters] = useState<any[]>([]);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<MissionFormData>({
    resolver: zodResolver(missionSchema),
    defaultValues: {
      statut: 'planifie',
    },
  });

  useEffect(() => {
    loadClients();
    loadNannySitters();
  }, []);

  useEffect(() => {
    if (mission) {
      setValue('client_id', mission.client_id);
      setValue('nannysitter_id', mission.nannysitter_id || '');
      setValue('date_debut', format(new Date(mission.date_debut), "yyyy-MM-dd'T'HH:mm"));
      setValue('date_fin', format(new Date(mission.date_fin), "yyyy-MM-dd'T'HH:mm"));
      setValue('description', mission.description || '');
      setValue('montant', mission.montant?.toString() || '');
      setValue('statut', mission.statut);
    } else if (selectedDate) {
      const dateStr = format(selectedDate, "yyyy-MM-dd'T'09:00");
      setValue('date_debut', dateStr);
      setValue('date_fin', dateStr);
    }
  }, [mission, selectedDate, setValue]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nom', { ascending: true });
    
    if (!error && data) setClients(data);
  };

  const loadNannySitters = async () => {
    const { data, error } = await supabase
      .from('nannysitters')
      .select('*')
      .eq('actif', true)
      .order('nom', { ascending: true });
    
    if (!error && data) setNannysitters(data);
  };

  const onSubmit = async (data: MissionFormData) => {
    setLoading(true);
    try {
      const missionData = {
        client_id: data.client_id,
        nannysitter_id: data.nannysitter_id || null,
        date_debut: data.date_debut,
        date_fin: data.date_fin,
        description: data.description || null,
        montant: data.montant ? parseFloat(data.montant) : null,
        statut: data.statut,
      };

      if (mission) {
        const { error } = await supabase
          .from('missions')
          .update(missionData)
          .eq('id', mission.id);

        if (error) throw error;
        toast({ title: 'Mission mise à jour avec succès' });
      } else {
        const { error } = await supabase
          .from('missions')
          .insert([missionData]);

        if (error) throw error;
        toast({ title: 'Mission créée avec succès' });
      }

      reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mission ? 'Modifier la mission' : 'Nouvelle mission'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client_id">Client *</Label>
            <Select onValueChange={(value) => setValue('client_id', value)} value={watch('client_id')}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.nom} {client.prenom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nannysitter_id">NannySitter</Label>
            <Select onValueChange={(value) => setValue('nannysitter_id', value)} value={watch('nannysitter_id') || undefined}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une nannysitter (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                {nannysitters.map((ns) => (
                  <SelectItem key={ns.id} value={ns.id}>
                    {ns.nom} {ns.prenom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date_debut">Date de début *</Label>
              <Input type="datetime-local" {...register('date_debut')} />
              {errors.date_debut && <p className="text-sm text-destructive">{errors.date_debut.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_fin">Date de fin *</Label>
              <Input type="datetime-local" {...register('date_fin')} />
              {errors.date_fin && <p className="text-sm text-destructive">{errors.date_fin.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="statut">Statut *</Label>
            <Select onValueChange={(value: any) => setValue('statut', value)} value={watch('statut')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planifie">Planifié</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="termine">Terminé</SelectItem>
                <SelectItem value="annule">Annulé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="montant">Montant (€)</Label>
            <Input type="number" step="0.01" {...register('montant')} placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea {...register('description')} placeholder="Description de la mission..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mission ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
