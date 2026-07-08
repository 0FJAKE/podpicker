"use client";

import { useState } from "react";
import styles from "./page.module.css";
import { TOPICS, pick, EPISODE_COUNT, type Topic } from "./lib/pick";
import type { Episode } from "./data/episodes";

type Result = { episode: Episode; matched: boolean };

export default function Home() {
  const [selected, setSelected] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [shown, setShown] = useState<number[]>([]);

  const toggle = (label: string) =>
    setSelected((s) => (s.includes(label) ? s.filter((l) => l !== label) : [...s, label]));

  const keywords = () =>
    TOPICS.filter((t: Topic) => selected.includes(t.label)).flatMap((t) => t.keywords);

  const run = (exclude: number[]) => {
    const res = pick(keywords(), text, exclude);
    if (!res) return;
    setResult(res);
    setShown((prev) => [...prev, res.episode.num]);
  };

  const handlePick = () => {
    setShown([]);
    run([]);
  };

  const pickAnother = () => run(shown);

  const reset = () => {
    setSelected([]);
    setText("");
    setResult(null);
    setShown([]);
  };

  return (
    <main className={styles.main}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <a className={styles.kicker} href="https://podofjake.com" target="_blank" rel="noopener noreferrer">
            ● POD OF JAKE
          </a>
          <h1 className={styles.title}>Where should you start?</h1>
          <p className={styles.sub}>
            {EPISODE_COUNT}+ episodes with founders, investors, artists, and builders. Tell me what
            you&apos;re into and I&apos;ll pick your first listen.
          </p>
        </header>

        <section className={styles.controls}>
          <div className={styles.chips}>
            {TOPICS.map((t) => (
              <button
                key={t.label}
                type="button"
                onClick={() => toggle(t.label)}
                className={`${styles.chip} ${selected.includes(t.label) ? styles.chipOn : ""}`}
                aria-pressed={selected.includes(t.label)}
              >
                <span className={styles.chipEmoji}>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>

          <input
            className={styles.input}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePick()}
            placeholder="or type anything — a name, a topic, a vibe…"
            aria-label="Type an interest"
          />

          <button type="button" className={styles.cta} onClick={handlePick}>
            Pick my episode →
          </button>
        </section>

        {result && (
          <section className={styles.result}>
            <div className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.badge}>EP #{result.episode.num}</span>
                {result.matched ? (
                  <span className={styles.tag}>your match</span>
                ) : (
                  <span className={styles.tag}>wildcard 🎲</span>
                )}
              </div>
              <h2 className={styles.guest}>{result.episode.guest}</h2>
              {result.episode.desc && result.episode.desc.length > 3 && (
                <p className={styles.bio}>{result.episode.desc}</p>
              )}
              <div className={styles.actions}>
                <a
                  className={styles.listen}
                  href={result.episode.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ▶ Listen now
                </a>
                <button type="button" className={styles.secondary} onClick={pickAnother}>
                  Pick another
                </button>
                <button type="button" className={styles.ghost} onClick={reset}>
                  Start over
                </button>
              </div>
            </div>
          </section>
        )}

        <footer className={styles.footer}>
          <span>Not sure? Just hit pick with nothing selected for a wildcard.</span>
          <span className={styles.links}>
            <a href="https://podofjake.com" target="_blank" rel="noopener noreferrer">
              podofjake.com
            </a>
          </span>
        </footer>
      </div>
    </main>
  );
}
