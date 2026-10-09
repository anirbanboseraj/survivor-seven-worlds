const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const $ = (id) => document.getElementById(id);
const W = canvas.width,
  H = canvas.height,
  groundY = 452,
  GRAVITY = 0.72;
const worlds = [
  {
    name: "Dark Forest",
    sky: "#172b36",
    far: "#25483f",
    near: "#17362f",
    ground: "#263d2d",
    accent: "#9bff91",
    enemy: "WOLF",
    count: 3,
    hp: 2,
    speed: 1.0,
  },
  {
    name: "Medieval City",
    sky: "#342a3b",
    far: "#65505b",
    near: "#443344",
    ground: "#51414a",
    accent: "#ffd27a",
    enemy: "GUARD",
    count: 4,
    hp: 3,
    speed: 1.15,
  },
  {
    name: "Modern City",
    sky: "#28394b",
    far: "#52677a",
    near: "#354858",
    ground: "#303d4b",
    accent: "#76d8ff",
    enemy: "INFECTED",
    count: 4,
    hp: 3,
    speed: 1.3,
  },
  {
    name: "Cyber District",
    sky: "#171b43",
    far: "#39356e",
    near: "#25204f",
    ground: "#262342",
    accent: "#ff79ed",
    enemy: "DRONE",
    count: 5,
    hp: 4,
    speed: 1.45,
  },
  {
    name: "Frozen Outpost",
    sky: "#34536a",
    far: "#8aa9b8",
    near: "#537b91",
    ground: "#d6e6e8",
    accent: "#b8f5ff",
    enemy: "RAIDER",
    count: 5,
    hp: 4,
    speed: 1.55,
  },
  {
    name: "The Inferno",
    sky: "#431d28",
    far: "#813b36",
    near: "#562b32",
    ground: "#39262d",
    accent: "#ffb347",
    enemy: "BRUTE",
    count: 5,
    hp: 5,
    speed: 1.7,
  },
  {
    name: "Final Fortress",
    sky: "#171823",
    far: "#383847",
    near: "#252633",
    ground: "#292b35",
    accent: "#ff5e72",
    enemy: "OVERLORD",
    count: 1,
    hp: 18,
    speed: 1.25,
    boss: true,
  },
];
let keys = {},
  state = "title",
  level = 0,
  score = 0,
  enemies = [],
  pickups = [],
  particles = [],
  worldTime = 0,
  messageTimer = 0;
const portal = { x: W - 76, y: groundY - 66, w: 40, h: 66 };
const player = {
  x: 80,
  y: groundY - 58,
  w: 34,
  h: 58,
  vx: 0,
  vy: 0,
  speed: 4.5,
  jump: 14,
  health: 100,
  maxHealth: 100,
  facing: 1,
  attackTimer: 0,
  attackCooldown: 0,
  invincible: 0,
  onGround: true,
  jumpHeld: false,
};
function updateHud() {
  $("levelText").textContent = `${level + 1} / 7 — ${worlds[level].name}`;
  $("healthText").textContent =
    `${Math.max(0, Math.ceil(player.health))} / 100`;
  $("healthBar").style.width = `${Math.max(0, player.health)}%`;
  $("healthBar").style.background =
    player.health <= 30
      ? "linear-gradient(90deg,#ff405a,#ff956d)"
      : "linear-gradient(90deg,#5df0a8,#c8ff7a)";
  $("scoreText").textContent = String(score).padStart(4, "0");
}
function showOverlay(title, message, buttonText) {
  $("overlayTitle").textContent = title;
  $("overlayMessage").textContent = message;
  $("start").textContent = buttonText;
  $("overlay").classList.remove("hidden");
}
function resetGame() {
  level = 0;
  score = 0;
  player.health = 100;
  player.x = 80;
  player.y = groundY - player.h;
  player.vx = player.vy = 0;
  player.facing = 1;
  player.attackTimer = player.attackCooldown = 0;
  startLevel();
  state = "playing";
  $("overlay").classList.add("hidden");
}
function startLevel() {
  const w = worlds[level];
  player.x = 80;
  player.y = groundY - player.h;
  player.vx = player.vy = 0;
  player.invincible = 60;
  enemies = [];
  pickups = [];
  particles = [];
  portal.x = W - 76;
  for (let i = 0; i < w.count; i++) {
    let boss = !!w.boss;
    enemies.push({
      x: boss ? 690 : 300 + i * Math.min(115, 500 / w.count),
      y: groundY - (boss ? 92 : 48),
      w: boss ? 72 : 34,
      h: boss ? 92 : 48,
      hp: w.hp,
      maxHp: w.hp,
      speed: w.speed,
      damage: boss ? 18 : 8 + Math.floor(level / 2),
      boss,
      hitFlash: 0,
      attackWait: 0,
    });
  }
  if (level < 6) {
    pickups.push({ x: 230, y: groundY - 28, taken: false });
    if (level >= 2) pickups.push({ x: 510, y: groundY - 28, taken: false });
  }
  updateHud();
}
function burst(x, y, color, amount) {
  for (let i = 0; i < amount; i++)
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.8) * 6,
      life: 18 + Math.random() * 14,
      color,
      size: 2 + Math.random() * 4,
    });
}
function attack() {
  if (state !== "playing" || player.attackCooldown > 0) return;
  player.attackTimer = 14;
  player.attackCooldown = 28;
  for (const e of enemies) {
    let dx = e.x + e.w / 2 - (player.x + player.w / 2),
      inFront = Math.sign(dx || player.facing) === player.facing;
    if (
      Math.abs(dx) < 68 &&
      Math.abs(e.y + e.h / 2 - (player.y + player.h / 2)) < 62 &&
      inFront
    ) {
      e.hp--;
      e.hitFlash = 9;
      e.x += player.facing * 12;
      burst(e.x + e.w / 2, e.y + e.h / 2, worlds[level].accent, 7);
      if (e.hp <= 0) {
        score += e.boss ? 500 : 100;
        burst(e.x + e.w / 2, e.y + e.h / 2, "#fff0a8", 18);
      }
    }
  }
  enemies = enemies.filter((e) => e.hp > 0);
  updateHud();
}
function update() {
  if (state !== "playing") return;
  worldTime++;
  if (player.attackTimer > 0) player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;
  if (player.invincible > 0) player.invincible--;
  const left = keys.ArrowLeft || keys.a || keys.A,
    right = keys.ArrowRight || keys.d || keys.D,
    jump = keys.ArrowUp || keys.w || keys.W || keys[" "];
  player.vx = 0;
  if (left) {
    player.vx = -player.speed;
    player.facing = -1;
  }
  if (right) {
    player.vx = player.speed;
    player.facing = 1;
  }
  player.x = Math.max(8, Math.min(W - player.w - 8, player.x + player.vx));
  if (jump && player.onGround && !player.jumpHeld) {
    player.vy = -player.jump;
    player.onGround = false;
  }
  player.jumpHeld = !!jump;
  player.vy += GRAVITY;
  player.y += player.vy;
  if (player.y + player.h >= groundY) {
    player.y = groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }
  for (const e of enemies) {
    if (e.hp <= 0) continue;
    if (e.hitFlash > 0) e.hitFlash--;
    if (e.attackWait > 0) e.attackWait--;
    let dx = player.x + player.w / 2 - (e.x + e.w / 2);
    if (Math.abs(dx) > 38) e.x += Math.sign(dx) * e.speed;
    else if (e.attackWait <= 0 && player.invincible <= 0) {
      player.health -= e.damage;
      player.invincible = 55;
      e.attackWait = 65;
      burst(player.x + player.w / 2, player.y + 25, "#ff667c", 8);
      if (player.health <= 0) {
        player.health = 0;
        state = "gameover";
        updateHud();
        showOverlay(
          "YOU DIDN'T SURVIVE",
          `You reached ${worlds[level].name}. Score: ${score}. Try again and make it further.`,
          `Try Again`,
        );
        return;
      }
    }
    e.x = Math.max(4, Math.min(W - e.w - 4, e.x));
  }
  enemies = enemies.filter((e) => e.hp > 0);
  for (const p of pickups) {
    if (p.taken) continue;
    if (
      Math.abs(player.x + player.w / 2 - p.x) < 30 &&
      Math.abs(player.y + player.h / 2 - p.y) < 55
    ) {
      p.taken = true;
      player.health = Math.min(100, player.health + 25);
      score += 25;
      burst(p.x, p.y, "#71ffc4", 12);
    }
  }
  if (enemies.length === 0 && player.x + player.w > portal.x - 12) {
    if (level < 6) {
      level++;
      startLevel();
      messageTimer = 100;
    } else {
      state = "victory";
      showOverlay(
        "YOU SURVIVED ALL 7 WORLDS!",
        `The Overlord has fallen. Final score: ${score}. You are the ultimate survivor.`,
        "Play Again",
      );
      return;
    }
  }
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life--;
  }
  particles = particles.filter((p) => p.life > 0);
  updateHud();
}
function drawBackground() {
  const w = worlds[level],
    g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, w.sky);
  g.addColorStop(1, w.far);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = w.accent;
  ctx.beginPath();
  ctx.arc(790, 90, level === 5 ? 38 : 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = w.far;
  for (let i = 0; i < 12; i++) {
    let x = i * 90 - 15,
      h = 90 + ((i * 47 + level * 29) % 110);
    if ([0, 4, 5].includes(level)) {
      ctx.beginPath();
      ctx.moveTo(x - 20, groundY);
      ctx.lineTo(x + 35, groundY - h);
      ctx.lineTo(x + 90, groundY);
      ctx.fill();
    } else {
      ctx.fillRect(x, groundY - h, 60, h);
      if ([1, 2, 3, 6].includes(level)) {
        ctx.fillStyle = level === 3 ? "#ff79ed66" : "#101a2b66";
        for (let wy = groundY - h + 18; wy < groundY - 15; wy += 24)
          for (let wx = x + 10; wx < x + 52; wx += 19)
            ctx.fillRect(wx, wy, 7, 10);
        ctx.fillStyle = w.far;
      }
    }
  }
  ctx.fillStyle = w.near;
  for (let i = 0; i < 16; i++) {
    let x = i * 68 + ((worldTime * 0.15) % 68) - 68;
    if (level === 0) {
      ctx.fillRect(x + 25, groundY - 125, 10, 125);
      ctx.beginPath();
      ctx.moveTo(x - 10, groundY - 85);
      ctx.lineTo(x + 30, groundY - 185);
      ctx.lineTo(x + 75, groundY - 85);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 6, groundY - 125);
      ctx.lineTo(x + 30, groundY - 205);
      ctx.lineTo(x + 70, groundY - 125);
      ctx.fill();
    } else if (level === 4) {
      ctx.beginPath();
      ctx.moveTo(x, groundY);
      ctx.lineTo(x + 35, groundY - 100);
      ctx.lineTo(x + 70, groundY);
      ctx.fill();
    } else {
      ctx.fillRect(x, groundY - 65, 42, 65);
      ctx.fillRect(x + 12, groundY - 94, 18, 29);
    }
  }
  ctx.fillStyle = w.ground;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = w.accent;
  ctx.globalAlpha = 0.45;
  ctx.fillRect(0, groundY, W, 4);
  ctx.globalAlpha = 1;
  for (let x = 0; x < W; x += 42) {
    ctx.fillStyle = "#00000018";
    ctx.fillRect(x + ((level * 7) % 18), groundY + 18, 22, 4);
  }
  if (level === 5) {
    for (let i = 0; i < 8; i++) {
      let x = i * 135 + 20;
      ctx.fillStyle = "#ff6b35";
      ctx.beginPath();
      ctx.moveTo(x, groundY + 1);
      ctx.lineTo(x + 16, groundY - 20 - (i % 3) * 7);
      ctx.lineTo(x + 31, groundY + 1);
      ctx.fill();
    }
  }
}
function drawPlayer() {
  if (player.invincible > 0 && Math.floor(worldTime / 4) % 2 === 0) return;
  let x = player.x,
    y = player.y;
  ctx.fillStyle = "#d84e61";
  ctx.fillRect(x + (player.facing > 0 ? 3 : 19), y + 18, 13, 28);
  ctx.fillStyle = "#202b3b";
  ctx.fillRect(x + 5, y + 42, 9, 16);
  ctx.fillRect(x + 20, y + 42, 9, 16);
  ctx.fillStyle = "#4aa4a5";
  ctx.fillRect(x + 4, y + 17, 26, 28);
  ctx.fillStyle = "#e6c98b";
  ctx.fillRect(x + 4, y + 34, 26, 5);
  ctx.fillStyle = "#efbd91";
  ctx.fillRect(x + 7, y + 2, 21, 18);
  ctx.fillStyle = "#2b2530";
  ctx.fillRect(x + 6, y, 23, 7);
  ctx.fillStyle = "#17202b";
  ctx.fillRect(x + (player.facing > 0 ? 23 : 9), y + 10, 3, 3);
  if (player.attackTimer > 0) {
    ctx.strokeStyle = "#eafcff";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    let sx = x + (player.facing > 0 ? 28 : 6),
      sy = y + 29;
    ctx.arc(
      sx + player.facing * 18,
      sy - 2,
      28,
      player.facing > 0 ? -1.05 : 2.1,
      player.facing > 0 ? 0.75 : 4.2,
      player.facing < 0,
    );
    ctx.stroke();
    ctx.strokeStyle = worlds[level].accent;
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#dbe8f1";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + (player.facing > 0 ? 27 : 7), y + 27);
    ctx.lineTo(x + (player.facing > 0 ? 42 : -8), y + 17);
    ctx.stroke();
  }
}
function drawEnemy(e) {
  let x = e.x,
    y = e.y,
    w = worlds[level],
    color =
      e.hitFlash > 0
        ? "#fff"
        : e.boss
          ? "#8b344b"
          : [
              "#75946a",
              "#b08b62",
              "#7e8e9e",
              "#9e61c7",
              "#8aaeb7",
              "#c85c3b",
              "#b64d65",
            ][level];
  ctx.fillStyle = "#0005";
  ctx.fillRect(x - 4, groundY - 4, e.w + 8, 8);
  ctx.fillStyle = color;
  ctx.fillRect(x + 3, y + 13, e.w - 6, e.h - 14);
  ctx.fillStyle = e.boss ? "#d9a1a1" : "#c99b79";
  ctx.fillRect(x + e.w * 0.2, y, e.w * 0.6, e.boss ? 30 : 17);
  ctx.fillStyle = w.accent;
  ctx.fillRect(x + e.w * 0.28, y + 7, 5, 4);
  ctx.fillRect(x + e.w * 0.62, y + 7, 5, 4);
  ctx.fillStyle = color;
  ctx.fillRect(x - 5, y + 20, 9, e.h * 0.38);
  ctx.fillRect(x + e.w - 4, y + 20, 9, e.h * 0.38);
  ctx.fillStyle = "#20202b";
  ctx.fillRect(x + 5, y + e.h - 10, 10, 10);
  ctx.fillRect(x + e.w - 15, y + e.h - 10, 10, 10);
  ctx.fillStyle = "#151820";
  ctx.fillRect(x - 4, y - 13, e.w + 8, 6);
  ctx.fillStyle = e.boss ? "#ff4567" : "#7df9c5";
  ctx.fillRect(x - 4, y - 13, (e.w + 8) * Math.max(0, e.hp / e.maxHp), 6);
  if (e.boss) {
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("OVERLORD", x + e.w / 2, y - 20);
  }
}
function drawPortal() {
  if (enemies.length) return;
  let pulse = Math.sin(worldTime * 0.09) * 5;
  ctx.save();
  ctx.shadowColor = worlds[level].accent;
  ctx.shadowBlur = 18 + pulse;
  ctx.strokeStyle = worlds[level].accent;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.ellipse(
    portal.x + portal.w / 2,
    portal.y + portal.h / 2,
    20 + pulse * 0.3,
    32 + pulse * 0.3,
    0,
    0,
    Math.PI * 2,
  );
  ctx.stroke();
  ctx.fillStyle = "#ffffff22";
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(
    level === 6 ? "EXIT" : "NEXT",
    portal.x + portal.w / 2,
    portal.y - 10,
  );
}
function drawPickups() {
  for (const p of pickups) {
    if (p.taken) continue;
    let bob = Math.sin(worldTime * 0.08 + p.x) * 4;
    ctx.fillStyle = "#71ffc4";
    ctx.fillRect(p.x - 10, p.y - 13 + bob, 20, 25);
    ctx.fillStyle = "#eafff7";
    ctx.fillRect(p.x - 4, p.y - 8 + bob, 8, 14);
    ctx.fillStyle = "#2d986f";
    ctx.fillRect(p.x - 4, p.y - 18 + bob, 8, 5);
    ctx.fillStyle = "#dffff1";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("+HP", p.x, p.y + 25 + bob);
  }
}
function draw() {
  drawBackground();
  drawPickups();
  drawPortal();
  enemies.forEach(drawEnemy);
  drawPlayer();
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life / 20);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  if (messageTimer > 0 && state === "playing") {
    messageTimer--;
    ctx.fillStyle = "#06101dcc";
    ctx.fillRect(W / 2 - 190, 30, 380, 52);
    ctx.fillStyle = worlds[level].accent;
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      `WORLD ${level + 1}: ${worlds[level].name.toUpperCase()}`,
      W / 2,
      63,
    );
  }
  if (state === "playing" && enemies.length) {
    ctx.fillStyle = "#07101a9c";
    ctx.fillRect(18, 18, 180, 30);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`ENEMIES LEFT: ${enemies.length}`, 30, 38);
  }
}
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
window.addEventListener("keydown", (e) => {
  if (["ArrowLeft", "ArrowRight", "ArrowUp", " "].includes(e.key))
    e.preventDefault();
  keys[e.key] = true;
  if (e.key === "j" || e.key === "J") attack();
  if (e.key === "r" || e.key === "R") resetGame();
  if (state === "title" && (e.key === "Enter" || e.key === " ")) resetGame();
});
window.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});
$("start").addEventListener("click", resetGame);
$("restart").addEventListener("click", () => {
  state = "title";
  showOverlay(
    "SURVIVOR: SEVEN WORLDS",
    "Start a fresh run through seven dangerous worlds. Your score and health will reset.",
    "Start Adventure",
  );
});
updateHud();
loop();
