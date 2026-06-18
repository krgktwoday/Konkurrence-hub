import os
import time
import streamlit as st
from dotenv import load_dotenv

# Importer funktionerne fra vores opdaterede scrape_agent
from scrape_agent import (
    select_best_ollama_model,
    scrape_url_content,
    scrape_with_jina,
    scrape_with_instaloader,
    analyze_with_ollama,
    save_to_supabase,
    OLLAMA_API_URL
)

# Indlæs miljøvariabler
load_dotenv()

st.set_page_config(
    page_title="Scraper Dashboard",
    page_icon="🤖",
    layout="centered"
)

# --- CSS Styling ---
st.markdown("""
<style>
    .main-header { font-size: 2.5rem; font-weight: 800; color: #1E3A8A; margin-bottom: 0; }
    .sub-header { font-size: 1.1rem; color: #475569; margin-bottom: 2rem; }
    .status-box { padding: 1.5rem; border-radius: 0.5rem; background-color: #F8FAFC; border-left: 5px solid #3B82F6; margin-bottom: 1rem; }
</style>
""", unsafe_allow_html=True)

st.markdown('<div class="main-header">Konkurrence Scraper</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-header">Automatisér og validér konkurrencer via AI</div>', unsafe_allow_html=True)

# Opret to faner i brugerfladen
tab1, tab2 = st.tabs(["🌍 Almindelig Hjemmeside (Jina AI)", "📱 Sociale Medier (Instagram)"])

def run_scraping_pipeline(url_input, scrape_method_name):
    st.markdown("---")
    
    # ---------------------------------------------------------
    # TRIN 1: FORBEREDELSE & OLLAMA TJEK
    # ---------------------------------------------------------
    with st.status("🔍 Forbereder AI...", expanded=True) as status:
        st.write("Forbinder til lokal Ollama...")
        best_model = select_best_ollama_model(OLLAMA_API_URL)
        
        if not best_model:
            status.update(label="❌ Fejl: Kunne ikke finde en Ollama model.", state="error")
            st.stop()
        
        st.write(f"✅ Valgt model: **{best_model}**")
        status.update(label="✅ AI Forberedt!", state="complete")
        time.sleep(0.5)

    # ---------------------------------------------------------
    # TRIN 2: SKRAB & VASK AF TEKST
    # ---------------------------------------------------------
    with st.status("🧹 Henter og vasker indhold...", expanded=True) as status:
        st.write(f"Skraber data via {scrape_method_name}...")
        
        if scrape_method_name == "jina":
            scraped_text, final_url = scrape_with_jina(url_input)
        elif scrape_method_name == "instaloader":
            scraped_text, final_url = scrape_with_instaloader(url_input)
        else:
            scraped_text, final_url = scrape_url_content(url_input)
            
        if not scraped_text:
            if scrape_method_name == "instaloader":
                st.error("Kunne ikke hente Instagram-opslaget. Det kan skyldes at profilen er privat, eller at Instagram kræver login/blokerer anmodningen.")
            status.update(label="❌ Fejl: Kunne ikke hente tekst.", state="error")
            st.stop()
        
        st.write(f"✅ Renset {len(scraped_text)} tegn.")
        with st.expander("Se den rå, vaskede tekst"):
            st.text(scraped_text[:1500] + ("..." if len(scraped_text) > 1500 else ""))
        
        status.update(label="✅ Indhold vasket og klar!", state="complete")
        time.sleep(0.5)

    # ---------------------------------------------------------
    # TRIN 3: AI VALIDERING
    # ---------------------------------------------------------
    with st.status("🧠 AI læser og strukturerer data...", expanded=True) as status:
        st.write("Sender teksten til Ollama. Det tager typisk 5-15 sekunder...")
        details = analyze_with_ollama(best_model, scraped_text, final_url)
        
        if not details:
            status.update(label="❌ Fejl: AI-analysen mislykkedes.", state="error")
            st.stop()

        if not details.is_competition:
            status.update(label="⚠️ AI vurderede, at dette IKKE er en konkurrence.", state="error")
            st.stop()

        st.write("✅ Strukturering fuldført! Her er hvad AI'en fandt:")
        
        col1, col2 = st.columns(2)
        col1.metric("Titel", details.title if details.title else "Ukendt")
        col2.metric("Præmieværdi", f"{details.prize_value} kr." if details.prize_value else "Ukendt")
        
        st.write("**Kategori:**", details.category)
        
        with st.expander("Se rå JSON-data fra AI"):
            st.json(details.model_dump())
        
        status.update(label="✅ Data er valideret af AI!", state="complete")
        time.sleep(0.5)

    # ---------------------------------------------------------
    # TRIN 4: PUBLICERING TIL DATABASEN
    # ---------------------------------------------------------
    with st.status("☁️ Publicerer til din live hjemmeside...", expanded=True) as status:
        st.write("Uploader til Supabase...")
        success = save_to_supabase(details)
        
        if success:
            status.update(label="✅ Succes! Konkurrencen er nu LIVE.", state="complete")
            st.balloons()
        else:
            status.update(label="❌ Fejl: Kunne ikke gemme i databasen.", state="error")


# --- FANE 1: Almindelig Hjemmeside ---
with tab1:
    st.write("Brug denne fane til normale hjemmesider, nyhedssider og webshops (f.eks. Power.dk eller Samvirke.dk).")
    url_web = st.text_input("🔗 Indsæt URL til hjemmesiden:", key="url_web", placeholder="https://www.power.dk/keys/")
    
    if st.button("Start AI Scraper (Jina API) 🚀", key="btn_web", type="primary", use_container_width=True):
        if not url_web:
            st.warning("Indsæt venligst et link først.")
        else:
            run_scraping_pipeline(url_web, "jina")


# --- FANE 2: Instagram ---
with tab2:
    st.write("Brug denne fane til offentlige Instagram-opslag. *(Bemærk: Lukkede profiler kan ikke skrabes)*.")
    url_ig = st.text_input("📱 Indsæt URL til Instagram-opslag:", key="url_ig", placeholder="https://www.instagram.com/p/...")
    
    if st.button("Start Instagram Scraper 🚀", key="btn_ig", type="primary", use_container_width=True):
        if not url_ig:
            st.warning("Indsæt venligst et Instagram-link først.")
        else:
            run_scraping_pipeline(url_ig, "instaloader")
