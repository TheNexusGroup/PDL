# Product Development Lifecycle (PDL) Dynamic Agent System

## Overview
This project transforms static product development frameworks into dynamic, agent-driven workflows that coordinate Claude Code agents based on real-time project phases and requirements.

## 🎯 Vision
Create a living, interactive product development system where visual workflow diagrams directly drive agent coordination, collaboration patterns, and automation decisions.

## 📊 Current Status
- ✅ Interactive PDL Dashboard with complete 7-phase lifecycle
- ✅ SVG-based diagram interaction and JSON export
- ✅ Proof-of-concept agent coordination framework
- ✅ MCP tool integration strategy
- 🔄 Agent orchestration engine (planned)
- 🔄 Automated phase transitions (planned)

## 🗂️ Project Structure
```
pdl/
├── index.html              # Interactive dashboard
├── PDL.svg                 # Product Development Lifecycle diagram
├── PDT.svg                 # Product Development Team structure  
├── PDP.svg                 # Role engagement matrix
├── README.md               # This file
└── docs/
    ├── ROADMAP.md          # Implementation roadmap
    ├── COLLABORATION.md    # Agent coordination strategies
    └── ARCHITECTURE.md     # Technical architecture decisions
```

## 🚀 Quick Start
1. Start HTTP server: `python3 -m http.server 9000`
2. Open browser: `http://localhost:9000/index.html`
3. Click through PDL phases to see interactive elements
4. Use zoom controls and export functionality
5. Switch between PDL, PDT, and PDP views

## 📈 Key Features
- **Interactive Diagrams**: Click-to-select SVG elements with real-time feedback
- **Complete Lifecycle**: 7-phase PDL with feedback loops and decision points
- **JSON Export**: Export workflow structure for programmatic use
- **Editor Viewport**: Professional zoom/pan controls
- **Multi-Diagram Support**: PDL lifecycle, team structure, and role engagement

## 🔗 Next Steps
See [ROADMAP.md](docs/ROADMAP.md) for detailed implementation plan.