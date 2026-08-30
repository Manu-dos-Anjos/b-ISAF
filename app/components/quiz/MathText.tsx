"use client";

import { Fragment } from "react";
import { InlineMath, BlockMath } from "react-katex";

type Props = {
  text: string;
  className?: string;
};

export function MathText({ text, className }: Props) {
  if (!text) return null;

  // Pré-processa o texto para converter \frac em \dfrac (frações maiores)
  const processLatex = (latex: string) => {
    return latex
      .replace(/\\frac/g, "\\dfrac")
      .replace(/\\sum/g, "\\displaystyle\\sum")
      .replace(/\\int/g, "\\displaystyle\\int")
      .replace(/\\prod/g, "\\displaystyle\\prod");
  };

  // Divide primeiro por blocos $$...$$
  const blockParts = text.split(/(\$\$[\s\S]+?\$\$)/g);

  return (
    <span className={`break-words ${className ?? ""}`} style={{ overflowWrap: "break-word" }}>
      {blockParts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
          const latex = processLatex(part.slice(2, -2));
          return (
            <span key={i} className="my-2 block overflow-visible py-1 text-left">
              <BlockMath
                math={latex}
                errorColor="#e11d48"
                renderError={(err) => (
                  <span className="text-xs text-rose-500">[LaTeX erro: {err.message}]</span>
                )}
              />
            </span>
          );
        }

        // Divide por inline $...$
        const inlineParts = part.split(/(\$[^$\n]+?\$)/g);

        return (
          <Fragment key={i}>
            {inlineParts.map((seg, j) => {
              if (seg.startsWith("$") && seg.endsWith("$") && seg.length > 2) {
                const latex = processLatex(seg.slice(1, -1));
                return (
                  <InlineMath
                    key={j}
                    math={latex}
                    errorColor="#e11d48"
                    renderError={() => (
                      <span className="text-xs text-rose-500">[{latex}]</span>
                    )}
                  />
                );
              }
              return <span key={j}>{seg}</span>;
            })}
          </Fragment>
        );
      })}
    </span>
  );
}