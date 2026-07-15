"use client";

import { useEffect, useRef } from "react";

type Props = {
  url: string;
  className?: string;
};

export default function RevealViewer({ url, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    let cancelled = false;

    const init = async () => {
      if (deckRef.current) {
        try { deckRef.current.destroy(); } catch {}
        deckRef.current = null;
      }

      // Garantir que o container tem a classe 'reveal'
      if (containerRef.current) {
        containerRef.current.classList.add("reveal");
      }

      // CSS local
      const cssFiles = ["/reveal/css/reveal.css", "/reveal/css/bisaf.css"];
      for (const href of cssFiles) {
        if (!document.querySelector(`link[href="${href}"]`)) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          document.head.appendChild(link);
        }
      }

      // Buscar o Markdown
      let markdown = "";
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        markdown = await response.text();
        console.log("✅ Markdown carregado:", markdown.substring(0, 100) + "...");
      } catch (err) {
        console.error("❌ Erro ao carregar Markdown:", err);
        if (containerRef.current) {
          containerRef.current.innerHTML = `<p style="color:white;text-align:center;padding:40px;">Erro ao carregar o ficheiro.</p>`;
        }
        return;
      }

      if (cancelled) return;

      // Criar estrutura HTML necessária
      const slidesDiv = document.createElement("div");
      slidesDiv.className = "slides";

      const section = document.createElement("section");
      section.setAttribute("data-markdown", "");
      section.setAttribute("data-separator", "^\\r?\\n---\\r?\\n$");
      section.setAttribute("data-separator-vertical", "^\\r?\\n--\\r?\\n$");

      const textarea = document.createElement("textarea");
      textarea.setAttribute("data-template", "");
      textarea.textContent = markdown;
      section.appendChild(textarea);
      slidesDiv.appendChild(section);

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(slidesDiv);
      }
      console.log("✅ Estrutura HTML injetada");

      // Função para carregar o Reveal.js
      const loadReveal = (): Promise<void> => {
        return new Promise((resolve) => {
          if ((window as any).Reveal) {
            resolve();
            return;
          }

          const script = document.createElement("script");
          script.type = "module";
          script.innerHTML = `
            import Reveal from '/reveal/js/reveal.esm.js';
            import RevealMarkdown from '/reveal/plugin/markdown.esm.js';
            import RevealHighlight from '/reveal/plugin/highlight.esm.js';
            import RevealMath from '/reveal/plugin/math.esm.js';
            import RevealZoom from '/reveal/plugin/zoom.esm.js';

            window.__revealModules = {
              Reveal,
              RevealMarkdown,
              RevealHighlight,
              RevealMath,
              RevealZoom
            };
            window.Reveal = Reveal;
            window.dispatchEvent(new Event('reveal-loaded'));
          `;
          document.head.appendChild(script);
          window.addEventListener("reveal-loaded", () => resolve(), { once: true });
        });
      };

      try {
        await loadReveal();
        console.log("✅ Reveal.js carregado");
      } catch (err) {
        console.error("❌ Erro ao carregar Reveal.js:", err);
        return;
      }

      if (cancelled || !containerRef.current) return;

      const { Reveal, RevealMarkdown, RevealHighlight, RevealMath, RevealZoom } =
        (window as any).__revealModules;

      try {
        const deck = new Reveal(containerRef.current, {
          hash: false,
          center: true,
          transition: "slide",
          backgroundTransition: "fade",
          plugins: [RevealMarkdown, RevealHighlight, RevealMath, RevealZoom],
          progress: true,
          controls: true,
          controlsLayout: "bottom-right",
          slideNumber: "c/t",
          width: 960,
          height: 700,
          margin: 0.1,
        });

        await deck.initialize();
        console.log("✅ Reveal.js inicializado");
        if (!cancelled) deckRef.current = deck;
      } catch (err) {
        console.error("❌ Erro ao inicializar Reveal.js:", err);
      }
    };

    void init();

    return () => {
      cancelled = true;
      if (deckRef.current) {
        try { deckRef.current.destroy(); } catch {}
        deckRef.current = null;
      }
    };
  }, [url]);

  return (
    <div
      ref={containerRef}
      className={`reveal ${className ?? "h-full w-full"}`}
      style={{ backgroundColor: "#050816" }}
    />
  );
}