const {
  addPortalOptions,
  addConfigOptions,
  setLogLevel,
  getPortalId,
  addUseEnvironmentOptions,
} = require('../lib/commonOpts');
const { trackCommandUsage } = require('../lib/usageTracking');
const { logDebugInfo } = require('../lib/debugInfo');
const { validatePortal } = require('../lib/validation');
const {
  loadConfig,
  validateConfig,
  checkAndWarnGitInclusion,
} = require('@hubspot/cms-lib');
const { logger } = require('@hubspot/cms-lib/logger');
const {
  logApiErrorInstance,
  ApiErrorContext,
} = require('@hubspot/cms-lib/errorHandlers');
const {
  getDirectoryContentsByPath,
} = require('@hubspot/cms-lib/api/fileMapper');
const {
  HUBSPOT_FOLDER,
  MARKETPLACE_FOLDER,
} = require('@hubspot/cms-lib/lib/constants');

const FOLDER_DOT_EXTENSIONS = ['functions'];

const loadAndValidateOptions = async options => {
  setLogLevel(options);
  logDebugInfo(options);
  const { config: configPath } = options;
  loadConfig(configPath, options);
  checkAndWarnGitInclusion();

  if (!(validateConfig() && (await validatePortal(options)))) {
    process.exit(1);
  }
};

exports.command = 'ls [path]';
exports.describe = 'get remote contents of a directory';

exports.handler = async options => {
  loadAndValidateOptions(options);

  const { path } = options;
  const directoryPath = path || '/';
  const portalId = getPortalId(options);

  trackCommandUsage('ls', {}, portalId);

  logger.debug(`Getting contents of ${directoryPath}`);

  const contentsResp = await getDirectoryContentsByPath(
    portalId,
    directoryPath
  ).catch(async e => {
    await logApiErrorInstance(
      portalId,
      e,
      new ApiErrorContext({ portalId, directoryPath })
    );
    process.exit();
  });

  if (contentsResp.children.length) {
    const mappedContents = contentsResp.children.map(fileOrFolder => {
      const splitName = fileOrFolder.split('.');

      if (
        splitName.length > 1 &&
        FOLDER_DOT_EXTENSIONS.indexOf(splitName[1]) === -1
      ) {
        return fileOrFolder;
      }

      return `/${fileOrFolder}`;
    });
    const hubspotFolder = `/${HUBSPOT_FOLDER}`;
    const marketplaceFolder = `/${MARKETPLACE_FOLDER}`;

    logger.log(
      mappedContents
        .sort(function(a, b) {
          // Pin @hubspot folder to top
          if (a === hubspotFolder) {
            return -1;
          } else if (b === hubspotFolder) {
            return 1;
          }

          // Pin @marketplace folder to top
          if (a === marketplaceFolder) {
            return -1;
          } else if (b === marketplaceFolder) {
            return 1;
          }

          // Sort alphabetically regardless of capitalization
          const aVal = a.toLowerCase();
          const bVal = b.toLowerCase();
          if (aVal > bVal) {
            return 1;
          } else if (aVal < bVal) {
            return -1;
          }
          return 0;
        })
        .join('\n')
    );
  } else {
    logger.info(`No files found in ${directoryPath}`);
  }
};

exports.builder = yargs => {
  yargs.positional('path', {
    describe: 'Remote directory to list contents',
    type: 'string',
  });
  yargs.example([['$0 ls'], ['$0 ls /'], ['$0 ls serverless']]);

  addConfigOptions(yargs, true);
  addPortalOptions(yargs, true);
  addUseEnvironmentOptions(yargs, true);

  return yargs;
};