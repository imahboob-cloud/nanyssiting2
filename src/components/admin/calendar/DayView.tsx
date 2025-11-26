import { format, isWithinInterval, startOfDay, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';

interface DayViewProps {
  currentDate: Date;
  missions: any[];
  onDayClick: (date: Date) => void;
  onMissionClick: (mission: any, e: React.MouseEvent) => void;
  statusColors: Record<string, string>;
}

export function DayView({ currentDate, missions, onDayClick, onMissionClick, statusColors }: DayViewProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getMissionsForDay = () => {
    return missions.filter((mission) => {
      const missionStart = new Date(mission.date_debut);
      const missionEnd = new Date(mission.date_fin);
      const currentDay = startOfDay(currentDate);
      
      return isWithinInterval(currentDay, {
        start: startOfDay(missionStart),
        end: startOfDay(missionEnd)
      }) && isSameDay(missionStart, currentDate);
    });
  };

  const getMissionPosition = (mission: any) => {
    const start = new Date(mission.date_debut);
    const end = new Date(mission.date_fin);
    
    const startHour = start.getHours();
    const startMinutes = start.getMinutes();
    const topPosition = (startHour * 80) + (startMinutes / 60 * 80);
    
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const height = Math.max(1, diffHours) * 80;
    
    return { top: topPosition, height };
  };

  const dayMissions = getMissionsForDay();

  return (
    <div className="flex border rounded-lg overflow-hidden bg-background">
      {/* Hours column */}
      <div className="w-20 border-r bg-muted/30 flex-shrink-0">
        <div className="h-20 border-b flex items-center justify-center">
          <div className="text-xs text-muted-foreground">Heure</div>
        </div>
        {hours.map((hour) => (
          <div key={hour} className="h-20 border-b text-xs text-muted-foreground px-2 py-1 text-right">
            {hour.toString().padStart(2, '0')}:00
          </div>
        ))}
      </div>

      {/* Day column */}
      <div className="flex-1">
        {/* Day header */}
        <div className="h-20 border-b px-4 py-2 bg-primary/10">
          <div className="text-sm text-muted-foreground capitalize">
            {format(currentDate, 'EEEE', { locale: fr })}
          </div>
          <div className="text-2xl font-semibold text-primary">
            {format(currentDate, 'd MMMM yyyy', { locale: fr })}
          </div>
        </div>

        {/* Hour grid with missions */}
        <div className="relative" style={{ height: '1920px' }}>
          {/* Hour cells for clicking */}
          {hours.map((hour) => (
            <div
              key={hour}
              className="h-20 border-b hover:bg-muted/20 cursor-pointer transition-colors"
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setHours(hour, 0, 0, 0);
                onDayClick(newDate);
              }}
            />
          ))}

          {/* Missions overlay */}
          {dayMissions.map((mission) => {
            const { top, height } = getMissionPosition(mission);
            
            return (
              <div
                key={mission.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onMissionClick(mission, e);
                }}
                className={`absolute inset-x-2 ${statusColors[mission.statut as keyof typeof statusColors]} text-white rounded-lg p-3 overflow-hidden hover:opacity-80 cursor-pointer shadow-md z-10`}
                style={{ top: `${top}px`, height: `${height}px` }}
              >
                <div className="font-semibold text-base">
                  {mission.clients?.prenom} {mission.clients?.nom}
                </div>
                <div className="text-sm opacity-90 mt-1">
                  {format(new Date(mission.date_debut), 'HH:mm')} - {format(new Date(mission.date_fin), 'HH:mm')}
                </div>
                {mission.nannysitters && (
                  <div className="text-sm opacity-90 mt-1">
                    👤 {mission.nannysitters.prenom} {mission.nannysitters.nom}
                  </div>
                )}
                {mission.description && (
                  <div className="text-sm opacity-80 mt-2 line-clamp-2">
                    {mission.description}
                  </div>
                )}
                {mission.montant && (
                  <div className="text-sm font-medium mt-1">
                    {mission.montant}€
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
