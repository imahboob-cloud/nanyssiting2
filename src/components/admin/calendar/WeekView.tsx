import { format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, isWithinInterval, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WeekViewProps {
  currentDate: Date;
  missions: any[];
  onDayClick: (date: Date) => void;
  onMissionClick: (mission: any, e: React.MouseEvent) => void;
  statusColors: Record<string, string>;
}

export function WeekView({ currentDate, missions, onDayClick, onMissionClick, statusColors }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { locale: fr });
  const weekEnd = endOfWeek(currentDate, { locale: fr });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getMissionsForDay = (day: Date) => {
    return missions.filter((mission) => {
      const missionStart = new Date(mission.date_debut);
      const missionEnd = new Date(mission.date_fin);
      const currentDay = startOfDay(day);
      
      return isWithinInterval(currentDay, {
        start: startOfDay(missionStart),
        end: startOfDay(missionEnd)
      });
    });
  };

  const getMissionPosition = (mission: any, day: Date) => {
    const start = new Date(mission.date_debut);
    const end = new Date(mission.date_fin);
    
    // Si c'est le premier jour de la mission, commencer à l'heure réelle
    if (isSameDay(start, day)) {
      const startHour = start.getHours();
      const startMinutes = start.getMinutes();
      const topPosition = (startHour * 64) + (startMinutes / 60 * 64);
      
      // Si la mission se termine le même jour
      if (isSameDay(start, end)) {
        const diffMs = end.getTime() - start.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        const height = Math.max(1, diffHours) * 64;
        return { top: topPosition, height };
      } else {
        // Sinon, aller jusqu'à minuit
        const height = (24 - startHour - (startMinutes / 60)) * 64;
        return { top: topPosition, height };
      }
    }
    // Si c'est le dernier jour de la mission
    else if (isSameDay(end, day)) {
      const endHour = end.getHours();
      const endMinutes = end.getMinutes();
      const height = (endHour + (endMinutes / 60)) * 64;
      return { top: 0, height };
    }
    // Si c'est un jour entre le début et la fin
    else {
      return { top: 0, height: 24 * 64 }; // Toute la journée
    }
  };

  return (
    <div className="flex border rounded-lg overflow-hidden bg-background">
      {/* Hours column */}
      <div className="w-20 border-r bg-muted/30 flex-shrink-0">
        <div className="h-16 border-b" /> {/* Header spacer */}
        {hours.map((hour) => (
          <div key={hour} className="h-16 border-b text-xs text-muted-foreground px-2 py-1 text-right">
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* Days columns */}
      <div className="flex-1 grid grid-cols-7">
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const dayMissions = getMissionsForDay(day);
          
          return (
            <div key={day.toISOString()} className="border-r last:border-r-0 relative">
              {/* Day header */}
              <div className={`h-16 border-b px-2 py-2 text-center ${isToday ? 'bg-primary/10' : ''}`}>
                <div className="text-xs text-muted-foreground capitalize">
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>

              {/* Hour grid (for visual guide only) */}
              <div className="relative" style={{ height: '1536px' }}>
                {hours.map((hour) => (
                  <div
                    key={hour}
                    className="h-16 border-b hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => {
                      const newDate = new Date(day);
                      newDate.setHours(hour, 0, 0, 0);
                      onDayClick(newDate);
                    }}
                  />
                ))}

                {/* Missions overlay */}
                {dayMissions.map((mission) => {
                  const { top, height } = getMissionPosition(mission, day);
                  
                  return (
                    <div
                      key={mission.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMissionClick(mission, e);
                      }}
                      className={`absolute inset-x-1 ${statusColors[mission.statut as keyof typeof statusColors]} text-white rounded p-1 text-xs overflow-hidden hover:opacity-80 cursor-pointer shadow-sm z-10`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="font-medium truncate">
                        {mission.clients?.prenom} {mission.clients?.nom}
                      </div>
                      <div className="text-xs opacity-90">
                        {format(new Date(mission.date_debut), 'HH:mm')} - {format(new Date(mission.date_fin), 'HH:mm')}
                      </div>
                      {mission.nannysitters && (
                        <div className="text-xs opacity-80 truncate">
                          {mission.nannysitters.prenom}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
