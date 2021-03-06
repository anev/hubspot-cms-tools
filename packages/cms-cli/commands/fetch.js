const { downloadFileOrFolder } = require('@hubspot/cms-lib/fileMapper');
const {
  loadConfig,
  validateConfig,
  checkAndWarnGitInclusion,
} = require('@hubspot/cms-lib');
const { logger } = require('@hubspot/cms-lib/logger');

const {
  addConfigOptions,
  addPortalOptions,
  addOverwriteOptions,
  addModeOptions,
  addUseEnvironmentOptions,
  getPortalId,
  getMode,
  setLogLevel,
} = require('../lib/commonOpts');
const { resolveLocalPath } = require('../lib/filesystem');
const { validatePortal, validateMode } = require('../lib/validation');
const { logDebugInfo } = require('../lib/debugInfo');
const { trackCommandUsage } = require('../lib/usageTracking');

exports.command = 'fetch <src> [dest]';
exports.describe =
  'Fetch a file, directory or module from HubSpot and write to a path on your computer';

exports.handler = async options => {
  const { config: configPath, src, dest } = options;

  setLogLevel(options);
  logDebugInfo(options);

  loadConfig(configPath);
  checkAndWarnGitInclusion();

  if (
    !(
      validateConfig() &&
      (await validatePortal(options)) &&
      validateMode(options)
    )
  ) {
    process.exit(1);
  }

  if (typeof src !== 'string') {
    logger.error('A source to fetch is required');
    process.exit(1);
  }

  const portalId = getPortalId(options);
  const mode = getMode(options);

  trackCommandUsage('fetch', { mode }, portalId);

  // Fetch and write file/folder.
  downloadFileOrFolder({
    portalId,
    src,
    dest: resolveLocalPath(dest),
    mode,
    options,
  });
};

exports.builder = yargs => {
  addConfigOptions(yargs, true);
  addPortalOptions(yargs, true);
  addOverwriteOptions(yargs, true);
  addModeOptions(yargs, { read: true }, true);
  addUseEnvironmentOptions(yargs, true);

  yargs.positional('src', {
    describe: 'Path in HubSpot Design Tools',
    type: 'string',
  });

  yargs.positional('dest', {
    describe:
      'Local directory you would like the files to be placed in, relative to your current working directory',
    type: 'string',
  });

  return yargs;
};
