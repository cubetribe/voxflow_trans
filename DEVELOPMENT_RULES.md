# VoxFlow Development Rules - STRIKT EINZUHALTEN

## 🚫 VERBOTEN - KEINE AUSNAHMEN

1. **KEINE Minimal Working Systems**
   - Kein "erstmal zum Laufen bringen"
   - Kein "Quick MVP"
   - Kein "später optimieren"

2. **KEINE Mock-Implementierungen**
   - Keine Dummy-Daten
   - Keine Stub-Services  
   - Keine Placeholder-Funktionen

3. **KEINE Vereinfachungen**
   - System nicht "simpler machen"
   - Komplexität nicht reduzieren
   - Features nicht weglassen

## ✅ PFLICHT - IMMER EINHALTEN

1. **Production-Ready von Anfang an**
   - Jede Zeile Code deploybar
   - Vollständiges Error Handling
   - Comprehensive Logging
   - Security Best Practices

2. **Vollständige Implementierungen**
   - ALLE Features implementieren
   - ALLE Edge Cases abdecken
   - ALLE Tests schreiben

3. **Qualität vor Geschwindigkeit**
   - Lieber langsam und richtig
   - Code Reviews selbst durchführen
   - Best Practices befolgen

## 📋 ENTSCHEIDUNGS-CHECKLISTE

Vor JEDER Implementierung frage dich:
- [ ] Ist das eine vollständige Lösung?
- [ ] Ist das production-ready?
- [ ] Habe ich alle Edge Cases bedacht?
- [ ] Ist Error Handling implementiert?
- [ ] Sind Tests vorhanden?

Wenn EINE Antwort "Nein" ist → STOPP und mache es richtig!

## 🔴 AKTUELLER VERSTOSS

Du wolltest gerade "Minimal Working System First" implementieren.
Das verstößt gegen Regel #1!

## ✅ KORREKTE VORGEHENSWEISE

Implementiere JEDEN Service VOLLSTÄNDIG bevor du zum nächsten gehst.

---

## 🎯 PRODUCTION-READY STANDARDS

### Code Quality Requirements
- **TypeScript Strict Mode**: Alle Type-Fehler behoben
- **Error Boundaries**: Graceful degradation auf allen Ebenen
- **Input Validation**: Zod schemas für alle API endpoints
- **Security Headers**: Helmet, CORS, Rate Limiting implementiert
- **Structured Logging**: Winston mit JSON format in Production
- **Health Checks**: Detaillierte Service-Monitoring
- **Graceful Shutdown**: Proper cleanup bei SIGTERM/SIGINT

### Testing Requirements
- **Unit Tests**: 90%+ Coverage für business logic
- **Integration Tests**: API endpoints mit real dependencies
- **Error Scenario Tests**: Failure modes und recovery
- **Performance Tests**: Load testing für kritische endpoints
- **Security Tests**: Authentication, authorization, injection attacks

### Documentation Requirements
- **API Documentation**: OpenAPI specs für alle endpoints
- **Architecture Decision Records**: Warum-Entscheidungen dokumentiert
- **Deployment Guide**: Step-by-step production deployment
- **Monitoring Runbook**: Troubleshooting und metrics
- **Security Guidelines**: Threat model und mitigations

### Performance Requirements
- **Response Times**: <200ms für API calls, <2s für file uploads
- **Memory Usage**: Container limits eingehalten
- **Error Recovery**: Exponential backoff, circuit breakers
- **Caching Strategy**: Redis mit TTL und invalidation
- **Resource Cleanup**: Automatic temp file deletion

## 🚨 ENFORCEMENT

Wenn ich gegen diese Regeln verstoße:
1. **SOFORT STOPPEN** - keine weitere Implementierung
2. **Regeln lesen** - diese Datei komplett durchgehen
3. **Plan korrigieren** - production-ready Ansatz entwickeln
4. **Neu implementieren** - vollständig und richtig

Diese Regeln sind UNVERÄNDERLICH und NICHT VERHANDELBAR!