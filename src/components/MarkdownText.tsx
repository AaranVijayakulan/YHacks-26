import type { ReactNode } from 'react';

function renderInlineSegments(text: string): ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
  return tokens.map((token, idx) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={idx}
          className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-slate-800"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={idx} className="font-semibold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{token}</span>;
  });
}

export function MarkdownText({ content }: { content: string }) {
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-3 text-[15px] leading-[1.65] text-slate-700">
      {blocks.map((block, blockIdx) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const lines = block.slice(3, -3).split('\n');
          const firstLine = lines[0]?.trim() ?? '';
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const codeBody = (hasLang ? lines.slice(1) : lines).join('\n').trim();
          return (
            <pre
              key={blockIdx}
              className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-3.5 font-mono text-[13px] leading-relaxed text-slate-100"
            >
              <code>{codeBody}</code>
            </pre>
          );
        }

        const lines = block.split('\n');
        const elements: ReactNode[] = [];
        let listItems: string[] = [];

        const flushList = (keyPrefix: string) => {
          if (listItems.length === 0) return;
          elements.push(
            <ul key={`${keyPrefix}-list`} className="list-disc space-y-1.5 pl-5">
              {listItems.map((item, idx) => (
                <li key={idx}>{renderInlineSegments(item)}</li>
              ))}
            </ul>
          );
          listItems = [];
        };

        lines.forEach((rawLine, lineIdx) => {
          const line = rawLine.trim();
          if (!line) {
            flushList(`${blockIdx}-${lineIdx}`);
            return;
          }

          if (line.startsWith('### ')) {
            flushList(`${blockIdx}-${lineIdx}`);
            elements.push(
              <h4
                key={`${blockIdx}-${lineIdx}`}
                className="pt-1 font-[var(--font-display)] text-sm font-semibold text-slate-900"
              >
                {renderInlineSegments(line.slice(4))}
              </h4>
            );
            return;
          }

          if (line.startsWith('## ') || line.startsWith('# ')) {
            flushList(`${blockIdx}-${lineIdx}`);
            const text = line.replace(/^#{1,3}\s+/, '');
            elements.push(
              <h3
                key={`${blockIdx}-${lineIdx}`}
                className="pt-1 font-[var(--font-display)] text-base font-semibold text-slate-900"
              >
                {renderInlineSegments(text)}
              </h3>
            );
            return;
          }

          const bulletMatch = line.match(/^[-*]\s+(.*)$/) || line.match(/^\d+\.\s+(.*)$/);
          if (bulletMatch) {
            listItems.push(bulletMatch[1]);
            return;
          }

          flushList(`${blockIdx}-${lineIdx}`);
          elements.push(
            <p key={`${blockIdx}-${lineIdx}`}>{renderInlineSegments(line)}</p>
          );
        });

        flushList(`${blockIdx}-end`);
        return <div key={blockIdx} className="space-y-2.5">{elements}</div>;
      })}
    </div>
  );
}
