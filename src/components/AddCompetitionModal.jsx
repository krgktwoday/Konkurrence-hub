"use client";

import { useState } from 'react';
import { X, Image as ImageIcon, Link as LinkIcon, Type, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function AddCompetitionModal({ isOpen, onClose, onCompetitionAdded }) {
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from('competitions')
        .insert([{ title, link, image_url: imageUrl, category: 'Andet' }])
        .select();

      if (dbError) throw dbError;

      setTitle('');
      setLink('');
      setImageUrl('');
      onCompetitionAdded(data[0]);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Der opstod en fejl ved indrapportering af konkurrencen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform transition-all">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">Tilføj Konkurrence</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Titel *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Type className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="F.eks. Vind en iPhone 15"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">URL (Link) *</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LinkIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="url"
                required
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Billede URL</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ImageIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="https://.../billede.jpg"
              />
            </div>
            {imageUrl && (
              <div className="mt-3 rounded-xl overflow-hidden h-32 border border-slate-100 bg-slate-50 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Preview" className="max-h-full max-w-full object-contain" onError={(e) => e.target.style.display='none'} />
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              Annuller
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Gemmer...' : (
                <>
                  <Plus className="w-5 h-5" />
                  Tilføj
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
