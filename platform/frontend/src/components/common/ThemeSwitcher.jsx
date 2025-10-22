// components/ThemeSwitcher.jsx
import { FiMonitor, FiMoon, FiSun } from 'react-icons/fi'
import { useTheme } from '../../hooks/useTheme'


export const ThemeSwitcher = () => {
  const { theme, setLight, setDark, setSystem } = useTheme();

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <FiSun className="h-4 w-4" />;
      case 'dark':
        return <FiMoon className="h-4 w-4" />;
      case 'system':
        return <FiMonitor className="h-4 w-4" />;
      default:
        return <FiSun className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
      default:
        return 'Light';
    }
  };

  const cycleTheme = () => {
    switch (theme) {
      case 'light':
        setDark();
        break;
      case 'dark':
        setSystem();
        break;
      case 'system':
        setLight();
        break;
      default:
        setLight();
        break;
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/60 dark:bg-gray-800/90 hover:bg-amber-400 dark:hover:bg-gray-700/90 rounded-sm text-sm font-medium text-gray-700 dark:text-gray-300 transition-all duration-300"
      title={`Current theme: ${getThemeLabel()}. Click to cycle.`}
    >
      {getThemeIcon()}
      {/* <span className="hidden sm:inline">{getThemeLabel()}</span> */}
    </button>
  )
}