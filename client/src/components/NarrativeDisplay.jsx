import { useState, useEffect, useRef } from "react";

export default function NarrativeDisplay({ text, done }) {
  const [displayedLen, setDisplayedLen] = useState(0);
  const containerRef = useRef(null);

  // 重置打字機：text 被清空時（新冒險開始）
  useEffect(() => {
    if (text === "") setDisplayedLen(0);
  }, [text]);

  // 打字機動畫：逐步追上 text 長度
  useEffect(() => {
    if (displayedLen >= text.length) return;
    const timer = setTimeout(() => {
      setDisplayedLen((prev) => Math.min(prev + 3, text.length));
    }, 25);
    return () => clearTimeout(timer);
  }, [displayedLen, text]);

  // 自動捲到底部
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedLen]);

  const isStreaming = !done || displayedLen < text.length;

  if (!text && !done) {
    return (
      <div style={{ fontStyle: "italic", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
        物語生成中... <span className="cursor-blink">▍</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        fontStyle: "italic",
        lineHeight: 1.8,
        marginTop: "0.5rem",
        maxHeight: "220px",
        overflowY: "auto",
        whiteSpace: "pre-wrap",
      }}
    >
      {text.slice(0, displayedLen)}
      {isStreaming && <span className="cursor-blink">▍</span>}
    </div>
  );
}
