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

  const getMissionsForDayAndHour = (day: Date, hour: number) => {
    return missions.filter((mission) => {
      const missionStart = new Date(mission.date_debut);
      const missionEnd = new Date(mission.date_fin);
      const currentDay = startOfDay(day);
      
      const isOnDay = isWithinInterval(currentDay, {
        start: startOfDay(missionStart),
        end: startOfDay(missionEnd)
      });

      if (!isOnDay) return false;

      const missionHour = missionStart.getHours();
      return missionHour === hour;
    });
  };

  const getMissionDuration = (mission: any) => {
    const start = new Date(mission.date_debut);
    const end = new Date(mission.date_fin);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    return Math.max(1, Math.ceil(diffHours));
  };

  return (
    <div className="flex border rounded-lg overflow-hidden bg-background">
      {/* Hours column */}
      <div className="w-20 border-r bg-muted/30">
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
          
          return (
            <div key={day.toISOString()} className="border-r last:border-r-0">
              {/* Day header */}
              <div className={`h-16 border-b px-2 py-2 text-center ${isToday ? 'bg-primary/10' : ''}`}>
                <div className="text-xs text-muted-foreground capitalize">
                  {format(day, 'EEE', { locale: fr })}
                </div>
                <div className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>
                  {format(day, 'd')}
                </div>
              </div>

              {/* Hour cells */}
              <div className="relative">
                {hours.map((hour) => {
                  const hourMissions = getMissionsForDayAndHour(day, hour);
                  
                  return (
                    <div
                      key={hour}
                      onClick={() => onDayClick(day)}
                      className="h-16 border-b hover:bg-muted/30 cursor-pointer transition-colors relative"
                    >
                      {hourMissions.map((mission) => {
                        const duration = getMissionDuration(mission);
                        const height = duration * 64; // 64px per hour
                        
                        return (
                          <div
                            key={mission.id}
                            onClick={(e) => onMissionClick(mission, e)}
                            className={`absolute inset-x-1 ${statusColors[mission.statut as keyof typeof statusColors]} text-white rounded p-1 text-xs overflow-hidden hover:opacity-80 cursor-pointer`}
                            style={{ height: `${height}px` }}
                          >
                            <div className="font-medium truncate">
                              {mission.clients?.prenom} {mission.clients?.nom}
                            </div>
                            <div className="text-xs opacity-90">
                              {format(new Date(mission.date_debut), 'HH:mm')} - {format(new Date(mission.date_fin), 'HH:mm')}
                            </div>
                            {mission.nannysitters && (
                              <div className="text-xs opacity-80 truncate">
                                {mission.nannysitters.prenom} {mission.nannysitters.nom}
                              </div>
                            )}
                          </div>
                        );
                      })}
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
