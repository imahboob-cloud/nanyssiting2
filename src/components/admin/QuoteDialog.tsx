import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon, Plus, Trash2, Copy, Download } from 'lucide-react';
import { format, parse, differenceInHours, differenceInMinutes, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const quoteSchema = z.object({
  client_id: z.string().min(1, 'Client requis'),
  date_validite: z.date().optional(),
  tva: z.string().optional(),
  notes: z.string().optional(),
  statut: z.enum(['brouillon', 'envoye', 'accepte', 'refuse', 'expire']),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

interface QuoteLine {
  date: string;
  heure_debut: string;
  heure_fin: string;
  description: string;
  prix_horaire: number;
  total: number;
}

interface QuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: any;
  onSuccess: () => void;
}

export function QuoteDialog({ open, onOpenChange, quote, onSuccess }: QuoteDialogProps) {
  const [loading, setLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [tarifs, setTarifs] = useState<any[]>([]);
  const [dateValidite, setDateValidite] = useState<Date | undefined>(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    return defaultDate;
  });
  const [lignes, setLignes] = useState<QuoteLine[]>([
    { date: format(new Date(), 'yyyy-MM-dd'), heure_debut: '09:00', heure_fin: '17:00', description: '', prix_horaire: 0, total: 0 }
  ]);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [selectedLigneIndex, setSelectedLigneIndex] = useState<number | null>(null);
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      statut: 'brouillon',
      tva: '0',
    },
  });

  useEffect(() => {
    loadClients();
    loadTarifs();
  }, []);

  // Initialize first line with appropriate tarif when tarifs are loaded
  useEffect(() => {
    if (tarifs.length > 0 && lignes.length === 1 && !lignes[0].description && !quote) {
      const todayDate = format(new Date(), 'yyyy-MM-dd');
      const appropriateTarif = getAppropriateTarif(todayDate);
      if (appropriateTarif) {
        setLignes([{
          date: todayDate,
          heure_debut: '09:00',
          heure_fin: '17:00',
          description: appropriateTarif.nom,
          prix_horaire: parseFloat(appropriateTarif.tarif_horaire),
          total: 0
        }]);
      }
    }
  }, [tarifs]);

  useEffect(() => {
    if (quote) {
      setValue('client_id', quote.client_id);
      setValue('statut', quote.statut);
      setValue('tva', quote.tva?.toString() || '0');
      setValue('notes', quote.notes || '');
      if (quote.date_validite) {
        setDateValidite(new Date(quote.date_validite));
      } else {
        const defaultDate = new Date();
        defaultDate.setDate(defaultDate.getDate() + 7);
        setDateValidite(defaultDate);
      }
      if (quote.lignes && Array.isArray(quote.lignes)) {
        setLignes(quote.lignes);
      }
    } else {
      // Reset to default date (+7 days) when creating new quote
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setDateValidite(defaultDate);
    }
  }, [quote, setValue]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nom', { ascending: true });
    
    if (!error && data) setClients(data);
  };

  const loadTarifs = async () => {
    const { data, error } = await supabase
      .from('tarifs')
      .select('*')
      .eq('actif', true)
      .order('nom', { ascending: true });
    
    if (!error && data) setTarifs(data);
  };

  const calculateHours = (heureDebut: string, heureFin: string): number => {
    try {
      const debut = parse(heureDebut, 'HH:mm', new Date());
      const fin = parse(heureFin, 'HH:mm', new Date());
      const totalMinutes = differenceInMinutes(fin, debut);
      return totalMinutes / 60;
    } catch {
      return 0;
    }
  };

  const getAppropriateTarif = (date: string) => {
    const dayOfWeek = getDay(new Date(date));
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
    
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

  const addLigne = () => {
    const lastLigne = lignes[lignes.length - 1];
    const newDate = lastLigne.date;
    const appropriateTarif = getAppropriateTarif(newDate);
    
    setLignes([...lignes, { 
      date: newDate, 
      heure_debut: lastLigne.heure_debut, 
      heure_fin: lastLigne.heure_fin, 
      description: appropriateTarif?.nom || '', 
      prix_horaire: appropriateTarif ? parseFloat(appropriateTarif.tarif_horaire) : 0, 
      total: 0 
    }]);
  };

  const openDuplicateDialog = (index: number) => {
    setSelectedLigneIndex(index);
    setSelectedDates([]);
    setDuplicateDialogOpen(true);
  };

  const confirmDuplicate = () => {
    if (selectedLigneIndex === null || selectedDates.length === 0) return;
    
    const ligne = lignes[selectedLigneIndex];
    const newLignes = selectedDates.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd');
      const appropriateTarif = getAppropriateTarif(dateStr);
      
      return {
        ...ligne,
        date: dateStr,
        description: appropriateTarif?.nom || ligne.description,
        prix_horaire: appropriateTarif ? parseFloat(appropriateTarif.tarif_horaire) : ligne.prix_horaire,
      };
    });
    
    setLignes([...lignes.slice(0, selectedLigneIndex + 1), ...newLignes, ...lignes.slice(selectedLigneIndex + 1)]);
    setDuplicateDialogOpen(false);
    setSelectedDates([]);
    setSelectedLigneIndex(null);
    toast({ title: `${newLignes.length} ligne(s) ajoutée(s)` });
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const updateLigne = (index: number, field: keyof QuoteLine, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    
    // Auto-select tarif when date changes
    if (field === 'date' && tarifs.length > 0) {
      const appropriateTarif = getAppropriateTarif(value);
      if (appropriateTarif) {
        newLignes[index].description = appropriateTarif.nom;
        newLignes[index].prix_horaire = parseFloat(appropriateTarif.tarif_horaire);
        // Recalculate total with new price
        const hours = calculateHours(newLignes[index].heure_debut, newLignes[index].heure_fin);
        newLignes[index].total = hours * newLignes[index].prix_horaire;
      }
    }
    
    if (field === 'heure_debut' || field === 'heure_fin' || field === 'prix_horaire') {
      const hours = calculateHours(newLignes[index].heure_debut, newLignes[index].heure_fin);
      newLignes[index].total = hours * newLignes[index].prix_horaire;
    }
    
    setLignes(newLignes);
  };

  const calculateTotals = () => {
    const montant_ht = lignes.reduce((sum, ligne) => sum + ligne.total, 0);
    const tvaValue = parseFloat(watch('tva') || '0');
    const montant_tva = (montant_ht * tvaValue) / 100;
    const montant_ttc = montant_ht + montant_tva;
    
    return { montant_ht, montant_tva, montant_ttc };
  };

  const generateQuoteNumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .like('numero', `DEV-${year}-%`);
    
    return `DEV-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const onSubmit = async (data: QuoteFormData) => {
    setLoading(true);
    try {
      const { montant_ht, montant_ttc } = calculateTotals();
      const tvaValue = parseFloat(data.tva || '0');

      const quoteData = {
        client_id: data.client_id,
        numero: quote?.numero || await generateQuoteNumber(),
        date_validite: dateValidite ? format(dateValidite, 'yyyy-MM-dd') : null,
        lignes: lignes as any,
        montant_ht,
        tva: tvaValue,
        montant_ttc,
        statut: data.statut,
        notes: data.notes || null,
      };

      if (quote) {
        const { error } = await supabase
          .from('quotes')
          .update(quoteData)
          .eq('id', quote.id);

        if (error) throw error;
        toast({ title: 'Devis mis à jour avec succès' });
      } else {
        const { error } = await supabase
          .from('quotes')
          .insert([quoteData]);

        if (error) throw error;
        toast({ title: 'Devis créé avec succès' });
      }

      reset();
      const todayDate = format(new Date(), 'yyyy-MM-dd');
      const appropriateTarif = getAppropriateTarif(todayDate);
      setLignes([{ 
        date: todayDate, 
        heure_debut: '09:00', 
        heure_fin: '17:00', 
        description: appropriateTarif?.nom || '', 
        prix_horaire: appropriateTarif ? parseFloat(appropriateTarif.tarif_horaire) : 0, 
        total: 0 
      }]);
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 7);
      setDateValidite(defaultDate);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const { montant_ht, montant_tva, montant_ttc } = calculateTotals();

  const handleDownloadPdf = async () => {
    if (!quote) {
      toast({
        title: 'Erreur',
        description: 'Veuillez d\'abord sauvegarder le devis',
        variant: 'destructive',
      });
      return;
    }

    setDownloadingPdf(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-quote-pdf', {
        body: { quoteId: quote.id },
      });

      if (error) throw error;

      if (data?.pdf) {
        const link = document.createElement('a');
        link.href = data.pdf;
        link.download = `Devis-${quote.numero}.pdf`;
        link.click();
        
        toast({
          title: 'PDF téléchargé',
          description: 'Le devis a été téléchargé avec succès',
        });
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de télécharger le PDF',
        variant: 'destructive',
      });
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{quote ? 'Modifier le devis' : 'Nouveau devis'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select onValueChange={(value) => setValue('client_id', value)} value={watch('client_id')}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nom} {client.prenom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Date de validité</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateValidite && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateValidite ? format(dateValidite, "PPP", { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateValidite}
                    onSelect={setDateValidite}
                    initialFocus
                    locale={fr}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lignes du devis *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une ligne
              </Button>
            </div>
            <div className="space-y-2">
              {lignes.map((ligne, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                  <div className="col-span-2">
                    <Label className="text-xs">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal h-9 text-xs",
                            !ligne.date && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {ligne.date ? format(new Date(ligne.date), "dd/MM/yy", { locale: fr }) : "Date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={ligne.date ? new Date(ligne.date) : undefined}
                          onSelect={(date) => updateLigne(index, 'date', date ? format(date, 'yyyy-MM-dd') : '')}
                          initialFocus
                          locale={fr}
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Début</Label>
                    <Select value={ligne.heure_debut} onValueChange={(value) => updateLigne(index, 'heure_debut', value)}>
                      <SelectTrigger className="h-9 text-xs px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 48 }, (_, i) => {
                          const hour = Math.floor(i / 2);
                          const minute = i % 2 === 0 ? '00' : '30';
                          const time = `${String(hour).padStart(2, '0')}:${minute}`;
                          return (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Fin</Label>
                    <Select value={ligne.heure_fin} onValueChange={(value) => updateLigne(index, 'heure_fin', value)}>
                      <SelectTrigger className="h-9 text-xs px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 48 }, (_, i) => {
                          const hour = Math.floor(i / 2);
                          const minute = i % 2 === 0 ? '00' : '30';
                          const time = `${String(hour).padStart(2, '0')}:${minute}`;
                          return (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Description</Label>
                    <Input
                      value={ligne.description}
                      disabled
                      className="h-9 text-xs bg-muted"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Prix/h</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ligne.prix_horaire}
                      onChange={(e) => updateLigne(index, 'prix_horaire', parseFloat(e.target.value) || 0)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Total</Label>
                    <Input
                      type="text"
                      value={`${ligne.total.toFixed(2)} €`}
                      disabled
                      className="h-9 text-xs bg-muted font-semibold"
                    />
                  </div>
                  <div className="col-span-2 flex gap-1 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => openDuplicateDialog(index)}
                      title="Dupliquer sur plusieurs dates"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => removeLigne(index)}
                      disabled={lignes.length === 1}
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tva">TVA (%)</Label>
              <Input type="number" step="0.01" {...register('tva')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="statut">Statut *</Label>
              <Select onValueChange={(value: any) => setValue('statut', value)} value={watch('statut')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="brouillon">Brouillon</SelectItem>
                  <SelectItem value="envoye">Envoyé</SelectItem>
                  <SelectItem value="accepte">Accepté</SelectItem>
                  <SelectItem value="refuse">Refusé</SelectItem>
                  <SelectItem value="expire">Expiré</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Montant HT:</span>
              <span className="font-semibold">{montant_ht.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>TVA ({watch('tva')}%):</span>
              <span className="font-semibold">{montant_tva.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Montant TTC:</span>
              <span>{montant_ttc.toFixed(2)} €</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea {...register('notes')} placeholder="Notes additionnelles..." rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            {quote && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Téléchargement...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Télécharger PDF
                  </>
                )}
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {quote ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dupliquer sur plusieurs dates</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sélectionnez les dates sur lesquelles vous souhaitez dupliquer cette ligne
            </p>
            <div className="flex justify-center">
              <Calendar
                mode="multiple"
                selected={selectedDates}
                onSelect={(dates) => setSelectedDates(dates || [])}
                locale={fr}
                className="pointer-events-auto border rounded-lg"
              />
            </div>
            <p className="text-sm text-center">
              {selectedDates.length} date(s) sélectionnée(s)
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              type="button" 
              onClick={confirmDuplicate}
              disabled={selectedDates.length === 0}
            >
              Dupliquer ({selectedDates.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
