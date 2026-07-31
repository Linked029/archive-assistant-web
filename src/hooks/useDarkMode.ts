import { useState, useEffect } from "react";

const STORAGE_KEY = "archive-theme";

export function useDarkMode(): [boolean, () => void] {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  }, [dark]);

  const toggle = () => setDark((prev) => !prev);

  return [dark, toggle];
}