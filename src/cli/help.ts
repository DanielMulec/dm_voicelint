const helpLines = [
  "VoiceLint",
  "",
  "VoiceLint is a CLI linting system for natural-language text in software projects.",
  "",
  "Status:",
  "  This package now builds from TypeScript and parses the v0.1 command shell.",
  "  Deterministic mechanical lint execution is not implemented yet.",
  "",
  "Available now:",
  "  voicelint --help",
  "  voicelint --version",
  "  voicelint init",
  "  voicelint .",
  "  voicelint changed",
  "  voicelint staged",
  "  voicelint --stdin",
  "",
  "Project:",
  "  https://github.com/DanielMulec/dm_voicelint",
  "",
];

export const createHelpText = (): string => helpLines.join("\n");
