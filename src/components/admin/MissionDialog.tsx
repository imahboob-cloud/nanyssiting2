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
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon, Copy, Trash2 } from 'lucide-react';
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
  onDelete?: (missionId: string) => void;
}

export function MissionDialog({ open, onOpenChange, mission, selectedDate, onSuccess, onDelete }: MissionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [nannysitters, setNannysitters] = useState<any[]>([]);
  const [tarifs, setTarifs] = useState<any[]>([]);
  const [date, setDate] = useState<Date | undefined>(mission ? new Date(mission.date) : selectedDate);
  const [heureDebut, setHeureDebut] = useState('09:00');
  const [heureFin, setHeureFin] = useState('18:00');
  const [selectedDates, setSelectedDates] = useState<Date[]>(selectedDate && !mission ? [selectedDate] : []);
  const [dateTimeMap, setDateTimeMap] = useState<Map<string, { heureDebut: string; heureFin: string }>>(new Map());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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
    loadTarifs();
  }, []);

  // Normalize time format from "HH:MM:SS" to "HH:MM"
  const normalizeTime = (time: string): string => {
    return time.substring(0, 5);
  };

  // Calculate hours between two times
  const calculateHours = (heureDebut: string, heureFin: string): number => {
    const [startHour, startMin] = heureDebut.split(':').map(Number);
    const [endHour, endMin] = heureFin.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  };

  // Get appropriate tarif based on day of week
  const getAppropriateTarif = (date: Date) => {
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    const appropriateTarifs = tarifs.filter(t => 
      t.type_jour === 'tous' || 
      (isWeekend && t.type_jour === 'weekend') || 
      (!isWeekend && t.type_jour === 'semaine')
    );
    
    const specificTarif = appropriateTarifs.find(t => 
      isWeekend ? t.type_jour === 'weekend' : t.type_jour === 'semaine'
    );
    
    return specificTarif || appropriateTarifs[0];
  };

  // Calculate mission amount based on tarifs
  const calculateMissionAmount = (): number => {
    if (!date) return 0;
    const hours = calculateHours(heureDebut, heureFin);
    const tarif = getAppropriateTarif(date);
    const prixHoraire = tarif ? parseFloat(tarif.tarif_horaire) : 0;
    return prixHoraire * hours;
  };

  useEffect(() => {
    if (mission) {
      setValue('client_id', mission.client_id);
      setValue('nannysitter_id', mission.nannysitter_id || '');
      setDate(new Date(mission.date));
      setHeureDebut(normalizeTime(mission.heure_debut));
      setHeureFin(normalizeTime(mission.heure_fin));
      setValue('description', mission.description || '');
      // Calculate the correct amount based on tarifs instead of using DB value
      const calculatedAmount = calculateMissionAmount();
      setValue('montant', calculatedAmount > 0 ? calculatedAmount.toFixed(2) : '');
      setValue('statut', mission.statut);
    } else if (selectedDate) {
      // Initialize with selected date and default times
      setSelectedDates([selectedDate]);
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      setDateTimeMap(new Map([[dateKey, { heureDebut: '09:00', heureFin: '18:00' }]]));
    }
  }, [mission, selectedDate, setValue, tarifs]);

  // Auto-save when nannysitter changes (only for existing missions)
  useEffect(() => {
    if (!mission) return; // Only for editing existing missions
    
    const currentNannysitterId = watch('nannysitter_id');
    const originalNannysitterId = mission.nannysitter_id || '';
    
    // Only update if the value has actually changed
    if (currentNannysitterId !== originalNannysitterId) {
      const autoSave = async () => {
        try {
          const { error } = await supabase
            .from('missions')
            .update({ nannysitter_id: currentNannysitterId || null })
            .eq('id', mission.id);

          if (error) throw error;
          
          toast({ title: 'NannySitter mise à jour automatiquement' });
          onSuccess();
        } catch (error: any) {
          toast({
            title: 'Erreur',
            description: error.message,
            variant: 'destructive',
          });
        }
      };
      
      autoSave();
    }
  }, [watch('nannysitter_id'), mission]);

  // Recalculate amount when date or hours change
  useEffect(() => {
    if (date && heureDebut && heureFin && tarifs.length > 0) {
      const amount = calculateMissionAmount();
      if (amount > 0) {
        setValue('montant', amount.toFixed(2));
      }
    }
  }, [date, heureDebut, heureFin, tarifs, setValue]);

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

  const loadTarifs = async () => {
    const { data } = await supabase
      .from('tarifs')
      .select('*')
      .eq('actif', true);
    
    setTarifs(data || []);
  };

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!mission || !onDelete) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', mission.id);

      if (error) throw error;
      
      toast({ title: 'Mission supprimée avec succès' });
      reset();
      setDeleteDialogOpen(false);
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

  const onSubmit = async (data: MissionFormData) => {
    if (mission) {
      // Mode édition - comportement existant
      if (!date) {
        toast({
          title: 'Erreur',
          description: 'Veuillez sélectionner une date',
          variant: 'destructive',
        });
        return;
      }
    } else {
      // Mode création - vérifier qu'au moins une date est sélectionnée
      if (selectedDates.length === 0) {
        toast({
          title: 'Erreur',
          description: 'Veuillez sélectionner au moins une date',
          variant: 'destructive',
        });
        return;
      }
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
        // Créer toutes les missions avec horaires personnalisés
        const missions = selectedDates.map(missionDate => {
          const dateKey = format(missionDate, 'yyyy-MM-dd');
          const customTimes = dateTimeMap.get(dateKey) || { heureDebut: '09:00', heureFin: '18:00' };
          
          const hours = calculateHours(customTimes.heureDebut, customTimes.heureFin);
          const tarif = getAppropriateTarif(missionDate);
          const prixHoraire = tarif ? parseFloat(tarif.tarif_horaire) : 0;
          const montant = prixHoraire * hours;

          return {
            client_id: data.client_id,
            nannysitter_id: data.nannysitter_id || null,
            date: dateKey,
            heure_debut: customTimes.heureDebut,
            heure_fin: customTimes.heureFin,
            description: data.description || null,
            montant: montant > 0 ? montant : null,
            statut: data.statut,
          };
        });

        const { error } = await supabase
          .from('missions')
          .insert(missions);

        if (error) throw error;
        toast({ title: `${missions.length} mission(s) créée(s) avec succès` });
      }

      reset();
      setSelectedDates([]);
      setDateTimeMap(new Map());
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

          {mission ? (
            // Mode édition - affichage classique
            <>
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
            </>
          ) : (
            // Mode création - sélection multiple avec horaires
            <div className="space-y-2">
              <Label>Sélectionner des dates *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start" type="button">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDates.length > 0 ? `${selectedDates.length} date(s) sélectionnée(s)` : 'Sélectionner des dates'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="multiple"
                    selected={selectedDates}
                    onSelect={(dates) => setSelectedDates(dates || [])}
                    locale={fr}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {selectedDates.length > 0 && (
                <div className="mt-4 space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Horaires pour chaque date :
                  </p>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {selectedDates.map((selectedDate) => {
                      const dateKey = format(selectedDate, 'yyyy-MM-dd');
                      const customTime = dateTimeMap.get(dateKey) || { heureDebut: '09:00', heureFin: '18:00' };
                      
                      return (
                        <div key={dateKey} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                          <div className="font-medium text-sm">
                            {format(selectedDate, "EEEE dd MMMM yyyy", { locale: fr })}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Début</Label>
                              <Select 
                                value={customTime.heureDebut} 
                                onValueChange={(value) => {
                                  const newMap = new Map(dateTimeMap);
                                  newMap.set(dateKey, { ...customTime, heureDebut: value });
                                  setDateTimeMap(newMap);
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
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
                            <div className="space-y-1">
                              <Label className="text-xs">Fin</Label>
                              <Select 
                                value={customTime.heureFin} 
                                onValueChange={(value) => {
                                  const newMap = new Map(dateTimeMap);
                                  newMap.set(dateKey, { ...customTime, heureFin: value });
                                  setDateTimeMap(newMap);
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

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
            <Label htmlFor="montant">Montant calculé (€)</Label>
            {mission ? (
              <Input 
                type="number" 
                step="0.01" 
                {...register('montant')} 
                placeholder="0.00"
                disabled
                className="bg-muted"
              />
            ) : (
              <div className="text-sm text-muted-foreground p-3 border rounded-lg bg-muted/30">
                {selectedDates.length === 0 ? (
                  'Sélectionnez des dates pour voir le calcul'
                ) : (
                  <>
                    <div className="font-medium mb-2">Total estimé par mission :</div>
                    {selectedDates.map(selectedDate => {
                      const dateKey = format(selectedDate, 'yyyy-MM-dd');
                      const customTime = dateTimeMap.get(dateKey) || { heureDebut: '09:00', heureFin: '18:00' };
                      const hours = calculateHours(customTime.heureDebut, customTime.heureFin);
                      const tarif = getAppropriateTarif(selectedDate);
                      const prixHoraire = tarif ? parseFloat(tarif.tarif_horaire) : 0;
                      const montant = prixHoraire * hours;
                      
                      return (
                        <div key={dateKey} className="flex justify-between text-xs py-1">
                          <span>{format(selectedDate, "dd/MM/yyyy", { locale: fr })}</span>
                          <span className="font-medium">{montant.toFixed(2)} €</span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Montant calculé automatiquement selon les tarifs configurés
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea {...register('description')} placeholder="Description de la mission..." />
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {mission && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={loading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mission ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Supprimer la mission"
        description="Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </Dialog>
  );
}
