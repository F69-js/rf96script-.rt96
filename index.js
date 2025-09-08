#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const readline = require("readline");

class commandManager {
  constructor(prefix) {
    this.prefix = prefix;
    this.commands = {};
    this.variables = {}; // 変数格納
  }

  registerCommand(cmd) {
    if (!cmd.name) return console.error("Command must have a name!");
    this.commands[cmd.name] = cmd;
    if (cmd.alias) cmd.alias.forEach((a) => (this.commands[a] = cmd));
  }

  executeCommand(input) {
    input = input.trim();
    if (!input) return;

    // --- var文 ---
    const varMatch = input.match(/^var\s+(\w+)\s*=\s*(.+)$/);
    if (varMatch) {
      const [, varName, expr] = varMatch;
      const result = this.evaluateExpression(expr);
      this.variables[varName] = result;
      return;
    }

    // --- 通常コマンド ---
    return this.evaluateExpression(input);
  }

  evaluateExpression(expr) {
    expr = expr.trim();

    // コマンド呼び出し: cmdName(arg1, arg2, ...)
    const funcMatch = expr.match(/^(\w+)\((.*)\)$/);
    if (!funcMatch) return this.expandVariables(expr);

    const cmdName = funcMatch[1];
    const argsString = funcMatch[2].trim();

    const cmd = this.commands[cmdName];
    if (!cmd) {
      console.error(`Command not found: "${cmdName}"`);
      return;
    }

    // 引数を解析
    const args = argsString
      ? argsString.split(",").map((a) => {
          a = a.trim();
          // 文字列リテラルはそのまま
          a = a.replace(/^["']|["']$/g, "");
          // 変数展開
          return this.expandVariables(a);
        })
      : [];

    try {
      return cmd.onExecute(args);
    } catch (err) {
      console.error(`Runtime error in command "${cmdName}": ${err.message}`);
    }
  }

  expandVariables(str) {
    let replaced = str;
    // すべての %var% を繰り返し展開
    while (/%\w+%/.test(replaced)) {
      replaced = replaced.replace(/%(\w+)%/g, (_, varName) => {
        return this.variables[varName] !== undefined ? this.variables[varName] : "";
      });
    }
    return replaced;
  }
}

// --- commandManager セットアップ ---
const cm = new commandManager("/");

// greet コマンド
cm.registerCommand({
  name: "greet",
  onExecute: ([name]) => `Hello ${name}!`,
});

// echo コマンド（複数引数対応）
cm.registerCommand({
  name: "echo",
  onExecute: (args) => {
    const output = args.map((v) => (v !== undefined ? v : "")).join(" ");
    console.log(output);
  },
});

// --- スクリプト実行 ---
const args = process.argv.slice(2);

if (args.length > 0) {
  const scriptPath = path.resolve(args[0]);
  let scriptContent;
  try {
    scriptContent = fs.readFileSync(scriptPath, "utf-8");
  } catch (err) {
    console.error("スクリプト読み込み失敗:", err.message);
    process.exit(1);
  }

  const commands = scriptContent
    .split(/[\n;]/)
    .map((c) => c.trim())
    .filter(Boolean);

  commands.forEach((cmdLine) => {
    const result = cm.executeCommand(cmdLine);
    if (result !== undefined && !cmdLine.startsWith("echo")) console.log(result);
  });

  process.exit(0);
}

// --- REPLモード ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

console.log("RF96 REPL (type 'exit' to quit)");
rl.prompt();

rl.on("line", (line) => {
  if (line.trim() === "exit") {
    rl.close();
    return;
  }

  const result = cm.executeCommand(line);
  if (result !== undefined && !line.startsWith("echo")) console.log(result);
  rl.prompt();
});

rl.on("close", () => {
  console.log("Bye!");
  process.exit(0);
});
