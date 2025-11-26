import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Columns3, CalendarDays } from 'lucide-react';
import { MissionDialog } from '@/components/admin/MissionDialog';
import { MonthView } from '@/components/admin/calendar/MonthView';
import { WeekView } from '@/components/admin/calendar/WeekView';
import { DayView } from '@/components/admin/calendar/DayView';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

type CalendarView = 'month' | 'week' | 'day';

const statusColors = {
  planifie: 'bg-status-planned',
  en_cours: 'bg-status-in-progress',
  termine: 'bg-status-completed',
  annule: 'bg-status-cancelled',
};

const statusColorsAlt = {
  planifie: 'bg-status-planned-alt',
  en_cours: 'bg-status-in-progress-alt',
  termine: 'bg-status-completed-alt',
  annule: 'bg-status-cancelled-alt',
};

const statusLabels = {
  planifie: 'Planifié',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
};

const Calendar = () => {
  const [missions, setMissions] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadMissions();
  }, [currentDate, view]);

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
      // Ajouter une propriété colorIndex pour gérer les chevauchements
      const missionsWithColors = (data || []).map((mission: any, index: number, array: any[]) => {
        // Vérifier si cette mission chevauche la précédente
        let useAltColor = false;
        if (index > 0) {
          const prevMission = array[index - 1];
          if (
            mission.date === prevMission.date &&
            mission.heure_debut < prevMission.heure_fin
          ) {
            useAltColor = !prevMission.useAltColor;
          }
        }
        return { ...mission, useAltColor };
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
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette mission ?')) {
      return;
    }

    const { error } = await supabase
      .from('missions')
      .delete()
      .eq('id', missionId);

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
            statusColors={statusColors}
            statusColorsAlt={statusColorsAlt}
          />
        )}

        {view === 'week' && (
          <WeekView
            currentDate={currentDate}
            missions={missions}
            onDayClick={handleDayClick}
            onMissionClick={handleMissionClick}
            onDeleteMission={handleDeleteMission}
            statusColors={statusColors}
            statusColorsAlt={statusColorsAlt}
          />
        )}

        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            missions={missions}
            onDayClick={handleDayClick}
            onMissionClick={handleMissionClick}
            onDeleteMission={handleDeleteMission}
            statusColors={statusColors}
            statusColorsAlt={statusColorsAlt}
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
    </div>
  );
};

export default Calendar;
