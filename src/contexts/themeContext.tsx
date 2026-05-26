import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export type BootswatchTheme =
  | "default"
  | "cerulean"
  | "cosmo"
  | "cyborg"
  | "darkly"
  | "flatly"
  | "journal"
  | "litera"
  | "lumen"
  | "lux"
  | "materia"
  | "minty"
  | "morph"
  | "pulse"
  | "quartz"
  | "sandstone"
  | "simplex"
  | "sketchy"
  | "slate"
  | "solar"
  | "spacelab"
  | "superhero"
  | "united"
  | "vapor"
  | "yeti"
  | "zephyr";

interface ThemeContextType {
  bootswatchTheme: BootswatchTheme;
  setBootswatchTheme: (theme: BootswatchTheme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

const BOOTSWATCH_STORAGE_KEY = "bootswatch_theme";

const DARK_THEMES = new Set<BootswatchTheme>([
  "cyborg",
  "darkly",
  "slate",
  "solar",
  "superhero",
  "vapor",
]);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [bootswatchTheme, setBootswatchThemeState] = useState<BootswatchTheme>(() => {
    const saved = localStorage.getItem(BOOTSWATCH_STORAGE_KEY) as BootswatchTheme | null;
    return saved || "united";
  });

  const setBootswatchTheme = (newTheme: BootswatchTheme) => {
    setBootswatchThemeState(newTheme);
    localStorage.setItem(BOOTSWATCH_STORAGE_KEY, newTheme);
  };

  const isDark = DARK_THEMES.has(bootswatchTheme);

  // Handle dynamic loading of Bootswatch stylesheet
  useEffect(() => {
    let link = document.getElementById("bootswatch-theme") as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement("link");
      link.id = "bootswatch-theme";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }

    if (bootswatchTheme === "default") {
      link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css";
    } else {
      // Set href to jsdelivr package CDN
      link.href = `https://cdn.jsdelivr.net/npm/bootswatch@5.3.3/dist/${bootswatchTheme}/bootstrap.min.css`;
    }
  }, [bootswatchTheme]);

  // Handle data-bs-theme based on selected theme nature (dark or light)
  useEffect(() => {
    const actualTheme = DARK_THEMES.has(bootswatchTheme) ? "dark" : "light";
    document.body.setAttribute("data-bs-theme", actualTheme);
    document.documentElement.setAttribute("data-bs-theme", actualTheme);
  }, [bootswatchTheme]);

  return (
    <ThemeContext.Provider
      value={{
        bootswatchTheme,
        setBootswatchTheme,
        isDark,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
