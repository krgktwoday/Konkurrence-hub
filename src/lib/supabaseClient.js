import { createClient } from '@supabase/supabase-js';

// Vi trækker vores hemmelige nøgler fra miljøvariablerne (så de ikke ender på GitHub)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Opretter forbindelsen til databasen med den nye "Publishable Key"
export const supabase = createClient(supabaseUrl, supabasePublishableKey);

/**
 * Funktion der henter de nyeste konkurrencer fra databasen.
 * Den sorterer automatisk, så de nyeste ligger øverst.
 */
export async function getCompetitions() {
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fejl ved hentning af konkurrencer:', error.message);
    return [];
  }

  return data;
}
