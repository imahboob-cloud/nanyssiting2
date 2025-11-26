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
import { Loader2, CalendarIcon, Plus, Trash2, Copy } from 'lucide-react';
import { format, parse, differenceInMinutes, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const invoiceSchema = z.object({
  client_id: z.string().min(1, 'Client requis'),
  date_echeance: z.date().optional(),
  tva: z.string().optional(),
  notes: z.string().optional(),
  statut: z.enum(['brouillon', 'envoyee', 'payee', 'en_retard']),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceLine {
  date: string;
  heure_debut: string;
  heure_fin: string;
  description: string;
  prix_horaire: number;
  total: number;
}

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: any;
  onSuccess: () => void;
  quoteData?: {
    client_id: string;
    lignes: InvoiceLine[];
    tva: number;
    notes: string;
    quote_id: string;
  };
}

export function InvoiceDialog({ open, onOpenChange, invoice, onSuccess, quoteData }: InvoiceDialogProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [tarifs, setTarifs] = useState<any[]>([]);
  const [dateEcheance, setDateEcheance] = useState<Date | undefined>(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    return defaultDate;
  });
  const [lignes, setLignes] = useState<InvoiceLine[]>([
    { date: format(new Date(), 'yyyy-MM-dd'), heure_debut: '09:00', heure_fin: '17:00', description: '', prix_horaire: 0, total: 0 }
  ]);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      statut: 'brouillon',
      tva: '0',
    },
  });

  useEffect(() => {
    loadClients();
    loadTarifs();
  }, []);

  useEffect(() => {
    if (quoteData) {
      // Pre-fill from quote
      setValue('client_id', quoteData.client_id);
      setValue('tva', quoteData.tva?.toString() || '0');
      setValue('notes', quoteData.notes || '');
      setLignes(quoteData.lignes);
    } else if (invoice) {
      setValue('client_id', invoice.client_id);
      setValue('statut', invoice.statut);
      setValue('tva', invoice.tva?.toString() || '0');
      setValue('notes', invoice.notes || '');
      if (invoice.date_echeance) {
        setDateEcheance(new Date(invoice.date_echeance));
      }
      if (invoice.lignes && Array.isArray(invoice.lignes)) {
        setLignes(invoice.lignes);
      }
    } else {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setDateEcheance(defaultDate);
    }
  }, [invoice, quoteData, setValue]);

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

  const addLigne = () => {
    const lastLigne = lignes[lignes.length - 1];
    setLignes([...lignes, { 
      date: lastLigne.date, 
      heure_debut: lastLigne.heure_debut, 
      heure_fin: lastLigne.heure_fin, 
      description: '', 
      prix_horaire: lastLigne.prix_horaire, 
      total: 0 
    }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
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

  const updateLigne = (index: number, field: keyof InvoiceLine, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    
    // Auto-select tarif when date changes
    if (field === 'date' && tarifs.length > 0) {
      const appropriateTarif = getAppropriateTarif(value);
      if (appropriateTarif) {
        newLignes[index].description = appropriateTarif.nom;
        newLignes[index].prix_horaire = parseFloat(appropriateTarif.tarif_horaire);
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

  const generateInvoiceNumber = async () => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .like('numero', `FAC-${year}-%`);
    
    return `FAC-${year}-${String((count || 0) + 1).padStart(4, '0')}`;
  };

  const onSubmit = async (data: InvoiceFormData) => {
    setLoading(true);
    try {
      const { montant_ht, montant_ttc } = calculateTotals();
      const tvaValue = parseFloat(data.tva || '0');

      const invoiceData = {
        client_id: data.client_id,
        numero: invoice?.numero || await generateInvoiceNumber(),
        date_echeance: dateEcheance ? format(dateEcheance, 'yyyy-MM-dd') : null,
        lignes: lignes as any,
        montant_ht,
        tva: tvaValue,
        montant_ttc,
        statut: data.statut,
        notes: data.notes || null,
        quote_id: quoteData?.quote_id || invoice?.quote_id || null,
      };

      if (invoice) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id);

        if (error) throw error;
        toast({ title: 'Facture mise à jour avec succès' });
      } else {
        const { error } = await supabase
          .from('invoices')
          .insert([invoiceData]);

        if (error) throw error;
        toast({ title: 'Facture créée avec succès' });
      }

      reset();
      setLignes([{ date: format(new Date(), 'yyyy-MM-dd'), heure_debut: '09:00', heure_fin: '17:00', description: '', prix_horaire: 0, total: 0 }]);
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 30);
      setDateEcheance(defaultDate);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {quoteData ? 'Générer une facture depuis le devis' : invoice ? 'Modifier la facture' : 'Nouvelle facture'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Client *</Label>
              <Select onValueChange={(value) => setValue('client_id', value)} value={watch('client_id')} disabled={!!quoteData}>
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
              <Label>Date d'échéance</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateEcheance && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateEcheance ? format(dateEcheance, "PPP", { locale: fr }) : "Sélectionner une date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateEcheance}
                    onSelect={setDateEcheance}
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
              <Label>Lignes de la facture *</Label>
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
                  <div className="col-span-2">
                    <Label className="text-xs">Heure début</Label>
                    <Select value={ligne.heure_debut} onValueChange={(value) => updateLigne(index, 'heure_debut', value)}>
                      <SelectTrigger className="h-9 text-xs">
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
                  <div className="col-span-2">
                    <Label className="text-xs">Heure fin</Label>
                    <Select value={ligne.heure_fin} onValueChange={(value) => updateLigne(index, 'heure_fin', value)}>
                      <SelectTrigger className="h-9 text-xs">
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
                      placeholder="Description"
                      value={ligne.description}
                      onChange={(e) => updateLigne(index, 'description', e.target.value)}
                      className="h-9 text-xs"
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
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Total</Label>
                    <Input
                      type="number"
                      value={ligne.total.toFixed(2)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
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
                  <SelectItem value="envoyee">Envoyée</SelectItem>
                  <SelectItem value="payee">Payée</SelectItem>
                  <SelectItem value="en_retard">En retard</SelectItem>
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
            <div className="flex justify-between text-xl font-bold border-t-2 border-foreground pt-3 mt-2">
              <span>Montant TTC:</span>
              <span className="text-primary">{montant_ttc.toFixed(2)} €</span>
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {invoice ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
