#!/usr/bin/env node

const { Command } = require('commander');
const { configureWatchCommand } = require('../commands/watch');
const program = new Command('hs watch');
configureWatchCommand(program);
program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}
