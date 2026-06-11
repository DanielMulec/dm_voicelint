const helpLines = [
  "VoiceLint",
  "",
  "VoiceLint is a CLI linting system for natural-language text in software projects.",
  "",
  "Status:",
  "  This package now builds from TypeScript.",
  "  Deterministic mechanical lint execution is not implemented yet.",
  "",
  "Available now:",
  "  voicelint --help",
  "  voicelint --version",
  "",
  "Planned v0.1 commands:",
  "  voicelint init",
  "  voicelint .",
  "  voicelint changed",
  "  voicelint staged",
  "",
  "Project:",
  "  https://github.com/DanielMulec/dm_voicelint",
  "",
];

export const createHelpText = (): string => helpLines.join("\n");

export const createPlaceholderText = (tokens: readonly string[]): string =>
  [
    "VoiceLint CLI scaffold is installed, but lint execution is not implemented yet.",
    `Received command: ${tokens.join(" ")}`,
    "Use `voicelint --help` to inspect the planned command surface.",
    "",
  ].join("\n");

export const createUsageText = (): string =>
  [
    "VoiceLint requires a command, path, or piped stdin input.",
    "Use `voicelint --help` to inspect the planned command surface.",
    "",
  ].join("\n");
