import kleur from "kleur";

let verbose = false;

export function setVerbose(v: boolean): void {
  verbose = v;
}

export function step(tag: string, msg: string): void {
  console.log(`${kleur.cyan(`[${tag}]`)} ${msg}`);
}

export function info(msg: string): void {
  console.log(msg);
}

export function ok(msg: string): void {
  console.log(`${kleur.green("✓")} ${msg}`);
}

export function warn(msg: string): void {
  console.warn(`${kleur.yellow("⚠")} ${msg}`);
}

export function error(msg: string): void {
  console.error(`${kleur.red("✗")} ${msg}`);
}

export function debug(msg: string): void {
  if (verbose) console.log(kleur.gray(`· ${msg}`));
}

export function dryNote(msg: string): void {
  console.log(`${kleur.magenta("(dry)")} ${msg}`);
}
