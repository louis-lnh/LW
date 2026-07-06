export type Page = "home" | "projects" | "timeline" | "templates" | "about";

export type Project = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  status: "active" | "released" | "prototype" | "archived";
  type: string;
  year: string;
  stack: string[];
  accent: string;
  links: string[];
};

export type Template = {
  title: string;
  type: string;
  price: string;
  version: string;
  description: string;
};

export const projects: Project[] = [
  {
    id: "world-hub",
    title: "Luigi's World Hub",
    tagline: "The central command layer for every project, archive, and future release.",
    description:
      "A premium project universe with searchable systems, status-aware projects, a timeline, and download-ready product surfaces.",
    status: "active",
    type: "Platform",
    year: "2026",
    stack: ["React", "Vite", "Command UI", "Local Data"],
    accent: "#48d6b5",
    links: ["Live", "Docs"],
  },
  {
    id: "template-vault",
    title: "Template Vault",
    tagline: "A future storefront for useful digital systems, web kits, and downloadable builds.",
    description:
      "A catalog-style product area designed to support free drops first and paid releases later without changing the interface.",
    status: "prototype",
    type: "Store",
    year: "2026",
    stack: ["Catalog", "Downloads", "Licensing"],
    accent: "#f2bf5e",
    links: ["Preview"],
  },
  {
    id: "legacy-archive",
    title: "Legacy Archive",
    tagline: "Old builds, experiments, rebuilds, and the story of how the world got here.",
    description:
      "A timeline-first archive that treats older projects as artifacts instead of forgotten links in a drawer.",
    status: "released",
    type: "Archive",
    year: "2025",
    stack: ["Timeline", "MDX-ready", "Filters"],
    accent: "#8ea8ff",
    links: ["Archive"],
  },
  {
    id: "lab-terminal",
    title: "Lab Terminal",
    tagline: "An experimental command interface for jumping through the entire site.",
    description:
      "A keyboard-first layer for opening projects, searching assets, surfacing hidden pages, and making the hub feel alive.",
    status: "active",
    type: "Interaction",
    year: "2026",
    stack: ["Keyboard", "Search", "Shortcuts"],
    accent: "#ff6f91",
    links: ["Try"],
  },
];

export const timeline = [
  {
    era: "Origin",
    date: "2024",
    title: "First scattered builds",
    text: "Small experiments, unfinished ideas, and the first proof that the archive needed a home.",
  },
  {
    era: "Archive",
    date: "2025",
    title: "Projects become artifacts",
    text: "Older work gets documented instead of buried, with status, context, and links back into the system.",
  },
  {
    era: "System",
    date: "2026",
    title: "Luigi's World becomes the hub",
    text: "The site turns into a command center for projects, templates, releases, and future apps.",
  },
  {
    era: "Commerce",
    date: "Next",
    title: "Templates and downloads unlock",
    text: "Free drops and paid products can plug into the same catalog without rebuilding the whole site.",
  },
];

export const templates: Template[] = [
  {
    title: "Project Launch Kit",
    type: "Web Template",
    price: "Free",
    version: "v0.1",
    description: "A clean project detail structure with screenshots, links, changelog, and build notes.",
  },
  {
    title: "Creator OS Index",
    type: "Notion-style System",
    price: "Soon",
    version: "v0.0",
    description: "A planned downloadable system for tracking ideas, releases, assets, and content.",
  },
  {
    title: "Archive Page Pack",
    type: "UI Pack",
    price: "Free",
    version: "v0.1",
    description: "Timeline sections, status badges, and project cards for documenting older work.",
  },
];
