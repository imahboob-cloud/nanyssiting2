import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, FileText, Euro, TrendingUp, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import type { DateRange } from 'react-day-picker';
import { InvoiceDialog } from './InvoiceDialog';
import { cn } from '@/lib/utils';

type Client = Tables<'clients'>;
type Mission = Tables<'missions'> & {
  nannysitters?: {
    nom: string;
    prenom: string;
  } | null;
};

interface InvoiceLine {
  date: string;
  heure_debut: string;
  heure_fin: string;
  description: string;
  prix_horaire: number;
  total: number;
}

interface ClientMissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client | null;
}

export function ClientMissionsDialog({ open, onOpenChange, client }: ClientMissionsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [tarifs, setTarifs] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  }));
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTarifs();
  }, []);

  useEffect(() => {
    if (client && open && dateRange?.from && dateRange?.to) {
      loadMissions();
    }
  }, [client, dateRange, open]);

  const loadTarifs = async () => {
    try {
      const { data, error } = await supabase
        .from('tarifs')
        .select('*')
        .eq('actif', true);

      if (error) throw error;
      setTarifs(data || []);
    } catch (error) {
      console.error('Error loading tarifs:', error);
    }
  };

  const loadMissions = async () => {
    if (!client || !dateRange?.from || !dateRange?.to) return;

    setLoading(true);
    try {
      const start = format(dateRange.from, 'yyyy-MM-dd');
      const end = format(dateRange.to, 'yyyy-MM-dd');

      console.log('Fetching missions for client:', client.id, 'from', start, 'to', end);

      const { data, error } = await supabase
        .from('missions')
        .select(`
          *,
          nannysitters (nom, prenom)
        `)
        .eq('client_id', client.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      if (error) throw error;
      
      console.log('Missions fetched:', data?.length || 0);
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

  const calculateTotal = () => {
    return missions.reduce((sum, mission) => sum + (mission.montant || 0), 0);
  };

  // Normalize time format from "HH:MM:SS" to "HH:MM"
  const normalizeTime = (time: string): string => {
    return time.substring(0, 5);
  };

  // Round up to nearest half hour
  const roundUpToNearestHalf = (value: number): number => {
    return Math.ceil(value * 2) / 2;
  };

  // Get description based on day of week
  const getDescription = (date: string): string => {
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
    return isWeekend ? 'Babysitting en week-end' : 'Babysitting en semaine';
  };

  // Get appropriate tarif based on day of week
  const getAppropriateTarif = (date: string) => {
    const dayOfWeek = new Date(date).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    // Filter tarifs based on day type
    const appropriateTarifs = tarifs.filter(t => 
      t.type_jour === 'tous' || 
      (isWeekend && t.type_jour === 'weekend') || 
      (!isWeekend && t.type_jour === 'semaine')
    );
    
    // Prioritize specific day type over 'tous'
    const specificTarif = appropriateTarifs.find(t => 
      isWeekend ? t.type_jour === 'weekend' : t.type_jour === 'semaine'
    );
    
    return specificTarif || appropriateTarifs[0];
  };

  const handleGenerateInvoice = () => {
    if (!client || missions.length === 0) return;

    // Convert missions to invoice lines
    const lignes: InvoiceLine[] = missions.map(mission => {
      const heureDebut = normalizeTime(mission.heure_debut);
      const heureFin = normalizeTime(mission.heure_fin);
      const hours = calculateHours(heureDebut, heureFin);
      
      // Get the appropriate tarif for this date
      const tarif = getAppropriateTarif(mission.date);
      const prixHoraire = tarif ? parseFloat(tarif.tarif_horaire) : 0;

      return {
        date: mission.date,
        heure_debut: heureDebut,
        heure_fin: heureFin,
        description: getDescription(mission.date),
        prix_horaire: prixHoraire,
        total: prixHoraire * hours,
      };
    });

    const dateRangeText = dateRange?.from && dateRange?.to
      ? `du ${format(dateRange.from, 'dd/MM/yyyy')} au ${format(dateRange.to, 'dd/MM/yyyy')}`
      : '';

    setInvoiceData({
      client_id: client.id,
      lignes,
      tva: 0,
      notes: `Facture pour les prestations ${dateRangeText}`,
      quote_id: null,
    });

    setInvoiceDialogOpen(true);
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

  if (!client) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Missions de {client.prenom} {client.nom}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Client Info Card */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader>
                <CardTitle className="text-lg">Informations Client</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Nom complet</p>
                  <p className="font-semibold">{client.prenom} {client.nom}</p>
                </div>
                {client.email && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-semibold">{client.email}</p>
                  </div>
                )}
                {client.telephone && (
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-semibold">{client.telephone}</p>
                  </div>
                )}
                {client.ville && (
                  <div>
                    <p className="text-sm text-muted-foreground">Localisation</p>
                    <p className="font-semibold">{client.code_postal} {client.ville}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Date Range Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <span className="font-semibold">
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                    : 'Sélectionner une période'}
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange({
                    from: startOfMonth(new Date()),
                    to: endOfMonth(new Date())
                  })}
                >
                  Mois actuel
                </Button>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Calendar className="h-4 w-4" />
                      Choisir les dates
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <CalendarComponent
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                      locale={fr}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Missions terminées</p>
                      <p className="text-3xl font-bold">{missions.length}</p>
                    </div>
                    <FileText className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Heures totales</p>
                      <p className="text-3xl font-bold">
                        {missions.reduce((sum, m) => sum + calculateHours(m.heure_debut, m.heure_fin), 0).toFixed(1)}h
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary bg-gradient-to-br from-primary/10 to-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Montant total</p>
                      <p className="text-3xl font-bold text-primary">{calculateTotal().toFixed(2)} €</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Generate Invoice Button */}
            {missions.length > 0 && (
              <div className="flex justify-end">
                <Button 
                  onClick={handleGenerateInvoice} 
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                >
                  <Euro className="h-5 w-5" />
                  Générer une facture ({calculateTotal().toFixed(2)} €)
                </Button>
              </div>
            )}

            {/* Missions List */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Détail des missions ({missions.length})</h3>

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
                            
                            {mission.description && (
                              <p className="text-sm text-muted-foreground">{mission.description}</p>
                            )}
                            
                            {mission.nannysitters && (
                              <p className="text-sm text-muted-foreground">
                                Avec {mission.nannysitters.prenom} {mission.nannysitters.nom}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">
                              {calculateHours(normalizeTime(mission.heure_debut), normalizeTime(mission.heure_fin)).toFixed(1)}h
                            </p>
                            <p className="text-lg font-bold text-primary">
                              {mission.montant?.toFixed(2)} €
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        quoteData={invoiceData}
        onSuccess={() => {
          setInvoiceDialogOpen(false);
          toast({
            title: 'Facture générée',
            description: 'La facture a été créée avec succès',
          });
          onOpenChange(false);
        }}
      />
    </>
  );
}
