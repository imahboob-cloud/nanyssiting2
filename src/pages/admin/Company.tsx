import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Building2 } from 'lucide-react';

const companySchema = z.object({
  denomination_sociale: z.string().min(1, 'La dénomination sociale est requise'),
  adresse_siege: z.string().min(1, 'L\'adresse du siège est requise'),
  numero_tva: z.string().min(1, 'Le numéro de TVA est requis'),
  telephone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  site_web: z.string().url('URL invalide').optional().or(z.literal('')),
  logo_url: z.string().url('URL invalide').optional().or(z.literal('')),
});

type CompanyFormData = z.infer<typeof companySchema>;

const Company = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      denomination_sociale: '',
      adresse_siege: '',
      numero_tva: '',
      telephone: '',
      email: '',
      site_web: '',
      logo_url: '',
    },
  });

  useEffect(() => {
    loadCompanyInfo();
  }, []);

  const loadCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_info')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCompanyId(data.id);
        reset({
          denomination_sociale: data.denomination_sociale || '',
          adresse_siege: data.adresse_siege || '',
          numero_tva: data.numero_tva || '',
          telephone: data.telephone || '',
          email: data.email || '',
          site_web: data.site_web || '',
          logo_url: data.logo_url || '',
        });
      }
    } catch (error) {
      console.error('Error loading company info:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les informations de l\'entreprise',
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    setSaving(true);
    try {
      const companyData = {
        denomination_sociale: data.denomination_sociale,
        adresse_siege: data.adresse_siege,
        numero_tva: data.numero_tva,
        telephone: data.telephone || null,
        email: data.email || null,
        site_web: data.site_web || null,
        logo_url: data.logo_url || null,
      };

      if (companyId) {
        const { error } = await supabase
          .from('company_info')
          .update(companyData)
          .eq('id', companyId);

        if (error) throw error;
      } else {
        const { data: newData, error } = await supabase
          .from('company_info')
          .insert([companyData])
          .select()
          .single();

        if (error) throw error;
        if (newData) setCompanyId(newData.id);
      }

      toast({
        title: 'Succès',
        description: 'Les informations de l\'entreprise ont été enregistrées',
      });
      
      reset(data);
    } catch (error) {
      console.error('Error saving company info:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de sauvegarder les informations',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Entreprise</h2>
        <p className="text-muted-foreground">Gérez les informations de votre entreprise</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Informations de l'entreprise
          </CardTitle>
          <CardDescription>
            Complétez les informations qui apparaîtront sur vos documents (devis, factures)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="denomination_sociale">
                  Dénomination sociale <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="denomination_sociale"
                  {...register('denomination_sociale')}
                  placeholder="Nom de votre entreprise"
                />
                {errors.denomination_sociale && (
                  <p className="text-sm text-destructive">{errors.denomination_sociale.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_tva">
                  Numéro de TVA <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="numero_tva"
                  {...register('numero_tva')}
                  placeholder="BE0123456789"
                />
                {errors.numero_tva && (
                  <p className="text-sm text-destructive">{errors.numero_tva.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="adresse_siege">
                  Adresse du siège <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="adresse_siege"
                  {...register('adresse_siege')}
                  placeholder="Rue, numéro, code postal, ville"
                />
                {errors.adresse_siege && (
                  <p className="text-sm text-destructive">{errors.adresse_siege.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  {...register('telephone')}
                  placeholder="+32 123 45 67 89"
                />
                {errors.telephone && (
                  <p className="text-sm text-destructive">{errors.telephone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contact@entreprise.be"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="site_web">Site web</Label>
                <Input
                  id="site_web"
                  {...register('site_web')}
                  placeholder="https://www.entreprise.be"
                />
                {errors.site_web && (
                  <p className="text-sm text-destructive">{errors.site_web.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">URL du logo</Label>
                <Input
                  id="logo_url"
                  {...register('logo_url')}
                  placeholder="https://..."
                />
                {errors.logo_url && (
                  <p className="text-sm text-destructive">{errors.logo_url.message}</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => loadCompanyInfo()}
                disabled={saving || !isDirty}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={saving || !isDirty}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  'Enregistrer'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Company;
