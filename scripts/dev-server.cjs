#!/usr/bin/env node
// `next dev` の起動ラッパー。
//
// 背景: このマシンではNorton Antivirusがローカル通信のTLSインスペクション
// (自己署名の再署名証明書への差し替え)を行っている。通常のターミナルから
// `npm run dev` する場合はNortonが起動時に環境変数NODE_EXTRA_CA_CERTSを
// 注入するため問題にならないが、Claude Codeのプレビュー機能(.claude/launch.json
// 経由の起動)はその注入を経由しないプロセスとして起動するため、Node標準の
// CA証明書ストアだけではNortonの再署名証明書を検証できず、Supabaseなど外部
// httpsへのfetchが "fetch failed"(UNABLE_TO_VERIFY_LEAF_SIGNATURE)で失敗する。
//
// NODE_EXTRA_CA_CERTSはNodeのTLSモジュール初期化時に一度だけ読まれるため、
// `.env.local`経由(Next.js起動後の読み込み)では手遅れで効かない。プロセス
// 起動前の環境変数として渡す必要があるため、この小さなラッパーで子プロセス
// 生成前にセットしてから`next dev`を起動する。
//
// Nortonが入っていないマシン(証明書ファイルが存在しない)では何もせず、
// 通常どおり`next dev`を起動するだけなので、他の開発環境には影響しない。
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const NORTON_CERT_PATH = "C:\\ProgramData\\Norton\\Antivirus\\wscert.pem";

const env = { ...process.env };
if (!env.NODE_EXTRA_CA_CERTS && fs.existsSync(NORTON_CERT_PATH)) {
  env.NODE_EXTRA_CA_CERTS = NORTON_CERT_PATH;
}

const result = spawnSync("npx", ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env,
  // recipe-app/.claude/launch.json・project直下/.claude/launch.jsonのどちらから
  // 起動されても(呼び出し側のcwdに関わらず)このスクリプトの1つ上=recipe-app直下で
  // next devが動くようにする。
  cwd: path.join(__dirname, ".."),
});

process.exit(result.status ?? 1);
