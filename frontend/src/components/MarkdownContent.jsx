import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownContent({ content }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: ({ children }) => <h2 className="md-h2">{children}</h2>,
          h3: ({ children }) => <h3 className="md-h3">{children}</h3>,
          p: ({ children }) => <p className="md-p">{children}</p>,
          ul: ({ children }) => <ul className="md-ul">{children}</ul>,
          ol: ({ children }) => <ol className="md-ol">{children}</ol>,
          li: ({ children }) => <li className="md-li">{children}</li>,
          hr: () => <hr className="md-hr" />,
          strong: ({ children }) => <strong className="md-strong">{children}</strong>,
          code: ({ inline, children }) =>
            inline ? (
              <code className="md-code-inline">{children}</code>
            ) : (
              <pre className="md-code-block">
                <code>{children}</code>
              </pre>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
