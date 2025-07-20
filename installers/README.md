# 🚀 VoxFlow Installers & Launchers

Professional installation and startup system for VoxFlow AI Voice Transcription Platform.

## 📁 Files Overview

### 🎯 **Core Installers**

| File | Purpose | Duration | When to Use |
|------|---------|----------|-------------|
| `VoxFlow-Install.command` | **One-time installation** | 5-10 min | First time setup, after reset |
| `VoxFlow-Start.command` | **Ultra-fast startup** | <5 seconds | Every day startup |
| `VoxFlow-Reset.command` | **Clean slate reset** | <30 seconds | Troubleshooting, clean start |

---

## 🛠️ **Quick Start Guide**

### **Step 1: First Time Installation**
```bash
# Double-click or run in terminal:
./installers/VoxFlow-Install.command
```

**What it does:**
- ✅ Validates system requirements (Python 3.11+, Node 18+, 8GB+ RAM)
- ✅ Detects Apple Silicon optimization
- ✅ Installs Python dependencies (Voxtral + FastAPI)
- ✅ Installs Node.js dependencies (Express + TypeScript) 
- ✅ Installs React dependencies (Vite + TailwindCSS)
- ✅ Tests Voxtral model functionality
- ✅ Creates environment configuration
- ✅ Marks installation complete

### **Step 2: Daily Usage**
```bash
# Double-click or run in terminal:
./installers/VoxFlow-Start.command
```

**What it does:**
- ⚡ Validates installation status (instant)
- 🔍 Quick system health check
- 🚀 Starts all services without installations
- 🌐 Opens browser to http://localhost:5173
- 📊 Provides interactive service management

### **Step 3: Troubleshooting (if needed)**
```bash
# Double-click or run in terminal:
./installers/VoxFlow-Reset.command
```

**What it does:**
- 🧹 Removes all installations cleanly
- 💾 Optional backup creation
- 🗑️ Cleans node_modules, venv, build artifacts
- ✅ Returns to fresh state for re-installation

---

## 🎯 **Installation Modes**

### VoxFlow-Install.command Options

**When already installed:**
- `[1]` **Skip Installation** - Use existing setup
- `[2]` **Fresh Installation** - Complete reinstall  
- `[3]` **Repair Installation** - Fix missing components
- `[4]` **Cancel** - Exit without changes

### VoxFlow-Start.command Options

**Startup modes:**
- `[1]` **Standard Start** - Quick startup (recommended)
- `[2]` **Debug Mode** - Extended logging
- `[3]` **Advanced Options** - Full terminal interface

### VoxFlow-Reset.command Options

**Reset types:**
- `[1]` **Fast Reset** - No backup, instant (<10 seconds)
- `[2]` **Safe Reset** - With intelligent backup
- `[3]` **Dependencies Only** - Keep configs, remove deps
- `[4]` **Cancel** - Exit without reset

---

## 🔧 **Technical Details**

### **System Architecture**
```
VoxFlow Native Stack (No Docker)
├── Redis Server (Port 6379) - Native daemon
├── Python Voxtral Service (Port 8000) - MPS optimized
├── Node.js API Gateway (Port 3000) - Hot reload
└── React Frontend (Port 5173) - Vite dev server
```

### **Installation Markers**
- `.installation_complete` - Main installation marker with metadata
- `backend/python-service/.deps_installed` - Python dependencies marker
- `backend/node-service/.deps_installed` - Node.js dependencies marker  
- `frontend/.deps_installed` - Frontend dependencies marker

### **Environment Files**
- `frontend/.env.local` - Frontend configuration
- `backend/node-service/.env` - API Gateway configuration
- `backend/python-service/.env` - Voxtral service configuration

---

## 📊 **Performance Benefits**

| Aspect | Traditional | VoxFlow System | Improvement |
|--------|-------------|----------------|-------------|
| **First Install** | Manual setup | 5-10 minutes | ✅ Automated |
| **Daily Startup** | 10+ minutes | <5 seconds | 🚀 120x faster |
| **Dependencies** | Re-download | Cached locally | 💾 Persistent |
| **Troubleshooting** | Manual cleanup | One-click reset | 🧹 Automated |
| **Error Handling** | User debugging | Production-ready | 🛡️ Robust |

---

## 🔍 **Troubleshooting**

### **Common Issues**

**❓ Installation fails**
```bash
# Check system requirements
./installers/VoxFlow-Install.command
# Select option [3] for repair mode
```

**❓ Startup hangs or errors**
```bash
# Reset and reinstall
./installers/VoxFlow-Reset.command  # Option [1] for fast reset
./installers/VoxFlow-Install.command
```

**❓ npm/pip issues**
```bash
# Clean reset without backup (fastest)
./installers/VoxFlow-Reset.command  # Option [1]
# Then fresh install
./installers/VoxFlow-Install.command
```

### **Log Files**
- `installation.log` - Installation process logs
- `reset.log` - Reset operation logs
- Service logs in respective directories after startup

### **System Requirements**
- **macOS 14+** with Apple Silicon (M1/M2/M3/M4) recommended
- **Python 3.11+** (3.13 tested and working)
- **Node.js 18+**
- **8GB+ RAM** minimum, 16GB+ recommended
- **Redis** (auto-installed via Homebrew if missing)

---

## 🎉 **Success Indicators**

**Installation Complete:**
- ✅ `.installation_complete` file exists in project root
- ✅ All service dependency markers present
- ✅ Environment files configured
- ✅ Voxtral model test passed

**Startup Success:**
- ✅ All 4 services running (Redis, Python, Node.js, React)
- ✅ Browser opens to http://localhost:5173
- ✅ VoxFlow interface loads
- ✅ Audio upload and transcription functional

---

## 💡 **Best Practices**

1. **Always use VoxFlow-Install.command first** - One-time setup
2. **Use VoxFlow-Start.command daily** - Fast startup
3. **Keep installers/ directory** - Don't delete these files
4. **Use Reset only for troubleshooting** - Clean slate when needed
5. **Check installation.log** - For debugging installation issues

---

## 📝 **Development Notes**

- **Production-Ready**: No shortcuts, comprehensive error handling
- **Atomic Operations**: All-or-nothing installation approach
- **macOS Optimized**: Native Apple Silicon performance
- **Backwards Compatible**: Legacy start-dev.sh still works
- **Maintenance**: Self-contained, no external dependencies

---

*For more information, see the main README.md in the project root.*