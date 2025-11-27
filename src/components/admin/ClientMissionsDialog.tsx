import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, Clock, FileText, Euro, TrendingUp } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';
import { InvoiceDialog } from './InvoiceDialog';

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
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (client && open) {
      loadMissions();
    }
  }, [client, selectedMonth, open]);

  const loadMissions = async () => {
    if (!client) return;

    setLoading(true);
    try {
      const start = format(startOfMonth(selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(selectedMonth), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('missions')
        .select(`
          *,
          nannysitters (nom, prenom)
        `)
        .eq('client_id', client.id)
        .gte('date', start)
        .lte('date', end)
        .eq('statut', 'termine')
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

  const calculateTotal = () => {
    return missions.reduce((sum, mission) => sum + (mission.montant || 0), 0);
  };

  const handleGenerateInvoice = () => {
    if (!client || missions.length === 0) return;

    // Convert missions to invoice lines
    const lignes: InvoiceLine[] = missions.map(mission => ({
      date: mission.date,
      heure_debut: mission.heure_debut,
      heure_fin: mission.heure_fin,
      description: mission.description || 'Garde d\'enfants',
      prix_horaire: mission.montant ? mission.montant / calculateHours(mission.heure_debut, mission.heure_fin) : 0,
      total: mission.montant || 0,
    }));

    setInvoiceData({
      client_id: client.id,
      lignes,
      tva: 0,
      notes: `Facture pour les prestations du ${format(startOfMonth(selectedMonth), 'MMMM yyyy', { locale: fr })}`,
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

            {/* Month Selector */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-semibold">
                  {format(selectedMonth, 'MMMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                >
                  Mois précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMonth(new Date())}
                >
                  Mois actuel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                >
                  Mois suivant
                </Button>
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

            {/* Missions List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Détail des missions</h3>
                {missions.length > 0 && (
                  <Button onClick={handleGenerateInvoice} className="gap-2">
                    <Euro className="h-4 w-4" />
                    Générer une facture
                  </Button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : missions.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucune mission terminée pour ce mois</p>
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
                              <Badge variant="outline">
                                {mission.heure_debut} - {mission.heure_fin}
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
                              {calculateHours(mission.heure_debut, mission.heure_fin).toFixed(1)}h
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
