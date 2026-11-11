import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import {
  Zap,
  Clapperboard,
  Shapes,
  Volume2,
  Settings2,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Plus,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Download,
  Check,
  Maximize2,
  Sparkles,
  Clock,
  Eye,
  Grid2X2,
  Brain,
  Shuffle,
  X,
  CheckCircle2,
  Music2,
  Mic,
  AudioLines,
  Loader2,
  Film,
  Keyboard,
  ArrowUpRight,
} from "lucide-react";
import {
  drawShow,
  mascot,
  defaults,
  initialSettings,
  formats,
  timing,
  sceneAt,
  type Challenge,
  type Settings,
} from "../lib/show";
import { ShowAudio } from "../lib/audio";
import "../studio.css";
import "../studio-refinements.css";

const readStored = () => {
  try {
    return JSON.parse(localStorage.getItem("mindtrap-studio") || "null");
  } catch {
    return null;
  }
};
const fmt = (n: number) =>
  `${Math.floor(n / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(n % 60)
    .toString()
    .padStart(2, "0")}`;
function MascotMini({ state = "intro" }: { state?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!.getContext("2d")!;
    let raf = 0;
    const run = (t: number) => {
      c.clearRect(0, 0, 400, 400);
      mascot(
        c,
        200,
        176,
        0.83,
        t / 1000,
        state === "speaking" ? Math.abs(Math.sin(t / 140)) * 0.7 : 0,
        state,
      );
      raf = requestAnimationFrame(run);
    };
    raf = requestAnimationFrame(run);
    return () => cancelAnimationFrame(raf);
  }, [state]);
  return (
    <canvas width={400} height={400} ref={ref} aria-label="Trappy mascot" />
  );
}
function Thumbnail({ item, index }: { item: Challenge; index: number }) {
  return (
    <div className={`thumbnail thumb-${index}`}>
      {index === 0 ? (
        <div className="tiny-emoji-grid">
          {Array.from({ length: 9 }, (_, i) => (
            <span key={i}>{i === 5 ? "😉" : "😀"}</span>
          ))}
        </div>
      ) : index === 1 ? (
        <div className="mini-room">
          <div className="window" />
          <div className="sofa" />
          <span>✦</span>
          <div className="plant" />
        </div>
      ) : (
        <div className="tiny-shapes">
          <i />
          <b />
          <em />
          <span>?</span>
        </div>
      )}
      <small>{item.difficulty.toUpperCase()}</small>
    </div>
  );
}
export default function Index() {
  const stored = useRef(readStored());
  const [challenges, setChallenges] = useState<Challenge[]>(
    stored.current?.challenges || defaults,
  );
  const [settings, setSettings] = useState<Settings>(
    stored.current?.settings || initialSettings,
  );
  const [selected, setSelected] = useState(0),
    [tab, setTab] = useState("Content"),
    [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0),
    [loading, setLoading] = useState(false),
    [exporting, setExporting] = useState(false),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState(""),
    [rail, setRail] = useState("studio"),
    [name, setName] = useState(
      stored.current?.name || "Your next brain teaser",
    ),
    [saved, setSaved] = useState(true),
    [full, setFull] = useState(false),
    [recordingUrl, setRecordingUrl] = useState("");
  const [demoState, setDemoState] = useState("intro");
  const canvas = useRef<HTMLCanvasElement>(null),
    audio = useRef(new ShowAudio()),
    transport = useRef({ playing: false, t: 0, start: 0 }),
    current = useRef({ challenges, settings }),
    recorder = useRef<MediaRecorder | null>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const q = timing(settings),
    scene = sceneAt(time, settings),
    item = challenges[selected];
  current.current = { challenges, settings };
  function notify(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }
  useEffect(() => {
    localStorage.setItem(
      "mindtrap-studio",
      JSON.stringify({ challenges, settings, name }),
    );
    setSaved(true);
  }, [challenges, settings, name]);
  useEffect(() => {
    audio.current.volumes(settings);
  }, [settings]);
  useEffect(() => {
    const engine = audio.current;
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      const tr = transport.current;
      const s = current.current.settings;
      const total = timing(s).total;
      let t = tr.t;
      if (tr.playing) {
        t = Math.max(0, tr.t + (now - tr.start) / 1000);
        if (t >= total) {
          t = total - 0.01;
          tr.playing = false;
          tr.t = t;
          audio.current.stop();
          setPlaying(false);
          if (recorder.current?.state === "recording") recorder.current.stop();
        }
      }
      if (canvas.current)
        drawShow(
          canvas.current.getContext("2d")!,
          t,
          current.current.challenges,
          s,
          tr.playing ? audio.current.amplitude() : 0,
        );
      if (now - last > 70) {
        setTime(t);
        last = now;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      engine.stop();
    };
  }, []);
  function pause() {
    const tr = transport.current;
    if (tr.playing) {
      tr.t += (performance.now() - tr.start) / 1000;
      tr.playing = false;
    }
    audio.current.stop();
    setPlaying(false);
  }
  function seek(t: number) {
    if (exporting) return;
    const tr = transport.current;
    tr.t = t;
    tr.start = performance.now();
    setTime(t);
    if (tr.playing) audio.current.play(t, settings);
  }
  async function play() {
    if (loading || exporting) return;
    if (playing) {
      pause();
      return;
    }
    setLoading(true);
    try {
      await audio.current.init();
      const tr = transport.current;
      if (tr.t >= q.total - 0.1) tr.t = 0;
      audio.current.play(tr.t, settings);
      tr.start = performance.now();
      tr.playing = true;
      setPlaying(true);
    } catch (e) {
      notify(
        `Audio couldn't start: ${e instanceof Error ? e.message : "unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  }
  function update(patch: Partial<Challenge>) {
    if (exporting) return;
    pause();
    setChallenges((prev) =>
      prev.map((a, i) => (i === selected ? { ...a, ...patch, id: a.id } : a)),
    );
    setSaved(false);
  }
  function updateSettings(patch: Partial<Settings>) {
    if (exporting) return;
    if (patch.countdown || patch.voice) {
      pause();
      seek(selected * q.length);
    }
    setSettings((p) => ({ ...p, ...patch }));
    setSaved(false);
  }
  function pick(i: number) {
    setSelected(i);
    seek(i * q.length);
  }
  async function exportVideo() {
    setModal("");
    if (exporting) return;
    setLoading(true);
    try {
      await audio.current.init();
      if (!canvas.current || !audio.current.destination)
        throw new Error("Audio not ready");
      if (!("MediaRecorder" in window))
        throw new Error("Video export requires Chrome or Firefox");
      pause();
      transport.current.t = 0;
      setTime(0);
      drawShow(canvas.current.getContext("2d")!, 0, challenges, settings, 0);
      const stream = canvas.current.captureStream(30);
      audio.current.destination.stream
        .getAudioTracks()
        .forEach((track) => stream.addTrack(track));
      const mime = [
        "video/webm;codecs=vp8,opus",
        "video/webm;codecs=vp9,opus",
        "video/webm",
      ].find((m) => MediaRecorder.isTypeSupported(m));
      if (!mime) throw new Error("WebM recording is not supported");
      const rec = new MediaRecorder(stream, {
        mimeType: mime,
        videoBitsPerSecond: 7_000_000,
        audioBitsPerSecond: 192000,
      });
      recorder.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => {
        stream.getVideoTracks().forEach((track) => track.stop());
        setExporting(false);
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordingUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return url;
        });
        const a = document.createElement("a");
        a.href = url;
        a.download = "mind-trap-1080x1920.webm";
        a.click();
        notify("Your video is ready — download complete.");
      };
      rec.onerror = () => {
        setExporting(false);
        pause();
        notify("Recording failed. Please try again.");
      };
      rec.start(1000);
      setExporting(true);
      transport.current.start = performance.now();
      transport.current.playing = true;
      setPlaying(true);
      audio.current.play(0, settings);
    } catch (e) {
      notify(e instanceof Error ? e.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }
  function cancelExport() {
    pause();
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = () => {
        setExporting(false);
      };
      recorder.current.stop();
    }
    setExporting(false);
    notify("Export cancelled.");
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).matches("input,textarea,select") ||
        exporting
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        void play();
      }
      if (e.code === "ArrowRight") seek(Math.min(q.total - 0.02, time + 5));
      if (e.code === "ArrowLeft") seek(Math.max(0, time - 5));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  const formatIcon = (i: number) =>
    i === 0 ? (
      <Grid2X2 size={15} />
    ) : i === 1 ? (
      <Eye size={15} />
    ) : (
      <Brain size={15} />
    );
  return (
    <div className="studio-app">
      <aside className="nav-rail">
        <a className="brand-mark" href="/" aria-label="Mind Trap home">
          <Zap size={25} fill="currentColor" />
        </a>
        <div className="rail-group">
          <button
            className={rail === "studio" ? "active" : ""}
            title="Video studio"
            onClick={() => {
              setRail("studio");
              setModal("");
            }}
          >
            <Clapperboard size={21} />
          </button>
          <button
            className={rail === "formats" ? "active" : ""}
            title="Challenge library"
            onClick={() => {
              setRail("formats");
              setModal("formats");
            }}
          >
            <Shapes size={22} />
          </button>
          <button
            className={rail === "audio" ? "active" : ""}
            title="Audio mixer"
            onClick={() => {
              setRail("audio");
              setTab("Audio");
            }}
          >
            <AudioLines size={21} />
          </button>
        </div>
        <div className="rail-bottom">
          <button
            title="Studio settings"
            onClick={() => {
              setRail("settings");
              setTab("Style");
            }}
          >
            <Settings2 size={21} />
          </button>
          <button
            title="Help and keyboard shortcuts"
            onClick={() => setModal("help")}
          >
            <HelpCircle size={21} />
          </button>
          <div className="avatar">JD</div>
        </div>
      </aside>
      <div className="studio-body">
        <header className="topbar">
          <div className="wordmark">
            MIND<span>TRAP</span>
            <i>STUDIO</i>
          </div>
          <div className="top-divider" />
          <div className="project-name">
            <input
              aria-label="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <ChevronDown size={14} />
          </div>
          <span className="saved-state">
            <CheckCircle2 size={13} />
            {saved ? "All changes saved" : "Saving…"}
          </span>
          <button
            className="export-button"
            disabled={loading || exporting}
            onClick={() => setModal("export")}
          >
            <Download size={15} />
            {exporting ? "Exporting…" : "Export video"}
            <ChevronDown size={13} />
          </button>
        </header>
        <div className="workspace-header">
          <div>
            <div className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={12} />
              <span>Untitled series</span>
              <ChevronRight size={12} />
              <b>Episode 01</b>
            </div>
            <h1>
              A little challenge. A big mind trap.
              <span className="draft-tag">DRAFT</span>
            </h1>
            <p>
              Three levels. One mischievous host. Make their brains work for it.
            </p>
          </div>
          <button className="format-pill" onClick={() => setModal("export")}>
            <Film size={15} />
            <span>Vertical short</span>
            <b>9:16</b>
          </button>
        </div>
        <div className="workspace-grid">
          <aside className="challenge-panel">
            <div className="panel-title">
              <h2>
                Challenges <span>03</span>
              </h2>
              <button
                title="Change challenge formats"
                onClick={() => setModal("formats")}
              >
                <Plus size={17} />
              </button>
            </div>
            <p className="panel-subtitle">Small puzzles. Big reactions.</p>
            <div className="challenge-list">
              {challenges.map((a, i) => (
                <button
                  key={a.id}
                  className={`challenge-card ${selected === i ? "selected" : ""}`}
                  onClick={() => pick(i)}
                  disabled={exporting}
                >
                  <Thumbnail item={a} index={i} />
                  <div className="challenge-copy">
                    <div>
                      <span className="level-label">CHALLENGE 0{i + 1}</span>
                      {selected === i && <span className="selected-dot" />}
                    </div>
                    <h3>{a.title}</h3>
                    <p>
                      {formatIcon(i)}
                      {a.type}
                    </p>
                    <footer>
                      <span className={`difficulty difficulty-${i}`}>
                        {a.difficulty}
                      </span>
                      <span>
                        <Clock size={11} />
                        {q.length.toFixed(1)}s
                      </span>
                    </footer>
                  </div>
                </button>
              ))}
            </div>
            <button
              className="add-challenge"
              onClick={() => setModal("formats")}
            >
              <Plus size={16} /> Explore challenge formats
            </button>
            <div className="trappy-card">
              <div className="mascot-avatar">
                <MascotMini />
              </div>
              <div>
                <h3>Meet your host, Trappy.</h3>
                <p>A little cheeky. A lot of personality.</p>
                <span>
                  <i /> Lip sync is ready
                </span>
              </div>
            </div>
            <div className="tip">
              <Sparkles size={16} />
              <p>
                Keep it snappy.
                <br />
                <span>A little pressure makes a great puzzle.</span>
              </p>
            </div>
          </aside>
          <main className={`preview-panel ${full ? "expanded" : ""}`}>
            <div className="preview-heading">
              <h2>
                <span className="live-dot" /> Live preview
              </h2>
              <div>
                <button
                  title="Fullscreen preview"
                  onClick={() => setFull(!full)}
                >
                  {full ? <X size={16} /> : <Maximize2 size={15} />}
                </button>
                <span>1080 × 1920</span>
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="canvas-space"
            >
              <div className="ambient-ring ring-one" />
              <div className="ambient-ring ring-two" />
              <div className="portrait-wrap">
                <canvas
                  ref={canvas}
                  width={1080}
                  height={1920}
                  aria-label="Animated Mind Trap vertical video preview"
                />
                <div className="canvas-border" />
              </div>
              <span className="safe-area-label">
                DESIGNED FOR THE SCROLL. BUILT TO STOP IT.
              </span>
            </motion.div>
            <div className="player-controls">
              <button
                title="Restart"
                onClick={() => seek(0)}
                disabled={exporting}
              >
                <RotateCcw size={16} />
              </button>
              <button
                title="Previous scene"
                onClick={() => seek(Math.max(0, (scene.index - 1) * q.length))}
                disabled={exporting}
              >
                <SkipBack size={16} />
              </button>
              <button
                className="play-button"
                onClick={play}
                disabled={loading || exporting}
                title={playing ? "Pause" : "Play"}
              >
                {loading ? (
                  <Loader2 size={20} className="spin" />
                ) : playing ? (
                  <Pause size={19} fill="currentColor" />
                ) : (
                  <Play size={19} fill="currentColor" />
                )}
              </button>
              <button
                title="Next scene"
                onClick={() =>
                  seek(Math.min(q.total - 0.02, (scene.index + 1) * q.length))
                }
                disabled={exporting}
              >
                <SkipForward size={16} />
              </button>
              <span className="player-time">
                {fmt(time)} <i>/</i> {fmt(q.total)}
              </span>
              <button
                title="Toggle narration"
                onClick={() =>
                  updateSettings({ narration: settings.narration ? 0 : 90 })
                }
              >
                <Volume2 size={16} />
              </button>
            </div>
            <div className="platforms">
              <span>Made for</span>
              <b>
                ▶ <span>YouTube Shorts</span>
              </b>
              <b>
                ♪ <span>TikTok</span>
              </b>
              <b>
                ◎ <span>Reels</span>
              </b>
            </div>
          </main>
          <aside className="inspector">
            <div className="inspector-heading">
              <h2>Make it yours</h2>
              <Settings2 size={16} />
            </div>
            <div className="inspector-tabs">
              {["Content", "Style", "Audio"].map((a) => (
                <button
                  key={a}
                  className={tab === a ? "active" : ""}
                  onClick={() => setTab(a)}
                >
                  {a}
                </button>
              ))}
            </div>
            <div className="inspector-content">
              {tab === "Content" && (
                <>
                  <div className="editing-label">
                    <span className="selected-dot" />
                    EDITING CHALLENGE 0{selected + 1}
                  </div>
                  <label>
                    Challenge type
                    <div className="select-wrap">
                      <select
                        value={item.type}
                        onChange={(e) => {
                          const type = e.target.value;
                          const overrides: Record<
                            string,
                            Partial<Challenge>
                          > = {
                            "Memory challenge": {
                              title: "What disappeared?",
                              prompt: "Remember the shapes before they vanish.",
                              answer: "The triangle",
                              explanation: "The yellow triangle disappeared.",
                            },
                            "Mathematical traps": {
                              title: "Beat the math trap",
                              prompt: "Remember the order of operations.",
                              answer: "12",
                              explanation:
                                "Multiply first: 3 × 2 = 6. Then add 6.",
                            },
                            "Impossible choices": {
                              title: "Which is heavier?",
                              prompt: "Think carefully before you answer.",
                              answer: "They weigh the same",
                              explanation: "Both weigh exactly one kilogram.",
                            },
                          };
                          update({
                            type,
                            ...(overrides[type] ||
                              defaults.find((x) => x.type === type)),
                          });
                        }}
                      >
                        {formats.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                      <ChevronDown size={13} />
                    </div>
                  </label>
                  <label>
                    Challenge title
                    <input
                      aria-label="Challenge title"
                      value={item.title}
                      onChange={(e) => update({ title: e.target.value })}
                      maxLength={65}
                    />
                  </label>
                  <label>
                    Prompt text
                    <textarea
                      aria-label="Prompt text"
                      value={item.prompt}
                      onChange={(e) => update({ prompt: e.target.value })}
                      maxLength={120}
                    />
                    <small>Keep it short. Let the puzzle do the talking.</small>
                  </label>
                  <div className="field-divider" />
                  <label>
                    Correct answer
                    <input
                      aria-label="Correct answer"
                      value={item.answer}
                      onChange={(e) => update({ answer: e.target.value })}
                      maxLength={45}
                    />
                  </label>
                  <label>
                    Reveal explanation
                    <textarea
                      aria-label="Reveal explanation"
                      value={item.explanation}
                      onChange={(e) => update({ explanation: e.target.value })}
                      maxLength={120}
                    />
                  </label>
                  <div className="field-divider" />
                  <div className="timer-row">
                    <span>
                      <Clock size={15} />
                      Countdown
                    </span>
                    <div>
                      <button
                        onClick={() =>
                          updateSettings({
                            countdown: Math.max(3, settings.countdown - 1),
                          })
                        }
                        disabled={exporting}
                      >
                        −
                      </button>
                      <b>{settings.countdown}s</b>
                      <button
                        onClick={() =>
                          updateSettings({
                            countdown: Math.min(10, settings.countdown + 1),
                          })
                        }
                        disabled={exporting}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <p className="field-hint">
                    A little time pressure. A lot of fun.
                  </p>
                  {item.type === "Spot the difference" && (
                    <button
                      className="shuffle-button"
                      onClick={() => {
                        const odd =
                          (item.odd + 1 + Math.floor(Math.random() * 15)) % 16;
                        update({
                          odd,
                          explanation: `Row ${Math.floor(odd / 4) + 1}, column ${(odd % 4) + 1} — one little wink!`,
                        });
                        notify("A new wink is hiding in the grid.");
                      }}
                    >
                      <Shuffle size={14} />
                      Shuffle the odd emoji
                    </button>
                  )}
                  <p className="recorded-note">
                    Text edits change on-screen copy. Recorded voice stays
                    original; choose a format to explore its visual template.
                  </p>
                </>
              )}
              {tab === "Style" && (
                <>
                  <div className="editing-label">THE SHOW’S LOOK & FEEL</div>
                  <label>
                    Color theme
                    <div className="select-wrap">
                      <select
                        value={settings.theme}
                        onChange={(e) =>
                          updateSettings({ theme: e.target.value })
                        }
                      >
                        {["Electric violet", "Cyan arcade", "Golden hour"].map(
                          (x) => (
                            <option key={x}>{x}</option>
                          ),
                        )}
                      </select>
                      <ChevronDown size={13} />
                    </div>
                  </label>
                  <div className="swatches">
                    <i style={{ background: "#9257ff" }} />
                    <i style={{ background: "#f4eb64" }} />
                    <i style={{ background: "#6ee8ef" }} />
                    <i style={{ background: "#fff" }} />
                    <i style={{ background: "#211334" }} />
                  </div>
                  <label>
                    Animation intensity{" "}
                    <b className="range-value">{settings.intensity}%</b>
                    <input
                      aria-label="Animation intensity"
                      type="range"
                      min="0"
                      max="100"
                      value={settings.intensity}
                      onChange={(e) =>
                        updateSettings({ intensity: +e.target.value })
                      }
                    />
                  </label>
                  <div className="field-hint">
                    Controls Trappy’s bounce, floating particles and ambient
                    movement.
                  </div>
                  <div className="style-mascot">
                    <MascotMini state={demoState} />
                    <h3>A face with personality.</h3>
                    <p>
                      Trappy blinks, thinks and celebrates. His mouth follows
                      the real narration waveform.
                    </p>
                    <span className="status-pill">
                      <span className="live-dot" /> Audio-driven lip sync
                    </span>
                    <div className="mascot-states">
                      {Object.entries({
                        Idle: "intro",
                        Speaking: "speaking",
                        Thinking: "countdown",
                        Surprised: "surprised",
                        Celebrate: "reveal",
                        "Wrong answer": "wrong",
                      }).map(([label, state]) => (
                        <button
                          className={demoState === state ? "active" : ""}
                          key={state}
                          onClick={() => setDemoState(state)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <small>
                      Expression demo · the main show uses actual audio.
                    </small>
                  </div>
                  <button
                    className="shuffle-button"
                    onClick={() => {
                      updateSettings({
                        theme: "Electric violet",
                        intensity: 65,
                      });
                      notify("Original show style restored.");
                    }}
                  >
                    <RotateCcw size={14} /> Reset show style
                  </button>
                </>
              )}
              {tab === "Audio" && (
                <>
                  <div className="editing-label">SOUND ON. GAME ON.</div>
                  <label>
                    Narrator
                    <div className="select-wrap">
                      <select
                        value={settings.voice}
                        onChange={(e) =>
                          updateSettings({ voice: e.target.value })
                        }
                      >
                        <option>Charlie · Original</option>
                        <option>Charlie · High energy</option>
                      </select>
                      <ChevronDown size={13} />
                    </div>
                  </label>
                  <p className="field-hint">
                    Original studio recording, or a playful faster pitch. Mouth
                    motion follows the audio amplitude, including silence.
                  </p>
                  <div className="field-divider" />
                  {(
                    [
                      {
                        key: "narration",
                        label: "Narration",
                        icon: <Mic size={16} />,
                      },
                      {
                        key: "music",
                        label: "Music",
                        icon: <Music2 size={16} />,
                      },
                      {
                        key: "sfx",
                        label: "Sound effects",
                        icon: <AudioLines size={16} />,
                      },
                    ] as const
                  ).map((a) => (
                    <label className="audio-slider" key={a.key}>
                      <span>
                        {a.icon}
                        {a.label}
                      </span>
                      <b>{settings[a.key]}%</b>
                      <input
                        aria-label={`${a.label} volume`}
                        type="range"
                        min="0"
                        max="100"
                        value={settings[a.key]}
                        onChange={(e) =>
                          updateSettings({ [a.key]: +e.target.value })
                        }
                      />
                    </label>
                  ))}
                  <div className="audio-ready">
                    <AudioLines size={23} />
                    <div>
                      <strong>All tracks ready</strong>
                      <p>Voiceover · Puzzle pop · Game FX</p>
                    </div>
                    <Check size={16} />
                  </div>
                  <button
                    className="shuffle-button"
                    onClick={() => {
                      seek(selected * q.length);
                      if (!playing) void play();
                    }}
                  >
                    <Play size={14} /> Preview this challenge
                  </button>
                </>
              )}
            </div>
            <div className="inspector-footer">
              <Zap size={13} />
              <span>Little details. Big rewatch energy.</span>
            </div>
          </aside>
        </div>
        <section className="timeline">
          <div className="timeline-header">
            <h2>
              <Clapperboard size={16} />
              Your show, in a nutshell <span>{fmt(q.total)}</span>
            </h2>
            <div>
              <span className="timeline-status">
                {exporting ? "RECORDING" : scene.phase.toUpperCase()}
              </span>
              <button
                title="Jump to reveal"
                disabled={exporting}
                onClick={() =>
                  seek(selected * q.length + 5.5 + settings.countdown)
                }
              >
                Preview reveal <Eye size={13} />
              </button>
            </div>
          </div>
          <div className="timeline-track">
            <div className="track-icon">
              <Film size={17} />
            </div>
            <div className="timeline-segments">
              {challenges.map((a, i) => (
                <button
                  key={i}
                  className={`timeline-clip clip-${i} ${scene.index === i ? "clip-active" : ""}`}
                  style={{ flex: q.length }}
                  onClick={() => pick(i)}
                  disabled={exporting}
                >
                  <Thumbnail item={a} index={i} />
                  <div>
                    <span>
                      0{i + 1} <b>{a.title}</b>
                    </span>
                    <small>
                      Hook <i>→</i> Countdown <i>→</i> Reveal
                    </small>
                  </div>
                  <em>{q.length.toFixed(1)}s</em>
                </button>
              ))}
              <button
                className={`timeline-outro ${scene.index === 3 ? "clip-active" : ""}`}
                style={{ flex: 5.5 }}
                onClick={() => seek(q.length * 3)}
                disabled={exporting}
              >
                <Sparkles size={16} />
                <span>Outro & CTA</span>
                <small>5.5s</small>
              </button>
              <div
                className="playhead"
                style={{ left: `${Math.min(99.9, (time / q.total) * 100)}%` }}
              >
                <span />
                <i />
              </div>
            </div>
          </div>
          <input
            className="scrub"
            aria-label="Video timeline"
            type="range"
            min="0"
            max={q.total - 0.01}
            step=".05"
            value={time}
            onChange={(e) => seek(+e.target.value)}
            disabled={exporting}
          />
          <div className="timeline-ruler">
            {[0, 10, 20, 30, 40, q.total].map((t, i) => (
              <span key={i}>{fmt(t)}</span>
            ))}
          </div>
        </section>
        <footer className="workspace-footer">
          <span>
            <span className="live-dot" /> Everything you need to make a
            mind-bending short.
          </span>
          <span>
            <Keyboard size={13} /> Space to play / pause{" "}
            <span className="footer-sep">·</span> Auto-saved locally
          </span>
        </footer>
      </div>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={16} />
          {toast}
          <button onClick={() => setToast("")}>
            <X size={13} />
          </button>
        </div>
      )}
      {exporting && (
        <div className="export-progress">
          <Loader2 size={18} className="spin" />
          <div>
            <strong>
              Rendering your show… {Math.round((time / q.total) * 100)}%
            </strong>
            <span>1080 × 1920 · audio included · keep this tab open</span>
            <progress value={time} max={q.total} />
          </div>
          <button onClick={cancelExport}>Cancel</button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setModal("")}
          onKeyDown={(e) => {
            if (e.key === "Escape") setModal("");
          }}
        >
          <motion.dialog
            open
            aria-modal="true"
            aria-label={
              modal === "export"
                ? "Export video settings"
                : modal === "formats"
                  ? "Challenge formats"
                  : "Studio help"
            }
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close" onClick={() => setModal("")}>
              <X size={20} />
            </button>
            {modal === "export" ? (
              <>
                <div className="modal-icon">
                  <Download size={25} />
                </div>
                <h2>Ready to trap some minds?</h2>
                <p>
                  Export your three-challenge show with Trappy, narration, music
                  and all the little sound effects.
                </p>
                <div className="export-spec">
                  <span>
                    Resolution <b>1080 × 1920</b>
                  </span>
                  <span>
                    Frame rate <b>30 fps</b>
                  </span>
                  <span>
                    Format <b>WebM · audio included</b>
                  </span>
                  <span>
                    Duration <b>{q.total.toFixed(1)} seconds</b>
                  </span>
                </div>
                <p className="field-hint">
                  Rendering takes one playback. Keep this tab open. For
                  platforms requiring MP4, convert the downloaded WebM before
                  uploading.
                </p>
                <button
                  className="export-button full-button"
                  onClick={exportVideo}
                  disabled={loading}
                >
                  <Download size={16} /> Export video
                </button>
                {recordingUrl && (
                  <a
                    className="download-again"
                    href={recordingUrl}
                    download="mind-trap-1080x1920.webm"
                  >
                    Download the last render again <ArrowUpRight size={14} />
                  </a>
                )}
                <a
                  className="download-again"
                  href="/videos/prototype.mp4"
                  download="mind-trap-prototype.mp4"
                >
                  Download finished prototype (MP4) <ArrowUpRight size={14} />
                </a>
              </>
            ) : modal === "formats" ? (
              <>
                <div className="modal-icon">
                  <Shapes size={26} />
                </div>
                <h2>Six ways to bend a brain.</h2>
                <p>
                  Choose a format for challenge 0{selected + 1}. The prototype
                  comes with three narrated puzzles; additional formats are
                  visual templates.
                </p>
                <div className="formats-grid">
                  {formats.map((f, i) => (
                    <button
                      key={f}
                      onClick={() => {
                        const d = defaults.find((x) => x.type === f);
                        const extra: Record<string, Partial<Challenge>> = {
                          "Memory challenge": {
                            title: "What disappeared?",
                            answer: "The triangle",
                            explanation: "The yellow triangle disappeared.",
                            prompt: "Remember the shapes before they vanish.",
                          },
                          "Impossible choices": {
                            title: "Which is heavier?",
                            answer: "They weigh the same",
                            explanation: "Both weigh one kilogram.",
                            prompt: "Think carefully before you answer.",
                          },
                          "Mathematical traps": {
                            title: "Beat the math trap",
                            answer: "12",
                            explanation: "Multiply before adding.",
                            prompt: "Remember the order of operations.",
                          },
                        };
                        update({ ...(d || extra[f]), type: f });
                        setModal("");
                        setTab("Content");
                        setRail("studio");
                      }}
                    >
                      <span>0{i + 1}</span>
                      <b>{f}</b>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="modal-icon">
                  <HelpCircle size={26} />
                </div>
                <h2>A quick studio cheat sheet.</h2>
                <p>
                  Select a challenge, edit the on-screen copy, then hit play.
                  Your edits are saved automatically on this device.
                </p>
                <div className="help-list">
                  <span>
                    <kbd>Space</kbd> Play / pause
                  </span>
                  <span>
                    <kbd>← / →</kbd> Skip five seconds
                  </span>
                  <span>
                    <Eye size={17} /> Preview reveal jumps straight to the
                    answer
                  </span>
                  <span>
                    <Volume2 size={17} /> Audio tab gives each track its own
                    volume
                  </span>
                  <span>
                    <Download size={17} /> Export records the canvas and mixed
                    audio
                  </span>
                </div>
                <p className="field-hint">
                  This prototype uses recorded voiceover. Text edits do not
                  regenerate narration. The six formats are fixed visual
                  templates, not AI-generated puzzles.
                </p>
                <button
                  className="export-button full-button"
                  onClick={() => setModal("")}
                >
                  Got it. Let’s make a show.
                </button>
              </>
            )}
          </motion.dialog>
        </div>
      )}
    </div>
  );
}
