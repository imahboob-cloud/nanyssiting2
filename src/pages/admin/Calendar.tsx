import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { MissionDialog } from '@/components/admin/MissionDialog';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadMissions();
  }, [currentDate]);

  const loadMissions = async () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);

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

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getMissionsForDay = (day: Date) => {
    return missions.filter((mission) => 
      isSameDay(new Date(mission.date_debut), day)
    );
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

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

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
          <Button variant="outline" size="icon" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-xl font-semibold capitalize">
            {format(currentDate, 'MMMM yyyy', { locale: fr })}
          </h3>
          <Button variant="outline" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
              {day}
            </div>
          ))}

          {days.map((day, idx) => {
            const dayMissions = getMissionsForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);

            return (
              <div
                key={idx}
                onClick={() => handleDayClick(day)}
                className={`min-h-[100px] p-2 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                  !isCurrentMonth ? 'opacity-40' : ''
                } ${isToday ? 'border-primary' : ''}`}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayMissions.map((mission) => (
                    <div
                      key={mission.id}
                      onClick={(e) => handleMissionClick(mission, e)}
                      className={`text-xs p-1 rounded ${statusColors[mission.statut as keyof typeof statusColors]} text-white truncate hover:opacity-80`}
                    >
                      {mission.clients?.nom} {format(new Date(mission.date_debut), 'HH:mm')}
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
