import { format, eachDayOfInterval, startOfMonth, endOfMonth, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';

interface MonthViewProps {
  currentDate: Date;
  missions: any[];
  onDayClick: (date: Date) => void;
  onMissionClick: (mission: any, e: React.MouseEvent) => void;
  onDeleteMission: (missionId: string, e: React.MouseEvent) => void;
  statusColors: Record<string, string>;
}

export function MonthView({ currentDate, missions, onDayClick, onMissionClick, onDeleteMission, statusColors }: MonthViewProps) {
  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getMissionsForDay = (day: Date) => {
    return missions.filter((mission) => {
      const missionDate = parseISO(mission.date);
      return isSameDay(missionDate, day);
    });
  };

  return (
    <>
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
              onClick={() => onDayClick(day)}
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
                    onClick={(e) => onMissionClick(mission, e)}
                    className={`text-xs p-1 rounded ${statusColors[mission.statut as keyof typeof statusColors]} text-white truncate hover:opacity-80 flex items-center justify-between group`}
                  >
                    <span className="truncate flex-1">
                      {mission.clients?.nom} {mission.heure_debut?.slice(0, 5)}
                    </span>
                    <button
                      onClick={(e) => onDeleteMission(mission.id, e)}
                      className="opacity-0 group-hover:opacity-100 ml-1 hover:text-red-200 transition-opacity flex-shrink-0"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
