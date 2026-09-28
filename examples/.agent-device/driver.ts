import { execFileSync, spawnSync } from "node:child_process";
import { createSign } from "node:crypto";
import fs from "node:fs";
import http2 from "node:http2";
import path from "node:path";
import {
  createAgentDeviceClient,
  isAgentDeviceError,
  normalizeAgentDeviceError,
} from "agent-device";
import {
  runAdbShell,
  type AndroidAdbExecutor,
} from "agent-device/android-adb";

export type Platform = "ios" | "android";

export type AccessibilityNode = {
  index?: number;
  ref?: string;
  type?: string;
  role?: string;
  label?: string;
  value?: string;
  identifier?: string;
  id?: string;
  enabled?: boolean;
  selected?: boolean;
  focused?: boolean;
  hittable?: boolean;
  frame?: { x: number; y: number; width: number; height: number };
  rect?: { x: number; y: number; width: number; height: number };
  children?: AccessibilityNode[];
  [key: string]: unknown;
};

type RemotePushResult = { status: number; body: string };
type TraceEntry = { at: string; action: string; detail?: unknown };

export class AgentDeviceCapabilityError extends Error {
  readonly code = "AGENT_DEVICE_CAPABILITY_MISSING";

  constructor(readonly capability: string, detail: string) {
    super(`agent-device capability missing: ${capability} (${detail})`);
    this.name = "AgentDeviceCapabilityError";
  }
}

export class AgentDeviceOperatorError extends Error {
  constructor(
    readonly agentDeviceCode: string,
    detail: string,
  ) {
    super(`app not installed (${agentDeviceCode}): ${detail}`);
    this.name = "AgentDeviceOperatorError";
  }
}

export function classifyAgentDeviceFailure(
  error: unknown,
): "infra" | "operator" | "product" {
  if (error instanceof AgentDeviceCapabilityError) return "infra";
  if (error instanceof AgentDeviceOperatorError) return "operator";
  if (!isAgentDeviceError(error)) return "product";
  const normalized = normalizeAgentDeviceError(error);
  if (
    ["APP_NOT_FOUND", "APP_NOT_INSTALLED"].includes(normalized.code)
  ) {
    return "operator";
  }
  if (
    /DAEMON|DEVICE|RUNNER|TRANSPORT|TIMEOUT|SESSION|CONNECTION/.test(
      normalized.code,
    )
  ) {
    return "infra";
  }
  return "product";
}

function asNode(node: Record<string, unknown>): AccessibilityNode {
  const rect = node.rect as AccessibilityNode["rect"] | undefined;
  return {
    ...node,
    id: (node.identifier as string | undefined) ?? (node.id as string | undefined),
    frame: rect ?? (node.frame as AccessibilityNode["frame"] | undefined),
  };
}

function quoteBase64Url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

function jsonOutput(command: string, args: string[]): unknown {
  return JSON.parse(execFileSync(command, args, { encoding: "utf8" }));
}

function adb(serial: string, args: string[]): string {
  return execFileSync("adb", ["-s", serial, ...args], { encoding: "utf8" });
}

function androidAdbExecutor(serial: string): AndroidAdbExecutor {
  return async (args, options = {}) => {
    const result = spawnSync("adb", ["-s", serial, ...args], {
      encoding: "utf8",
      env: options.env ? { ...process.env, ...options.env } : process.env,
      input: options.stdin,
      timeout: options.timeoutMs,
      maxBuffer: 20 * 1024 * 1024,
    });
    const exitCode = result.status ?? 1;
    const output = {
      exitCode,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? result.error?.message ?? "",
    };
    if (exitCode !== 0 && !options.allowFailure) {
      throw new Error(
        `adb ${args.join(" ")} failed (${exitCode}): ${output.stderr}`,
      );
    }
    return output;
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function labels(nodes: AccessibilityNode[]): string[] {
  return nodes
    .flatMap((node) => [node.label, node.value, node.identifier])
    .filter((value): value is string => Boolean(value));
}

function findNode(
  nodes: AccessibilityNode[],
  predicate: (node: AccessibilityNode) => boolean,
): AccessibilityNode | undefined {
  return nodes.find(predicate);
}

export type LaunchOptions = {
  platform?: Platform;
  device?: string;
  deviceId?: string;
  app?: string;
  lock?: boolean;
  lockWaitMs?: number;
  boot?: boolean;
  artifactDir?: string;
  [key: string]: unknown;
};

export class DeviceSession {
  readonly platform: Platform;
  readonly deviceId: string;
  private readonly client;
  private readonly session: string;
  private readonly waitMs?: number;
  private opened = false;
  private currentApp?: string;
  private readonly trace: TraceEntry[] = [];
  private readonly traceListeners = new Set<(entry: TraceEntry) => void>();
  private readonly artifactDir?: string;
  private evidenceIndex = 0;

  constructor(options: LaunchOptions) {
    this.platform = options.platform ?? "ios";
    this.deviceId =
      options.deviceId ??
      options.device ??
      (this.platform === "android" ? "emulator-5554" : "");
    this.session = `expo-targets-${this.platform}-${process.pid}-${Date.now()}`;
    this.waitMs =
      options.lockWaitMs !== undefined && options.lockWaitMs >= 100
        ? options.lockWaitMs
        : undefined;
    this.artifactDir = options.artifactDir;
    this.client = createAgentDeviceClient({
      session: this.session,
      cwd: process.cwd(),
      responseLevel: "full",
    });
  }

  private selection() {
    return this.platform === "android"
      ? { platform: "android" as const, serial: this.deviceId || undefined }
      : { platform: "ios" as const, udid: this.deviceId || undefined };
  }

  private record(action: string, detail?: unknown): void {
    const entry = { at: new Date().toISOString(), action, detail };
    this.trace.push(entry);
    for (const listener of this.traceListeners) listener(entry);
  }

  async initialize(app?: string): Promise<void> {
    if (app) await this.launchApp(app, { terminateRunning: false });
  }

  async accessibilityTree(): Promise<AccessibilityNode[]> {
    if (!this.opened) {
      throw new AgentDeviceCapabilityError(
        "snapshot-without-open-session",
        "launch an app before reading accessibility",
      );
    }
    const result = await this.client.capture.snapshot({
      ...this.selection(),
      session: this.session,
      raw: true,
      responseLevel: "full",
    });
    const nodes = (result.nodes ?? []) as Array<Record<string, unknown>>;
    this.record("snapshot", { nodes: nodes.length });
    return nodes.map(asNode);
  }

  async launchApp(
    app: string,
    options: {
      terminateRunning?: boolean;
      arguments?: string[];
      env?: Record<string, string>;
    } = {},
  ): Promise<void> {
    try {
      await this.client.apps.open({
        ...this.selection(),
        session: this.session,
        app,
        relaunch: options.terminateRunning === true,
        launchArgs: options.arguments,
        launchEnvironment: options.env,
        waitMs: this.waitMs,
        // Matrix rows frequently return from Settings, launchers, choosers, or
        // the notification shade. A row launch must actively foreground its
        // host; otherwise Android can keep SystemUI on top and every later row
        // observes the previous surface instead of its own app.
        foreground: true,
      });
      if (this.platform === "android") {
        const surface = await this.client.capture.snapshot({
          ...this.selection(),
          session: this.session,
          raw: false,
          responseLevel: "full",
        });
        const foregroundBundle = (surface as { appBundleId?: string })
          .appBundleId;
        const surfaceNodes = ((surface as { nodes?: AccessibilityNode[] }).nodes ?? []);
        const systemUiOnly =
          surfaceNodes.some((node) => node.bundleId === "com.android.systemui") &&
          !surfaceNodes.some((node) => node.bundleId === app);
        this.record("launch-surface", { app, foregroundBundle });
        if (foregroundBundle === "com.android.systemui" || systemUiOnly) {
          // Dismiss only a confirmed notification shade, crash dialog, or
          // other SystemUI overlay. An unconditional Back exits healthy hosts
          // and leaves launcher-only snapshots on the following wait.
          await this.client.command.back({
            ...this.selection(),
            session: this.session,
          });
          await this.client.apps.open({
            ...this.selection(),
            session: this.session,
            app,
            relaunch: false,
            launchArgs: options.arguments,
            launchEnvironment: options.env,
            waitMs: this.waitMs,
            foreground: true,
          });
        }
      }
    } catch (error) {
      if (isAgentDeviceError(error)) {
        const normalized = normalizeAgentDeviceError(error);
        if (
          normalized.code === "APP_NOT_FOUND" ||
          normalized.code === "APP_NOT_INSTALLED"
        ) {
          throw new AgentDeviceOperatorError(
            normalized.code,
            normalized.message,
          );
        }
      }
      throw error;
    }
    this.opened = true;
    this.currentApp = app;
    this.record("open", { app, relaunch: options.terminateRunning === true });
  }

  async terminateApp(app = this.currentApp): Promise<void> {
    if (!app) return;
    await this.client.apps.close({ session: this.session, app });
    this.record("close-app", { app });
  }

  async close(): Promise<void> {
    if (!this.opened) return;
    try {
      await this.client.sessions.close({ session: this.session });
      this.record("close-session");
    } catch (error) {
      this.record("cleanup-error", { error: String(error) });
      throw error;
    } finally {
      this.opened = false;
    }
  }

  async tap(point: {
    x: number;
    y: number;
    duration?: number;
    verify?: boolean;
  }): Promise<void> {
    await this.client.interactions.press({
      ...this.selection(),
      session: this.session,
      x: point.x,
      y: point.y,
      holdMs: point.duration ? Math.round(point.duration * 1_000) : undefined,
      settle: true,
      verify: point.verify,
    });
    this.record("press", point);
  }

  async swipe(input: {
    xStart: number;
    yStart: number;
    xEnd: number;
    yEnd: number;
    duration?: number;
  }): Promise<void> {
    await this.client.interactions.swipe({
      ...this.selection(),
      session: this.session,
      from: { x: input.xStart, y: input.yStart },
      to: { x: input.xEnd, y: input.yEnd },
      pauseMs: input.duration ? Math.round(input.duration * 1_000) : undefined,
    });
    this.record("swipe", input);
  }

  async type(text: string): Promise<void> {
    await this.client.interactions.type({
      ...this.selection(),
      session: this.session,
      text,
    });
    this.record("type", { length: text.length });
  }

  async pressButton(input: { button: string }): Promise<void> {
    const button = input.button.toUpperCase();
    if (button === "HOME") {
      await this.client.command.home({ ...this.selection(), session: this.session });
    } else if (button === "BACK") {
      await this.client.command.back({ ...this.selection(), session: this.session });
    } else if (button === "LOCK") {
      await this.client.command.screenLock({
        ...this.selection(),
        session: this.session,
      });
    } else {
      throw new AgentDeviceCapabilityError("hardware-button", button);
    }
    this.record("button", button);
  }

  async inspectPoint(point: { x: number; y: number }): Promise<AccessibilityNode[]> {
    const result = await this.client.capture.inspectPoint({
      ...this.selection(),
      session: this.session,
      point,
    });
    const nodes = result.elements.map((element) =>
      asNode(element as unknown as Record<string, unknown>),
    );
    this.record("inspect-point", { point, status: result.status, elements: nodes });
    return nodes;
  }

  async capturePointEvidence(
    point: { x: number; y: number },
    descriptor: AccessibilityNode,
  ): Promise<string | undefined> {
    if (!this.artifactDir) return undefined;
    fs.mkdirSync(this.artifactDir, { recursive: true });
    const out = path.join(
      this.artifactDir,
      `point-${String(++this.evidenceIndex).padStart(3, "0")}-${point.x}-${point.y}.png`,
    );
    const screenshot = await this.client.capture.screenshot({
      ...this.selection(),
      session: this.session,
      path: out,
    });
    this.record("point-evidence", {
      point,
      descriptor,
      screenshot: screenshot.path,
    });
    return screenshot.path;
  }

  async openUrl(url: string): Promise<void> {
    await this.client.apps.open({
      ...this.selection(),
      session: this.session,
      url,
    });
    this.opened = true;
    this.record("open-url", { url });
  }

  async tapIdAllowingAppTransition(
    id: string,
    options: { toBundleId: string; timeoutMs?: number },
  ): Promise<void> {
    const selector = `id=${JSON.stringify(id)}`;
    try {
      await this.client.interactions.press({
        ...this.selection(),
        session: this.session,
        selector,
        settle: true,
        timeoutMs: options.timeoutMs ?? 10_000,
        verify: false,
      });
      this.record("press-selector", { selector, verify: false });
    } catch (error) {
      if (!isAgentDeviceError(error)) throw error;
      const normalized = normalizeAgentDeviceError(error);
      const details = normalized.details as
        | { expectedPackage?: string; foregroundPackage?: string; activity?: string }
        | undefined;
      if (
        normalized.code !== "COMMAND_FAILED" ||
        !details ||
        details.expectedPackage !== this.currentApp ||
        details.foregroundPackage !== options.toBundleId
      ) {
        throw error;
      }
      // agent-device intentionally reports an app-boundary escape after the
      // press. For flows that are defined to cross into a named system app,
      // the exact structured transition is evidence that dispatch succeeded;
      // the caller must still assert the destination behavior.
      this.record("press-selector-app-transition", {
        selector,
        expectedPackage: details.expectedPackage,
        foregroundPackage: details.foregroundPackage,
        activity: details.activity,
      });
    }
  }

  getById(
    id: string,
    options: { timeoutMs?: number; verify?: boolean } = {},
  ) {
    return this.locator(
      `id=${JSON.stringify(id)}`,
      options.timeoutMs,
      options.verify,
    );
  }

  getByText(
    text: string,
    options: { timeoutMs?: number; verify?: boolean } = {},
  ) {
    return this.locator(
      `label=${JSON.stringify(text)}`,
      options.timeoutMs,
      options.verify,
    );
  }

  private locator(
    selector: string,
    timeoutMs = 10_000,
    verify?: boolean,
  ) {
    return {
      tap: async () => {
        await this.client.interactions.press({
          ...this.selection(),
          session: this.session,
          selector,
          settle: true,
          timeoutMs,
          verify,
        });
        this.record("press-selector", { selector, verify });
      },
    };
  }

  async setPrivacy(input: {
    action: "grant" | "deny" | "reset";
    service: string;
    bundleId?: string;
  }): Promise<void> {
    if (input.bundleId && input.bundleId !== this.currentApp) {
      await this.launchApp(input.bundleId, { terminateRunning: false });
    }
    const permission = input.service === "photos-add" ? "photos" : input.service;
    if (
      this.platform === "android" &&
      permission === "notifications" &&
      input.bundleId
    ) {
      const command = input.action === "grant" ? "grant" : "revoke";
      await runAdbShell(androidAdbExecutor(this.deviceId), [
        "pm",
        command,
        input.bundleId,
        "android.permission.POST_NOTIFICATIONS",
      ]);
      this.record("permission", input);
      return;
    }
    await this.client.settings.update({
      ...this.selection(),
      session: this.session,
      area: "permission",
      action: input.action,
      permission,
    } as never);
    this.record("permission", input);
  }

  async addMedia(files: string[]): Promise<void> {
    if (this.platform === "ios") {
      execFileSync("xcrun", ["simctl", "addmedia", this.deviceId, ...files]);
    } else {
      for (const file of files) {
        const remote = `/sdcard/Pictures/${path.basename(file)}`;
        execFileSync("adb", ["-s", this.deviceId, "push", file, remote]);
        adb(this.deviceId, [
          "shell",
          "am",
          "broadcast",
          "-a",
          "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
          "-d",
          `file://${remote}`,
        ]);
      }
    }
    this.record("fixture-add-media", {
      files: files.map((file) => path.basename(file)),
    });
  }

  async pushNotification(input: {
    bundleId: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    await this.client.apps.push({
      ...this.selection(),
      session: this.session,
      app: input.bundleId,
      payload: input.payload as never,
    });
    this.record("push", { app: input.bundleId });
  }

  async pushRemoteNotification(input: {
    deviceToken: string;
    bundleId?: string;
    credentials?: ApnsCredentials;
    fcmCredentials?: FcmCredentials;
    payload: Record<string, unknown>;
  }): Promise<RemotePushResult> {
    const result = input.fcmCredentials
      ? await sendFcm(input.deviceToken, input.fcmCredentials, input.payload)
      : await sendApns(
          input.deviceToken,
          input.bundleId ?? "",
          input.credentials ?? readApnsCredentialsFromEnv(),
          input.payload,
        );
    this.record("remote-push", { status: result.status });
    return result;
  }

  async openShareText(text: string): Promise<void> {
    if (this.platform !== "android") {
      throw new AgentDeviceCapabilityError("share-intent", "Android only");
    }
    await runAdbShell(androidAdbExecutor(this.deviceId), [
      "am",
      "start",
      "-a",
      "android.intent.action.SEND",
      "-t",
      "text/plain",
      "--es",
      "android.intent.extra.TEXT",
      text,
    ]);
    this.record("android-share-intent");
  }

  async listInputMethods(_options: { all?: boolean } = {}): Promise<string[]> {
    const result = await runAdbShell(androidAdbExecutor(this.deviceId), [
      "ime",
      "list",
      "-a",
    ]);
    return result.stdout
      .split("\n")
      // `ime list -a` starts each record with `<component>:` and then emits
      // indented diagnostic fields that may also contain slashes. Keep only
      // record headers and remove the display-only trailing colon.
      .filter((line) => line.length > 0 && !/^\s/.test(line))
      .map((line) => line.trim().replace(/:$/, ""))
      .filter((line) => line.includes("/"));
  }

  async setInputMethod(id: string): Promise<void> {
    const executor = androidAdbExecutor(this.deviceId);
    await runAdbShell(executor, ["ime", "enable", id]);
    await runAdbShell(executor, ["ime", "set", id]);
  }

  async currentInputMethod(): Promise<string | null> {
    const result = await runAdbShell(androidAdbExecutor(this.deviceId), [
      "settings",
      "get",
      "secure",
      "default_input_method",
    ]);
    return result.stdout.trim() || null;
  }

  async showInputMethodPicker(): Promise<void> {
    await runAdbShell(androidAdbExecutor(this.deviceId), ["ime", "show"]);
  }

  async showNotificationShade(): Promise<void> {
    if (this.platform !== "android") {
      throw new AgentDeviceCapabilityError(
        "notification-shade",
        "Android only",
      );
    }
    await runAdbShell(androidAdbExecutor(this.deviceId), [
      "cmd",
      "statusbar",
      "expand-notifications",
    ]);
    this.record("android-notification-shade");
  }

  async waitForActiveNotification(
    bundleId: string,
    markers: string[],
    timeoutMs = 8_000,
  ): Promise<void> {
    if (this.platform !== "android") {
      throw new AgentDeviceCapabilityError(
        "active-notification-inspection",
        "Android only",
      );
    }
    const deadline = Date.now() + timeoutMs;
    let last = "";
    while (Date.now() < deadline) {
      const result = await runAdbShell(androidAdbExecutor(this.deviceId), [
        "dumpsys",
        "notification",
        "--noredact",
      ]);
      last = result.stdout;
      const active = last.split("Notification attention state:", 1)[0] ?? "";
      if (
        active.includes(`pkg=${bundleId}`) &&
        markers.every((marker) => active.includes(marker))
      ) {
        this.record("android-notification-active", { bundleId, markers });
        return;
      }
      await sleep(200);
    }
    throw new Error(
      `notification did not become active for ${bundleId}; markers=${markers.join("|")}`,
    );
  }

  async setShowImeWithHardKeyboard(enabled: boolean): Promise<void> {
    await runAdbShell(androidAdbExecutor(this.deviceId), [
      "settings",
      "put",
      "secure",
      "show_ime_with_hard_keyboard",
      enabled ? "1" : "0",
    ]);
  }

  async imeAccessibilityTree(): Promise<AccessibilityNode[]> {
    return this.accessibilityTree();
  }

  async assertWebContent(input: {
    visible: string[];
    notVisible: string[];
    timeoutMs?: number;
  }): Promise<void> {
    const deadline = Date.now() + (input.timeoutMs ?? 10_000);
    let last: string[] = [];
    while (Date.now() < deadline) {
      last = labels(await this.accessibilityTree());
      const text = last.join("\n");
      if (
        input.visible.every((value) => text.includes(value)) &&
        input.notVisible.every((value) => !text.includes(value))
      ) {
        return;
      }
      await sleep(250);
    }
    throw new Error(`web content assertion failed; labels=${last.slice(0, 40).join("|")}`);
  }

  getTrace(): TraceEntry[] {
    return [...this.trace];
  }

  takeTrace(): TraceEntry[] {
    return this.trace.splice(0, this.trace.length);
  }

  onTrace(listener: (entry: TraceEntry) => void): () => void {
    this.traceListeners.add(listener);
    return () => this.traceListeners.delete(listener);
  }
}

export const devices = {
  async launch(options: LaunchOptions = {}): Promise<DeviceSession> {
    const session = new DeviceSession(options);
    await session.initialize(options.app);
    return session;
  },
};

export type ApnsCredentials = {
  authKeyPath: string;
  keyId: string;
  teamId: string;
  topic?: string;
};

export type FcmCredentials = { serviceAccountPath: string; projectId: string };

export function readApnsCredentialsFromEnv(): ApnsCredentials {
  const authKeyPath = process.env.APNS_AUTH_KEY_PATH;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID ?? process.env.APPLE_TEAM_ID;
  if (!authKeyPath || !keyId || !teamId) {
    throw new Error("APNS_AUTH_KEY_PATH, APNS_KEY_ID, and APNS_TEAM_ID are required");
  }
  return { authKeyPath, keyId, teamId, topic: process.env.APNS_TOPIC };
}

export function readFcmCredentialsFromEnv(): FcmCredentials | null {
  const serviceAccountPath =
    process.env.FCM_SERVICE_ACCOUNT_PATH ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.FCM_PROJECT_ID;
  return serviceAccountPath && projectId ? { serviceAccountPath, projectId } : null;
}

async function sendApns(
  token: string,
  bundleId: string,
  credentials: ApnsCredentials,
  payload: Record<string, unknown>,
): Promise<RemotePushResult> {
  const now = Math.floor(Date.now() / 1_000);
  const head = quoteBase64Url(JSON.stringify({ alg: "ES256", kid: credentials.keyId }));
  const body = quoteBase64Url(JSON.stringify({ iss: credentials.teamId, iat: now }));
  const signer = createSign("SHA256");
  signer.update(`${head}.${body}`);
  const signature = signer.sign({
    key: fs.readFileSync(credentials.authKeyPath),
    dsaEncoding: "ieee-p1363",
  });
  const jwt = `${head}.${body}.${quoteBase64Url(signature)}`;
  return new Promise((resolve, reject) => {
    const client = http2.connect("https://api.sandbox.push.apple.com");
    client.once("error", reject);
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": credentials.topic ?? bundleId,
      "content-type": "application/json",
    });
    let status = 0;
    let responseBody = "";
    request.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });
    request.setEncoding("utf8");
    request.on("data", (chunk) => (responseBody += chunk));
    request.on("end", () => {
      client.close();
      resolve({ status, body: responseBody });
    });
    request.on("error", (error) => {
      client.close();
      reject(error);
    });
    request.end(JSON.stringify(payload));
  });
}

async function sendFcm(
  token: string,
  credentials: FcmCredentials,
  payload: Record<string, unknown>,
): Promise<RemotePushResult> {
  const account = JSON.parse(fs.readFileSync(credentials.serviceAccountPath, "utf8")) as {
    client_email: string;
    private_key: string;
    token_uri?: string;
  };
  const now = Math.floor(Date.now() / 1_000);
  const header = quoteBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = quoteBase64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: account.token_uri ?? "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3_600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${quoteBase64Url(signer.sign(account.private_key))}`;
  const tokenResponse = await fetch(account.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const tokenJson = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenResponse.ok || !tokenJson.access_token) {
    return { status: tokenResponse.status, body: JSON.stringify(tokenJson) };
  }
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenJson.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ message: { token, ...payload } }),
    },
  );
  return { status: response.status, body: await response.text() };
}

type SimDevice = { name: string; udid: string; state: string };

function listSimulators(options: { family?: string } = {}): SimDevice[] {
  const data = jsonOutput("xcrun", ["simctl", "list", "devices", "--json"]) as {
    devices?: Record<string, Array<{ name: string; udid: string; state: string }>>;
  };
  const all = Object.values(data.devices ?? {}).flat();
  const family = options.family?.toLowerCase();
  return family ? all.filter((device) => device.name.toLowerCase().includes(family)) : all;
}

async function ensureWatchPhonePair(options: {
  phoneId: string;
  watch?: string;
  activate?: boolean;
  boot?: boolean;
}) {
  const client = createAgentDeviceClient({
    session: `expo-targets-pair-ios-${process.pid}-${Date.now()}`,
    cwd: process.cwd(),
    responseLevel: "full",
  });
  const result = await client.devices.pairWearable({
    phone: { platform: "ios", deviceId: options.phoneId },
    wearable: options.watch ? { name: options.watch } : undefined,
    boot: options.boot === true,
  });
  return {
    pairId: result.pairId,
    status: result.status,
    remainingHumanStep: result.remainingHumanStep,
    watch: {
      name: result.wearable.name,
      udid: result.wearable.ios?.udid ?? result.wearable.id,
      state: result.wearable.booted ? "Booted" : "Shutdown",
    },
  };
}

export const ios = {
  simctl: { listSimulators },
  ensureWatchPhonePair,
  readApnsCredentialsFromEnv,
};

function listAvds(): string[] {
  const result = spawnSync("emulator", ["-list-avds"], { encoding: "utf8" });
  if (result.status !== 0) return [];
  return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}

const pairWearPhone = async (options: {
  phoneSerial: string;
  boot?: boolean;
  wearDeviceId?: string;
  wearName?: string;
}): Promise<{
  status: string;
  pairId: string;
  wear: { serial: string };
  remainingHumanStep?: string;
}> => {
  const client = createAgentDeviceClient({
    session: `expo-targets-pair-android-${process.pid}-${Date.now()}`,
    cwd: process.cwd(),
    responseLevel: "full",
  });
  const result = await client.devices.pairWearable({
    phone: { platform: "android", deviceId: options.phoneSerial },
    wearable:
      options.wearDeviceId || options.wearName
        ? { deviceId: options.wearDeviceId, name: options.wearName }
        : undefined,
    boot: options.boot === true,
  });
  return {
    status: result.status,
    pairId: result.pairId,
    wear: { serial: result.wearable.android?.serial ?? result.wearable.id },
    remainingHumanStep: result.remainingHumanStep,
  };
};

export const android = {
  readFcmCredentialsFromEnv,
  listWearAvds: () => listAvds().filter((name) => /wear/i.test(name)),
  listUnpairedWearAvds: () => listAvds().filter((name) => /wear/i.test(name)),
  listWearPairs: () => [] as Array<{ pairId: string }>,
  pairWearPhone,
};

export async function launchWearPhonePair(options: {
  phone: { deviceId: string; boot?: boolean };
  pair?: { boot?: boolean; phoneSerial?: string };
  artifactDir?: string;
  [key: string]: unknown;
}): Promise<{
  wear: DeviceSession;
  pair: {
    status: string;
    pairId: string;
    wear: { serial: string };
    remainingHumanStep?: string;
  };
}> {
  const pair = await pairWearPhone({
    phoneSerial: options.pair?.phoneSerial ?? options.phone.deviceId,
    boot: options.pair?.boot === true,
  });
  const wear = await devices.launch({
    platform: "android",
    deviceId: pair.wear.serial,
    boot: false,
    artifactDir: options.artifactDir,
  });
  return { wear, pair };
}
