import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function injectUmami() {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;
  const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID as string | undefined;

  // 둘 중 하나라도 없으면 아무 것도 하지 않음 (에러 방지 핵심)
  if (!endpoint || !websiteId) return;

  const script = document.createElement('script');
  script.defer = true;

  // endpoint 끝에 /가 있어도 정상 동작하도록 정리
  script.src = `${endpoint.replace(/\/$/, '')}/umami`;
  script.setAttribute('data-website-id', websiteId);

  document.head.appendChild(script);
}

injectUmami();

createRoot(document.getElementById("root")!).render(<App />);
