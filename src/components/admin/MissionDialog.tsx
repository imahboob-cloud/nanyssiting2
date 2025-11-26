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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const missionSchema = z.object({
  client_id: z.string().min(1, 'Client requis'),
  nannysitter_id: z.string().optional(),
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
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
  const [heureDebut, setHeureDebut] = useState('09:00');
  const [heureFin, setHeureFin] = useState('18:00');
  const [duplicateDates, setDuplicateDates] = useState<Date[]>([]);
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
      setDate(new Date(mission.date));
      setHeureDebut(mission.heure_debut);
      setHeureFin(mission.heure_fin);
      setValue('description', mission.description || '');
      setValue('montant', mission.montant?.toString() || '');
      setValue('statut', mission.statut);
    } else if (selectedDate) {
      setDate(selectedDate);
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
    if (!date) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une date',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const missionData = {
        client_id: data.client_id,
        nannysitter_id: data.nannysitter_id || null,
        heure_debut: heureDebut,
        heure_fin: heureFin,
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
        // Créer toutes les missions (principale + dupliquées)
        const allDates = [date, ...duplicateDates];
        const missions = allDates.map(missionDate => ({
          ...missionData,
          date: format(missionDate, 'yyyy-MM-dd'),
        }));

        const { error } = await supabase
          .from('missions')
          .insert(missions);

        if (error) throw error;
        toast({ title: `${missions.length} mission(s) créée(s) avec succès` });
      }

      reset();
      setDuplicateDates([]);
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

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={fr}
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {!mission && (
            <div className="space-y-2">
              <Label>Dupliquer sur d'autres dates</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" type="button">
                    <Copy className="mr-2 h-4 w-4" />
                    {duplicateDates.length > 0 ? `${duplicateDates.length} date(s) sélectionnée(s)` : 'Sélectionner des dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={duplicateDates}
                    onSelect={(dates) => {
                      // Empêcher la sélection de la date principale
                      const filteredDates = dates?.filter(d => 
                        !date || format(d, 'yyyy-MM-dd') !== format(date, 'yyyy-MM-dd')
                      ) || [];
                      setDuplicateDates(filteredDates);
                    }}
                    disabled={(day) => date ? format(day, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd') : false}
                    locale={fr}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {duplicateDates.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {duplicateDates.length} mission(s) supplémentaire(s) seront créées
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heure_debut">Heure de début *</Label>
              <Select value={heureDebut} onValueChange={setHeureDebut}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 48 }, (_, i) => {
                    const hour = Math.floor(i / 2);
                    const minute = i % 2 === 0 ? '00' : '30';
                    const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                    return <SelectItem key={time} value={time}>{time}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="heure_fin">Heure de fin *</Label>
              <Select value={heureFin} onValueChange={setHeureFin}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 48 }, (_, i) => {
                    const hour = Math.floor(i / 2);
                    const minute = i % 2 === 0 ? '00' : '30';
                    const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                    return <SelectItem key={time} value={time}>{time}</SelectItem>;
                  })}
                </SelectContent>
              </Select>
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
