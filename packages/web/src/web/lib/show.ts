export type Challenge = {
  id: number;
  type: string;
  title: string;
  prompt: string;
  answer: string;
  explanation: string;
  difficulty: string;
  odd: number;
};
export type Settings = {
  countdown: number;
  intensity: number;
  theme: string;
  voice: string;
  music: number;
  sfx: number;
  narration: number;
};
export const defaults: Challenge[] = [
  {
    id: 1,
    type: "Spot the difference",
    title: "Spot the different emoji",
    prompt: "One of these is not like the others.",
    answer: "The winking face",
    explanation: "Row 3, column 4 — one little wink!",
    difficulty: "Easy",
    odd: 11,
  },
  {
    id: 2,
    type: "Hidden object",
    title: "Find the hidden star",
    prompt: "Find the tiny yellow star in this room.",
    answer: "Behind the plant",
    explanation: "Look behind the plant on the right.",
    difficulty: "Medium",
    odd: 0,
  },
  {
    id: 3,
    type: "Visual logic",
    title: "What comes next?",
    prompt: "Look closely. Can you crack the pattern?",
    answer: "A circle",
    explanation: "Circle → triangle → square. Repeat!",
    difficulty: "Hard",
    odd: 0,
  },
];
export const initialSettings: Settings = {
  countdown: 5,
  intensity: 65,
  theme: "Electric violet",
  voice: "Charlie · Original",
  music: 25,
  sfx: 65,
  narration: 90,
};
export const formats = [
  "Spot the difference",
  "Hidden object",
  "Visual logic",
  "Memory challenge",
  "Impossible choices",
  "Mathematical traps",
];
export function timing(s: Settings) {
  return {
    intro: 5.5,
    count: s.countdown,
    reveal: 4,
    length: 9.5 + s.countdown,
    total: (9.5 + s.countdown) * 3 + 5.5,
  };
}
export function sceneAt(t: number, s: Settings) {
  const q = timing(s);
  const index = Math.max(0, Math.min(3, Math.floor(t / q.length)));
  const local = t - index * q.length;
  return {
    index,
    local,
    phase:
      index === 3
        ? "outro"
        : local < q.intro
          ? "intro"
          : local < q.intro + q.count
            ? "countdown"
            : "reveal",
    remaining: Math.max(1, Math.ceil(q.intro + q.count - local)),
  };
}
type C = CanvasRenderingContext2D;
const P = "#180d39";
function rr(
  c: C,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill: string,
  stroke?: string,
  line = 5,
) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = line;
    c.stroke();
  }
}
function ellipse(
  c: C,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  stroke?: string,
) {
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 7;
    c.stroke();
  }
}
function text(
  c: C,
  str: string,
  x: number,
  y: number,
  size: number,
  color = "#fff",
  weight = 700,
) {
  c.fillStyle = color;
  c.font = `${weight} ${size}px Poppins, sans-serif`;
  c.textAlign = "center";
  c.fillText(str, x, y);
}
function lines(
  c: C,
  str: string,
  x: number,
  y: number,
  size: number,
  max = 850,
  color = "#fff",
  weight = 700,
) {
  c.font = `${weight} ${size}px Poppins, sans-serif`;
  let line = "";
  let yy = y;
  for (const word of str.split(" ")) {
    if (c.measureText(line + word).width > max && line) {
      text(c, line.trim(), x, yy, size, color, weight);
      yy += size * 1.3;
      line = "";
    }
    line += word + " ";
  }
  text(c, line.trim(), x, yy, size, color, weight);
}
function star(c: C, x: number, y: number, r: number, color: string) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const rad = i % 2 ? r * 0.45 : r;
    const xx = x + Math.cos(a) * rad,
      yy = y + Math.sin(a) * rad;
    if (i) c.lineTo(xx, yy);
    else c.moveTo(xx, yy);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
}
function shape(c: C, kind: number, x: number, y: number, size = 55) {
  if (kind === 0) ellipse(c, x, y, size, size, "#9e69ff", P);
  if (kind === 1) {
    c.beginPath();
    c.moveTo(x, y - size);
    c.lineTo(x + size, y + size);
    c.lineTo(x - size, y + size);
    c.closePath();
    c.fillStyle = "#ffe65d";
    c.fill();
    c.strokeStyle = P;
    c.lineWidth = 7;
    c.stroke();
  }
  if (kind === 2)
    rr(c, x - size, y - size, size * 2, size * 2, 14, "#6ae6eb", P);
}
export function mascot(
  c: C,
  x: number,
  y: number,
  scale: number,
  t: number,
  mouth: number,
  state: string,
  intensity = 65,
) {
  c.save();
  c.translate(
    x,
    y +
      (Math.sin(t * 3.4) * 7 * intensity) / 65 -
      (state === "reveal" ? Math.abs(Math.sin(t * 6)) * 14 : 0),
  );
  c.scale(scale, scale);
  // feet and arms, silhouette shadow
  ellipse(c, 0, 224, 151, 23, "#13072b60");
  c.lineCap = "round";
  c.strokeStyle = P;
  c.lineWidth = 32;
  c.beginPath();
  c.moveTo(-85, 133);
  c.lineTo(-107, 205);
  c.moveTo(85, 133);
  c.lineTo(104, 205);
  c.stroke();
  c.strokeStyle = "#8550eb";
  c.lineWidth = 20;
  c.stroke();
  ellipse(c, -113, 209, 39, 19, "#a578ff", P);
  ellipse(c, 111, 209, 39, 19, "#a578ff", P);
  c.strokeStyle = P;
  c.lineWidth = 31;
  c.beginPath();
  c.moveTo(-112, 48);
  c.quadraticCurveTo(-160, 90, -185, 33);
  c.moveTo(110, 48);
  c.quadraticCurveTo(
    175,
    75,
    184,
    state === "reveal" ? -63 : state === "wrong" ? 110 : 7,
  );
  c.stroke();
  c.strokeStyle = "#ae78ff";
  c.lineWidth = 20;
  c.stroke();
  ellipse(c, -187, 22, 20, 24, "#bc8cff", P);
  ellipse(
    c,
    185,
    state === "reveal" ? -69 : state === "wrong" ? 103 : 1,
    23,
    24,
    "#bc8cff",
    P,
  );
  c.beginPath();
  c.moveTo(-120, -43);
  c.quadraticCurveTo(-157, -140, -84, -104);
  c.lineTo(-68, -68);
  c.quadraticCurveTo(0, -115, 69, -65);
  c.quadraticCurveTo(135, -154, 136, -65);
  c.quadraticCurveTo(184, 92, 100, 158);
  c.quadraticCurveTo(0, 211, -103, 155);
  c.quadraticCurveTo(-160, 97, -120, -43);
  c.closePath();
  c.fillStyle = "#9c64fb";
  c.strokeStyle = P;
  c.lineWidth = 9;
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-101, -70);
  c.lineTo(-110, -107);
  c.lineTo(-81, -88);
  c.fillStyle = "#d1a7ff";
  c.fill();
  ellipse(c, -62, 135, 30, 11, "#b17fff");
  ellipse(c, 72, 132, 30, 11, "#b17fff");
  const blink = Math.sin(t * 1.17) > 0.993;
  const eyeH = blink ? 5 : state === "surprised" ? 78 : 68;
  ellipse(c, -52, 13, 47, eyeH, "#fff", P);
  ellipse(c, 53, 13, 47, eyeH, "#fff", P);
  if (!blink) {
    const looking = state === "countdown" ? -8 : 0;
    ellipse(c, -42, 15 + looking, 21, 30, P);
    ellipse(c, 43, 15 + looking, 21, 30, P);
    ellipse(c, -34, 4 + looking, 7, 10, "#fff");
    ellipse(c, 51, 4 + looking, 7, 10, "#fff");
  }
  c.lineWidth = 10;
  c.strokeStyle = P;
  c.beginPath();
  c.moveTo(-89, -67);
  c.quadraticCurveTo(-61, -82, -25, -64);
  c.moveTo(21, -63);
  c.quadraticCurveTo(55, state === "countdown" ? -96 : -79, 88, -63);
  c.stroke();
  const opening =
    mouth > 0.01
      ? 10 + Math.min(1, mouth) * 65
      : state === "surprised"
        ? 36
        : 7;
  ellipse(c, 0, 97, 39, opening, P);
  if (opening > 15) {
    ellipse(c, 0, 97 + opening * 0.4, 24, opening * 0.3, "#f08dc8");
    rr(c, -23, 97 - opening + 3, 46, 13, 4, "white");
  }
  ellipse(c, -94, 75, 17, 9, "#ea8acb90");
  ellipse(c, 94, 75, 17, 9, "#ea8acb90");
  if (state === "countdown") {
    c.beginPath();
    c.moveTo(111, 72);
    c.quadraticCurveTo(145, 129, 37, 133);
    c.strokeStyle = P;
    c.lineWidth = 29;
    c.stroke();
    c.strokeStyle = "#ae78ff";
    c.lineWidth = 18;
    c.stroke();
    ellipse(c, 31, 133, 20, 19, "#bc8cff", P);
  }
  if (state === "wrong") {
    text(c, "…", 0, -132, 47, "#f7df65", 800);
    c.beginPath();
    c.moveTo(-23, 99);
    c.quadraticCurveTo(0, 83, 23, 99);
    c.strokeStyle = "#e8bdff";
    c.lineWidth = 4;
    c.stroke();
  }
  c.restore();
}
function emoji(
  c: C,
  x: number,
  y: number,
  wink: boolean,
  reveal: boolean,
  t: number,
) {
  if (reveal) {
    ellipse(
      c,
      x,
      y,
      94 + Math.sin(t * 6) * 4,
      94 + Math.sin(t * 6) * 4,
      "#eaff6030",
    );
    c.strokeStyle = "#f7ff61";
    c.lineWidth = 9;
    c.beginPath();
    c.arc(x, y, 86 + Math.sin(t * 6) * 4, 0, Math.PI * 2);
    c.stroke();
  }
  ellipse(c, x, y, 63, 63, "#ffc935", "#e49a16");
  ellipse(c, x - 18, y - 7, 6, 9, "#4c2607");
  if (wink) {
    c.beginPath();
    c.moveTo(x + 10, y - 6);
    c.quadraticCurveTo(x + 22, y - 16, x + 31, y - 5);
    c.strokeStyle = "#4c2607";
    c.lineWidth = 6;
    c.lineCap = "round";
    c.stroke();
  } else ellipse(c, x + 21, y - 7, 6, 9, "#4c2607");
  c.beginPath();
  c.arc(x, y + 6, 29, 0.1, Math.PI - 0.1);
  c.fillStyle = "#70370c";
  c.fill();
  c.beginPath();
  c.moveTo(x - 25, y + 10);
  c.lineTo(x + 25, y + 10);
  c.strokeStyle = "#fff5d1";
  c.lineWidth = 7;
  c.stroke();
}
function room(c: C, reveal: boolean, t: number) {
  rr(c, 101, 564, 878, 666, 30, "#f1def9", P, 8);
  rr(c, 114, 1045, 850, 170, 0, "#be9edc");
  // picture frames, window, sofa, lamp, book shelf
  rr(c, 154, 631, 231, 241, 10, "#9c74d3", P);
  rr(c, 168, 646, 203, 212, 3, "#98e3e8");
  c.strokeStyle = "#ede1ff";
  c.lineWidth = 13;
  c.beginPath();
  c.moveTo(267, 650);
  c.lineTo(267, 858);
  c.moveTo(171, 752);
  c.lineTo(372, 752);
  c.stroke();
  rr(c, 474, 633, 151, 164, 12, "#ffe487", P);
  star(c, 549, 709, 40, "#b778ef");
  rr(c, 719, 623, 195, 284, 12, "#8059b1", P);
  for (let r = 0; r < 3; r++) {
    rr(c, 731, 637 + r * 84, 170, 13, 2, "#cdafe8");
    for (let j = 0; j < 4; j++)
      rr(
        c,
        745 + j * 33,
        660 + r * 84,
        22,
        49,
        3,
        ["#ffce67", "#c3eff0", "#f591ac", "#aa98ee"][j],
      );
  }
  rr(c, 261, 949, 480, 182, 37, "#a970e2", P);
  rr(c, 300, 906, 198, 160, 26, "#c597f2", P);
  rr(c, 505, 906, 196, 160, 26, "#c597f2", P);
  rr(c, 230, 975, 92, 173, 22, "#b480eb", P);
  rr(c, 688, 975, 92, 173, 22, "#b480eb", P);
  c.strokeStyle = P;
  c.lineWidth = 12;
  c.beginPath();
  c.moveTo(185, 862);
  c.lineTo(185, 1110);
  c.stroke();
  c.beginPath();
  c.moveTo(136, 864);
  c.lineTo(236, 864);
  c.lineTo(213, 791);
  c.lineTo(160, 791);
  c.closePath();
  c.fillStyle = "#ffd75c";
  c.fill();
  c.stroke();
  ellipse(c, 185, 1122, 51, 12, P);
  ellipse(c, 813, 1171, 109, 18, "#62438640");
  star(c, 864, 994, 24, "#ffda48");
  c.strokeStyle = "#336855";
  c.lineWidth = 13;
  c.beginPath();
  c.moveTo(850, 1120);
  c.lineTo(843, 891);
  c.moveTo(842, 999);
  c.lineTo(790, 947);
  c.moveTo(845, 965);
  c.lineTo(899, 910);
  c.stroke();
  ellipse(c, 791, 945, 42, 20, "#64bca0", P);
  ellipse(c, 884, 909, 41, 22, "#71cfb2", P);
  ellipse(c, 840, 884, 24, 42, "#68c5a4", P);
  ellipse(c, 812, 999, 39, 20, "#86d3ae");
  rr(c, 796, 1077, 107, 109, 17, "#f9bd66", P);
  if (reveal) {
    c.save();
    c.translate(861, 995);
    c.rotate(-0.3);
    c.strokeStyle = P;
    c.lineWidth = 28;
    c.beginPath();
    c.moveTo(50, 60);
    c.lineTo(107, 137);
    c.stroke();
    c.strokeStyle = "#6cebee";
    c.lineWidth = 20;
    c.stroke();
    ellipse(
      c,
      0,
      0,
      67 + Math.sin(t * 5) * 3,
      67 + Math.sin(t * 5) * 3,
      "#ffffff15",
      "#f8eb62",
    );
    c.restore();
  }
}
export function drawShow(
  c: C,
  t: number,
  challenges: Challenge[],
  s: Settings,
  mouth = 0,
) {
  const { index, local, phase, remaining } = sceneAt(t, s);
  const item = challenges[Math.min(index, 2)];
  const reveal = phase === "reveal";
  const cyan = s.theme === "Cyan arcade";
  const yellow = s.theme === "Golden hour";
  const bg = c.createLinearGradient(0, 0, 1080, 1920);
  bg.addColorStop(0, cyan ? "#10374a" : yellow ? "#472756" : "#33105e");
  bg.addColorStop(0.5, cyan ? "#0c485a" : yellow ? "#673588" : "#542399");
  bg.addColorStop(1, "#241048");
  c.fillStyle = bg;
  c.fillRect(0, 0, 1080, 1920);
  const motion = s.intensity / 65;
  for (let i = 0; i < 26; i++) {
    const x = (i * 173 + Math.sin(t * 0.4 + i) * 23 * motion) % 1080;
    const y = (i * 293 + t * 13 * motion) % 1920;
    c.save();
    c.translate(x, y);
    c.rotate(t * 0.12 * motion + i);
    if (i % 3 === 0) {
      rr(c, -22, -22, 44, 44, 8, "#ffffff0a", "#c7a7ff20", 4);
    } else if (i % 3 === 1) ellipse(c, 0, 0, 6, 6, "#e3c8ff65");
    else star(c, 0, 0, 14, "#d3b9ff20");
    c.restore();
  }
  // safe-area brand and level marker
  rr(c, 72, 81, 258, 70, 35, "#ffffff12", "#ffffff22", 2);
  text(c, "MIND TRAP", 201, 128, 30, "#fff", 800);
  rr(c, 756, 81, 252, 70, 35, "#200c45", "#9874ca", 2);
  text(
    c,
    index === 3 ? "YOUR SCORE" : `LEVEL 0${index + 1}`,
    882,
    127,
    28,
    "#e9d9ff",
    700,
  );
  if (index === 3) {
    text(c, "TRAP", 540, 426, 155, "#fff", 900);
    text(c, "COMPLETE!", 540, 596, 132, "#f5ef67", 900);
    mascot(c, 540, 1000, 1.8, t, mouth, "reveal", s.intensity);
    text(c, "How many did", 540, 1544, 64, "#fff", 800);
    text(c, "you get right?", 540, 1628, 64, "#fff", 800);
    rr(c, 190, 1720, 700, 104, 32, "#f3eb68", P, 7);
    text(c, "COMMENT YOUR SCORE ↓", 540, 1787, 38, P, 800);
    return;
  }
  const title = item.title;
  const titleLines = title.length > 22;
  lines(c, title, 540, 273, titleLines ? 72 : 79, 920, "#fff", 900);
  text(
    c,
    phase === "intro"
      ? index === 0
        ? "BET YOU CAN’T GET ALL 3!"
        : "READY FOR THE NEXT TRAP?"
      : reveal
        ? "DID YOU GET IT?"
        : "YOU’VE GOT THIS!",
    540,
    titleLines ? 455 : 404,
    28,
    "#ddc7f9",
    600,
  );
  c.save();
  const entrance = Math.min(1, Math.max(0, local) / 0.45);
  const revealAge = local - 5.5 - s.countdown;
  const zoom =
    reveal && revealAge < 0.5
      ? 1 + Math.sin((Math.max(0, revealAge) / 0.5) * Math.PI) * 0.035
      : 0.96 + 0.04 * entrance;
  c.translate(540, 885);
  c.scale(zoom, zoom);
  c.translate(-540, -885);
  c.globalAlpha = 0.72 + 0.28 * entrance;
  rr(c, 76, 504, 928, 762, 43, "#27104799", "#bb92ed50", 3);
  if (item.type === "Spot the difference") {
    for (let i = 0; i < 16; i++)
      emoji(
        c,
        234 + (i % 4) * 203,
        659 + Math.floor(i / 4) * 164,
        i === item.odd,
        reveal && i === item.odd,
        t,
      );
  } else if (item.type === "Hidden object") room(c, reveal, t);
  else if (item.type === "Visual logic") {
    text(c, "FOLLOW THE PATTERN", 540, 620, 31, "#d3bcf3");
    for (let i = 0; i < 6; i++)
      shape(c, i % 3, 230 + (i % 3) * 309, 763 + Math.floor(i / 3) * 190, 64);
    rr(c, 193, 1055, 693, 142, 27, "#ffffff0e", "#9976cc", 3);
    text(c, "?", 540, 1158, 100, "#fff", 900);
    if (reveal) {
      rr(c, 423, 1045, 234, 157, 25, "#f5ec6140", "#f5ec61", 7);
      shape(c, 0, 540, 1124, 54);
    }
  } else if (item.type === "Memory challenge") {
    text(
      c,
      phase === "intro" ? "REMEMBER THESE SHAPES" : "WHICH SHAPE DISAPPEARED?",
      540,
      636,
      32,
    );
    for (let i = 0; i < 3; i++) {
      if (phase === "intro" || i !== 1 || reveal)
        shape(c, i, 270 + i * 270, 880, 70);
    }
    if (reveal) text(c, "THE TRIANGLE!", 540, 1160, 45, "#f9eb65");
  } else if (item.type === "Mathematical traps") {
    text(c, "ORDER MATTERS", 540, 654, 35, "#d7b9f4");
    text(c, "6 + 3 × 2 = ?", 540, 880, 81, "#fff", 800);
    text(
      c,
      reveal ? "12 — multiply first!" : "9       12       18",
      540,
      1100,
      55,
      reveal ? "#f9eb65" : "#a9eff2",
    );
  } else {
    text(c, "WHICH IS HEAVIER?", 540, 665, 42);
    text(c, "1 kg of feathers", 540, 850, 48, "#b2eff3");
    text(c, "OR", 540, 950, 34, "#d5baf4");
    text(c, "1 kg of steel", 540, 1050, 48, "#efdbff");
    if (reveal) text(c, "THEY WEIGH THE SAME!", 540, 1170, 40, "#f9eb65");
  }
  c.restore();
  // Timer and instructions
  if (reveal) {
    rr(c, 133, 1315, 814, 114, 32, "#f2eb67", P, 7);
    text(c, item.answer, 540, 1387, 42, P, 800);
    lines(c, item.explanation, 540, 1494, 30, 880, "#edddff", 500);
  } else {
    const count = phase === "countdown" ? remaining : s.countdown;
    const frac =
      phase === "countdown"
        ? Math.max(0, (s.countdown - (local - 5.5)) / s.countdown)
        : 1;
    rr(c, 154, 1328, 772, 14, 7, "#ffffff1c");
    rr(c, 154, 1328, 772 * frac, 14, 7, "#eaf167");
    const pulse =
      phase === "countdown"
        ? 1 + Math.max(0, 0.18 - ((local - 5.5) % 1)) * 0.25
        : 1;
    ellipse(c, 540, 1445, 71 * pulse, 71 * pulse, "#f6ed62", P);
    text(c, String(count), 540, 1475, 84, P, 900);
    lines(c, item.prompt, 540, 1581, 30, 865, "#edddff", 500);
  }
  mascot(c, 540, 1705, 0.88, t, mouth, phase, s.intensity);
  if (reveal) {
    for (let i = 0; i < 35; i++) {
      const a = i * 2.399;
      const xx =
        540 + Math.cos(a) * (130 + (((local - 10.5) * 60 + i * 7) % 520));
      const yy =
        1700 + Math.sin(a) * (200 + (((local - 10.5) * 50 + i * 9) % 480));
      if (yy < 1560) continue;
      c.save();
      c.translate(xx, yy);
      c.rotate(t + i);
      rr(c, 0, 0, 12, 27, 3, ["#f9ef66", "#7ceef1", "#c58cff"][i % 3]);
      c.restore();
    }
  }
}
