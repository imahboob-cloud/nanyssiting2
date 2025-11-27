import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, Pencil, Trash2, Send, Download, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { QuoteDialog } from "@/components/admin/QuoteDialog";
import { SendQuoteDialog } from "@/components/admin/SendQuoteDialog";
import { InvoiceDialog } from "@/components/admin/InvoiceDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Tables } from "@/integrations/supabase/types";

type Quote = Tables<"quotes">;
type QuoteWithClient = Quote & {
  clients: {
    nom: string;
    prenom: string;
    email: string | null;
  } | null;
  invoices?: Array<{ id: string; numero: string }>;
};

const Quotes = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [quoteToSend, setQuoteToSend] = useState<QuoteWithClient | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [quoteForInvoice, setQuoteForInvoice] = useState<QuoteWithClient | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("*, clients(nom, prenom, email), invoices(id, numero)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as QuoteWithClient[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Devis supprimé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression du devis");
    },
  });

  const filteredQuotes = quotes?.filter((quote) => {
    const matchesSearch =
      quote.numero.toLowerCase().includes(search.toLowerCase()) ||
      `${quote.clients?.prenom} ${quote.clients?.nom}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all" || quote.statut === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleEdit = (quote: Quote) => {
    setSelectedQuote(quote);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setQuoteToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (quoteToDelete) {
      deleteMutation.mutate(quoteToDelete);
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
    }
  };

  const handleSend = (quote: QuoteWithClient) => {
    setQuoteToSend(quote);
    setSendDialogOpen(true);
  };

  const handleGenerateInvoice = (quote: QuoteWithClient) => {
    setQuoteForInvoice(quote);
    setInvoiceDialogOpen(true);
  };

  const handleDownload = async (quote: QuoteWithClient) => {
    setDownloadingPdf(quote.id);
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
        
        toast.success('PDF téléchargé avec succès');
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloadingPdf(null);
    }
  };

  const getStatusBadge = (statut: string) => {
    const variants: Record<string, { variant: any; label: string; className?: string }> = {
      brouillon: { variant: "secondary", label: "Brouillon" },
      envoye: { variant: "default", label: "Envoyé" },
      accepte: { variant: "default", label: "Accepté", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
      refuse: { variant: "destructive", label: "Refusé" },
      expire: { variant: "outline", label: "Expiré" },
    };
    const config = variants[statut] || variants.brouillon;
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Devis</h2>
          <p className="text-muted-foreground">
            Gérez vos devis et propositions commerciales
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedQuote(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nouveau devis
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par numéro ou client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="envoye">Envoyé</SelectItem>
            <SelectItem value="accepte">Accepté</SelectItem>
            <SelectItem value="refuse">Refusé</SelectItem>
            <SelectItem value="expire">Expiré</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead>Date de validité</TableHead>
              <TableHead>Montant TTC</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Devis</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filteredQuotes?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">
                    Aucun devis trouvé
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredQuotes?.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.numero}</TableCell>
                  <TableCell>
                    {quote.clients
                      ? `${quote.clients.prenom} ${quote.clients.nom}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {new Date(quote.created_at!).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell>
                    {quote.date_validite
                      ? new Date(quote.date_validite).toLocaleDateString(
                          "fr-FR"
                        )
                      : "-"}
                  </TableCell>
                  <TableCell>{quote.montant_ttc?.toFixed(2)} €</TableCell>
                  <TableCell>{getStatusBadge(quote.statut || "brouillon")}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => handleDownload(quote)}
                      disabled={downloadingPdf === quote.id}
                    >
                      {downloadingPdf === quote.id ? (
                        <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <>
                          <Download className="h-3 w-3" />
                          Télécharger
                        </>
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {quote.statut !== 'envoye' && quote.statut !== 'accepte' && quote.statut !== 'refuse' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSend(quote)}
                          title="Envoyer le devis"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      {quote.statut === 'accepte' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleGenerateInvoice(quote)}
                          title="Générer une facture"
                        >
                          <Wand2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(quote)}
                        disabled={quote.statut === 'accepte'}
                        title={quote.statut === 'accepte' ? 'Impossible de modifier un devis accepté' : 'Modifier'}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(quote.id)}
                        disabled={quote.statut === 'accepte'}
                        title={quote.statut === 'accepte' ? 'Impossible de supprimer un devis accepté' : 'Supprimer'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <QuoteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        quote={selectedQuote}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["quotes"] });
          setDialogOpen(false);
        }}
      />

      <SendQuoteDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        quote={quoteToSend}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["quotes"] });
        }}
      />

      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        quoteData={quoteForInvoice ? {
          client_id: quoteForInvoice.client_id,
          lignes: quoteForInvoice.lignes as any,
          tva: quoteForInvoice.tva || 0,
          notes: quoteForInvoice.notes || '',
          quote_id: quoteForInvoice.id,
        } : undefined}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          setInvoiceDialogOpen(false);
          setQuoteForInvoice(null);
          toast.success("Facture générée avec succès");
        }}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Supprimer le devis"
        description="Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible."
        confirmText="Supprimer"
      />
    </div>
  );
};

export default Quotes;
