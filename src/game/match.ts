import { clamp, moveToward, smoothFollow, Rng } from "../core/math";
import {
  courtProject,
  paddleWorld,
  contactDistance,
  PLAYFIELD,
} from "../core/court-view";
import { followPaddle } from "../core/paddle-follow";
import {
  difficulty,
  opponents,
  racketStats,
  type RacketId,
  type Side,
  type Spin,
  type Stage,
} from "../content";
import {
  masterFor,
  techniqueFor,
  type TechniqueKind,
} from "../content/techniques";
import { Tactics } from "./tactics";
import { INPUT_TUNING, MATCH_TUNING } from "../content/tuning";
import {
  advanceBall,
  COURT,
  other,
  planShot,
  predictAiContact,
  serve,
  validateShot,
  type Ball,
  type Collision,
} from "./physics";
export type Phase =
  | "READY"
  | "SERVING"
  | "RALLY"
  | "POINT_RESULT"
  | "MATCH_RESULT"
  | "PAUSED";
export interface MatchOptions {
  stage: Stage;
  seed: number;
  racket: RacketId;
  level: number;
  assist: boolean;
  expert?: boolean;
  training?: boolean;
  skills?: string[];
  daily?: boolean;
}
export interface MatchEvent {
  type:
    | "hit"
    | "bounce"
    | "net"
    | "point"
    | "finish"
    | "serve"
    | "let"
    | "target";
  side?: Side;
  text?: string;
  impact?: { speed: number; x: number; depth: number };
}
export interface InputIntent {
  targetX: number;
  targetDepth: number;
  positioned: boolean;
  dragging: boolean;
  movementAge: number;
  shotAge: number;
  aim: number;
  power: number;
  dropAge: number;
  freePaddle: boolean;
  paddleX: number;
  paddleY: number;
}
export class Match {
  phase: Phase = "READY";
  ball: Ball = serve("player");
  playerX = 0;
  playerDepth = COURT.playerY;
  paddleX = 195;
  paddleY = 560;
  previousPaddleX = 195;
  previousPaddleY = 560;
  paddleTilt = -0.12;
  previousPaddleTilt = -0.12;
  contactFlash = 0;
  contactX = 195;
  contactY = 400;
  aiX = 0;
  aiDepth = COURT.aiY;
  readonly tactics = new Tactics();
  bossTell = "";
  tellTime = 0;
  weakReturns = 0;
  smashes = 0;
  reversals = 0;
  private aiRecovery = 0;
  private aiShots = 0;
  private special = false;
  playerScore = 0;
  aiScore = 0;
  elapsed = 0;
  hits = 0;
  precise = 0;
  rallyHits = 0;
  bestRally = 0;
  misses = 0;
  feeds = 0;
  successes = 0;
  feedback = "准备发球";
  feedbackTime = 1;
  readonly input: InputIntent = {
    targetX: 0,
    targetDepth: COURT.playerY,
    positioned: false,
    dragging: false,
    movementAge: 99,
    shotAge: 99,
    aim: 0,
    power: 0.5,
    dropAge: 99,
    freePaddle: false,
    paddleX: 195,
    paddleY: 560,
  };
  readonly events: MatchEvent[] = [];
  readonly rng: Rng;
  readonly targetZone = { x: 0.38, y: 2.05, width: 0.48, height: 0.5 };
  readonly previousBall: Ball = serve("player");
  previousPlayerX = 0;
  previousPlayerDepth = COURT.playerY;
  previousAiX = 0;
  previousAiDepth = COURT.aiY;
  playerStroke = 0;
  aiStroke = 0;
  rallyContacts = 0;
  private timer = MATCH_TUNING.readySeconds;
  private beforePause: Phase = "READY";
  private lastHitter: Side = "player";
  private receiver: Side = "ai";
  private bounces = 0;
  private serving = true;
  private serveBounces = 0;
  private touchedNet = false;
  private pointDone = false;
  private aiDelay = 0;
  private aiTarget = 0;
  private aiDepthTarget = COURT.aiY;
  private aiPlanned = false;
  private aiMiss = false;
  private history: number[] = [];
  private accuracyPending = false;
  constructor(public readonly options: MatchOptions) {
    this.rng = new Rng(options.seed);
    this.ball.active = false;
    this.previousBall.active = false;
    if (options.stage.rule === "comeback" && !options.training)
      this.aiScore = 3;
    if (options.stage.rule === "zone")
      Object.assign(this.targetZone, {
        x: 0.36,
        y: 2.04,
        width: 0.72,
        height: 1.24,
      });
  }
  get master() {
    return masterFor(this.options.stage.cityId);
  }
  get isBoss() {
    return (
      this.options.stage.order === 6 ||
      !!this.options.stage.practice ||
      !!this.options.daily
    );
  }
  hasSkill(kind: TechniqueKind): boolean {
    return (this.options.skills ?? []).some(
      (id) => techniqueFor(id)?.kind === kind,
    );
  }
  get server(): Side {
    return Math.floor((this.playerScore + this.aiScore) / 2) % 2 === 0
      ? "player"
      : "ai";
  }
  get completed(): boolean {
    return this.phase === "MATCH_RESULT";
  }
  get won(): boolean {
    if (this.options.stage.practice || this.options.daily)
      return this.elapsed >= 30;
    return this.options.stage.mode === "match"
      ? this.playerScore > this.aiScore
      : this.options.stage.mode === "rally"
        ? this.bestRally >= 10
        : this.options.stage.mode === "rescue"
          ? this.successes >= 8 && this.misses <= 3
          : this.successes >= 6;
  }
  get stars(): number {
    if (!this.won) return 0;
    if (this.options.stage.practice || this.options.daily)
      return this.hits >= 10 ? 3 : this.hits >= 6 ? 2 : 1;
    const mode = this.options.stage.mode;
    return mode === "match"
      ? 1 + (this.aiScore <= 2 ? 1 : 0) + (this.precise > 0 ? 1 : 0)
      : mode === "rally"
        ? this.bestRally >= 20
          ? 3
          : this.bestRally >= 15
            ? 2
            : 1
        : mode === "rescue"
          ? this.successes >= 12
            ? 3
            : this.successes >= 10
              ? 2
              : 1
          : this.successes >= 10
            ? 3
            : this.successes >= 8
              ? 2
              : 1;
  }
  get stats() {
    return racketStats(this.options.racket, this.options.level);
  }
  get aiConfig() {
    return difficulty[clamp(this.options.stage.difficulty, 1, 6) - 1]!;
  }
  drag(x: number, moving = true): void {
    if (this.phase === "PAUSED" || this.completed) return;
    this.input.targetX = clamp(x, -0.72, 0.72);
    this.input.dragging = true;
    if (moving) this.input.movementAge = 0;
    if (moving) this.input.positioned = true;
  }
  moveDepth(y: number): void {
    if (this.phase === "PAUSED" || this.completed) return;
    if (this.input.targetDepth - y > 0.02) this.input.dropAge = 0;
    else if (y - this.input.targetDepth > 0.02) this.input.dropAge = 99;
    this.input.targetDepth = clamp(y, -0.2, 0.72);
  }
  movePaddle(x: number, y: number, moving = true): void {
    if (this.phase === "PAUSED" || this.completed) return;
    if (moving && this.input.freePaddle) {
      if (y - this.input.paddleY > 3) this.input.dropAge = 0;
      else if (y - this.input.paddleY < -4) this.input.dropAge = 99;
    }
    this.input.freePaddle = true;
    this.input.paddleX = clamp(x, PLAYFIELD.left, PLAYFIELD.right);
    this.input.paddleY = clamp(y, PLAYFIELD.top, PLAYFIELD.bottom);
    this.input.dragging = true;
    if (moving) {
      this.input.positioned = true;
      this.input.movementAge = 0;
    }
  }
  release(): void {
    this.input.dragging = false;
  }
  swipe(aim: number, power: number): void {
    if (this.phase === "PAUSED" || this.completed) return;
    this.input.aim = clamp(aim, -1, 1);
    this.input.power = clamp(power, 0, 1);
    this.input.shotAge = 0;
  }
  clearInput(): void {
    this.input.dragging = false;
    this.input.movementAge = 99;
    this.input.shotAge = 99;
    this.input.dropAge = 99;
    this.input.positioned = false;
  }
  pause(): void {
    if (this.phase === "PAUSED" || this.completed) return;
    this.beforePause = this.phase;
    this.phase = "PAUSED";
    this.clearInput();
  }
  resume(): void {
    if (this.phase !== "PAUSED") return;
    this.phase = this.beforePause;
    this.clearInput();
  }
  finishChallenge(): void {
    if (
      this.options.stage.mode === "rally" &&
      this.bestRally >= 10 &&
      !this.options.stage.practice
    )
      this.finish();
  }
  tick(dt: number): void {
    if (this.phase === "PAUSED" || this.completed) return;
    Object.assign(this.previousBall, this.ball);
    this.previousPlayerX = this.playerX;
    this.previousPlayerDepth = this.playerDepth;
    this.previousAiX = this.aiX;
    this.previousAiDepth = this.aiDepth;
    this.previousPaddleX = this.paddleX;
    this.previousPaddleY = this.paddleY;
    this.previousPaddleTilt = this.paddleTilt;
    this.contactFlash = Math.max(0, this.contactFlash - dt * 6);
    this.playerStroke = Math.max(0, this.playerStroke - dt * 4.8);
    this.aiStroke = Math.max(0, this.aiStroke - dt * 4.8);
    this.elapsed += dt;
    this.input.movementAge += dt;
    this.input.shotAge += dt;
    this.input.dropAge += dt;
    this.feedbackTime -= dt;
    this.tellTime = Math.max(0, this.tellTime - dt);
    this.aiRecovery = Math.max(0, this.aiRecovery - dt);
    const oldDepth = this.playerDepth;
    if (this.input.freePaddle) {
      this.paddleX = followPaddle(
        this.paddleX,
        this.input.paddleX,
        dt,
        INPUT_TUNING.screenMoveSpeed,
      );
      this.paddleY = followPaddle(
        this.paddleY,
        this.input.paddleY,
        dt,
        INPUT_TUNING.screenDepthSpeed,
      );
      const world = paddleWorld(this.paddleX, this.paddleY);
      this.playerX = world.x;
      this.playerDepth = world.depth;
    } else {
      this.playerX = smoothFollow(
        this.playerX,
        this.input.targetX,
        dt,
        INPUT_TUNING.playerMoveSpeed,
      );
      this.playerDepth = smoothFollow(
        this.playerDepth,
        this.input.targetDepth,
        dt,
        INPUT_TUNING.playerDepthSpeed,
      );
    }
    const horizontalSpeed =
      (this.paddleX - this.previousPaddleX) / Math.max(dt, 0.0001);
    this.paddleTilt = smoothFollow(
      this.paddleTilt,
      -0.12 + clamp(horizontalSpeed * 0.00055, -0.28, 0.28),
      dt,
      8,
      18,
    );
    if (
      (this.options.stage.mode === "rescue" ||
        this.options.stage.practice ||
        this.options.daily) &&
      !this.options.training &&
      this.elapsed >= 30
    ) {
      this.finish();
      return;
    }
    if (this.phase === "READY" || this.phase === "POINT_RESULT") {
      this.aiDepth = moveToward(
        this.aiDepth,
        COURT.aiY,
        this.aiConfig.speed * dt,
      );
      this.timer -= dt;
      if (this.timer <= 0) this.beginRally();
      return;
    }
    if (this.receiver === "ai") {
      this.aiDelay -= dt;
      if (this.aiDelay <= 0 && !this.aiPlanned) {
        const forecast = predictAiContact(this.ball);
        this.aiDepthTarget = clamp(forecast.depth, COURT.netY + 0.2, COURT.aiY);
        const error =
          this.options.stage.mode === "rally" ? 0 : this.aiConfig.error;
        this.aiTarget = clamp(
          forecast.x + this.rng.normal() * error,
          -1.18,
          1.18,
        );
        this.aiPlanned = true;
      }
      if (this.aiPlanned) {
        this.aiX = moveToward(
          this.aiX,
          this.aiTarget,
          this.aiConfig.speed * dt,
        );
        this.aiDepth = moveToward(
          this.aiDepth,
          this.aiDepthTarget,
          this.aiConfig.speed * dt,
        );
      }
    } else {
      this.aiX = moveToward(
        this.aiX,
        this.tactics.bias,
        this.aiConfig.speed * (this.aiRecovery > 0 ? 0.18 : 0.6) * dt,
      );
      this.aiDepth = moveToward(
        this.aiDepth,
        COURT.aiY,
        this.aiConfig.speed * 0.75 * dt,
      );
    }
    if (
      this.receiver === "ai" &&
      !this.serving &&
      this.bounces === 1 &&
      this.ball.active &&
      this.ball.vy > 0 &&
      this.ball.y > this.aiDepth &&
      this.ball.y - this.aiDepth < 0.18
    )
      this.collision("ai", this.ball);
    // 前挥的球拍也参与碰撞检测。
    if (
      this.receiver === "player" &&
      !this.serving &&
      this.bounces === 1 &&
      this.ball.active &&
      oldDepth < this.ball.y &&
      this.playerDepth >= this.ball.y
    )
      this.collision("player", this.ball);
    if (
      this.receiver === "player" &&
      !this.serving &&
      this.bounces === 1 &&
      this.ball.active &&
      this.ball.vy < 0 &&
      this.ball.y < this.playerDepth &&
      this.playerDepth - this.ball.y < 0.18
    )
      this.collision("player", this.ball);
    advanceBall(
      this.ball,
      dt,
      (e, b) => this.collision(e, b),
      this.playerDepth,
      this.input.freePaddle ? -1.45 : -0.48,
      this.aiDepth,
    );
    this.tryPaddleContact();
  }
  private tryPaddleContact(): void {
    if (
      !this.input.freePaddle ||
      this.receiver !== "player" ||
      this.serving ||
      this.bounces !== 1 ||
      !this.ball.active ||
      this.ball.vy >= 0 ||
      this.ball.z < 0.01
    )
      return;
    const manual =
      this.input.shotAge <=
      this.stats.window + INPUT_TUNING.bufferSeconds - 0.1;
    const assisted = this.options.assist && this.input.positioned;
    if (!manual && !assisted) return;
    const pos = courtProject(this.ball.x, this.ball.y, this.ball.z);
    // 同时检查球和拍的运动轨迹，避免快速挥拍穿过来球。
    const prev =
      this.previousBall.active &&
      this.previousBall.vy < 0 &&
      this.previousBall.z >= 0.02 &&
      this.ball.vz < this.previousBall.vz
        ? courtProject(
            this.previousBall.x,
            this.previousBall.y,
            this.previousBall.z,
          )
        : pos;
    const size = clamp(0.85 + (this.paddleY - 280) / 900, 0.8, 1.35);
    if (
      contactDistance(
        prev,
        pos,
        { x: this.previousPaddleX, y: this.previousPaddleY },
        { x: this.paddleX, y: this.paddleY },
        (assisted ? 36 : 27) * size,
        (assisted ? 40 : 32) * size,
      ) <= 1
    ) {
      this.contactX = pos.x;
      this.contactY = pos.y;
      this.contactFlash = 1;
      this.hit("player", manual);
    }
  }
  private emit(
    type: MatchEvent["type"],
    side?: Side,
    text?: string,
    impactSpeed?: number,
  ): void {
    const impact =
      type === "hit" || type === "bounce" || type === "net"
        ? {
            speed:
              impactSpeed ??
              (type === "bounce"
                ? Math.abs(this.ball.vz)
                : Math.hypot(this.ball.vx, this.ball.vy, this.ball.vz)),
            x: this.ball.x,
            depth: this.ball.y,
          }
        : undefined;
    this.events.push({ type, side, text, impact });
    if (text) {
      this.feedback = text;
      this.feedbackTime = 1.1;
    }
  }
  private beginRally(): void {
    const challenge =
      this.options.stage.mode !== "match" || this.options.training;
    const side = challenge ? "ai" : this.server;
    this.pointDone = false;
    this.serving = true;
    this.serveBounces = 0;
    this.touchedNet = false;
    this.bounces = 0;
    this.lastHitter = side;
    this.receiver = other(side);
    this.rallyHits = 0;
    this.rallyContacts = 0;
    this.tactics.reset();
    this.aiRecovery = 0;
    this.aiShots = 0;
    this.special = false;
    this.tellTime = 0;
    this.accuracyPending = false;
    this.ball = serve(side, this.rng.range(-0.42, 0.42));
    this.phase = "SERVING";
    if (this.options.stage.practice || this.options.daily) {
      const special = this.feeds % 3 === 1;
      const style = this.master.style;
      const targetX = this.rng.range(-0.36, 0.36);
      const targetY =
        special && (style === "short" || style === "slice") ? 1.05 : 0.62;
      this.ball = planShot(
        { x: this.aiX, y: 2.65, z: 0.48 },
        "ai",
        special && style === "body"
          ? clamp(this.playerX, -0.45, 0.45)
          : targetX,
        targetY,
        special && (style === "rush" || style === "body") ? 4.1 : 3.05,
        special && style === "slice" ? "slice" : "normal",
      );
      if (special && style === "sidespin")
        this.ball.sideKick = targetX >= 0 ? 0.6 : -0.6;
      if (special && style === "short") this.ball.drop = true;
      this.serving = false;
      this.lastHitter = "ai";
      this.receiver = "player";
      this.bossTell = special ? this.master.tell : "稳住拍面，接下一球";
      this.tellTime = 1.1;
    }
    this.input.shotAge = 99;
    this.aiDelay = this.aiConfig.delay;
    this.aiPlanned = false;
    this.aiMiss = false;
    this.emit(
      "serve",
      side,
      side === "player" ? "你发球 · 等待来球" : "对手发球 · 准备接球",
    );
  }
  private collision(event: Collision, b: Ball): void {
    if (this.pointDone || !b.active) return;
    if (event === "net") {
      if (b.z - COURT.radius <= COURT.netHeight) {
        this.touchedNet = true;
        this.emit("net", undefined, "触网");
        if (b.z + COURT.radius < COURT.netHeight - 0.025) {
          this.point(other(this.lastHitter), "回球下网");
          return;
        }
        b.vy *= 0.8;
        b.vx *= 0.8;
        b.z = COURT.netHeight + COURT.radius + 0.001;
        b.vz = Math.max(0.65, b.vz * 0.45);
      }
      return;
    }
    if (event === "table") {
      if (Math.abs(b.x) > COURT.halfWidth || b.y < 0 || b.y > COURT.length) {
        this.point(
          this.bounces > 0 ? this.lastHitter : other(this.lastHitter),
          this.bounces > 0 ? "未接到合法来球" : "回球出界",
        );
        return;
      }
      const half: Side = b.y < COURT.netY ? "player" : "ai";
      this.emit("bounce");
      if (this.serving) {
        const expected =
          this.serveBounces === 0 ? this.lastHitter : this.receiver;
        if (half !== expected) {
          this.point(other(this.lastHitter), "发球落台不合法");
          return;
        }
        this.serveBounces++;
        if (this.serveBounces === 2) {
          if (this.touchedNet) {
            this.ball.active = false;
            this.phase = "READY";
            this.timer = MATCH_TUNING.serveLetSeconds;
            this.emit("let", undefined, "发球擦网 · 重发");
            return;
          }
          this.serving = false;
          this.phase = "RALLY";
          this.bounces = 1;
        }
        return;
      }
      if (half !== this.receiver) {
        this.point(other(this.lastHitter), "回球未落对方半台");
        return;
      }
      this.bounces++;
      if (this.bounces >= 2) {
        this.point(this.lastHitter, "来球两次落台");
        return;
      }
      if (
        this.options.stage.rule === "zone" &&
        this.lastHitter === "player" &&
        b.x < 0 &&
        !this.options.training
      ) {
        this.point("ai", "回球未进金色半台");
        return;
      }
      if (this.accuracyPending) {
        const z = this.targetZone;
        if (
          Math.abs(b.x - z.x) <= z.width / 2 &&
          Math.abs(b.y - z.y) <= z.height / 2
        ) {
          this.successes++;
          this.emit("target", "player", "命中目标区！");
        } else this.emit("point", undefined, "偏离目标 · 斜划调整方向");
        this.accuracyPending = false;
        this.feeds++;
        this.nextFeed();
      }
      return;
    }
    if (event === "player" || event === "ai") {
      const side: Side = event;
      if (side === "player" && this.input.freePaddle) return;
      if (side !== this.receiver || this.serving || this.bounces !== 1) return;
      const paddle = side === "player" ? this.playerX : this.aiX;
      const manual =
        this.input.shotAge <=
        this.stats.window + INPUT_TUNING.bufferSeconds - 0.1;
      const assisted = this.options.assist && this.input.positioned;
      const intent = side === "ai" ? !this.aiMiss : manual || assisted;
      const tolerance = side === "player" && assisted ? 0.3 : 0.19;
      if (
        !intent ||
        Math.abs(b.x - paddle) > tolerance ||
        b.z < 0.01 ||
        b.z > 1.15
      )
        return;
      this.hit(side, manual);
      return;
    }
    if (event === "out")
      this.point(
        this.bounces > 0 ? this.lastHitter : other(this.lastHitter),
        this.bounces > 0 ? "漏接来球" : "回球出界",
      );
  }
  private hit(side: Side, manual: boolean): void {
    this.rallyContacts++;
    if (side === "player") this.playerStroke = 1;
    else this.aiStroke = 1;
    let targetX: number;
    let targetY: number;
    let speed: number;
    let spin: Spin = "normal";
    if (side === "player") {
      const precise =
        manual && this.input.shotAge <= INPUT_TUNING.preciseSeconds;
      const incomingSpeed = Math.abs(this.ball.vy);
      const short = this.input.dropAge < (this.hasSkill("drop") ? 0.32 : 0.22);
      const smash =
        !short &&
        manual &&
        this.input.power > 0.8 &&
        (this.ball.weak ? this.ball.z > 0.42 : this.ball.z > 0.82);
      targetX = manual
        ? this.input.aim * 0.67
        : clamp(
            -this.playerX * 0.85 +
              this.rng.range(-0.035, 0.035) / this.stats.stability,
            -0.64,
            0.64,
          );
      const previousSide = this.history.slice(-2);
      const switching =
        previousSide.length === 2 &&
        previousSide.every((x) => x * targetX < -0.05);
      if (manual && !precise && !(switching && this.hasSkill("switch")))
        targetX += this.rng.range(-0.055, 0.055) / this.stats.stability;
      targetX = clamp(targetX, -0.67, 0.67);
      targetY = short
        ? this.hasSkill("drop")
          ? 1.66
          : 1.76
        : manual && this.input.power > 0.65
          ? 2.42
          : 2.18;
      speed = Math.min(
        smash ? 5.9 : 4.6,
        (smash ? 5.2 : short ? 2.8 : 3.15 + this.input.power * 0.6) *
          this.stats.speed,
      );
      if (!manual && this.hasSkill("counter") && incomingSpeed > 3.4)
        speed = Math.max(speed, Math.min(4.3, incomingSpeed * 0.94));
      if (smash && this.hasSkill("smash")) speed = Math.min(6, speed * 1.1);
      if (this.hasSkill("rush") && this.ball.vz > 0 && this.playerDepth > 0.2)
        speed = Math.min(4.8, speed * 1.08);
      if (smash) this.smashes++;
      if (switching) this.reversals++;
      this.input.dropAge = 99;
      this.hits++;
      this.rallyHits++;
      this.bestRally = Math.max(this.bestRally, this.rallyHits);
      if (precise) this.precise++;
      this.history.push(targetX);
      if (this.history.length > 6) this.history.shift();
      this.input.shotAge = 99;
      this.emit(
        "hit",
        side,
        smash
          ? "抓住高球，扣向空档！"
          : short
            ? "收拍放短"
            : precise
              ? "精准变线"
              : "稳稳接住",
        speed,
      );
      const mode = this.options.stage.mode;
      if (
        mode === "rescue" ||
        this.options.stage.practice ||
        this.options.daily
      ) {
        this.successes++;
        this.feeds++;
        this.nextFeed();
        return;
      }
      if (mode === "accuracy" && !this.options.stage.practice)
        this.accuracyPending = true;
      if (
        mode === "rally" &&
        this.bestRally >= 20 &&
        !this.options.training &&
        !this.options.stage.practice
      ) {
        this.finish();
        return;
      }
    } else {
      const opponent = opponents.find(
        (o) => o.id === this.options.stage.opponentId,
      )!;
      const challenge =
        this.options.stage.mode !== "match" || this.options.training;
      const placement = 0.24 + this.options.stage.difficulty * 0.052;
      const openSide = this.playerX >= 0 ? -1 : 1;
      targetX = challenge
        ? this.rng.range(-0.4, 0.4)
        : this.rallyContacts <= 4
          ? this.rng.range(-0.2, 0.2)
          : opponent.style === "control" || opponent.style === "attack"
            ? openSide * placement
            : this.rng.range(-placement, placement);
      if (!challenge) targetX += this.rng.normal() * this.aiConfig.error * 0.3;
      targetY = opponent.style === "slice" ? 0.85 : 0.6;
      speed =
        2.85 +
        this.options.stage.difficulty * 0.12 +
        (opponent.style === "attack" ? 0.15 : 0);
      if (challenge) speed = 2.95;
      spin =
        this.options.stage.difficulty >= 4
          ? opponent.style === "slice"
            ? "slice"
            : "topspin"
          : "normal";
      this.aiShots++;
      if (this.special && this.isBoss) {
        if (this.master.style === "rush") {
          targetX = -0.42;
          targetY = 0.42;
          speed = 4.3;
        }
        if (this.master.style === "body") {
          targetX = clamp(this.playerX, -0.55, 0.55);
          speed = 4.35;
        }
        if (this.master.style === "short") {
          targetY = 1.03;
          speed = 2.55;
        }
        if (this.master.style === "slice") {
          targetY = 0.92;
          speed = 2.65;
          spin = "slice";
        }
        if (this.master.style === "sidespin") {
          targetX = this.playerX > 0 ? -0.18 : 0.18;
          speed = 3.2;
        }
      }
    }
    const origin = this.ball;
    origin.active = false;
    const chasingShort = this.tactics.longToShort && this.aiDepth < 2.35;
    const weak =
      side === "ai" &&
      (this.tactics.pressure > 0.42 || chasingShort) &&
      (Math.abs(this.aiX) > 0.22 || this.aiDepth < 2.48);
    if (side === "ai")
      this.emit(
        "hit",
        side,
        this.special && this.isBoss ? this.master.tell : undefined,
        weak ? 2.5 : speed,
      );
    this.ball = planShot(
      origin,
      side,
      targetX,
      targetY,
      weak ? 2.5 : speed,
      weak ? "normal" : spin,
      weak ? 1.02 : undefined,
    );
    if (weak) {
      this.ball.weak = true;
      this.weakReturns++;
      this.aiRecovery = 1.35 + this.tactics.pressure * 0.4;
      this.feedback = "对手救起高球 · 往前挥拍！";
      this.feedbackTime = 1.1;
    } else if (side === "ai") this.aiRecovery = this.special ? 0.24 : 0.12;
    if (
      side === "ai" &&
      this.special &&
      this.isBoss &&
      this.master.style === "sidespin" &&
      !weak
    )
      this.ball.sideKick = targetX >= 0 ? 0.68 : -0.68;
    if (
      side === "ai" &&
      this.special &&
      this.isBoss &&
      this.master.style === "short" &&
      !weak
    )
      this.ball.drop = true;
    if (side === "player") {
      if (targetY < 1.9) this.ball.drop = true;
      this.ball.vz += (this.stats.spin - 1) * 0.12;
      if (this.hasSkill("soft") && origin.z < 0.3 && !manual)
        this.ball.vz += 0.05;
      const forecast = predictAiContact(this.ball);
      this.tactics.observe(
        { x: targetX, y: targetY },
        { x: this.aiX, y: this.aiDepth },
        forecast.time - this.aiConfig.delay - this.aiRecovery,
        this.aiConfig.speed,
        this.hasSkill("feint"),
      );
      this.special =
        this.isBoss && (this.options.stage.practice || this.aiShots % 3 === 1);
      if (this.special) {
        this.bossTell = this.master.tell;
        this.tellTime = Math.max(0.5, forecast.time + 0.25);
      }
    }
    if (!validateShot(this.ball, side)) {
      this.feedback = "球路偏险 · 留意球网与边线";
      this.feedbackTime = 1.1;
    }
    this.lastHitter = side;
    this.receiver = other(side);
    this.bounces = 0;
    this.serving = false;
    this.touchedNet = false;
    this.phase = "RALLY";
    this.aiPlanned = false;
    this.aiDelay =
      this.aiConfig.delay +
      this.aiRecovery +
      (this.tactics.wrongFooted ? 0.12 : 0) +
      (this.tactics.longToShort && this.hasSkill("feint") ? 0.05 : 0);
    this.aiMiss = false;
    // 击球后让球离开接触面，同一来球只记一次击球。
  }
  private nextFeed(): void {
    this.ball.active = false;
    this.pointDone = true;
    if (
      this.options.stage.mode === "accuracy" &&
      this.feeds >= 12 &&
      !this.options.training &&
      !this.options.stage.practice
    ) {
      this.finish();
      return;
    }
    this.phase = "POINT_RESULT";
    this.timer = MATCH_TUNING.challengeFeedSeconds;
  }
  private point(winner: Side, reason: string): void {
    if (this.pointDone) return;
    this.pointDone = true;
    this.ball.active = false;
    this.emit(
      "point",
      winner,
      `${winner === "player" ? "你得分" : "对手得分"} · ${reason}`,
    );
    if (this.options.stage.mode !== "match" || this.options.training) {
      if (this.options.stage.mode === "accuracy") {
        this.feeds++;
        this.misses++;
        if (
          this.feeds >= 12 &&
          !this.options.training &&
          !this.options.stage.practice
        ) {
          this.finish();
          return;
        }
      } else if (winner === "ai") {
        this.misses++;
        this.rallyHits = 0;
        if (
          this.options.stage.mode === "rally" &&
          this.misses >= 3 &&
          !this.options.training &&
          !this.options.stage.practice
        ) {
          this.finish();
          return;
        }
      }
      this.phase = "POINT_RESULT";
      this.timer = 0.5;
      return;
    }
    if (winner === "player") this.playerScore++;
    else this.aiScore++;
    if (
      Math.max(this.playerScore, this.aiScore) >= this.options.stage.targetScore
    ) {
      this.finish();
      return;
    }
    this.phase = "POINT_RESULT";
    this.timer = MATCH_TUNING.pointSeconds;
    this.clearInput();
  }
  private finish(): void {
    this.ball.active = false;
    this.phase = "MATCH_RESULT";
    this.clearInput();
    this.emit(
      "finish",
      undefined,
      this.won ? "挑战成功！" : "再来一局，试试对手的弱侧",
    );
  }
}
