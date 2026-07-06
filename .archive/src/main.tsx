import React from "react";
import ReactDOM from "react-dom/client";
import {
  Archive,
  ArrowUpRight,
  Blocks,
  Box,
  Braces,
  CalendarClock,
  Command,
  Compass,
  Download,
  ExternalLink,
  Filter,
  Grid2X2,
  Home,
  Info,
  Menu,
  Package,
  Search,
  Sparkles,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { type Page, type Project, projects, templates, timeline } from "./data";
import "./styles.css";

const navItems = [
  { page: "home" as const, label: "Command", icon: Home },
  { page: "projects" as const, label: "Projects", icon: Grid2X2 },
  { page: "timeline" as const, label: "Timeline", icon: CalendarClock },
  { page: "templates" as const, label: "Templates", icon: Package },
  { page: "about" as const, label: "About", icon: Info },
];

function App() {
  const [page, setPage] = React.useState<Page>("home");
  const [selectedProject, setSelectedProject] = React.useState<Project>(projects[0]);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }

      if (!isTyping && event.key === "/") {
        event.preventDefault();
        setCommandOpen(true);
      }

      if (event.key === "Escape") {
        setCommandOpen(false);
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const goToPage = (nextPage: Page) => {
    setPage(nextPage);
    setCommandOpen(false);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openProject = (project: Project) => {
    setSelectedProject(project);
    setPage("projects");
    setCommandOpen(false);
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="app-shell">
      <AmbientGrid />
      <aside className={`sidebar ${mobileNavOpen ? "sidebar-open" : ""}`}>
        <button className="brand" onClick={() => goToPage("home")} aria-label="Open command center">
          <span className="brand-mark">LW</span>
          <span>
            <strong>Luigi's World</strong>
            <small>Project Operating Hub</small>
          </span>
        </button>

        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map(({ page: itemPage, label, icon: Icon }) => (
            <button
              className={page === itemPage ? "active" : ""}
              key={itemPage}
              onClick={() => goToPage(itemPage)}
              title={label}
            >
              <Icon size={18} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <button className="command-trigger" onClick={() => setCommandOpen(true)}>
          <Command size={16} />
          <span>Open command palette</span>
          <kbd>Ctrl K</kbd>
        </button>

        <div className="system-card">
          <span className="status-dot" />
          <small>World status</small>
          <strong>{projects.filter((project) => project.status === "active").length} active modules</strong>
          <p>Local-data prototype ready for backend wiring later.</p>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <button className="icon-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation">
            <Menu size={20} />
          </button>
          <button className="search-pill" onClick={() => setCommandOpen(true)}>
            <Search size={16} />
            <span>Search projects, pages, templates...</span>
          </button>
        </header>

        {page === "home" && <HomePage openProject={openProject} goToPage={goToPage} />}
        {page === "projects" && (
          <ProjectsPage selectedProject={selectedProject} setSelectedProject={setSelectedProject} />
        )}
        {page === "timeline" && <TimelinePage openProject={openProject} />}
        {page === "templates" && <TemplatesPage />}
        {page === "about" && <AboutPage goToPage={goToPage} />}
      </section>

      {mobileNavOpen && <button className="scrim" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" />}

      {commandOpen && (
        <CommandPalette
          query={query}
          setQuery={setQuery}
          close={() => setCommandOpen(false)}
          goToPage={goToPage}
          openProject={openProject}
        />
      )}
    </main>
  );
}

function AmbientGrid() {
  return (
    <div className="ambient" aria-hidden="true">
      <div className="scanline" />
    </div>
  );
}

function HomePage({ openProject, goToPage }: { openProject: (project: Project) => void; goToPage: (page: Page) => void }) {
  const featured = projects[0];

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow">
            <Terminal size={16} />
            Command center v0.1
          </div>
          <h1>Luigi's World</h1>
          <p>
            A premium hub for projects, templates, archives, release notes, and the future backend that ties the whole
            thing together.
          </p>
          <div className="hero-actions">
            <button className="primary-action" onClick={() => openProject(featured)}>
              Open featured build <ArrowUpRight size={17} />
            </button>
            <button className="secondary-action" onClick={() => goToPage("timeline")}>
              View timeline <CalendarClock size={17} />
            </button>
          </div>
        </div>

        <div className="terminal-window" aria-label="System preview">
          <div className="terminal-header">
            <span />
            <span />
            <span />
            <strong>world.boot</strong>
          </div>
          <div className="terminal-body">
            <p>
              <span>$</span> boot luigis-world
            </p>
            <p className="terminal-ok">loaded modules: projects, timeline, templates, archive</p>
            <p>
              <span>$</span> status --active
            </p>
            <div className="terminal-grid">
              <strong>{projects.length}</strong>
              <small>projects indexed</small>
              <strong>{templates.length}</strong>
              <small>template slots</small>
              <strong>{timeline.length}</strong>
              <small>timeline eras</small>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-grid">
        <ModuleLauncher goToPage={goToPage} />
        <ActivityFeed />
      </section>

      <section className="section-block">
        <div className="section-heading">
          <span>
            <Compass size={18} />
            Project constellation
          </span>
          <button onClick={() => goToPage("projects")}>
            All projects <ArrowUpRight size={16} />
          </button>
        </div>
        <ProjectMap openProject={openProject} />
      </section>
    </div>
  );
}

function ModuleLauncher({ goToPage }: { goToPage: (page: Page) => void }) {
  const modules = [
    { page: "projects" as const, icon: Blocks, title: "Project Directory", text: "Browse active, archived, and prototype builds." },
    { page: "timeline" as const, icon: Archive, title: "Legacy Timeline", text: "Track the story through eras and rebuilds." },
    { page: "templates" as const, icon: Download, title: "Template Vault", text: "Prepare free drops and paid products." },
  ];

  return (
    <div className="module-grid">
      {modules.map(({ page, icon: Icon, title, text }) => (
        <button className="module-tile" key={page} onClick={() => goToPage(page)}>
          <Icon size={22} />
          <strong>{title}</strong>
          <span>{text}</span>
        </button>
      ))}
    </div>
  );
}

function ActivityFeed() {
  return (
    <div className="activity-panel">
      <div className="mini-heading">
        <Zap size={17} />
        Recent signals
      </div>
      {[
        "Hub frontend scaffolded as a dedicated-page system.",
        "Command palette connected to pages and projects.",
        "Template catalog reserved for future downloads.",
      ].map((item, index) => (
        <div className="activity-item" key={item}>
          <span>0{index + 1}</span>
          <p>{item}</p>
        </div>
      ))}
    </div>
  );
}

function ProjectMap({ openProject }: { openProject: (project: Project) => void }) {
  return (
    <div className="project-map">
      {projects.map((project, index) => (
        <button
          className={`map-node node-${index + 1}`}
          key={project.id}
          onClick={() => openProject(project)}
          style={{ "--accent": project.accent } as React.CSSProperties}
        >
          <span />
          <strong>{project.title}</strong>
          <small>{project.type}</small>
        </button>
      ))}
    </div>
  );
}

function ProjectsPage({
  selectedProject,
  setSelectedProject,
}: {
  selectedProject: Project;
  setSelectedProject: (project: Project) => void;
}) {
  const [filter, setFilter] = React.useState("all");
  const filtered = filter === "all" ? projects : projects.filter((project) => project.status === filter);
  const filters = ["all", "active", "released", "prototype", "archived"];

  return (
    <div className="page-stack">
      <PageIntro
        icon={<Grid2X2 size={19} />}
        label="Project directory"
        title="Everything gets a proper place."
        text="Current builds, future products, archived experiments, and the detail pages that make each one feel intentional."
      />

      <section className="project-layout">
        <div className="project-list-panel">
          <div className="filter-row">
            <Filter size={16} />
            {filters.map((item) => (
              <button className={filter === item ? "active-filter" : ""} key={item} onClick={() => setFilter(item)}>
                {item}
              </button>
            ))}
          </div>
          <div className="project-list">
            {filtered.map((project) => (
              <button
                className={selectedProject.id === project.id ? "project-row selected" : "project-row"}
                key={project.id}
                onClick={() => setSelectedProject(project)}
              >
                <span style={{ background: project.accent }} />
                <div>
                  <strong>{project.title}</strong>
                  <small>
                    {project.type} / {project.status}
                  </small>
                </div>
              </button>
            ))}
          </div>
        </div>

        <ProjectDetail project={selectedProject} />
      </section>
    </div>
  );
}

function ProjectDetail({ project }: { project: Project }) {
  return (
    <article className="project-detail" style={{ "--accent": project.accent } as React.CSSProperties}>
      <div className="project-visual">
        <div className="project-orbit">
          <span />
          <span />
          <span />
        </div>
        <strong>{project.title.slice(0, 2).toUpperCase()}</strong>
      </div>
      <div className="project-meta">
        <span>{project.status}</span>
        <span>{project.year}</span>
        <span>{project.type}</span>
      </div>
      <h2>{project.title}</h2>
      <p>{project.description}</p>
      <div className="stack-row">
        {project.stack.map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
      <div className="link-row">
        {project.links.map((link) => (
          <button key={link}>
            {link}
            <ExternalLink size={15} />
          </button>
        ))}
      </div>
    </article>
  );
}

function TimelinePage({ openProject }: { openProject: (project: Project) => void }) {
  return (
    <div className="page-stack">
      <PageIntro
        icon={<CalendarClock size={19} />}
        label="Timeline"
        title="The archive has eras, not just dates."
        text="A chronological layer for milestones, abandoned ideas, rebuilds, releases, and whatever weird turns the world takes next."
      />

      <section className="timeline">
        {timeline.map((event, index) => (
          <article className="timeline-event" key={event.title}>
            <div className="timeline-marker">
              <span>{event.date}</span>
            </div>
            <div>
              <small>{event.era}</small>
              <h3>{event.title}</h3>
              <p>{event.text}</p>
              {index === 2 && (
                <button onClick={() => openProject(projects[0])}>
                  Open hub project <ArrowUpRight size={16} />
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function TemplatesPage() {
  return (
    <div className="page-stack">
      <PageIntro
        icon={<Package size={19} />}
        label="Template vault"
        title="A store foundation before it becomes a store."
        text="Built as a product catalog now, so downloads, licenses, payments, and version history can plug in later."
      />

      <section className="template-grid">
        {templates.map((template) => (
          <article className="template-card" key={template.title}>
            <div className="template-preview">
              <Box size={28} />
              <span>{template.version}</span>
            </div>
            <div className="template-card-body">
              <small>{template.type}</small>
              <h3>{template.title}</h3>
              <p>{template.description}</p>
              <div>
                <strong>{template.price}</strong>
                <button>
                  Preview <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function AboutPage({ goToPage }: { goToPage: (page: Page) => void }) {
  return (
    <div className="page-stack">
      <PageIntro
        icon={<Sparkles size={19} />}
        label="Identity"
        title="A personal site with infrastructure energy."
        text="Luigi's World is the place where the work gets organized, presented, launched, archived, and eventually sold."
      />

      <section className="about-layout">
        <div className="about-copy">
          <h2>Built to feel like a system, not a scrapbook.</h2>
          <p>
            This first frontend pass gives the site a dedicated-page structure, keyboard navigation, project status,
            timeline eras, and a template catalog. The backend can come after the shape feels right.
          </p>
          <button className="primary-action" onClick={() => goToPage("projects")}>
            Inspect the structure <ArrowUpRight size={17} />
          </button>
        </div>
        <div className="identity-grid">
          {[
            ["Core", "Projects"],
            ["Layer", "Timeline"],
            ["Future", "Downloads"],
            ["Mode", "Terminal"],
          ].map(([label, value]) => (
            <div key={label}>
              <small>{label}</small>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PageIntro({ icon, label, title, text }: { icon: React.ReactNode; label: string; title: string; text: string }) {
  return (
    <section className="page-intro">
      <span>
        {icon}
        {label}
      </span>
      <h1>{title}</h1>
      <p>{text}</p>
    </section>
  );
}

function CommandPalette({
  query,
  setQuery,
  close,
  goToPage,
  openProject,
}: {
  query: string;
  setQuery: (query: string) => void;
  close: () => void;
  goToPage: (page: Page) => void;
  openProject: (project: Project) => void;
}) {
  const normalized = query.toLowerCase();
  const pageResults = navItems.filter((item) => item.label.toLowerCase().includes(normalized));
  const projectResults = projects.filter((project) => project.title.toLowerCase().includes(normalized));

  React.useEffect(() => {
    const input = document.querySelector<HTMLInputElement>(".command-input input");
    input?.focus();
  }, []);

  return (
    <div className="command-overlay" role="dialog" aria-modal="true" aria-label="Command palette">
      <button className="command-backdrop" onClick={close} aria-label="Close command palette" />
      <div className="command-panel">
        <div className="command-input">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type a page or project name" />
          <button onClick={close} aria-label="Close command palette">
            <X size={18} />
          </button>
        </div>

        <div className="command-results">
          <small>Pages</small>
          {pageResults.map(({ page, label, icon: Icon }) => (
            <button key={page} onClick={() => goToPage(page)}>
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}

          <small>Projects</small>
          {projectResults.map((project) => (
            <button key={project.id} onClick={() => openProject(project)}>
              <Braces size={17} />
              <span>{project.title}</span>
            </button>
          ))}

          {!pageResults.length && !projectResults.length && <p className="empty-state">No command found.</p>}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
