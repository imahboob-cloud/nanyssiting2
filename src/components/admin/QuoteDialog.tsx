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
import { Loader2, CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
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
  description: string;
  quantite: number;
  prix_unitaire: number;
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
  const [clients, setClients] = useState<any[]>([]);
  const [dateValidite, setDateValidite] = useState<Date | undefined>();
  const [lignes, setLignes] = useState<QuoteLine[]>([
    { description: '', quantite: 1, prix_unitaire: 0, total: 0 }
  ]);
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      statut: 'brouillon',
      tva: '21',
    },
  });

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (quote) {
      setValue('client_id', quote.client_id);
      setValue('statut', quote.statut);
      setValue('tva', quote.tva?.toString() || '21');
      setValue('notes', quote.notes || '');
      if (quote.date_validite) {
        setDateValidite(new Date(quote.date_validite));
      }
      if (quote.lignes && Array.isArray(quote.lignes)) {
        setLignes(quote.lignes);
      }
    }
  }, [quote, setValue]);

  const loadClients = async () => {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nom', { ascending: true });
    
    if (!error && data) setClients(data);
  };

  const addLigne = () => {
    setLignes([...lignes, { description: '', quantite: 1, prix_unitaire: 0, total: 0 }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const updateLigne = (index: number, field: keyof QuoteLine, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    
    if (field === 'quantite' || field === 'prix_unitaire') {
      newLignes[index].total = newLignes[index].quantite * newLignes[index].prix_unitaire;
    }
    
    setLignes(newLignes);
  };

  const calculateTotals = () => {
    const montant_ht = lignes.reduce((sum, ligne) => sum + ligne.total, 0);
    const tvaValue = parseFloat(watch('tva') || '21');
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
      const tvaValue = parseFloat(data.tva || '21');

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
      setLignes([{ description: '', quantite: 1, prix_unitaire: 0, total: 0 }]);
      setDateValidite(undefined);
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
                  <div className="col-span-5">
                    <Label className="text-xs">Description</Label>
                    <Input
                      placeholder="Description"
                      value={ligne.description}
                      onChange={(e) => updateLigne(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Quantité</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ligne.quantite}
                      onChange={(e) => updateLigne(index, 'quantite', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Prix unitaire</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ligne.prix_unitaire}
                      onChange={(e) => updateLigne(index, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {quote ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
