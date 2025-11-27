import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, FileText, Euro, TrendingUp, CalendarDays, ArrowLeft } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';

type NannySitter = Tables<'nannysitters'>;
type Mission = Tables<'missions'> & {
  clients?: {
    nom: string;
    prenom: string;
  } | null;
};

interface NannySitterMissionsViewProps {
  nannysitter: NannySitter;
  onBack: () => void;
}

export function NannySitterMissionsView({ nannysitter, onBack }: NannySitterMissionsViewProps) {
  const [loading, setLoading] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  }));
  const { toast } = useToast();

  useEffect(() => {
    if (nannysitter && dateRange?.from && dateRange?.to) {
      loadMissions();
    }
  }, [nannysitter, dateRange]);

  const loadMissions = async () => {
    if (!nannysitter || !dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const start = format(dateRange.from, 'yyyy-MM-dd');
      const end = format(dateRange.to, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('missions')
        .select(`
          *,
          clients (nom, prenom)
        `)
        .eq('nannysitter_id', nannysitter.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      if (error) throw error;
      setMissions(data || []);
    } catch (error) {
      console.error('Error loading missions:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les missions',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (): number => {
    return missions.reduce((total, mission) => {
      const amount = calculateMissionAmount(mission);
      return total + amount;
    }, 0);
  };

  const calculateMissionAmount = (mission: Mission): number => {
    const heureDebut = normalizeTime(mission.heure_debut);
    const heureFin = normalizeTime(mission.heure_fin);
    const hours = calculateHours(heureDebut, heureFin);
    const roundedHours = roundUpToNearestHalf(hours);
    
    const tarifHoraire = nannysitter?.tarif_horaire ? parseFloat(String(nannysitter.tarif_horaire)) : 0;
    
    return roundedHours * tarifHoraire;
  };

  const normalizeTime = (time: string): string => {
    return time.substring(0, 5);
  };

  const roundUpToNearestHalf = (value: number): number => {
    return Math.ceil(value * 2) / 2;
  };

  const calculateHours = (heureDebut: string, heureFin: string): number => {
    const [startHour, startMin] = heureDebut.split(':').map(Number);
    const [endHour, endMin] = heureFin.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  };

  const getMissionStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      planifie: 'bg-blue-500',
      a_attribuer: 'bg-yellow-500',
      en_cours: 'bg-orange-500',
      termine: 'bg-green-500',
      annule: 'bg-red-500',
    };
    
    const statusLabels: Record<string, string> = {
      planifie: 'Planifié',
      a_attribuer: 'À attribuer',
      en_cours: 'En cours',
      termine: 'Terminé',
      annule: 'Annulé',
    };

    return (
      <Badge className={statusColors[status] || 'bg-gray-500'}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const totalToPay = calculateTotal();
  const totalHours = missions.reduce((total, mission) => {
    const heureDebut = normalizeTime(mission.heure_debut);
    const heureFin = normalizeTime(mission.heure_fin);
    return total + calculateHours(heureDebut, heureFin);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Missions de {nannysitter.prenom} {nannysitter.nom}
          </h2>
        </div>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Période
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd MMMM yyyy", { locale: fr })} -{" "}
                      {format(dateRange.to, "dd MMMM yyyy", { locale: fr })}
                    </>
                  ) : (
                    format(dateRange.from, "dd MMMM yyyy", { locale: fr })
                  )
                ) : (
                  <span>Sélectionner une période</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={fr}
              />
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Missions</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{missions.length}</div>
            <p className="text-xs text-muted-foreground">
              Pour la période sélectionnée
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heures</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
            <p className="text-xs text-muted-foreground">
              Total des heures travaillées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Montant à payer</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalToPay.toFixed(2)} €</div>
            <p className="text-xs text-muted-foreground">
              {nannysitter.tarif_horaire ? `${nannysitter.tarif_horaire} €/h` : 'Tarif non défini'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Missions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Détail des missions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : missions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune mission pour cette période</p>
                <p className="text-sm mt-2">Essayez de sélectionner une autre plage de dates</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {missions.map((mission) => (
                <Card key={mission.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">
                            {format(new Date(mission.date), 'EEEE dd MMMM yyyy', { locale: fr })}
                          </span>
                          <Badge variant="outline" className="font-mono">
                            {normalizeTime(mission.heure_debut)} - {normalizeTime(mission.heure_fin)}
                          </Badge>
                          {getMissionStatusBadge(mission.statut || 'planifie')}
                        </div>
                        
                        {mission.clients && (
                          <p className="text-sm text-muted-foreground">
                            Client: {mission.clients.prenom} {mission.clients.nom}
                          </p>
                        )}
                        
                        {mission.description && (
                          <p className="text-sm text-muted-foreground italic">Note: {mission.description}</p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {calculateHours(normalizeTime(mission.heure_debut), normalizeTime(mission.heure_fin)).toFixed(1)}h
                          {' → '}
                          {roundUpToNearestHalf(calculateHours(normalizeTime(mission.heure_debut), normalizeTime(mission.heure_fin))).toFixed(1)}h
                        </p>
                        <p className="text-lg font-bold text-primary">
                          {calculateMissionAmount(mission).toFixed(2)} €
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
