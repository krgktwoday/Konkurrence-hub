"use client";

import { useState } from 'react';
import { Search, Gift, Clock, ExternalLink, Filter, Plus, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { da, enUS } from 'date-fns/locale';
import AddCompetitionModal from './AddCompetitionModal';

const dict = {
  da: {
    heroTitle: "Konkurrér. Vind. Fejr.",
    heroSubtitle: "Deltag sammen med tusindvis af andre. Vi samler Danmarks bedste konkurrencer ét sted. Find din næste drømmepræmie og deltag helt gratis.",
    searchPlaceholder: "Søg efter f.eks. 'iPhone' eller 'Gavekort'...",
    addCompetition: "Indrapporter Konkurrence",
    categories: "Kategorier",
    all: "Alle",
    compsFound: "konkurrencer fundet",
    compFound: "konkurrence fundet",
    valueUnknown: "Værdi ukendt",
    expires: "Udløber",
    enterNow: "Deltag nu",
    other: "Andet",
    noComps: "Ingen konkurrencer fundet",
    tryOther: "Prøv at søge efter noget andet eller fjern dine filtre.",
    resetFilters: "Nulstil filtre",
    valCode: "kr."
  },
  en: {
    heroTitle: "Compete. Win. Celebrate.",
    heroSubtitle: "Join thousands of competitors. We gather Denmark's best competitions in one place. Find your next dream prize and participate for free.",
    searchPlaceholder: "Search for e.g. 'iPhone' or 'Gift card'...",
    addCompetition: "Add Competition",
    categories: "Categories",
    all: "All",
    compsFound: "competitions found",
    compFound: "competition found",
    valueUnknown: "Value unknown",
    expires: "Expires",
    enterNow: "Enter now",
    other: "Other",
    noComps: "No competitions found",
    tryOther: "Try searching for something else or remove your filters.",
    resetFilters: "Reset filters",
    valCode: "DKK"
  }
};

const getCategoryColor = (category) => {
  if (!category) return 'bg-amber-500';
  const cat = category.toLowerCase();
  if (cat.includes('elektronik') || cat.includes('tech')) return 'bg-teal-500';
  if (cat.includes('gavekort') || cat.includes('penge')) return 'bg-orange-500';
  if (cat.includes('rejser') || cat.includes('ferie')) return 'bg-sky-500';
  if (cat.includes('mad') || cat.includes('drikke')) return 'bg-red-500';
  if (cat.includes('tøj') || cat.includes('mode')) return 'bg-pink-500';
  return 'bg-amber-500';
};

export default function CompetitionsClient({ initialCompetitions }) {
  const [competitions, setCompetitions] = useState(initialCompetitions || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Alle');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lang, setLang] = useState('da');
  
  const t = dict[lang];

  // Udtræk alle unikke kategorier, fjerner null/undefined
  const uniqueCategories = [...new Set(competitions.map(c => c.category).filter(Boolean))];
  const categoriesList = [t.all, ...uniqueCategories];

  // Filtrer baseret på søgning og kategori
  const filtered = competitions.filter(comp => {
    const matchesSearch = comp.title?.toLowerCase().includes(searchTerm.toLowerCase());
    // Håndter oversættelse af "Alle" / "All"
    const isAll = selectedCategory === dict.da.all || selectedCategory === dict.en.all;
    const matchesCat = isAll || comp.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleLanguageToggle = () => {
    // Skift sprog og nulstil evt. "Alle" kategori, så den matcher det nye sprog
    if (lang === 'da') {
      setLang('en');
      if (selectedCategory === dict.da.all) setSelectedCategory(dict.en.all);
    } else {
      setLang('da');
      if (selectedCategory === dict.en.all) setSelectedCategory(dict.da.all);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      
      {/* Top Navbar / Header med Sprogvalg */}
      <div className="absolute top-0 w-full z-50 p-4 flex justify-between items-center max-w-7xl mx-auto left-0 right-0">
        <div className="text-white font-bold text-xl tracking-tight flex items-center gap-2">
          {/* Logo / Brand Name placeholder */}
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <Gift className="w-5 h-5 text-white" />
          </div>
          CompeteLive
        </div>
        <button 
          onClick={handleLanguageToggle}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full transition-all text-sm font-medium border border-white/30"
        >
          <Globe className="w-4 h-4" />
          {lang === 'da' ? '🇩🇰 DA' : '🇬🇧 EN'}
        </button>
      </div>

      {/* Hero Sektion (Orange Theme) */}
      <div className="bg-gradient-to-br from-orange-500 via-orange-400 to-amber-400 pt-32 pb-32 px-4 sm:px-6 lg:px-8 text-center text-white relative overflow-hidden">
        {/* Bubbly/Radial overlay for at matche Figma lidt mere blødt */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
        <div className="absolute -left-20 top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute right-10 bottom-20 w-80 h-80 bg-orange-600/20 rounded-full blur-3xl"></div>
        
        <div className="relative max-w-4xl mx-auto z-10">
          <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 drop-shadow-sm">
            {t.heroTitle}
          </h1>
          <p className="text-lg sm:text-xl text-orange-50 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t.heroSubtitle}
          </p>
          
          {/* Søgefelt */}
          <div className="relative max-w-xl mx-auto group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 rounded-full border-0 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-orange-500 bg-white text-gray-900 shadow-xl placeholder:text-gray-400 text-lg outline-none transition-all hover:shadow-2xl"
            />
          </div>

          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-amber-300 text-amber-900 font-bold rounded-full shadow-lg hover:shadow-xl hover:scale-105 hover:bg-amber-200 transition-all duration-300"
            >
              <Plus className="w-5 h-5" />
              {t.addCompetition}
            </button>
          </div>
        </div>

        {/* Wave bottom separator */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none translate-y-[1px]">
          <svg className="relative block w-full h-[40px] sm:h-[60px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.08,130.83,119.5,193.94,103.5,237.91,92.35,280.4,75.1,321.39,56.44Z" className="fill-slate-50"></path>
          </svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 relative z-20">
        
        {/* Filter Panel */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-8 mt-4">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-slate-800">{t.categories}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoriesList.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  selectedCategory === cat 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-200 scale-105' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:scale-105'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Antal Resultater */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {filtered.length} {filtered.length === 1 ? t.compFound : t.compsFound}
          </h2>
        </div>

        {/* Konkurrence Grid (Figma-lignende kort) */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(comp => {
              const cardColor = getCategoryColor(comp.category);
              return (
                <div 
                  key={comp.id} 
                  className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-300 flex flex-col hover:-translate-y-1"
                >
                  {/* Top farveblok */}
                  <div className={`h-44 relative p-6 flex flex-col justify-end ${comp.image_url ? '' : cardColor}`}>
                    {comp.image_url && (
                      <div className="absolute inset-0 w-full h-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={comp.image_url} alt={comp.title} className="w-full h-full object-cover" onError={(e) => e.target.style.display='none'} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      </div>
                    )}
                    
                    <span className="inline-flex absolute z-10 top-4 right-4 items-center rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
                      {comp.category || t.other}
                    </span>
                    
                    <div className="flex items-center z-10 gap-2 font-extrabold text-2xl text-white group-hover:scale-105 transition-transform origin-left">
                      <Gift className="w-6 h-6 text-white/90" />
                      {comp.prize_value ? `${comp.prize_value} ${t.valCode}` : t.valueUnknown}
                    </div>
                  </div>

                  {/* Kort Indhold */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-extrabold text-lg text-slate-900 leading-snug mb-3 line-clamp-2">
                      {comp.title}
                    </h3>
                    
                    {comp.expiry_date && (
                      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 mt-auto pt-4">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                          {t.expires} {format(new Date(comp.expiry_date), 'd. MMM yyyy', { locale: lang === 'da' ? da : enUS })}
                        </span>
                      </div>
                    )}

                    {/* Call to Action Knap */}
                    <a 
                      href={comp.link} 
                      target="_blank" 
                      rel="noreferrer"
                      className="mt-5 w-full flex items-center justify-center gap-2 bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white py-3.5 px-4 rounded-2xl font-bold transition-all duration-300 group-hover:shadow-md focus:ring-4 focus:ring-orange-100"
                    >
                      {t.enterNow}
                      <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Tom State */
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
            <Gift className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900">{t.noComps}</h3>
            <p className="text-slate-500 mt-2">{t.tryOther}</p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory(t.all); }}
              className="mt-6 px-8 py-3 bg-orange-50 text-orange-600 font-bold rounded-full hover:bg-orange-100 transition-colors"
            >
              {t.resetFilters}
            </button>
          </div>
        )}
      </div>
      <AddCompetitionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onCompetitionAdded={(newComp) => setCompetitions([newComp, ...competitions])}
      />
    </div>
  );
}

