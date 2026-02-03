# A Data-Driven Analysis for Engineering Conferences

An interactive web application that visualizes 23 years of IISE (Institute of Industrial and Systems Engineers) conference data. The dashboard provides academic cartography, network analysis, and trend tracking using a dual-database methodology (ProQuest and Google Scholar).

**Paper:** *A Data-Driven Analysis for Engineering Conferences* (Abstract ID: 16759)  
**IISE 2026 Conference Submission**

---

## Creating the GitHub Repository

To deploy at **https://data-driven-engineering-conferences.github.io** (root URL):

1. Go to [https://github.com/organizations/Data-Driven-Engineering-Conferences/repositories/new](https://github.com/organizations/Data-Driven-Engineering-Conferences/repositories/new) (or **New repository** from the organization page).
2. **Repository name:** `data-driven-engineering-conferences.github.io` (exact name required for org root URL)
3. **Description:** `Interactive web dashboard for IISE conference data (2002–2025)`
4. **Visibility:** Public
5. **Do not** initialize with README, .gitignore, or license (this folder already has them).
6. Click **Create repository**.
7. Push this folder to the new repo:
   ```bash
   cd Web_publish
   git init
   git add .
   git commit -m "Initial commit: IISE data-driven analysis web app"
   git branch -M main
   git remote add origin https://github.com/Data-Driven-Engineering-Conferences/data-driven-engineering-conferences.github.io.git
   git push -u origin main
   ```
8. Enable GitHub Pages: **Settings** → **Pages** → **Source:** GitHub Actions.

The app will be live at **https://data-driven-engineering-conferences.github.io**.

---

## Repository Structure

```
Web_publish/
├── .github/
│   └── ISSUE_TEMPLATE/
│       ├── config.yml           # Issue template config
│       └── data_correction.yml  # Data correction issue template
├── index.html              # Entry HTML
├── index.tsx               # React entry point
├── index.css               # Global styles
├── App.tsx                 # Main app and tab routing
├── constants.ts            # App constants (year range, etc.)
├── types.ts                # TypeScript interfaces
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config
├── vite.config.ts         # Vite build config
│
├── components/             # UI components
│   ├── Header.tsx          # App header, data source selector
│   ├── GlobalFilter.tsx   # Year range slider
│   ├── ModelSelector.tsx  # LLM model selector (Thematic/Archive)
│   ├── DomainFilter.tsx   # Domain/sub-area filters
│   ├── AuthorFilter.tsx   # Author filters
│   ├── ScrollToTop.tsx    # Scroll-to-top button
│   ├── AboutModal.tsx     # About and resource links
│   ├── UploadDataModal.tsx # Load data from GitHub or local folder
│   └── views/             # Tab views
│       ├── Overview.tsx    # Publication trends chart
│       ├── ThematicAtlas.tsx # Domain/sub-area heatmaps
│       ├── Community.tsx   # Citation & coauthorship networks
│       ├── Authors.tsx     # Author table with metrics
│       └── Archive.tsx     # Searchable paper archive
│
├── context/
│   └── DataContext.tsx    # Data loading and state
│
├── utils/
│   ├── parseGexf.ts       # GEXF network parser
│   └── parseClassifiedCsv.ts # CSV classification parser
│
├── data/                   # Build-time data (imported by DataContext)
│   └── publication_trends_by_source.json
│
└── public/
    └── data/               # Runtime data (served to app)
        ├── authors.json
        ├── papers.json
        ├── domains.json
        ├── yearly_stats.json
        ├── publication_trends_by_source.json
        ├── available_models.json
        ├── coauthorship_network_unified.json
        ├── citation_network_author.json
        ├── citation_network_paper.json
        ├── citation_network_mixed.json
        ├── citation_network_top200.gexf
        ├── coauthorship_network_top200.gexf
        ├── top200_authors.json
        ├── top200_author_metrics.json
        ├── papers_ollama_*.json
        ├── yearly_stats_ollama_*.json
        └── ollama_*/           # Per-model classification CSVs
            └── complete_classified_papers_*.csv
```

---

## Use of the Web Page

### Tabs

| Tab | Description |
|-----|-------------|
| **Overview** | Publication trends by year (merged ProQuest + Google Scholar). Bar chart of paper counts and classification coverage. |
| **Thematic Atlas** | Domain and sub-area evolution over time. Heatmaps show prevalence (%) of top 10 domains and sub-areas; "Others" row aggregates the rest. Model selector switches between LLM classification outputs. |
| **Community** | Interactive citation and coauthorship networks. Filter by domain, author, and year. GEXF-based layouts for top 200 authors. |
| **Authors** | Searchable author table with citation metrics (in/out degree, PageRank, centrality), coauthor degree, career span, and Google Scholar links. |
| **Archive** | Searchable paper archive with domain/sub-area classification. Filter by year, domain, and model. |

### Features

- **Global year filter** – Slider to restrict all views to a year range (default: 2002–2025).
- **Add Your Own** – Load data from a GitHub repository or local folder (see Upload modal for required structure).
- **Model selector** – For Thematic Atlas and Archive: switch between LLM classification models (e.g., llama3, mixtral).
- **Scroll to top** – Button appears when scrolling down long pages.

---

## Data Content

| File | Description |
|------|-------------|
| `authors.json` | Author records with citation metrics, coauthor degree, community ID, Google Scholar profile URLs. |
| `papers.json` | Paper records (title, year, authors, domain, sub-area). Base classification. |
| `papers_ollama_*.json` | Per-model paper classifications from LLM inference. |
| `domains.json` | 16 IISE domains with sub-areas and colors. |
| `yearly_stats.json` | Per-year paper counts and classification stats. |
| `publication_trends_by_source.json` | Per-year counts by source (ProQuest, Google Scholar, merged). |
| `coauthorship_network_unified.json` | Coauthorship edges (author–author). |
| `citation_network_*.json` | Citation edges (paper–paper, author–author, mixed). |
| `*_top200.gexf` | GEXF networks for top 200 authors (Gephi-compatible). |
| `available_models.json` | LLM models and paths to classification CSVs. |
| `complete_classified_papers_*.csv` | Per-model domain/sub-area classifications for Archive and Thematic Atlas. |

**Data sources:** ProQuest (IISE proceedings) and Google Scholar (citations), 2002–2025.

---

## How to Open an Issue (Data Correction)

If you find incorrect, missing, or problematic data, please open a GitHub issue using the **Data Correction** template.

### Steps

1. Go to the [GitHub repository](https://github.com/Data-Driven-Engineering-Conferences/data-driven-engineering-conferences-iise2026-codebase_dev).
2. Click **Issues** → **New issue**.
3. Select the **"Data Correction Request"** template (or use the direct link: [New Data Correction Issue](https://github.com/Data-Driven-Engineering-Conferences/data-driven-engineering-conferences-iise2026-codebase_dev/issues/new?template=data_correction.yml)).
4. Fill in the template fields:

| Field | Description |
|-------|-------------|
| **Type of Issue** | Incorrect paper info, missing paper, duplicate, wrong domain/classification, wrong citation count, author error, or other. |
| **Paper Title** | Title of the paper (if applicable). |
| **Paper Year** | Year of the paper (if applicable). |
| **Current Data (What's Wrong)** | What is currently shown that you believe is incorrect. |
| **Expected/Correct Data** | What the correct information should be; include sources if available. |
| **Source/Reference** | Links or references (DOI, Google Scholar, conference page). |
| **Additional Context** | Any other helpful details. |

5. Confirm you have searched existing issues and (optionally) verified the information.
6. Submit the issue.

---

## Build and Deploy

### Local build

```bash
npm install
npm run build
```

Output is in `dist/`. Deploy the contents of `dist/` to your hosting.

### GitHub Pages (automatic)

A GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) deploys the app to GitHub Pages on every push to `main`. After creating the repo:

1. Go to **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to `main` – the workflow will build and deploy

The app will be available at **https://data-driven-engineering-conferences.github.io** (when the repo is named `data-driven-engineering-conferences.github.io`).

---

## Resources

- **GitHub Repository:** [data-driven-engineering-conferences-iise2026-codebase_dev](https://github.com/Data-Driven-Engineering-Conferences/data-driven-engineering-conferences-iise2026-codebase_dev)
- **Harvard Dataverse Dataset:** [doi:10.7910/DVN/YW4IJG](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/YW4IJG)
