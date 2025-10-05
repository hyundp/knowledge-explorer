# Space Biology Knowledge Explorer

A Next.js web application for exploring space biology research through an interactive knowledge graph, gap analysis, and consensus findings.

**🚀 Optimized for Vercel deployment with static data (28MB total)**

## ✨ Features

### 1. Home Dashboard
- Browse 572 space biology research papers
- Search and filter papers by metadata
- View paper details with full abstracts and methods

### 2. Knowledge Graph Explorer
- Interactive network visualization of 2,582 nodes and 2,315 edges
- Paper → Phenotype relationships with direct connections
- **Node labels**: 30 characters max on graph, full text in details panel
- Click nodes to view complete information
- Search papers by PMCID
- Load more functionality (7 papers at a time, max 50)

### 3. Gap Finder
- Interactive heatmap showing research coverage
- Filter by organism, tissue, exposure type, and study duration
- Identify under-researched areas in space biology

### 4. Consensus Analysis
- Statistical analysis of phenotype findings across studies
- Effect size visualization
- Identify agreement and conflicts in research

### 5. Research Insights
- AI-generated insights from space biology literature
- Trend analysis and key findings

### 6. Mission Architect
- Plan research missions based on data gaps
- Priority-based recommendations

### 7. Research Manager
- Portfolio management for research projects
- ROI analysis for research investments

## 🛠 Tech Stack

- **Framework**: Next.js 15 with App Router & Turbopack
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Graph Visualization**: Cytoscape.js with Cola layout
- **Data**: Static JSON files (no database required)

## 📦 Data Structure

All data is stored in `public/data/` (28MB total):

```
public/data/
├── normalized/          # 22MB - 572 papers in JSON format
│   └── PMC*/           # One folder per paper
│       └── normalized.json
├── neo4j/              # 3.5MB - Knowledge graph data
│   ├── graph_overview.json  # Full graph (2,582 nodes, 2,315 edges)
│   ├── papers.json          # Paper metadata (267 papers)
│   ├── statistics.json      # Graph statistics
│   └── subgraphs/          # 267 individual paper subgraphs
└── external/           # 3.3MB - External content
    ├── news.ndjson
    ├── explainers.ndjson
    └── newsletters.ndjson
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at http://localhost:3000

### Build for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📁 Project Structure

```
knowledge-explorer/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page (Scientist view)
│   ├── kg-explorer/       # Knowledge Graph Explorer
│   ├── gap-finder/        # Research Gap Analysis
│   ├── consensus/         # Consensus Findings
│   ├── insights/          # Research Insights
│   ├── architect/         # Mission Architect
│   ├── manager/           # Research Manager
│   └── api/               # API routes
│       ├── papers/        # Paper data APIs
│       ├── parameters/    # Filter parameters
│       ├── consensus/     # Consensus analysis
│       ├── gap-finder/    # Gap analysis
│       ├── insights/      # AI insights
│       └── manager/       # Portfolio management
├── components/            # React components
│   ├── KnowledgeGraph.tsx # Cytoscape graph component
│   └── ui/               # UI components (buttons, cards, etc.)
├── lib/                  # Utilities and helpers
│   ├── api/             # API client functions
│   │   ├── static.ts    # Static data loader for KG
│   │   ├── data.ts      # Paper data loader
│   │   └── parameters.ts # Parameter extraction
│   └── types.ts         # TypeScript type definitions
├── public/
│   └── data/            # Static data files (28MB)
└── package.json
```

## 🌐 Deployment

### Vercel (Recommended)

This application is optimized for Vercel deployment:

1. **Push to GitHub**:
```bash
git add .
git commit -m "Deploy to Vercel"
git push origin main
```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Framework preset: Next.js (auto-detected)
   - Click "Deploy"

**Size**: ~30MB total (fits in Vercel free tier 100MB limit)

### Environment Variables

No environment variables required! All data is static and included in the build.

## 📊 API Routes

### Papers
- `GET /api/papers` - List all papers (572 papers)
- `GET /api/papers?query=<text>` - Search papers by text
- `GET /api/papers/[pmcid]` - Get specific paper details

### Knowledge Graph
- Static data loaded from `/data/neo4j/graph_overview.json`
- Client-side filtering and loading

### Parameters
- `GET /api/parameters` - Get available filter options
  - Organisms (17 types)
  - Tissues (19 types)
  - Exposures (8 types)
  - Study types (8 types)
  - Missions (5 types)
  - Durations (4 categories)

### Analysis
- `GET /api/consensus` - Consensus phenotype findings
- `GET /api/gap-finder?type=<exposure|organism|tissue>` - Gap analysis
- `GET /api/insights` - Research insights
- `GET /api/external` - External content (news, explainers)

### Manager APIs
- `GET /api/manager/portfolio-data` - Research portfolios
- `GET /api/manager/gap-roi` - ROI analysis for gaps
- `GET /api/manager/coverage-priority` - Coverage priorities
- `GET /api/manager/redundancy` - Redundancy analysis

## 🎨 Design System

### Colors (Space Theme)
- **Background**: Deep space black (`#0B0E13`)
- **Primary**: Earth Blue (`#00B4D8`)
- **Accent**: Solar Gold (`#FFB703`)
- **Text**: Lunar Gray (`#E5E5E5`)

### Typography
- **Font**: Geist Sans
- **Monospace**: Space Mono

### Components
- Rounded corners with glow effects
- Glass-morphism cards
- Smooth animations and transitions

## 🔧 Development

### Scripts

```bash
npm run dev      # Start development server with Turbopack
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Adding New Data

1. **Papers**: Add to `public/data/normalized/PMC*/normalized.json`
2. **Knowledge Graph**: Update `public/data/neo4j/graph_overview.json`
3. **External Content**: Add to `public/data/external/*.ndjson`

### Modifying the Knowledge Graph

The Knowledge Graph uses static data from `public/data/neo4j/`:
- Edit `graph_overview.json` to modify the full graph
- Edit `subgraphs/PMC*.json` to modify individual paper graphs
- Rebuild to apply changes

## 📝 Key Features Details

### Knowledge Graph Explorer
- **Initial Load**: 7 Paper nodes + all connected Phenotypes (~60-80 nodes)
- **Load More**: Adds 7 papers at a time (max 50)
- **Label Display**: 30 chars on nodes, full text in details panel
- **Tooltips**: Hover over nodes to see full labels
- **Search**: Find papers by PMCID
- **Layout**: Cola force-directed layout with optimized spacing

### Gap Finder
- **Heatmap**: Shows research coverage across parameters
- **Filters**: Multi-select for organisms, tissues, exposures
- **Gaps**: Highlights under-researched combinations
- **Priority Levels**: High/Medium/Low priority gaps

### Consensus Analysis
- **Effect Sizes**: Standardized mean differences
- **Confidence Intervals**: 95% CI for each study
- **Agreement Score**: Percentage of studies agreeing on direction
- **Outlier Detection**: Studies with conflicting findings

## 🐛 Troubleshooting

### Build Issues

**Problem**: Build fails with module not found
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**Problem**: Out of memory during build
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### Runtime Issues

**Problem**: Papers not loading
- Check `public/data/normalized/` exists
- Verify file permissions: `chmod -R 755 public/data`

**Problem**: Knowledge graph not rendering
- Check browser console for errors
- Verify `public/data/neo4j/graph_overview.json` exists
- Clear browser cache

**Problem**: Slow performance
- Reduce initial node limit in KG Explorer
- Use production build (`npm run build && npm start`)

## 📚 Additional Documentation

- `DEPLOYMENT_CHECKLIST.md` - Complete deployment guide
- `BACKEND_DEPLOYMENT.md` - Backend server setup (optional)
- `VERCEL_STATIC_DEPLOYMENT.md` - Static deployment guide
- `ENHANCEMENTS.md` - Feature roadmap

## 📄 License

This project is for research and educational purposes.

## 🤝 Contributing

This is a research project. For questions or contributions, please open an issue.

---

**Built with ❤️ for space biology research**
