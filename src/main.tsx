import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installFrontendMonitoring } from "@/lib/monitoring";

installFrontendMonitoring();
createRoot(document.getElementById("root")!).render(<App />);
