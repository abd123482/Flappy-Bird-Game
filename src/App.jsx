import "./App.css";
import birdGif from "./pictures/birds.png";
import React, { useEffect, useRef, useState } from "react";

function createGame() {
  const PIPE_WIDTH = 70;
  const PIPE_GAP = 180;

  class DoublePipe {
    constructor(x, gapHeight, screenHeight, gapY) {
      this.x = x;
      this.gapHeight = gapHeight;
      const MIN_MARGIN = 50;

      this.gapY =
        gapY !== undefined
          ? gapY
          : MIN_MARGIN + Math.random() * (screenHeight - gapHeight - MIN_MARGIN);

      this.topPipe = { x, y: 0, height: this.gapY, width: PIPE_WIDTH };

      const bottomY = Math.floor(this.gapY) + gapHeight;
      this.bottomPipe = {
        x,
        y: this.gapY + gapHeight,
        height: Math.max(0, screenHeight - bottomY),
        width: PIPE_WIDTH,
      };
    }

    static createInitialPipes(screenWidth, screenHeight) {
      const HORIZONTAL_GAP = Math.round(0.35 * screenWidth);
      const pipes = [];
      for (let i = 0; i < 3; i++) {
        const randomGapY = getRandomGapY(screenHeight, PIPE_GAP);
        pipes.push(
          new DoublePipe(
            screenWidth + i * HORIZONTAL_GAP,
            PIPE_GAP,
            screenHeight,
            randomGapY
          )
        );
      }
      return pipes;
    }
  }

  function getRandomGapY(screenHeight, gapHeight, minMargin = 50) {
    const minY = minMargin;
    const maxY = Math.max(minY, screenHeight - gapHeight - minMargin);
    return Math.floor(minY + Math.random() * (maxY - minY + 1));
  }

  const BASE_SPEED = 2;
  const MAX_SPEED = 9;
  const SPEED_INCREASE = 0.02;

  let pipes = [];
  let score = 0;

  function init(screenWidth, screenHeight) {
    pipes = DoublePipe.createInitialPipes(screenWidth, screenHeight);
    score = 0;
  }

  function movePipes(screenWidth, screenHeight) {
    const HORIZONTAL_GAP = Math.round(0.3 * screenWidth);
    const speed = Math.min(MAX_SPEED, BASE_SPEED + score * SPEED_INCREASE);

    pipes.forEach((pipe) => {
      pipe.x -= speed;
      pipe.topPipe.x = pipe.x;
      pipe.bottomPipe.x = pipe.x;
    });

    if (pipes.length && pipes[0].x + PIPE_WIDTH < 0) {
      pipes.shift();

      if (!pipes.length) {
        pipes = DoublePipe.createInitialPipes(screenWidth, screenHeight);
      } else {
        const lastPipe = pipes[pipes.length - 1];
        const newX = lastPipe.x + HORIZONTAL_GAP;
        const randomGapY = getRandomGapY(screenHeight, PIPE_GAP);
        pipes.push(new DoublePipe(newX, PIPE_GAP, screenHeight, randomGapY));
      }
    }
  }

  function getPipes() {
    return pipes;
  }
  function addScore(n = 1) {
    score += n;
  }
  function getScore() {
    return score;
  }
  return { init, movePipes, getPipes, addScore, getScore };
}
class Bird {
  constructor(x, y, height, width, gravity, jumpStrength) {
    this.x = x;
    this.y = y;
    this.height = height;
    this.width = width;
    this.velocity = 0;
    this.gravity = gravity;
    this.jumpStrength = jumpStrength;
  }
  update(dt, screenHeight) {
    this.velocity = Math.min(1000, this.velocity + this.gravity * dt );
    this.y += this.velocity * dt;

    const floor = screenHeight - this.height;
    if (this.y > floor - 20) { this.y = floor - 20; this.velocity = 0; }
  }
  flap() {
    this.velocity = -this.jumpStrength;
  }
}

export default function App() {
  const W = 800;
  const H = 500;

  const appRef = useRef(null);
  const rafRef = useRef(0);
  const birdRef = useRef(null);
  const [pipes, setPipes] = useState([]);
  const [birdY, setBirdY] = useState(H / 2 - 20);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  function intersectsInclusive(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax <= bx + bw + 40 &&
           ax + aw + 40 >= bx &&
           ay <= by + bh + 10 &&
           ay + ah + 40 >= by;
  }
  useEffect(() => {
  
    birdRef.current = new Bird(120, H / 2 - 20, 40, 40, 2000, 520);
    const app = createGame();
    appRef.current = app;
    app.init(W, H);
    setPipes(app.getPipes());
    setScore(0);

    let last = performance.now();
    const tick = (now) => {
  
      app.getPipes().forEach((p) => {
        if (!p.passed && p.x + p.topPipe.width < 120) { 
          app.addScore(1);
          setScore(app.getScore());
          p.passed = true;
        }
      });

      const dt = Math.min(0.03, (now - last) / 1000);
      last = now;

      app.movePipes(W, H);
      birdRef.current.update(dt, H);

      setPipes([...app.getPipes()]);
      setBirdY(birdRef.current.y);

      if (birdRef.current.y <= 10) {
        setGameOver(true);
        cancelAnimationFrame(rafRef.current);
        return;
      }

    if (birdRef.current.y + birdRef.current.height >= H - 22) {
     birdRef.current.y = H - birdRef.current.height - 22;
      setGameOver(true);
     cancelAnimationFrame(rafRef.current);
     return;
    }

      const birdBox = { x: 120, y: birdRef.current.y, w: 40, h: 40 };
      let hit = false;
      for (const p of app.getPipes()) {
        const top =    { x: p.topPipe.x,    y: 0,                 w: p.topPipe.width,    h: p.topPipe.height };
        const bottom = { x: p.bottomPipe.x, y: p.bottomPipe.y  , w: p.bottomPipe.width , h: p.bottomPipe.height };
        if (
          intersectsInclusive(
            birdBox.x, birdBox.y, birdBox.w, birdBox.h,
            top.x, top.y, top.w, top.h
          ) ||
          intersectsInclusive(
            birdBox.x, birdBox.y, birdBox.w, birdBox.h,
            bottom.x, bottom.y, bottom.w, bottom.h
          )
        ) {
          hit = true;
          break;
        }
      }

      if (hit) {
        console.log("Game Over: pipe touched");
        cancelAnimationFrame(rafRef.current);
        setGameOver(true);
      
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

 
    const onFlap = (e) => { e?.preventDefault?.(); birdRef.current?.flap(); };
    const keyHandler = (e) => { if (e.code === 'Space') { e.preventDefault(); onFlap(e); } };
    const area = document.querySelector('.game_area');
    const mouseHandler = (e) => onFlap(e);
    const touchHandler = (e) => { e.preventDefault(); onFlap(e); };

    window.addEventListener('keydown', keyHandler, { passive: false });
    area?.addEventListener('mousedown', mouseHandler);
    area?.addEventListener('touchstart', touchHandler, { passive: false });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', keyHandler);
      area?.removeEventListener('mousedown', mouseHandler);
      area?.removeEventListener('touchstart', touchHandler);
    };
  }, []);

  const restartGame = () => {
    const app = createGame();
    appRef.current = app;
    app.init(W, H);
    setPipes(app.getPipes());

    birdRef.current = new Bird(120, H / 2 - 20, 40, 40, 2000, 520);
    setBirdY(H / 2 - 20);
    setGameOver(false);
    setScore(0); 

    let last = performance.now();
    const tick = (now) => {
 
      app.getPipes().forEach((p) => {
        if (!p.passed && p.x + p.topPipe.width < 120) {
          app.addScore(1);
          setScore(app.getScore());
          p.passed = true;
        }
      });

      const dt = Math.min(0.03, (now - last) / 1500);
      last = now;

      app.movePipes(W, H);
      birdRef.current.update(dt, H);
      setPipes([...app.getPipes()]);
      setBirdY(birdRef.current.y);

      if (birdRef.current.y <= 0) {
        setGameOver(true);
        cancelAnimationFrame(rafRef.current);
        return;
      }

  if (birdRef.current.y + birdRef.current.height >= H - 30) {
  birdRef.current.y = H - birdRef.current.height - 30; 
  setGameOver(true);
  cancelAnimationFrame(rafRef.current);
  return; }

      const birdBox = { x: 120, y: birdRef.current.y, w: 40, h: 40 };
      for (const p of app.getPipes()) {
        const top = { x: p.topPipe.x, y: 0, w: p.topPipe.width -40 , h: p.topPipe.height };
        const bottom = { x: p.bottomPipe.x, y: p.bottomPipe.y, w: p.bottomPipe.width -40, h: p.bottomPipe.height };
        if (
          intersectsInclusive(birdBox.x, birdBox.y, birdBox.w, birdBox.h, top.x, top.y, top.w, top.h) ||
          intersectsInclusive(birdBox.x, birdBox.y, birdBox.w, birdBox.h, bottom.x, bottom.y, bottom.w, bottom.h)
        ) {
          setGameOver(true);
          cancelAnimationFrame(rafRef.current);
          return;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  return (
    <div
      className="game_container"
    >
      <div
        className="game_area"
        style={{
          position: "relative",
          width: 600,
          height: H,
          overflow: "hidden",
          background:
            "linear-gradient(180deg, rgba(101, 198, 255, 1) 0%, rgba(113, 203, 255, 1) 130%)",
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
        }}
      >
    <div className="score-display">{score}</div>


        <div
          className="bird"
          style={{
            position: "absolute",
            left: 120,
            top: birdY,
            width: 40,
            height: 40,
            zIndex: 2,
          }}
        >
          <img
            src={birdGif}
            alt="bird"
            style={{ width: 80, height: 70 }}
          />
        </div>

        {pipes.map((pipe, index) => (
          <div key={index}>
            <div
              className="pipe top-pipe"
              style={{
                position: "absolute",
                left: pipe.topPipe.x,
                top: 0,
                width: pipe.topPipe.width,
                height: pipe.topPipe.height,
                border: "2px solid #145a32",
                boxSizing: "border-box",
              }}
            />
            <div
              className="pipe bottom-pipe"
              style={{
                position: "absolute",
                left: pipe.bottomPipe.x,
                top: pipe.bottomPipe.y,
                width: pipe.bottomPipe.width,
                height: pipe.bottomPipe.height,
                border: "2px solid #145a32",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>
      {gameOver && (
        <div style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          fontWeight: "bold",
          zIndex: 10
        }}>
          <div>Game Over</div>
          <button
            onClick={restartGame}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              fontSize: 18,
              borderRadius: 8,
              border: "none",
              cursor: "pointer"
            }}
          >
            Restart Game
          </button>
        </div>
      )}
      <footer className="site-footer" role="contentinfo">
  <i className="fa-regular fa-copyright" aria-hidden="true"></i>
  <span className="by">by</span>
  <span className="brand">NAS.rO</span>
</footer>
    </div>
  );
}
