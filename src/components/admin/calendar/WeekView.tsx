import { format, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  missions: any[];
  onDayClick: (date: Date) => void;
  onMissionClick: (mission: any, e: React.MouseEvent) => void;
  onDeleteMission: (missionId: string, e: React.MouseEvent) => void;
  getStatusColor: (status: string, colorIndex: number) => string;
}

export function WeekView({ currentDate, missions, onDayClick, onMissionClick, onDeleteMission, getStatusColor }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { locale: fr });
  const weekEnd = endOfWeek(currentDate, { locale: fr });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getMissionsForDay = (day: Date) => {
    return missions.filter((mission) => {
      const missionDate = parseISO(mission.date);
      return isSameDay(missionDate, day);
    });
  };

  const getMissionPosition = (mission: any) => {
    const [heureDebut, minuteDebut] = mission.heure_debut.split(':').map(Number);
    const [heureFin, minuteFin] = mission.heure_fin.split(':').map(Number);
    
    const topPosition = (heureDebut * 64) + (minuteDebut / 60 * 64);
    const durationHours = (heureFin + minuteFin / 60) - (heureDebut + minuteDebut / 60);
    const height = Math.max(1, durationHours) * 64;
    
    return { top: topPosition, height };
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

              {/* Hour grid */}
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
                  const { top, height } = getMissionPosition(mission);
                  const colorClass = getStatusColor(mission.statut, mission.colorIndex || 0);
                  
                  return (
                    <div
                      key={mission.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMissionClick(mission, e);
                      }}
                      className={`absolute inset-x-1 ${colorClass} text-white rounded p-1 text-xs overflow-hidden hover:opacity-90 cursor-pointer shadow-md z-10 flex items-start justify-between group border-2 border-white`}
                      style={{ 
                        top: `${top}px`, 
                        height: `${height}px`,
                        left: `${4 + (mission.colorIndex || 0) * 2}px`,
                        right: `${4}px`
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {mission.clients?.prenom} {mission.clients?.nom}
                        </div>
                        <div className="text-xs opacity-90">
                          {mission.heure_debut?.slice(0, 5)} - {mission.heure_fin?.slice(0, 5)}
                        </div>
                        {mission.nannysitters && (
                          <div className="text-xs opacity-80 truncate">
                            {mission.nannysitters.prenom}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => onDeleteMission(mission.id, e)}
                        className="opacity-0 group-hover:opacity-100 ml-1 hover:text-red-200 transition-opacity flex-shrink-0"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
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
