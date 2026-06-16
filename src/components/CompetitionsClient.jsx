"use client";

import { useState } from 'react';
import { Search, Gift, Clock, ExternalLink, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { da } from 'date-fns/locale';

export default function CompetitionsClient({ initialCompetitions }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Alle');

  // Udtræk alle unikke kategorier, fjerner null/undefined
  const categories = ['Alle', ...new Set(initialCompetitions.map(c => c.category).filter(Boolean))];

  // Filtrer baseret på søgning og kategori
  const filtered = initialCompetitions.filter(comp => {
    const matchesSearch = comp.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'Alle' || comp.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Hero Sektion (Wow-faktor) */}
      <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 pt-20 pb-24 px-4 sm:px-6 lg:px-8 text-center text-white relative overflow-hidden shadow-lg">
        {/* Subtilt mønster/overlay i baggrunden */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent"></div>
        
        <div className="relative max-w-3xl mx-auto z-10">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mb-6 drop-shadow-sm">
            Vind fantastiske præmier
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Vi samler Danmarks bedste konkurrencer ét sted. 
            Find din næste drømmepræmie og deltag helt gratis.
          </p>
          
          {/* Søgefelt */}
          <div className="relative max-w-xl mx-auto group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Søg efter f.eks. 'iPhone' eller 'Gavekort'..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 rounded-full border-0 ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-indigo-500 bg-white text-gray-900 shadow-xl placeholder:text-gray-400 text-lg outline-none transition-all hover:shadow-2xl"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20">
        
        {/* Filter Panel */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800">Kategorier</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedCategory === cat 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-105' 
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
            {filtered.length} {filtered.length === 1 ? 'konkurrence' : 'konkurrencer'} fundet
          </h2>
        </div>

        {/* Konkurrence Grid (Kort Design) */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map(comp => (
              <div 
                key={comp.id} 
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl border border-slate-100 transition-all duration-300 flex flex-col hover:-translate-y-1"
              >
                {/* "Billede" / Top farveblok */}
                <div className="h-40 bg-gradient-to-br from-slate-50 to-slate-100 relative p-6 flex flex-col justify-end border-b border-slate-100">
                  <span className="inline-flex absolute top-4 right-4 items-center rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
                    {comp.category || 'Andet'}
                  </span>
                  
                  <div className="flex items-center gap-2 text-indigo-600 font-extrabold text-2xl group-hover:scale-105 transition-transform origin-left">
                    <Gift className="w-6 h-6 text-indigo-500" />
                    {comp.prize_value ? `${comp.prize_value} kr.` : 'Værdi ukendt'}
                  </div>
                </div>

                {/* Kort Indhold */}
                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg text-slate-900 leading-snug mb-2 line-clamp-2">
                    {comp.title}
                  </h3>
                  
                  {comp.expiry_date && (
                    <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-auto pt-4 border-t border-slate-50">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        Udløber {format(new Date(comp.expiry_date), 'd. MMM yyyy', { locale: da })}
                      </span>
                    </div>
                  )}

                  {/* Call to Action Knap */}
                  <a 
                    href={comp.link} 
                    target="_blank" 
                    rel="noreferrer"
                    className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white py-3.5 px-4 rounded-xl font-bold transition-all duration-300 group-hover:shadow-lg focus:ring-4 focus:ring-indigo-100"
                  >
                    Deltag nu
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Tom State */
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
            <Gift className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-900">Ingen konkurrencer fundet</h3>
            <p className="text-slate-500 mt-2">Prøv at søge efter noget andet eller fjern dine filtre.</p>
            <button 
              onClick={() => { setSearchTerm(''); setSelectedCategory('Alle'); }}
              className="mt-6 px-6 py-2 bg-indigo-50 text-indigo-600 font-medium rounded-full hover:bg-indigo-100 transition-colors"
            >
              Nulstil filtre
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
