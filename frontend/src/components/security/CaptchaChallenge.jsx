import { useEffect, useRef, useState } from "react";

const CaptchaChallenge = ({ onToken }) => {
  const container = useRef(null); const [error, setError] = useState(""); const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  useEffect(() => {
    if (import.meta.env.DEV && !siteKey) { onToken("development-bypass"); return undefined; }
    if (!siteKey) return undefined;
    const render = () => { if (!container.current || !window.turnstile) return; window.turnstile.render(container.current, { sitekey: siteKey, callback: onToken, "expired-callback": () => onToken(""), "error-callback": () => setError("CAPTCHA could not be loaded.") }); };
    const existing = document.querySelector('script[data-karlo-turnstile="true"]'); if (existing) { render(); return undefined; }
    const script = document.createElement("script"); script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; script.async = true; script.defer = true; script.dataset.karloTurnstile = "true"; script.addEventListener("load", render); script.addEventListener("error", () => setError("CAPTCHA could not be loaded.")); document.head.appendChild(script); return () => script.removeEventListener("load", render);
  }, [onToken, siteKey]);
  return <div><div ref={container} aria-label="CAPTCHA verification" />{import.meta.env.DEV && !siteKey && <p className="text-xs text-amber-700">CAPTCHA bypass is active only in development.</p>}{!import.meta.env.DEV && !siteKey && <p role="alert" className="text-sm text-rose-700">Secure CAPTCHA is not configured.</p>}{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}</div>;
};
export default CaptchaChallenge;
