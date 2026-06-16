import { getCompetitions } from '@/lib/supabaseClient';
import CompetitionsClient from '@/components/CompetitionsClient';

// Vi beder Next.js om automatisk at opdatere indholdet (revalidate) med jævne mellemrum,
// så vi slipper for at genopbygge siden, hver gang din Python-scraper har fundet nye konkurrencer.
export const revalidate = 60; // Opdateres mindst hver 60. sekund, hvis der er nye besøg.

export default async function Home() {
  // Hent alle konkurrencer fra databasen
  const competitions = await getCompetitions();
  
  // Send dem videre til vores interaktive (klient) komponent
  return <CompetitionsClient initialCompetitions={competitions} />;
}
