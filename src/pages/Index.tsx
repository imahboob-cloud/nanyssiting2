import { useState } from 'react';
import { 
  Heart, 
  ShieldCheck, 
  Star, 
  Menu, 
  X, 
  ArrowRight, 
  Baby, 
  GraduationCap, 
  Palette, 
  Moon, 
  Clock, 
  MapPin, 
  Phone, 
  Mail, 
  CheckCircle,
  Users,
  Quote,
  Instagram,
  Facebook
} from 'lucide-react';
import { NannyButton } from '@/components/NannyButton';
import { SectionTitle } from '@/components/SectionTitle';
import { ServiceSelect } from '@/components/ServiceSelect';
import { services, Service } from '@/data/services';
import { cn } from '@/lib/utils';
import heroBabysitter from '@/assets/hero-babysitter.jpg';

// Icon mapping
const iconMap: Record<string, any> = {
  Users,
  MapPin,
  GraduationCap,
  Palette,
  Moon,
  Baby,
  Clock
};

const ServiceCard = ({ service, onClick }: { service: Service; onClick: (service: Service) => void }) => {
  const IconComponent = iconMap[service.icon];
  const colorClass = service.color === 'salmon' ? 'bg-salmon' : service.color === 'sage' ? 'bg-sage' : 'bg-lavender';
  const textColorClass = service.color === 'salmon' ? 'text-salmon' : service.color === 'sage' ? 'text-sage' : 'text-lavender';
  
  return (
    <div 
      onClick={() => onClick(service)}
      className="bg-card rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border border-border group flex flex-col h-full active:scale-95 duration-200"
    >
      <div 
        className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-6", colorClass)}
      >
        <IconComponent className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold text-foreground mb-3 font-heading">{service.title}</h3>
      <p className="text-muted-foreground mb-6 flex-grow">{service.shortDesc}</p>
      <div className={cn("flex items-center text-sm font-bold", textColorClass)}>
        En savoir plus <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};

const TestimonialCard = ({ text, author, color }: { text: string; author: string; color: 'salmon' | 'sage' | 'lavender' }) => {
  const bgColorClass = color === 'salmon' ? 'bg-salmon' : color === 'sage' ? 'bg-sage' : 'bg-lavender';
  const textColorClass = color === 'salmon' ? 'text-salmon' : color === 'sage' ? 'text-sage' : 'text-lavender';
  
  return (
    <div className="relative group">
      <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform duration-500", bgColorClass)}></div>
      <div className={cn("absolute bottom-0 left-0 w-16 h-16 rounded-full opacity-10 transform -translate-x-4 translate-y-4 group-hover:scale-110 transition-transform duration-500", bgColorClass)}></div>
      
      <div className="bg-card p-8 rounded-tr-[40px] rounded-bl-[40px] rounded-tl-2xl rounded-br-2xl shadow-lg border-2 border-transparent hover:border-border transition-all relative z-10 h-full flex flex-col">
        <div className={cn("mb-6 text-4xl opacity-30", textColorClass)}>
          <Quote size={40} fill="currentColor" />
        </div>
        <p className="text-muted-foreground text-lg italic mb-6 leading-relaxed flex-grow font-medium">
          {text}
        </p>
        <div className="flex items-center gap-4 pt-4 border-t border-border">
          <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-md transform group-hover:rotate-12 transition-transform", bgColorClass)}>
            {author.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-foreground">{author}</div>
            <div className="flex text-yellow-400 text-xs mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={12} fill="currentColor" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContactSection = ({ prefilledService, id }: { prefilledService?: string; id: string }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    service: prefilledService || 'Garde à domicile',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contact-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          service: formData.service,
          message: formData.message
        })
      });

      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du formulaire');
      }

      setSubmitted(true);
      setTimeout(() => {
        const formSection = document.getElementById(id);
        if (formSection) {
          formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div id={id} className="py-20 px-6 bg-sage text-white text-center">
        <div className="max-w-3xl mx-auto bg-white/10 backdrop-blur-md p-12 rounded-[40px]">
          <CheckCircle className="w-20 h-20 mx-auto mb-6 text-white" />
          <h2 className="text-3xl font-bold mb-4 font-heading">Message reçu !</h2>
          <p className="text-xl">Nous avons bien reçu vos informations. Notre coordinatrice vous recontactera sous 24h.</p>
          <NannyButton variant="secondary" className="mt-8 mx-auto" onClick={() => setSubmitted(false)}>
            Envoyer une autre demande
          </NannyButton>
        </div>
      </div>
    );
  }

  return (
    <section id={id} className="py-20 px-6 bg-sage relative overflow-hidden scroll-mt-20">
      <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-salmon opacity-10 rounded-full translate-x-1/3 translate-y-1/3"></div>

      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-2 text-white text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-6 font-heading leading-tight">
              Prêt à rencontrer votre perle rare ?
            </h2>
            <p className="text-white/90 text-lg mb-8 leading-relaxed">
              Dites-nous en plus sur votre famille. C'est gratuit, sans engagement, et ça ne prend que 2 minutes.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <div className="bg-white p-2 rounded-full text-sage"><ShieldCheck size={20} /></div>
                <div className="text-left">
                  <p className="font-bold text-sm">100% Vérifié</p>
                  <p className="text-xs opacity-80">Identité & Casier judiciaire</p>
                </div>
              </div>
              <div className="flex items-center justify-center lg:justify-start gap-3 bg-white/10 p-4 rounded-2xl backdrop-blur-sm">
                <div className="bg-white p-2 rounded-full text-sage"><Heart size={20} /></div>
                <div className="text-left">
                  <p className="font-bold text-sm">Match Parfait</p>
                  <p className="text-xs opacity-80">Selon vos valeurs éducatives</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 bg-card p-8 md:p-10 rounded-[40px] shadow-2xl relative z-10">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide ml-3 mb-1 block">Votre Prénom</label>
                  <input 
                    type="text" 
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    className="w-full bg-muted border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-salmon focus:ring-1 focus:ring-salmon transition-colors"
                    placeholder="Ex: Julie"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide ml-3 mb-1 block">Votre Nom</label>
                  <input 
                    type="text" 
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    className="w-full bg-muted border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-salmon focus:ring-1 focus:ring-salmon transition-colors"
                    placeholder="Ex: Dupont"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide ml-3 mb-1 block">Email</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-muted border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-salmon focus:ring-1 focus:ring-salmon transition-colors"
                    placeholder="julie@exemple.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide ml-3 mb-1 block">Téléphone</label>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-muted border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-salmon focus:ring-1 focus:ring-salmon transition-colors"
                    placeholder="0470 12 34 56"
                  />
                </div>
              </div>
              
              <ServiceSelect 
                value={formData.service}
                onChange={(value) => setFormData({...formData, service: value})}
              />

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide ml-3 mb-1 block">Détails (Âge des enfants, horaires, etc.)</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-muted border border-border rounded-2xl px-5 py-3 focus:outline-none focus:border-salmon focus:ring-1 focus:ring-salmon transition-colors h-24 resize-none"
                  placeholder="Bonjour, je cherche quelqu'un pour mes jumeaux de 3 ans..."
                ></textarea>
              </div>

              <NannyButton 
                variant="accent" 
                type="submit" 
                className="w-full mt-2 shadow-xl hover:shadow-2xl py-4 text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Envoi en cours...' : 'Recevoir mon devis gratuit'}
              </NannyButton>
              <p className="text-center text-xs text-muted-foreground mt-2">Données confidentielles. Réponse sous 24h.</p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

const ServiceDetailPage = ({ service, onBack }: { service: Service; onBack: () => void }) => {
  const IconComponent = iconMap[service.icon];
  const colorClass = service.color === 'salmon' ? 'bg-salmon' : service.color === 'sage' ? 'bg-sage' : 'bg-lavender';
  const textColorClass = service.color === 'salmon' ? 'text-salmon' : service.color === 'sage' ? 'text-sage' : 'text-lavender';

  const scrollToForm = () => {
    const formSection = document.getElementById('service-contact-form');
    if (formSection) formSection.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="animate-fade-in pt-24 min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6 py-8 md:py-12">
        <button 
          onClick={onBack} 
          className="flex items-center text-muted-foreground hover:text-foreground mb-8 transition-colors active:scale-95 group"
        >
          <div className="bg-card p-2 rounded-full shadow-sm mr-3 group-hover:scale-110 transition-transform">
            <ArrowRight className="rotate-180" size={20} /> 
          </div>
          Retour aux services
        </button>

        <div className="bg-card rounded-[32px] md:rounded-[40px] shadow-xl overflow-hidden border border-border mb-16">
          <div className={cn("relative p-8 md:p-12 text-white overflow-hidden", colorClass)}>
            <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-center">
              <div className="bg-white/20 p-6 rounded-2xl backdrop-blur-sm w-fit shadow-inner">
                <IconComponent className="w-12 h-12 text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-5xl font-bold mb-2 leading-tight font-heading">{service.title}</h1>
                <p className="text-white/90 text-lg md:text-xl">{service.shortDesc}</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full translate-x-1/3 -translate-y-1/3"></div>
          </div>

          <div className="p-6 md:p-12 grid md:grid-cols-3 gap-8 md:gap-12">
            <div className="md:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2 font-heading">
                  <CheckCircle className="text-sage" />
                  Ce que nous proposons
                </h2>
                <p className="text-muted-foreground leading-relaxed text-lg">
                  {service.fullDesc}
                </p>
              </div>

              <div className="bg-orange-50 p-6 rounded-2xl border-l-4 border-salmon">
                <h3 className="font-bold text-salmon mb-2">Notre promesse</h3>
                <p className="text-foreground">
                  Nous ne remplaçons pas les parents, nous sommes le relais de confiance qui assure la continuité de vos valeurs éducatives.
                </p>
              </div>
              
              <div className="pt-4">
                <NannyButton onClick={scrollToForm} className="w-full md:w-auto text-lg shadow-xl hover:shadow-2xl">
                  Offrir ce confort à ma famille
                </NannyButton>
                <p className="text-sm text-muted-foreground mt-3 text-center md:text-left">Sans engagement • Réponse sous 24h</p>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="bg-muted p-6 rounded-3xl md:sticky md:top-32 border border-border">
                <div className="flex justify-center mb-4 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} fill="currentColor" size={24} />
                  ))}
                </div>
                <p className="italic text-muted-foreground mb-6 text-center leading-relaxed">"{service.testimonial}"</p>
                <div className="text-center font-bold text-foreground border-t border-border pt-4">
                  {service.author}
                </div>
                <div className="mt-4 flex justify-center">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 uppercase tracking-widest">
                    <CheckCircle size={12} className="mr-1" /> Vérifié
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ContactSection prefilledService={service.title} id="service-contact-form" />
    </div>
  );
};

const Index = () => {
  const [view, setView] = useState<'home' | 'service'>('home');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigateToService = (service: Service) => {
    setSelectedService(service);
    setView('service');
    setMobileMenuOpen(false);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const navigateHome = () => {
    setView('home');
    setMobileMenuOpen(false);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const navigateHomeToServices = () => {
    setView('home');
    setMobileMenuOpen(false);
    setTimeout(() => {
      const servicesSection = document.getElementById('services');
      if (servicesSection) {
        servicesSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const scrollToSection = (id: string) => {
    if (view !== 'home') {
      setView('home');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen selection:bg-salmon selection:text-white">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="text-2xl font-bold flex items-center gap-2 cursor-pointer font-heading" onClick={navigateHome}>
            <div className="w-8 h-8 rounded-full bg-salmon flex items-center justify-center text-white">
              <Baby size={20} />
            </div>
            <span className="text-foreground">NannySitting</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <button onClick={navigateHome} className="hover:text-salmon font-medium transition-colors">Accueil</button>
            <button onClick={() => scrollToSection('services')} className="hover:text-salmon font-medium transition-colors">Services</button>
            <NannyButton onClick={() => scrollToSection('contact-form-section')} className="px-5 py-2 text-sm">
              Réserver maintenant
            </NannyButton>
          </div>

          <div className="md:hidden text-foreground p-2 -mr-2 cursor-pointer" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-card border-t border-border absolute w-full p-6 flex flex-col shadow-xl h-screen">
            <button onClick={navigateHome} className="text-left py-3 font-medium text-lg border-b border-border">Accueil</button>
            <button onClick={() => scrollToSection('services')} className="text-left py-3 font-medium text-lg border-b border-border">Services</button>
            
            <div className="flex flex-col gap-3 mt-4">
              <NannyButton onClick={() => scrollToSection('contact-form-section')} className="w-full">Réserver</NannyButton>
              <NannyButton 
                variant="outline" 
                onClick={() => window.location.href = 'tel:+33123456789'} 
                className="w-full border-2 border-primary text-primary hover:bg-primary/10"
              >
                <Phone size={18} />
                Appelez-nous
              </NannyButton>
            </div>

            <div className="mt-6 pt-6 border-t border-border flex flex-col items-center">
              <p className="text-sm text-muted-foreground mb-3">Suivez-nous</p>
              <div className="flex gap-4">
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <Instagram size={24} className="text-primary" />
                </a>
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <Facebook size={24} className="text-primary" />
                </a>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main>
        {view === 'home' ? (
          <div className="w-full overflow-x-hidden">
            {/* Hero Section */}
            <header className="relative overflow-hidden pt-28 pb-12 md:pt-40 md:pb-32 px-6">
              <div className="absolute top-0 left-0 w-full h-full -z-10 bg-background">
                <div className="absolute top-0 right-0 w-2/3 h-full bg-lavender opacity-10 rounded-bl-[100px]"></div>
                <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-sage opacity-10 rounded-tr-[100px]"></div>
              </div>
              
              <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 md:gap-12 items-center">
                <div className="order-2 md:order-1">
                  <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-tight mb-6 font-heading">
                    Plus qu'une garde, <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-salmon to-lavender">
                      une bulle de sérénité.
                    </span>
                  </h1>
                  <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
                    De la sortie d'école à l'accompagnement post-accouchement, NannySitting offre bienveillance, sécurité et éveil à vos enfants. Partez l'esprit tranquille.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <NannyButton onClick={() => scrollToSection('contact-form-section')} className="whitespace-nowrap">
                      Trouver ma nounou
                    </NannyButton>
                    <NannyButton variant="secondary" onClick={() => scrollToSection('services')} className="whitespace-nowrap">
                      Nos services
                    </NannyButton>
                  </div>
                </div>
                
                <div className="relative order-1 md:order-2">
                  <div className="relative z-10 bg-card p-3 md:p-4 rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl md:rotate-3 transform md:hover:rotate-0 transition-transform duration-500">
                    <img 
                      src={heroBabysitter}
                      alt="Babysitter jouant avec enfant" 
                      className="rounded-xl md:rounded-2xl w-full h-auto object-cover aspect-[4/3]"
                    />
                    <div className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 bg-card p-3 md:p-4 rounded-xl shadow-lg flex items-center gap-2 md:gap-3">
                      <div className="bg-green-100 p-1.5 md:p-2 rounded-full text-green-600">
                        <ShieldCheck size={20} className="md:w-6 md:h-6" />
                      </div>
                      <p className="font-bold text-foreground text-sm md:text-lg">Profils vérifiés</p>
                    </div>
                  </div>
                  <div className="absolute top-6 md:top-10 right-6 md:right-10 w-full h-full bg-salmon rounded-2xl md:rounded-3xl -z-10 opacity-20 transform translate-x-3 translate-y-3 md:translate-x-4 md:translate-y-4"></div>
                </div>
              </div>
            </header>

            {/* Values Section */}
            <section className="py-16 md:py-20 px-6 bg-card">
              <div className="max-w-6xl mx-auto">
                <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                  <div className="order-2 md:order-1">
                    <h2 className="text-3xl font-bold mb-6 font-heading">Pourquoi les parents nous font confiance ?</h2>
                    <div className="space-y-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-salmon">
                          <Heart />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg font-heading">Bienveillance & Écoute</h3>
                          <p className="text-muted-foreground">Chaque enfant est unique. Nous nous adaptons à ses rituels et ses besoins émotionnels.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-lavender">
                          <ShieldCheck />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg font-heading">Sécurité Absolue</h3>
                          <p className="text-muted-foreground">Un recrutement strict pour transformer votre absence en sérénité totale.</p>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-sage">
                          <Star />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg font-heading">Éveil & Créativité</h3>
                          <p className="text-muted-foreground">Fini l'ennui. Nous proposons des jeux, des ateliers et des sorties adaptés à l'âge.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="order-1 md:order-2 bg-background p-6 md:p-8 rounded-[40px] border-4 border-card shadow-xl">
                    <p className="text-muted-foreground italic mb-6 leading-relaxed">
                      "J'ai grandi entourée de baby-sitters. Je me souviens encore de ce petit garçon qui refusait de se coucher sans son histoire préférée... Ces instants m'ont appris que chaque détail compte. C'est pourquoi j'ai créé NannySitting : pour offrir aux familles un service qui allie le professionnalisme d'une agence à la chaleur humaine d'une grande sœur."
                    </p>
                    <div className="font-bold text-salmon text-lg">Fondatrice de NannySitting</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Services */}
            <section id="services" className="py-16 md:py-20 px-6 bg-muted/30 scroll-mt-20">
              <div className="max-w-7xl mx-auto">
                <SectionTitle 
                  title="Des services pensés pour vous" 
                  subtitle="Que ce soit pour une soirée, une sortie d'école ou un besoin spécifique, nous avons la solution."
                />
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {services.map(service => (
                    <ServiceCard key={service.id} service={service} onClick={navigateToService} />
                  ))}
                </div>
              </div>
            </section>

            {/* Testimonials */}
            <section className="py-20 px-6 bg-card relative overflow-hidden">
              <div className="max-w-6xl mx-auto">
                <SectionTitle title="La parole aux parents" />
                <div className="grid md:grid-cols-2 gap-12 mt-12">
                  <TestimonialCard 
                    text="Au début, j'avais peur de laisser mes enfants pour sortir dîner. Mais tout s'est super bien passé, ils étaient couchés à mon retour. Quelle tranquillité d'esprit !" 
                    author="Marie & Pierre"
                    color="salmon"
                  />
                  <TestimonialCard 
                    text="Mon fils a des besoins particuliers et j'avais peur de ne trouver personne. Avec NannySitting, il est compris, respecté et s'épanouit." 
                    author="Julie, maman de Nathan"
                    color="sage"
                  />
                </div>
              </div>
            </section>
            
            <ContactSection id="contact-form-section" />
          </div>
        ) : selectedService ? (
          <ServiceDetailPage service={selectedService} onBack={navigateHomeToServices} />
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 md:py-16 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-8 md:gap-12 text-center md:text-left">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center justify-center md:justify-start gap-2 text-xl font-bold mb-4 font-heading">
              <div className="w-8 h-8 rounded-full bg-salmon flex items-center justify-center text-white">
                <Baby size={18} />
              </div>
              NannySitting
            </div>
            <p className="text-gray-400 max-w-sm mx-auto md:mx-0">
              Votre partenaire de confiance pour la garde d'enfants en Belgique. Sécurité, bienveillance et épanouissement garantis.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-salmon font-heading">Services</h4>
            <ul className="space-y-2 text-gray-400 text-sm cursor-pointer">
              <li className="hover:text-white transition-colors" onClick={() => scrollToSection('services')}>Garde à domicile</li>
              <li className="hover:text-white transition-colors" onClick={() => scrollToSection('services')}>Sortie d'école</li>
              <li className="hover:text-white transition-colors" onClick={() => scrollToSection('services')}>Aide aux devoirs</li>
              <li className="hover:text-white transition-colors" onClick={() => scrollToSection('services')}>Post-accouchement</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4 text-salmon font-heading">Contact</h4>
            <ul className="space-y-2 text-gray-400 text-sm flex flex-col items-center md:items-start">
              <li className="flex items-center gap-2">
                <Mail size={16}/>
                <a href="mailto:contact@nannysitting.be" className="hover:text-white transition-colors">
                  contact@nannysitting.be
                </a>
              </li>
              <li className="flex items-center gap-2"><Phone size={16}/> +32 4XX XX XX XX</li>
              <li className="flex items-center gap-2"><MapPin size={16}/> Bruxelles & Environs</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-500 text-sm">
          © {new Date().getFullYear()} NannySitting Belgique. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
};

export default Index;
