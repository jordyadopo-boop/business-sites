/** Fond de neurones animés (canvas 2D, déterministe en t), partagé par la vidéo de présentation et les shorts TikTok. */
// remplit les parties noires autour du cerveau ; field(t) dessine l'image au temps t
export function neuronField(cv, W, H, VERT) {
  const cx = cv.getContext('2d');
  cv.width = W; cv.height = H;
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const P = Array.from({ length: VERT ? 150 : 170 }, () => ({ x: rnd() * W, y: rnd() * H, ax: 20 + rnd() * 60, ay: 20 + rnd() * 60, fx: .05 + rnd() * .12, fy: .05 + rnd() * .12, p: rnd() * 6.3, r: .8 + rnd() * 2.2, z: .35 + rnd() * .65 }));
  const R = VERT ? 230 : 210;
  return (t) => {
    cx.clearRect(0, 0, W, H);
    const pos = P.map((q) => [q.x + Math.sin(t * q.fx + q.p) * q.ax, q.y + Math.cos(t * q.fy + q.p * 1.3) * q.ay]);
    cx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) {
      const dx = pos[i][0] - pos[j][0], dy = pos[i][1] - pos[j][1], d = Math.hypot(dx, dy);
      if (d > R) continue;
      const a = (1 - d / R) * Math.min(P[i].z, P[j].z);
      cx.strokeStyle = `rgba(220,225,235,${a * .6})`; cx.lineWidth = 1 + a * 1.2;
      cx.beginPath(); cx.moveTo(pos[i][0], pos[i][1]);
      // dendrite légèrement courbe
      cx.quadraticCurveTo((pos[i][0] + pos[j][0]) / 2 + dy * .12, (pos[i][1] + pos[j][1]) / 2 - dx * .12, pos[j][0], pos[j][1]); cx.stroke();
      // influx qui parcourt la connexion
      const k = ((t * .35 + (i * 7 + j * 13) % 17 / 17) % 1);
      if ((i + j) % 5 === 0 && a > .25) {
        const u = k, x = (1 - u) ** 2 * pos[i][0] + 2 * u * (1 - u) * ((pos[i][0] + pos[j][0]) / 2 + dy * .12) + u * u * pos[j][0];
        const y = (1 - u) ** 2 * pos[i][1] + 2 * u * (1 - u) * ((pos[i][1] + pos[j][1]) / 2 - dx * .12) + u * u * pos[j][1];
        const g = cx.createRadialGradient(x, y, 0, x, y, 9); g.addColorStop(0, `rgba(255,255,255,${.9 * a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        cx.fillStyle = g; cx.fillRect(x - 9, y - 9, 18, 18);
      }
    }
    P.forEach((q, i) => {
      const [x, y] = pos[i], pulse = .6 + .4 * Math.sin(t * 2 + q.p * 3), r = q.r * 4 * q.z;
      const g = cx.createRadialGradient(x, y, 0, x, y, r * 2.5); g.addColorStop(0, `rgba(255,255,255,${.85 * q.z * pulse})`); g.addColorStop(.3, `rgba(230,235,255,${.35 * q.z * pulse})`); g.addColorStop(1, 'rgba(230,235,255,0)');
      cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 2.5, 0, 6.3); cx.fill();
    });
  };
}
