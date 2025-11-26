-- Create enums for the application
CREATE TYPE public.app_role AS ENUM ('owner');
CREATE TYPE public.client_status AS ENUM ('prospect', 'client');
CREATE TYPE public.mission_status AS ENUM ('planifie', 'a_attribuer', 'en_cours', 'termine', 'annule');
CREATE TYPE public.quote_status AS ENUM ('brouillon', 'envoye', 'accepte', 'refuse', 'expire');
CREATE TYPE public.invoice_status AS ENUM ('brouillon', 'envoyee', 'payee', 'en_retard');

-- Table for user roles
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Table for company information (singleton)
CREATE TABLE public.company_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    denomination_sociale TEXT NOT NULL DEFAULT '',
    adresse_siege TEXT NOT NULL DEFAULT '',
    numero_tva TEXT NOT NULL DEFAULT '',
    telephone TEXT,
    email TEXT,
    site_web TEXT,
    logo_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default company info
INSERT INTO public.company_info (denomination_sociale, adresse_siege, numero_tva)
VALUES ('Ma société', 'Adresse à compléter', 'TVA à compléter');

-- Table for clients with prospect/client status
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prenom TEXT NOT NULL,
    nom TEXT NOT NULL,
    email TEXT,
    telephone TEXT,
    adresse TEXT,
    code_postal TEXT,
    ville TEXT,
    service_souhaite TEXT,
    message TEXT,
    statut client_status DEFAULT 'prospect',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for nannysitters
CREATE TABLE public.nannysitters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT,
    telephone TEXT,
    tarif_horaire DECIMAL(10,2),
    competences TEXT,
    actif BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for missions
CREATE TABLE public.missions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    nannysitter_id UUID REFERENCES public.nannysitters(id) ON DELETE SET NULL,
    date_debut TIMESTAMP WITH TIME ZONE NOT NULL,
    date_fin TIMESTAMP WITH TIME ZONE NOT NULL,
    statut mission_status DEFAULT 'planifie',
    description TEXT,
    montant DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for quotes
CREATE TABLE public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    lignes JSONB DEFAULT '[]',
    montant_ht DECIMAL(10,2) DEFAULT 0,
    tva DECIMAL(10,2) DEFAULT 0,
    montant_ttc DECIMAL(10,2) DEFAULT 0,
    statut quote_status DEFAULT 'brouillon',
    date_validite DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for invoices
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT NOT NULL UNIQUE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    lignes JSONB DEFAULT '[]',
    montant_ht DECIMAL(10,2) DEFAULT 0,
    tva DECIMAL(10,2) DEFAULT 0,
    montant_ttc DECIMAL(10,2) DEFAULT 0,
    statut invoice_status DEFAULT 'brouillon',
    date_echeance DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nannysitters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles (only owner can manage)
CREATE POLICY "Owners can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for company_info (only owner can access)
CREATE POLICY "Owners can view company info"
ON public.company_info FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update company info"
ON public.company_info FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for clients
CREATE POLICY "Owners can view all clients"
ON public.clients FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert clients"
ON public.clients FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Public can insert prospects"
ON public.clients FOR INSERT
TO anon
WITH CHECK (statut = 'prospect');

CREATE POLICY "Owners can update clients"
ON public.clients FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete clients"
ON public.clients FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for nannysitters (only owner can manage)
CREATE POLICY "Owners can view all nannysitters"
ON public.nannysitters FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert nannysitters"
ON public.nannysitters FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update nannysitters"
ON public.nannysitters FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete nannysitters"
ON public.nannysitters FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for missions (only owner can manage)
CREATE POLICY "Owners can view all missions"
ON public.missions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert missions"
ON public.missions FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update missions"
ON public.missions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete missions"
ON public.missions FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for quotes (only owner can manage)
CREATE POLICY "Owners can view all quotes"
ON public.quotes FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert quotes"
ON public.quotes FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update quotes"
ON public.quotes FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete quotes"
ON public.quotes FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- RLS Policies for invoices (only owner can manage)
CREATE POLICY "Owners can view all invoices"
ON public.invoices FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert invoices"
ON public.invoices FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update invoices"
ON public.invoices FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete invoices"
ON public.invoices FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nannysitters_updated_at
BEFORE UPDATE ON public.nannysitters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_info_updated_at
BEFORE UPDATE ON public.company_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();