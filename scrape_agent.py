#!/usr/bin/env python3
"""
Scrape Agent - En AI-agent til indsamling af konkurrencedata.
Dette script skraber tekst fra en URL, analyserer teksten ved hjælp af en lokal Ollama-model,
og uploader strukturerede konkurrenceoplysninger til Supabase.
"""

import os
import re
import sys
import json
import argparse
import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional
from supabase import create_client, Client

# Indlæs miljøvariable fra .env filen
load_dotenv()

# Konfiguration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
OLLAMA_API_URL = os.environ.get("OLLAMA_API_URL", "http://localhost:11434").rstrip('/')
FORCE_MODEL = os.environ.get("FORCE_MODEL")

# Definer den ønskede datastruktur ved hjælp af Pydantic
class CompetitionDetails(BaseModel):
    is_competition: bool = Field(
        description="Sandt hvis siden beskriver en konkurrence, ellers falsk."
    )
    title: Optional[str] = Field(
        None, 
        description="Konkurrencens overskrift eller titel (f.eks. 'Vind en rejse for 2 til Spanien')."
    )
    category: Optional[str] = Field(
        None, 
        description="Kategori af konkurrence (f.eks. 'Rejser', 'Elektronik', 'Gavekort', 'Kontanter', 'Andet')."
    )
    prize_value: Optional[int] = Field(
        None, 
        description="Den samlede præmieværdi formateret som et rent heltal (integer). MÅ IKKE indeholde valuta eller tegn, og MÅ IKKE forveksles med datoer."
    )
    link: Optional[str] = Field(
        None, 
        description="URL-linket til konkurrencen."
    )


def select_best_ollama_model(base_url: str) -> Optional[str]:
    """
    Henter listen af installerede modeller fra den lokale Ollama-instans
    og vælger dynamisk den mest kapable model baseret på modelnavn og parameterstørrelse.
    """
    if FORCE_MODEL:
        print(f"[Ollama] Bruger tvungen model fra miljøvariable: {FORCE_MODEL}")
        return FORCE_MODEL

    try:
        response = requests.get(f"{base_url}/api/tags", timeout=5)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"[Ollama] Advarsel: Kunne ikke hente modeller fra Ollama på {base_url}: {e}")
        return None

    models = data.get("models", [])
    if not models:
        print("[Ollama] Advarsel: Ingen modeller er installeret i den lokale Ollama-instans.")
        return None

    scored_models = []
    for m in models:
        name = m.get("name", "")
        clean_name = name.split(":")[0].lower()
        
        details = m.get("details", {})
        families = details.get("families") or [details.get("family")] or []
        families = [f.lower() for f in families if f]
        
        # Udtræk parameterstørrelse som et tal (f.eks. "8B" -> 8.0, "70B" -> 70.0)
        param_str = details.get("parameter_size", "")
        param_size = 0.0
        if param_str:
            match = re.search(r"([0-9.]+)\s*[a-zA-Z]?", param_str)
            if match:
                try:
                    param_size = float(match.group(1))
                except ValueError:
                    pass
        
        # Hvis parameterstørrelse mangler, estimerer vi den ud fra filstørrelsen i bytes
        file_size = m.get("size", 0)
        if param_size == 0.0 and file_size > 0:
            # 1B parametre fylder ca. 0.5 - 1.5 GB i kvantiseret format
            param_size = (file_size / (1024**3)) * 1.3

        # Vægtningsfaktor baseret på model-familie og kvalitet
        family_weight = 1.0
        capable_keywords = ["llama3", "llama3.1", "llama3.2", "gemma2", "mistral", "qwen2.5", "qwen", "phi3"]
        
        # Tjek om modellen matcher kendte stærke modeller
        for kw in capable_keywords:
            if kw in clean_name or any(kw in f for f in families):
                family_weight = 1.5
                # Ekstra vægt til nyere og stærkere modeller
                if any(new_kw in clean_name for new_kw in ["llama3.1", "llama3.2", "gemma2", "qwen2.5"]):
                    family_weight = 2.0
                break

        score = param_size * family_weight
        
        scored_models.append({
            "name": name,
            "score": score,
            "param_size": param_size,
            "file_size": file_size
        })

    # Sorter efter score (højeste først), og derefter efter filstørrelse som tie-breaker
    scored_models.sort(key=lambda x: (x["score"], x["file_size"]), reverse=True)
    
    print("\n--- Installerede modeller fundet i din lokale Ollama-instans ---")
    for sm in scored_models:
        print(f"  - {sm['name']:<20} | Score: {sm['score']:.2f} | Størrelse: {sm['param_size']:.1f}B params ({sm['file_size']/(1024**3):.2f} GB)")
    print("----------------------------------------------------------------\n")

    best_model = scored_models[0]["name"]
    print(f"[Ollama] Valgte dynamisk den mest kapable model: '{best_model}'")
    return best_model


def scrape_url_content(url: str) -> tuple[Optional[str], str]:
    """
    Henter og scraper indholdet fra den angivne URL.
    Returnerer renset tekst og den endelige URL (efter eventuelle redirects).
    """
    print(f"[Scraper] Starter dataindsamling fra: {url}")
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"[Scraper] Fejl under hentning af URL: {e}")
        return None, url
        
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Fjern støj-elementer som scripts, CSS, navigation, headers og footers
    for element in soup(["script", "style", "nav", "header", "footer", "iframe", "aside"]):
        element.decompose()
        
    # Hent tekst og rens whitespace
    text = soup.get_text(separator="\n")
    lines = [line.strip() for line in text.splitlines()]
    clean_lines = [line for line in lines if line]
    clean_text = "\n".join(clean_lines)
    
    # Begræns teksten for ikke at overbelaste LLM context (ca. 4000 ord)
    words = clean_text.split()
    if len(words) > 4000:
        print(f"[Scraper] Teksten er for lang ({len(words)} ord). Forkorter til de første 4000 ord.")
        clean_text = " ".join(words[:4000])

    print(f"[Scraper] Succes! Skrabede {len(clean_text)} tegn fra siden.")
    return clean_text, response.url


def scrape_with_jina(url: str) -> tuple[Optional[str], str]:
    """
    Bruger Jina AI's gratis Reader API til at omgå JavaScript og cookie-bannere.
    Returnerer den rensede Markdown-tekst.
    """
    print(f"[Scraper] Starter avanceret dataindsamling via Jina AI fra: {url}")
    jina_url = f"https://r.jina.ai/{url}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/markdown"
    }
    
    try:
        response = requests.get(jina_url, headers=headers, timeout=30)
        response.raise_for_status()
    except Exception as e:
        print(f"[Scraper] Fejl under hentning med Jina AI: {e}")
        return None, url
        
    clean_text = response.text
    
    # Begræns teksten for ikke at overbelaste LLM context (ca. 4000 ord)
    words = clean_text.split()
    if len(words) > 4000:
        print(f"[Scraper] Teksten er for lang ({len(words)} ord). Forkorter til de første 4000 ord.")
        clean_text = " ".join(words[:4000])

    print(f"[Scraper] Succes med Jina AI! Skrabede {len(clean_text)} tegn.")
    return clean_text, url


def scrape_with_instaloader(url: str) -> tuple[Optional[str], str]:
    """
    Bruger instaloader til at trække teksten direkte ud fra et Instagram-opslag
    ved hjælp af dets shortcode.
    """
    print(f"[Scraper] Forsøger at trække Instagram-data ud fra: {url}")
    try:
        import instaloader
        L = instaloader.Instaloader(quiet=True)
        
        # Find shortcode fra URL'en. Eksempel: https://www.instagram.com/p/DSIYqL_jHq_/
        match = re.search(r"instagram\.com/(?:p|reel)/([^/?#&]+)", url)
        if not match:
            print("[Scraper] Fejl: Kunne ikke finde en gyldig Instagram shortcode i linket.")
            return None, url
            
        shortcode = match.group(1)
        print(f"[Scraper] Fandt shortcode: {shortcode}. Henter opslag...")
        
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        caption = post.caption
        
        if not caption:
            print("[Scraper] Fandt opslaget, men der var ingen tekst/caption.")
            return "", url
            
        print(f"[Scraper] Succes med Instaloader! Hentede caption på {len(caption)} tegn.")
        return caption, url
        
    except Exception as e:
        print(f"[Scraper] Fejl under hentning med Instaloader: {e}")
        print("[Scraper] Tip: Instagram blokerer ofte anonyme anmodninger. Hvis dette sker konstant, kræves der login.")
        return None, url


def clean_and_parse_prize_value(val) -> Optional[int]:
    """
    Sikrer, at præmieværdien konverteres korrekt til et heltal (integer)
    og forhindrer fejl-konverteringer til datoer eller forkerte talformater.
    """
    if val is None or val == "":
        return None

    # Hvis det allerede er et heltal
    if isinstance(val, int) and not isinstance(val, bool):
        return val

    # Hvis det er en float, afrunder vi til nærmeste heltal
    if isinstance(val, float):
        return int(round(val))

    # Hvis det er en string, skal vi rense den grundigt
    if isinstance(val, str):
        # Fjern valutaer, whitespace og symboler
        cleaned = val.lower().replace("kr", "").replace("dkk", "").replace("$-", "").strip()
        
        # Tjek for datomønstre som f.eks. "12.12.2026", "2026-06-16", "16/06/2026"
        # for at forhindre at de ved en fejl læses som talværdier
        date_pattern = r'\d{1,4}[-./]\d{1,2}[-./]\d{2,4}'
        if re.search(date_pattern, cleaned):
            print(f"[Validering] Advarsel: Værdien '{val}' ligner en dato. Sætter præmieværdi til None.")
            return None

        # Håndter danske talformater. F.eks. "10.000" (tusindtals-separator) og "99,50" (decimal)
        if "," in cleaned:
            # Fjern decimaler
            cleaned = cleaned.split(",")[0]
        # Fjern tusindtals-punktummer (dansk format) eller kommaer (engelsk format)
        cleaned = cleaned.replace(".", "").replace(" ", "")

        # Træk kun de numeriske tegn ud
        digits = "".join([c for c in cleaned if c.isdigit()])
        if digits:
            try:
                parsed_val = int(digits)
                return parsed_val
            except ValueError:
                return None
                
    return None


def analyze_with_ollama(model_name: str, text: str, source_link: str) -> Optional[CompetitionDetails]:
    """
    Sender den skrabede tekst til Ollama for at vurdere om det er en konkurrence,
    og udtrækker strukturerede data.
    """
    print(f"[Ollama] Analyserer tekst med modellen '{model_name}'...")
    
    # System prompt med præcise instruktioner og regler for talformatering
    system_prompt = (
        "Du er en præcis AI-agent, der analyserer tekst fra websider for at identificere konkurrencer.\n"
        "Din opgave er at afgøre, om teksten beskriver en konkurrence, og i så fald udtrække data.\n\n"
        "Regler for udtrækning:\n"
        "1. Sæt 'is_competition' til true, hvis siden indeholder en konkurrence, lodtrækning eller giveaway.\n"
        "2. Sæt 'title' til en dækkende overskrift for konkurrencen.\n"
        "3. Sæt 'category' til en af følgende kategorier: 'Rejser', 'Elektronik', 'Gavekort', 'Kontanter' eller 'Andet'.\n"
        "4. Sæt 'prize_value' til den samlede præmieværdi som et RENT HELTAL (integer).\n"
        "   - VIGTIGT: Hvis præmien er 'Vind 15.000 kr.', skal du returnere 15000.\n"
        "   - Du må absolut IKKE inkludere tekst, valutasymboler eller datoer i dette felt.\n"
        "   - MÅ IKKE forveksles med datoer (f.eks. må datoen '16. juni' eller året '2026' IKKE gemmes som præmieværdi).\n"
        "   - Hvis værdien ikke er nævnt, skal du sætte den til null.\n"
        "5. Sæt 'link' til konkurrencens URL (brug værdien: {link}).\n\n"
        "Du SKAL returnere et gyldigt JSON-objekt, der overholder disse felter."
    ).format(link=source_link)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Her er teksten fra websiden:\n\n{text}"}
    ]

    # JSON Schema definition til Ollama (Structured Outputs)
    json_schema = {
        "type": "object",
        "properties": {
            "is_competition": {"type": "boolean"},
            "title": {"type": ["string", "null"]},
            "category": {"type": ["string", "null"]},
            "prize_value": {"type": ["integer", "null"]},
            "link": {"type": ["string", "null"]}
        },
        "required": ["is_competition", "title", "category", "prize_value", "link"]
    }

    # Forsøg at lave kaldet med skematisk JSON output (Ollama v0.3+)
    payload = {
        "model": model_name,
        "messages": messages,
        "format": json_schema,
        "options": {
            "temperature": 0.0  # Lav temperatur sikrer deterministisk og præcis struktur
        },
        "stream": False
    }

    response_content = ""
    try:
        url = f"{OLLAMA_API_URL}/api/chat"
        response = requests.post(url, json=payload, timeout=60)
        if response.status_code == 200:
            response_content = response.json().get("message", {}).get("content", "")
        else:
            print(f"[Ollama] Skema-kald fejlede med status {response.status_code}. Prøver fallback...")
    except Exception as e:
        print(f"[Ollama] Fejl under skematisk forespørgsel: {e}. Prøver fallback...")

    # Fallback til almindelig JSON-streng-format, hvis skema-kaldet fejler
    if not response_content:
        payload["format"] = "json"
        try:
            url = f"{OLLAMA_API_URL}/api/chat"
            response = requests.post(url, json=payload, timeout=60)
            response.raise_for_status()
            response_content = response.json().get("message", {}).get("content", "")
        except Exception as e:
            print(f"[Ollama] Alvorlig fejl: Kunne ikke kommunikere med Ollama: {e}")
            return None

    if not response_content:
        print("[Ollama] Modtog intet svar fra modellen.")
        return None

    # Pars og valider det modtagne svar
    try:
        parsed_data = json.loads(response_content.strip())
        
        # Ekstra oprydning og validering af talværdier på Python-siden
        raw_prize = parsed_data.get("prize_value")
        parsed_data["prize_value"] = clean_and_parse_prize_value(raw_prize)
        
        # Opret Pydantic instans for at validere typerne
        details = CompetitionDetails(**parsed_data)
        return details
    except Exception as e:
        print(f"[Ollama] Fejl ved parsing eller validering af AI-svar: {e}")
        print(f"Modtaget råt svar: {response_content}")
        return None


def save_to_supabase(details: CompetitionDetails) -> bool:
    """
    Uploader de strukturerede konkurrencedata til Supabase databasen.
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[Database] Fejl: Supabase URL eller API-nøgle mangler i .env filen.")
        return False

    print("[Database] Forbinder til Supabase...")
    try:
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Forbered data til indsættelse
        db_data = {
            "title": details.title,
            "category": details.category,
            "prize_value": details.prize_value,
            "link": details.link
        }
        
        print(f"[Database] Indsætter konkurrence: {db_data}")
        response = supabase.table("competitions").insert(db_data).execute()
        
        # Supabase-py v2 returnerer et objekt med en 'data' attribut
        if response.data:
            print("[Database] Succes! Data blev gemt i tabellen 'competitions'.")
            return True
        else:
            print(f"[Database] Advarsel: Indsættelse lykkedes muligvis ikke. Svar: {response}")
            return False
            
    except Exception as e:
        print(f"[Database] Fejl under upload til Supabase: {e}")
        print("[Database] Tip: Hvis du modtager en 401/403 eller tom respons, tjek om din RLS-politik tillader anonyme INSERTs, eller brug din 'service_role'-nøgle.")
        return False


def main():
    parser = argparse.ArgumentParser(description="AI Agent til skrabning og registrering af konkurrencer.")
    parser.add_argument(
        "--url", 
        type=str, 
        default="https://www.test.dk/konkurrence-eksempel",
        help="URL på websiden der skal analyseres (standard: test-url)"
    )
    args = parser.parse_args()

    print("=== STARTING SCRAPER AGENT ===")
    
    # 1. Hent den bedste model dynamisk fra den lokale Ollama instans
    best_model = select_best_ollama_model(OLLAMA_API_URL)
    if not best_model:
        print("[Agent] Fejl: Kunne ikke vælge en egnet Ollama-model. Kontroller, at Ollama kører.")
        sys.exit(1)

    # 2. Dataindsamling via scraping
    scraped_text, final_url = scrape_url_content(args.url)
    if not scraped_text:
        print("[Agent] Fejl: Kunne ikke hente tekst fra URL'en.")
        sys.exit(1)

    # 3. AI-vurdering og strukturering
    details = analyze_with_ollama(best_model, scraped_text, final_url)
    
    if not details:
        print("[Agent] Fejl: AI-analysen mislykkedes.")
        sys.exit(1)

    print("\n=== AI VURDERINGSRESULTAT ===")
    print(f"Er konkurrence?: {details.is_competition}")
    if details.is_competition:
        print(f"Titel:          {details.title}")
        print(f"Kategori:       {details.category}")
        print(f"Præmieværdi:    {details.prize_value} kr. (Type: {type(details.prize_value).__name__})")
        print(f"Link:           {details.link}")
        print("=============================\n")

        # 4. Database-integration (gemmer kun hvis det er en konkurrence)
        success = save_to_supabase(details)
        if success:
            print("[Agent] Script fuldført med succes!")
        else:
            print("[Agent] Script fuldført, men kunne ikke gemme i databasen.")
    else:
        print("Siden blev vurderet til IKKE at være en konkurrence. Ingen database-upload foretaget.")
        print("=============================\n")


if __name__ == "__main__":
    main()
