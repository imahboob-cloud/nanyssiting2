import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Columns3, CalendarDays } from 'lucide-react';
import { MissionDialog } from '@/components/admin/MissionDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { MonthView } from '@/components/admin/calendar/MonthView';
import { WeekView } from '@/components/admin/calendar/WeekView';
import { DayView } from '@/components/admin/calendar/DayView';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

type CalendarView = 'month' | 'week' | 'day';

const statusColorValues: Record<string, string[]> = {
  planifie: [
    '18 87% 73%',
    '18 87% 65%',
    '18 87% 58%',
    '18 80% 70%',
    '25 85% 70%',
    '15 85% 68%',
    '20 82% 66%',
    '18 75% 60%',
    '22 80% 64%',
    '16 82% 62%',
  ],
  en_cours: [
    '45 93% 70%',
    '45 93% 62%',
    '45 93% 55%',
    '48 90% 68%',
    '42 90% 68%',
    '45 85% 60%',
    '47 88% 65%',
    '43 88% 58%',
    '46 80% 63%',
    '44 85% 57%',
  ],
  termine: [
    '164 50% 55%',
    '164 50% 47%',
    '164 50% 40%',
    '160 48% 53%',
    '168 48% 53%',
    '164 45% 45%',
    '162 52% 50%',
    '166 46% 42%',
    '164 48% 48%',
    '164 44% 38%',
  ],
  annule: [
    '0 0% 65%',
    '0 0% 55%',
    '0 0% 48%',
    '0 0% 62%',
    '0 0% 58%',
    '0 0% 52%',
    '0 0% 60%',
    '0 0% 50%',
    '0 0% 56%',
    '0 0% 45%',
  ],
};

const getStatusColor = (status: string, colorIndex: number) => {
  const colors = statusColorValues[status] || statusColorValues.planifie;
  return `hsl(${colors[colorIndex % 10]})`;
};

const statusLabels = {
  planifie: 'Planifié',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
};

const Calendar = () => {
  const [missions, setMissions] = useState<any[]>([]);
  const [tarifs, setTarifs] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [missionToDelete, setMissionToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTarifs();
  }, []);

  useEffect(() => {
    loadMissions();
  }, [currentDate, view]);

  const loadTarifs = async () => {
    const { data } = await supabase
      .from('tarifs')
      .select('*')
      .eq('actif', true);
    
    setTarifs(data || []);
  };

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
  const getAppropriateTarif = (date: string) => {
    const dayOfWeek = new Date(date).getDay();
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
  const calculateMissionAmount = (mission: any): number => {
    const heureDebut = normalizeTime(mission.heure_debut);
    const heureFin = normalizeTime(mission.heure_fin);
    const hours = calculateHours(heureDebut, heureFin);
    const tarif = getAppropriateTarif(mission.date);
    const prixHoraire = tarif ? parseFloat(tarif.tarif_horaire) : 0;
    return prixHoraire * hours;
  };

  const loadMissions = async () => {
    let start: Date;
    let end: Date;

    if (view === 'month') {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    } else if (view === 'week') {
      start = startOfWeek(currentDate, { locale: fr });
      end = endOfWeek(currentDate, { locale: fr });
    } else {
      start = startOfDay(currentDate);
      end = endOfDay(currentDate);
    }

    const { data, error } = await supabase
      .from('missions')
      .select(`
        *,
        clients (nom, prenom),
        nannysitters (nom, prenom)
      `)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'))
      .order('date', { ascending: true })
      .order('heure_debut', { ascending: true });

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // Détection sophistiquée des chevauchements pour assigner des index de couleur uniques
      const missionsWithColors = (data || []).map((mission: any) => {
        return { ...mission, colorIndex: 0 };
      });

      // Pour chaque date, calculer les chevauchements
      const dateGroups = missionsWithColors.reduce((acc: any, mission: any) => {
        if (!acc[mission.date]) acc[mission.date] = [];
        acc[mission.date].push(mission);
        return acc;
      }, {});

      Object.values(dateGroups).forEach((dayMissions: any) => {
        dayMissions.forEach((mission: any, idx: number) => {
          // Trouver toutes les missions qui chevauchent celle-ci
          const overlapping = dayMissions.filter((m: any, mIdx: number) => {
            if (mIdx >= idx) return false; // Ne regarder que les missions précédentes
            return m.heure_fin > mission.heure_debut;
          });

          // Trouver le premier index de couleur disponible
          const usedIndices = overlapping.map((m: any) => m.colorIndex);
          let colorIndex = 0;
          while (usedIndices.includes(colorIndex)) {
            colorIndex++;
          }
          mission.colorIndex = Math.min(colorIndex, 9); // Max 10 couleurs
        });
      });

      setMissions(missionsWithColors);
    }
  };


  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setSelectedMission(null);
    setDialogOpen(true);
  };

  const handleMissionClick = (mission: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMission(mission);
    setSelectedDate(null);
    setDialogOpen(true);
  };

  const handleDeleteMission = async (missionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMissionToDelete(missionId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!missionToDelete) return;

    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', missionToDelete);

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Mission supprimée avec succès',
      });
      loadMissions();
    }
    
    setDeleteDialogOpen(false);
    setMissionToDelete(null);
  };

  const previousPeriod = () => {
    if (view === 'month') {
      setCurrentDate(subMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 1));
    }
  };

  const nextPeriod = () => {
    if (view === 'month') {
      setCurrentDate(addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const getTitle = () => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: fr });
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { locale: fr });
      const end = endOfWeek(currentDate, { locale: fr });
      return `${format(start, 'd MMM', { locale: fr })} - ${format(end, 'd MMM yyyy', { locale: fr })}`;
    } else {
      return format(currentDate, 'EEEE d MMMM yyyy', { locale: fr });
    }
  };

  

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendrier</h2>
          <p className="text-muted-foreground">Gérez vos missions</p>
        </div>
        <Button onClick={() => { setSelectedDate(new Date()); setSelectedMission(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle mission
        </Button>
      </div>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" size="icon" onClick={previousPeriod}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-semibold capitalize">
              {getTitle()}
            </h3>
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={view === 'month' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('month')}
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'week' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('week')}
              >
                <Columns3 className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'day' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setView('day')}
              >
                <CalendarDays className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={nextPeriod}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {view === 'month' && (
          <MonthView
            currentDate={currentDate}
            missions={missions}
            onDayClick={handleDayClick}
            onMissionClick={handleMissionClick}
            onDeleteMission={handleDeleteMission}
            getStatusColor={getStatusColor}
            calculateMissionAmount={calculateMissionAmount}
          />
        )}

        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            missions={missions}
            onDayClick={handleDayClick}
            onMissionClick={handleMissionClick}
            onDeleteMission={handleDeleteMission}
            getStatusColor={getStatusColor}
            calculateMissionAmount={calculateMissionAmount}
          />
        )}

        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            missions={missions}
            onDayClick={handleDayClick}
            onMissionClick={handleMissionClick}
            onDeleteMission={handleDeleteMission}
            getStatusColor={getStatusColor}
            calculateMissionAmount={calculateMissionAmount}
          />
        )}
      </Card>

      <MissionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mission={selectedMission}
        selectedDate={selectedDate || undefined}
        onSuccess={loadMissions}
        onDelete={handleDeleteMission}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Supprimer la mission"
        description="Êtes-vous sûr de vouloir supprimer cette mission ? Cette action est irréversible."
        confirmText="Supprimer"
        cancelText="Annuler"
      />
    </div>
  );
};

export default Calendar;
