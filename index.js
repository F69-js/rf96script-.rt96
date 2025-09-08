#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

class commandManager {
  constructor(prefix) {
    this.prefix = prefix;
    this.commands = {};
  }

  registerCommand(cmd) {
    if (!cmd.name) return console.error("Command must have a name!");
    this.commands[cmd.name] = cmd;
    if (cmd.alias) cmd.alias.forEach((a) => (this.commands[a] = cmd));
  }

  executeCommand(input) {
    input = input.trim();
    if (!input) return;

    const funcMatch = input.match(/^(\w+)\((.*)\)$/);
    if (!funcMatch) return console.log(`Invalid command format: ${input}`);

    const cmdName = funcMatch[1];
    const argsString = funcMatch[2].trim();

    const cmd = this.commands[cmdName];
    if (!cmd) return console.log(`Command not found: ${cmdName}`);
    const args = argsString ? argsString.split(",").map((a) => a.trim().replace(/^["']|["']$/g, "")) : [];

    cmd.onExecute(args);
  }
}

// --- インタプリタ本体 ---
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("使い方: node Interpreter.js <script.rf96>");
  process.exit(1);
}

const scriptPath = path.resolve(args[0]);

let scriptContent;
try {
  scriptContent = fs.readFileSync(scriptPath, "utf-8");
} catch (err) {
  console.error("スクリプト読み込み失敗:", err.message);
  process.exit(1);
}

// 改行・セミコロンで区切る
const commands = scriptContent
  .split(/[\n;]/)
  .map((c) => c.trim())
  .filter(Boolean);

// --- commandManager セットアップ ---
const cm = new commandManager("/");

// echo コマンド
cm.registerCommand({
  name: "echo",
  onExecute: ([val]) => console.log(`${val}`),
});

// --- スクリプト実行 ---
commands.forEach((cmdLine) => cm.executeCommand(cmdLine));
