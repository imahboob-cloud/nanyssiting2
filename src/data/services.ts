export interface Service {
  id: string;
  title: string;
  shortDesc: string;
  fullDesc: string;
  icon: string;
  color: 'salmon' | 'sage' | 'lavender';
  testimonial: string;
  author: string;
}

export const services: Service[] = [
  {
    id: 'domicile',
    title: "Garde à Domicile Cocooning",
    shortDesc: "Préservez les repères de votre enfant dans son environnement habituel.",
    fullDesc: "Nous assurons la garde de vos enfants directement à votre domicile, dans leur environnement habituel. C'est la solution idéale pour préserver leurs repères, leur confort et leur sécurité. Selon leur âge, nous ne faisons pas que surveiller : nous proposons des activités d'éveil, des histoires et une présence rassurante active.",
    icon: "Users",
    color: 'salmon',
    testimonial: "Avec mon travail à temps plein, j'avais besoin d'une personne de confiance. Grâce à NannySitting, je pars travailler sereine.",
    author: "Sophie, maman de Léa (2 ans)"
  },
  {
    id: 'ecole',
    title: "Sorties d'École & Crèche",
    shortDesc: "Le trajet retour en toute sécurité, suivi d'un temps calme et du goûter.",
    fullDesc: "Finies les courses contre la montre. Nous allons chercher vos enfants à la crèche ou à l'école et les raccompagnons à la maison en toute sécurité. Le trajet est un moment clé de transition où l'enfant est écouté. Une fois à la maison, nous gérons le goûter et la détente en attendant votre retour.",
    icon: "MapPin",
    color: 'sage',
    testimonial: "Je ne pouvais pas toujours sortir tôt du travail. Depuis que NannySitting s'en occupe, mon fils rentre en sécurité et m'attend déjà installé avec son goûter !",
    author: "Marc, papa de Tom (5 ans)"
  },
  {
    id: 'devoirs',
    title: "Aide aux Devoirs Ludique",
    shortDesc: "Transformer le moment des devoirs en réussite et prise de confiance.",
    fullDesc: "Nous accompagnons vos enfants dans leurs devoirs (lecture, mathématiques, langues). Notre objectif n'est pas seulement scolaire : c'est de redonner confiance à l'enfant et de rendre l'apprentissage agréable pour éviter les conflits le soir.",
    icon: "GraduationCap",
    color: 'lavender',
    testimonial: "Les devoirs étaient une source de stress. Depuis que Julie accompagne ma fille, elle a pris confiance en elle et ose même lever la main en classe !",
    author: "Amélie, maman de Zoé (8 ans)"
  },
  {
    id: 'creatif',
    title: "Ateliers Créatifs & Éveil",
    shortDesc: "Bricolage, musique et peinture pour stimuler leur imagination.",
    fullDesc: "Plus qu'une garde, une animation ! Nous proposons des activités variées adaptées à l'âge : bricolages (DIY), dessins, jeux de société, histoires, musique. L'objectif est de stimuler leur créativité et de limiter les écrans.",
    icon: "Palette",
    color: 'salmon',
    testimonial: "Ma fille est rentrée avec un collier fait main qu'elle a créé toute seule, elle était tellement fière ! C'est devenu son rendez-vous préféré.",
    author: "Chloé, maman de Mia (6 ans)"
  },
  {
    id: 'post-partum',
    title: "Relais Maman & Post-Partum",
    shortDesc: "Une aide précieuse pour les aînés pendant que vous profitez de bébé.",
    fullDesc: "L'arrivée d'un nouveau-né est un bouleversement. Nous accompagnons les mamans qui viennent d'accoucher en nous occupant des aînés (jeux, sorties, soins) pour vous permettre de vous reposer, de prendre une douche ou de profiter pleinement de votre nouveau-né en toute sérénité.",
    icon: "Baby",
    color: 'lavender',
    testimonial: "Après la naissance de ma fille, j'étais débordée. L'aide que j'ai reçue m'a permis de souffler et de me consacrer à mon bébé sans culpabiliser.",
    author: "Sarah, maman de 2 enfants"
  },
  {
    id: 'urgence',
    title: "Baby-sitting d'Urgence",
    shortDesc: "Un imprévu ? Une réunion tardive ? Nous sommes là.",
    fullDesc: "Un déplacement professionnel imprévu, une urgence familiale ou un rendez-vous médical ? Nous proposons un service de garde de dernière minute selon nos disponibilités pour que vous ne soyez jamais pris au dépourvu.",
    icon: "Clock",
    color: 'salmon',
    testimonial: "J'ai eu une urgence médicale et j'ai pu compter sur NannySitting en moins d'une heure. J'ai pu partir l'esprit serein.",
    author: "Valérie, maman solo"
  }
];
