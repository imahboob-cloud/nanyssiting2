import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Columns3, CalendarDays } from 'lucide-react';
import { MissionDialog } from '@/components/admin/MissionDialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, startOfDay, endOfDay, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

type CalendarView = 'month' | 'week' | 'day';

const statusColors = {
  planifie: 'bg-blue-500',
  en_cours: 'bg-yellow-500',
  termine: 'bg-green-500',
  annule: 'bg-gray-500',
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
      .gte('date_debut', start.toISOString())
      .lte('date_debut', end.toISOString())
      .order('date_debut', { ascending: true });

    if (error) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setMissions(data || []);
    }
  };

  const getDaysToDisplay = () => {
    if (view === 'month') {
      return eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate),
      });
    } else if (view === 'week') {
      return eachDayOfInterval({
        start: startOfWeek(currentDate, { locale: fr }),
        end: endOfWeek(currentDate, { locale: fr }),
      });
    } else {
      return [currentDate];
    }
  };

  const getMissionsForDay = (day: Date) => {
    return missions.filter((mission) => {
      const missionStart = startOfDay(new Date(mission.date_debut));
      const missionEnd = startOfDay(new Date(mission.date_fin));
      const currentDay = startOfDay(day);
      
      return isWithinInterval(currentDay, {
        start: missionStart,
        end: missionEnd
      });
    });
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

  const days = getDaysToDisplay();

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

        <div className={`grid gap-2 ${view === 'month' ? 'grid-cols-7' : view === 'week' ? 'grid-cols-7' : 'grid-cols-1'}`}>
          {view !== 'day' && ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {days.map((day, idx) => {
            const dayMissions = getMissionsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = view === 'month' ? isSameMonth(day, currentDate) : true;

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day)}
                className={`${view === 'day' ? 'min-h-[500px]' : 'min-h-[100px]'} p-2 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                  !isCurrentMonth ? 'opacity-40' : ''
                } ${isToday ? 'border-primary' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                  {view === 'day' ? format(day, 'EEEE d MMMM yyyy', { locale: fr }) : format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayMissions.map((mission) => (
                    <div
                      key={mission.id}
                      onClick={(e) => handleMissionClick(mission, e)}
                      className={`text-xs p-2 rounded ${statusColors[mission.statut as keyof typeof statusColors]} text-white hover:opacity-80 ${
                        view === 'day' ? '' : 'truncate'
                      }`}
                    >
                      <div className="font-medium">{mission.clients?.nom} {mission.clients?.prenom}</div>
                      <div>{format(new Date(mission.date_debut), 'HH:mm')} - {format(new Date(mission.date_fin), 'HH:mm')}</div>
                      {mission.nannysitters && (
                        <div className="text-xs opacity-90">{mission.nannysitters.prenom} {mission.nannysitters.nom}</div>
                      )}
                      {view === 'day' && mission.description && (
                        <div className="mt-1 text-xs opacity-90">{mission.description}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <MissionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mission={selectedMission}
        selectedDate={selectedDate || undefined}
        onSuccess={loadMissions}
      />
    </div>
  );
};

export default Calendar;
