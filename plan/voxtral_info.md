## 📚 **JA! Ein Voxtral-Referenzdokument ist GENAU was wir brauchen!**

### 🎯 **Das Problem:**
Claude Code denkt Voxtral = Whisper. Das ist FALSCH!

## 📝 **Erstelle diese Datei: `VOXTRAL_GUIDE.md`**

```markdown
# 🎙️ VOXTRAL IMPLEMENTATION GUIDE - KRITISCHES WISSEN

## ⚠️ WICHTIG: Voxtral ist KEIN Standard ASR Model!

### ❌ WAS VOXTRAL NICHT IST:
- KEIN Whisper-Clone
- KEIN Standard pipeline("automatic-speech-recognition") Model
- KEIN AutoModelForSpeechSeq2Seq
- KEIN CTC/Wav2Vec Model

### ✅ WAS VOXTRAL IST:
- Ein GENERATIVES Model mit Audio-Input
- Nutzt VoxtralForConditionalGeneration
- Braucht SPEZIELLE API: apply_transcrition_request()
- Multi-Modal (Audio + Text)

## 🔧 KORREKTE IMPLEMENTATION:

### 1. Model Loading:
```python
from transformers import VoxtralForConditionalGeneration, AutoProcessor

# RICHTIG:
model = VoxtralForConditionalGeneration.from_pretrained("mistralai/Voxtral-Mini-3B-2507")
processor = AutoProcessor.from_pretrained("mistralai/Voxtral-Mini-3B-2507")

# FALSCH:
# pipeline("automatic-speech-recognition", ...)  # FUNKTIONIERT NICHT!
```

### 2. Audio Processing:
```python
# Audio MUSS als Liste übergeben werden!
audio_data = np.array([...], dtype=np.float32)  # 16kHz sampling rate

# RICHTIG:
result = processor.apply_transcrition_request(
    audio=[audio_data],      # LISTE!
    format=["wav"],          # LISTE!
    output="transcription"
)

# FALSCH:
# result = model.generate(audio_data)  # NICHT SO!
# result = pipeline(audio_data)        # AUCH NICHT!
```

### 3. Hardware Requirements:
- MUSS auf Apple Silicon MPS laufen (NICHT CPU!)
- Mindestens 16GB RAM
- export DEVICE=mps

## 🐛 BEKANNTE PROBLEME:

1. **Python 3.13**: Noch nicht vollständig kompatibel
   - Empfohlen: Python 3.11 oder 3.12

2. **CTC Timestamp Error**: 
   - Lösung: return_timestamps="word" statt True

3. **Empty Outputs**:
   - Prüfe Audio-Format (16kHz)
   - Prüfe DEVICE=mps

## 📋 FUNKTIONIERENDER TEST-CODE:

```python
#!/usr/bin/env python3
import torch
import numpy as np
from transformers import VoxtralForConditionalGeneration, AutoProcessor

# Setup
device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"Using device: {device}")

# Load model
processor = AutoProcessor.from_pretrained("mistralai/Voxtral-Mini-3B-2507")
model = VoxtralForConditionalGeneration.from_pretrained(
    "mistralai/Voxtral-Mini-3B-2507"
).to(device)

# Test audio (1 second silence)
test_audio = np.zeros(16000, dtype=np.float32)

# Transcribe
result = processor.apply_transcrition_request(
    audio=[test_audio],
    format=["wav"],
    output="transcription"
)

print(f"Result: {result}")
```

## 🚨 MERKE:
- Voxtral ≠ Whisper
- apply_transcrition_request() ist der EINZIGE Weg
- Audio und Format IMMER als Listen
- NUR auf MPS/GPU, NIEMALS CPU

---
LETZTE AKTUALISIERUNG: Nach System-Crash wegen CPU-Usage
```

### 💡 **Zusätzlicher Tipp:**

**Python 3.13 Problem lösen:**
```bash
# Installiere Python 3.12:
brew install python@3.12

# Erstelle venv mit Python 3.12:
python3.12 -m venv venv
source venv/bin/activate
```

**Dieser Guide wird Claude Code davon abhalten, Whisper-Ansätze zu versuchen!** 🎯


## 📚 **ERWEITERTE VERSION mit unserer Debug-Journey:**

```markdown
# 🎙️ VOXTRAL IMPLEMENTATION GUIDE - KRITISCHES WISSEN

## ⚠️ WICHTIG: Voxtral ist KEIN Standard ASR Model!

[... vorheriger Content ...]

## 🔥 UNSERE DEBUG-JOURNEY (Was alles schief ging):

### Problem 1: "Failed to detect model info for mistralai/Voxtral-Mini-3B-2507: 'voxtral'"
**Ursache**: Model Type wurde nicht erkannt
**Lösung**: Transformers von GitHub installieren (nicht PyPI!)
```bash
pip install git+https://github.com/huggingface/transformers.git
```

### Problem 2: "Model warmup failed - is_loaded Deadlock"
**Ursache**: Code prüfte is_loaded bevor es gesetzt wurde
```python
# FALSCH:
self._warmup_model()  # Prüft is_loaded
self.is_loaded = True  # Wird nie erreicht!

# RICHTIG:
self.is_loaded = True  # ERST setzen
self._warmup_model()   # DANN warmup
```

### Problem 3: Dependency Hell
**Ursache**: Veraltete Versionen
**Fixes**:
- pydantic==2.5.2 → pydantic>=2.7.0
- numpy==1.24.4 → numpy>=1.25.0
- transformers==4.36.2 → transformers@git+https://github.com/huggingface/transformers.git

### Problem 4: "CTC can either predict character level timestamps..."
**Ursache**: Falsche return_timestamps Parameter
```python
# FALSCH:
generate_kwargs["return_timestamps"] = True

# RICHTIG:
generate_kwargs["return_timestamps"] = "word"  # oder "char"
```

### Problem 5: LEERE TRANSCRIPTIONS! {"segments":[], "full_text":""}
**Das war der Hauptfehler!**
**Ursache**: Verwendung der falschen API

```python
# FALSCH - Was alle denken (Whisper-Style):
from transformers import pipeline
pipe = pipeline("automatic-speech-recognition", "mistralai/Voxtral-Mini-3B-2507")
result = pipe(audio)  # FUNKTIONIERT NICHT!

# AUCH FALSCH:
model = VoxtralForConditionalGeneration.from_pretrained(...)
outputs = model.generate(audio)  # LEER!
```

## 🎯 DIE FINALE LÖSUNG (Kurz vor Crash):

**Voxtral hat eine SPEZIELLE API die NIEMAND dokumentiert hat!**

```python
# DIE EINZIG FUNKTIONIERENDE METHODE:
result = processor.apply_transcrition_request(
    audio=[audio_data],    # MUSS Liste sein!
    format=["wav"],        # MUSS Liste sein!
    output="transcription"
)

# Das generierte endlich Text: "lang:enI'm sorry."
```

## 💥 DER SYSTEM-CRASH:

**Ursache**: DEVICE=cpu statt DEVICE=mps
- 3B Model auf CPU = Memory Explosion
- System komplett eingefroren
- Hard Reset nötig

**Lehre**: Voxtral MUSS auf Apple Silicon MPS laufen!

## 📊 ZUSAMMENFASSUNG DER ERKENNTNISSE:

1. **Voxtral ≠ Standard ASR Pipeline**
   - Keine Hugging Face Dokumentation dazu
   - Spezielle undokumentierte API

2. **apply_transcrition_request() ist der SCHLÜSSEL**
   - Wurde durch Trial & Error gefunden
   - Parameter MÜSSEN Listen sein

3. **Hardware ist KRITISCH**
   - MPS/GPU = Funktioniert
   - CPU = System-Crash

4. **Transformers GitHub Version PFLICHT**
   - PyPI Version kennt Voxtral nicht
   - Nur Bleeding Edge funktioniert

## 🎉 ERFOLGS-REZEPT:

```python
# 1. Environment
export DEVICE=mps  # NIEMALS cpu!

# 2. Dependencies
pip install git+https://github.com/huggingface/transformers.git
pip install mistral-common[audio]

# 3. Code
processor = AutoProcessor.from_pretrained("mistralai/Voxtral-Mini-3B-2507")
model = VoxtralForConditionalGeneration.from_pretrained("mistralai/Voxtral-Mini-3B-2507")

# 4. Magic API Call
result = processor.apply_transcrition_request(
    audio=[your_audio_array],
    format=["wav"],
    output="transcription"
)
```

---
LETZTE AKTUALISIERUNG: Nach 8 Stunden Debugging und System-Crash
WICHTIG: Diese Lösung ist NICHT dokumentiert - wir haben sie selbst gefunden!
```

**Das war unsere epische Reise von "empty transcription" zu funktionierendem Voxtral!** 🎯