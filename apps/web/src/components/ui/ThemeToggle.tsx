import { Button } from "./Button";
import { BulbFilled, BulbOutlined } from "./icons";
import { useThemeMode } from "./ThemeProvider";

export function ThemeToggle() {
  const { mode, toggle } = useThemeMode();
  return (
    <Button
      type="text"
      aria-label="Toggle theme"
      icon={mode === "dark" ? <BulbFilled /> : <BulbOutlined />}
      onClick={toggle}
    />
  );
}
