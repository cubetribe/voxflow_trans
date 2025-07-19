# Prompt für SRT Feature Implementation

## Kontext

Du arbeitest am VoxFlow Transcription System. Der Python Voxtral Service ist vollständig implementiert. Jetzt soll die SRT Export-Funktionalität hinzugefügt werden.

**WICHTIG**: Beachte die Projekt-Regeln in CLAUDE.md - KEINE Quick-Fixes, NUR production-ready Code!

## Aufgabe

Implementiere die SRT Export-Funktionalität gemäß der beigefügten SRT_Feature_Specification.md mit folgenden Komponenten:

### 1. Python Service Erweiterung

**Erstelle in `python-service/app/services/srt_service.py`:**

```python
# Vollständige SRT Generation Service mit:
- SRTConfig Pydantic Model für Konfiguration
- SRT Generation mit python-srt Library
- Line-Breaking mit srt_equalizer
- Custom Extensions für deutsche Sprache
- Multi-Format Export (SRT, VTT, TXT, JSON)
- Quality Validation
- Comprehensive Error Handling
```

**Dependencies zu `requirements.txt` hinzufügen:**
```
srt>=3.5.3
srt-equalizer>=0.1.8
```

### 2. API Endpoints

**Erweitere `python-service/app/api/endpoints/export.py`:**

- `POST /export/srt/{transcription_id}` - Single SRT Export
- `POST /export/batch` - Batch Export
- `GET /export/status/{job_id}` - Export Status
- WebSocket Support für Progress Updates

### 3. Node.js Service Integration

**Erweitere den Node.js Gateway mit:**

- Export Routes in `node-service/src/controllers/export.controller.ts`
- SRT Config Validation mit Zod
- Progress Tracking via WebSocket
- File Download Handling

### 4. Frontend UI Components

**Erstelle React Components für SRT Preview:**

`frontend/src/components/srt/SRTPreview.tsx`:
- Live-Preview des generierten SRT
- Statistik-Anzeige (Zeichen/Zeile, Lesegeschwindigkeit)
- Timeline-Visualisierung
- Edit-in-place Funktionalität
- Visuelle Warnungen bei Problemen

`frontend/src/components/srt/SRTTestPanel.tsx`:
- Test-Modus mit Beispieldaten
- Sprach-Auswahl (alle 9 Voxtral-Sprachen)
- Config-Sliders für alle Parameter
- Live-Update bei Änderungen
- Export in verschiedenen Formaten

`frontend/src/components/srt/SRTConfigForm.tsx`:
- Formular für SRT-Konfiguration
- Presets für verschiedene Standards (Netflix, BBC, Custom)
- Sprach-spezifische Defaults
- Validation in Echtzeit

### 5. Test-Funktionalität

**Python Service Test-Modul** `python-service/app/services/srt_test_service.py`:

```python
# Test-Daten-Generator für alle 9 Sprachen
# Realistische Beispiel-Segmente
# Verschiedene Edge-Cases (lange Sätze, kurze Utterances)
# Performance-Test mit großen Datenmengen
```

**Frontend Test-Integration:**
- Test-Button im Transcription-View
- Separater Test-Tab für Entwickler
- A/B Vergleich verschiedener Configs
- Benchmark-Anzeige

## Implementierungs-Anforderungen

### Konfigurierbare Parameter (PFLICHT)

```typescript
interface SRTConfig {
  // Zeichen-Limits
  maxCharsPerLine: number;      // Default: 42
  maxLinesPerSubtitle: number;  // Default: 2 (1 oder 2 wählbar)
  
  // Timing
  minDuration: number;          // Default: 1.0s
  maxDuration: number;          // Default: 8.0s
  minGap: number;              // Default: 0.08s
  
  // Sprache
  language: string;            // Default: "de"
  readingSpeedCPS: number;     // Default: 17
  
  // Splitting
  splitMethod: 'greedy' | 'halving' | 'punctuation';
  preservePhrases: boolean;
}
```

## Sprach-spezifische Implementierung

### Unterstützte Sprachen (ALLE Voxtral-Sprachen)

Implementiere spezifische Regeln für JEDE Sprache:

```python
LANGUAGE_CONFIGS = {
    "en": {"max_chars": 42, "reading_speed": 17},
    "de": {"max_chars": 41, "reading_speed": 16, "compound_word_handling": True},
    "es": {"max_chars": 39, "reading_speed": 17},
    "fr": {"max_chars": 41, "reading_speed": 16},
    "pt": {"max_chars": 41, "reading_speed": 17},
    "it": {"max_chars": 39, "reading_speed": 17},
    "nl": {"max_chars": 41, "reading_speed": 16},
    "hi": {"max_chars": 33, "reading_speed": 14, "script": "devanagari"},
    "ar": {"max_chars": 33, "reading_speed": 15, "direction": "rtl"}
}
```

### Sprach-Features

1. **Deutsch**: Compound-Word Detection, Umlaute
2. **Englisch**: Contraction handling (don't, won't)
3. **Spanisch/Französisch**: Akzente berücksichtigen
4. **Arabisch**: RTL-Support, arabische Ziffern
5. **Hindi**: Devanagari Script, Matra-Handling

### Quality Checks

Jeder Export MUSS validiert werden:
- Reading Speed innerhalb Limits
- Keine überlappenden Timecodes  
- Korrekte Zeichencodierung (UTF-8)
- Line-Balance Prüfung

### Error Handling

- Graceful Degradation bei Fehlern
- Detaillierte Error Messages
- Recovery Mechanisms
- User-friendly Feedback

## Code-Qualität

### VERBOTEN
- ❌ Hardcoded Werte (alles konfigurierbar!)
- ❌ Quick-and-dirty Lösungen
- ❌ Ungetesteter Code
- ❌ Fehlende Dokumentation

### PFLICHT
- ✅ Type Safety überall
- ✅ Comprehensive Tests
- ✅ Performance Monitoring
- ✅ Production Logging

## Testing

Erstelle Tests für:

### 1. Unit Tests
- SRT Format Validation
- Line-Breaking Logic für ALLE 9 Sprachen
- Timing Calculations
- Config Validation
- Test-Data Generator

### 2. Integration Tests  
- Voxtral → SRT Pipeline
- Multi-Format Export
- Batch Processing
- Error Scenarios
- UI Component Tests

### 3. UI Tests
- Preview Component Rendering
- Live-Edit Funktionalität
- Config-Änderungen
- Export-Workflow
- Responsive Design

### 4. Edge Cases & Sprach-Tests
- Sehr lange Sätze in jeder Sprache
- RTL-Support für Arabisch
- Devanagari für Hindi
- Umlaute und ß für Deutsch
- Akzente für romanische Sprachen
- Große Dateien (2h+)
- Gemischte Sprachen in einem Dokument

### 6. Datenbank Schema

**Erweitere das Schema für:**
- Export Jobs Tabelle
- SRT Config Speicherung pro User/Projekt
- Export History mit Statistiken
- Favorite Presets

**Schema Updates:**
```sql
-- Export Jobs
CREATE TABLE export_jobs (
    id UUID PRIMARY KEY,
    transcription_id UUID REFERENCES transcriptions(id),
    config JSONB NOT NULL,
    status VARCHAR(50),
    format VARCHAR(10),
    created_at TIMESTAMP,
    completed_at TIMESTAMP,
    file_path TEXT,
    statistics JSONB
);

-- User Presets
CREATE TABLE srt_presets (
    id UUID PRIMARY KEY,
    user_id UUID,
    name VARCHAR(100),
    config JSONB,
    is_default BOOLEAN DEFAULT FALSE
);
```

1. **Voll funktionsfähiger SRT Service** mit allen Features
2. **API Endpoints** mit Swagger Dokumentation
3. **Tests** mit >90% Coverage
4. **Performance Metrics** (< 100ms pro Audio-Minute)
5. **Beispiel-Outputs** in verschiedenen Konfigurationen

## Zusätzliche Hinweise

- Nutze die bewährten Libraries (python-srt, srt_equalizer)
- Erweitere nur wo nötig mit Custom Code  
- Dokumentiere alle Konfigurationsoptionen
- Implementiere Progress-Tracking für lange Dateien

### UI-Integration
- Die SRT-Preview soll in den bestehenden TranscriptionView integriert werden
- Ein neuer Tab "SRT Export" neben "Transcription" und "Audio"
- Test-Modus als Developer-Tool im Settings-Menü
- Mobile-responsive Design ist PFLICHT

### Test-Workflow
1. User kann ohne Audio-Upload den Test-Modus starten
2. Wählt Sprache und sieht sofort Beispiel-SRT
3. Kann Config live anpassen und Änderungen sehen
4. Exportiert Test-SRT zum Validieren

**ERINNERUNG**: Dies ist eine PRODUCTION-READY Implementation. Keine Shortcuts, keine "TODO later" Kommentare, keine Mock-Implementierungen!

Beginne mit:
1. SRT Service in Python (Backend)
2. API Endpoints  
3. Frontend Components
4. Tests

Zeige mir den vollständigen, getesteten Code für ALLE Komponenten.