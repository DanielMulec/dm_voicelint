#!/usr/bin/env node

const helpText = `VoiceLint

VoiceLint is a CLI linting system for natural-language text in software projects.

Status:
  This is an early release for active development. The mechanical CLI
  implementation is not available yet.

Planned commands:
  voicelint init
  voicelint .
  voicelint changed
  voicelint staged

Project:
  https://github.com/DanielMulec/dm_voicelint
`;

process.stdout.write(helpText);
