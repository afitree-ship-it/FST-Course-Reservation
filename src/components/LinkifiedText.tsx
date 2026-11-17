import { Fragment } from 'react';

/**
 * Renders plain text and turns any http(s):// or www. address inside it into a clickable link
 * that opens in a new tab. Used for officer remarks / rejection reasons that often carry a
 * Facebook post or document link.
 */
const URL_RE = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;
const TRAILING = /[.,;:!?)\]}"'’”]+$/;

export default function LinkifiedText({ text, linkClassName }: { text?: string; linkClassName?: string }) {
  if (!text) return null;
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>;
        // keep sentence punctuation that follows a link outside of it
        const trail = (part.match(TRAILING) || [''])[0];
        const url = trail ? part.slice(0, -trail.length) : part;
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        return (
          <Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className={linkClassName || 'underline font-semibold text-sky-700 hover:text-sky-900 break-all'}
            >
              {url}
            </a>
            {trail}
          </Fragment>
        );
      })}
    </>
  );
}
