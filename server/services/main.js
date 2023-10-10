'use strict';

const { isEmpty } = require('lodash');
const fs = require('fs');
const util = require('util');
const difference = require('../utils/getObjectDiff');
const { logMessage } = require('../utils');
const child_process = require("child_process");

/**
 * Main services for config import/export.
 */

module.exports = () => ({
  /**
   * Write a single config file.
   *
   * @param {string} configType - The type of the config.
   * @param {string} configName - The name of the config file.
   * @param {string} fileContents - The JSON content of the config file.
   * @returns {void}
   */
  writeConfigFile: async (configType, configName, fileContents) => {
    // Check if the config should be excluded.
    const shouldExclude = !isEmpty(strapi.config.get('plugin.config-sync.excludedConfig').filter((option) => `${configType}.${configName}`.startsWith(option)));
    if (shouldExclude) return;

    // Replace reserved characters in filenames.
    configName = configName.replace(/:/g, "#").replace(/\//g, "$");

    // Check if the JSON content should be minified.
    const json = !strapi.config.get('plugin.config-sync').minify
      ? JSON.stringify(fileContents, null, 2)
      : JSON.stringify(fileContents);

    if (!fs.existsSync(strapi.config.get('plugin.config-sync.syncDir'))) {
      fs.mkdirSync(strapi.config.get('plugin.config-sync.syncDir'), { recursive: true });
    }

    const writeFile = util.promisify(fs.writeFile);
    await writeFile(`${strapi.config.get('plugin.config-sync.syncDir')}${configType}.${configName}.json`, json)
      .then(() => {
        // @TODO:
        // Add logging for successfull config export.
      })
      .catch(() => {
        // @TODO:
        // Add logging for failed config export.
      });
  },

  /**
   * Delete config file.
   *
   * @param {string} configName - The name of the config file.
   * @returns {void}
   */
  deleteConfigFile: async (configName) => {
    // Check if the config should be excluded.
    const shouldExclude = !isEmpty(strapi.config.get('plugin.config-sync.excludedConfig').filter((option) => configName.startsWith(option)));
    if (shouldExclude) return;

    // Replace reserved characters in filenames.
    configName = configName.replace(/:/g, "#").replace(/\//g, "$");

    fs.unlinkSync(`${strapi.config.get('plugin.config-sync.syncDir')}${configName}.json`);
  },

  /**
   * Zip config files.
   *
   * @param {string} configName - The name of the config file.
   * @returns {void}
   */
  zipConfigFiles: async () => {
    const fileName = `config-${new Date().toJSON()}.zip`
    child_process.execSync(`zip -r ${fileName} *`, {
      cwd: strapi.config.get('plugin.config-sync.syncDir')
    });
    const fullFilePath = `${strapi.config.get('plugin.config-sync.syncDir')}${fileName}`
    const stats = fs.statSync(fullFilePath);

    const result = await strapi.plugins.upload.services.upload.upload({
      data: {}, //mandatory declare the data(can be empty), otherwise it will give you an undefined error. This parameters will be used to relate the file with a collection.
      files: {
        path: fullFilePath,
        name: `configs/${fileName}`,
        type: 'application/zip', // mime type of the file
        size: stats.size,
      },
    });
    fs.unlinkSync(fullFilePath);
    return { url: result[0].url, message: 'Success' };
  },

  /**
   * Read from a config file.
   *
   * @param {string} configType - The type of config.
   * @param {string} configName - The name of the config file.
   * @returns {object} The JSON content of the config file.
   */
  readConfigFile: async (configType, configName) => {
    // Replace reserved characters in filenames.
    configName = configName.replace(/:/g, "#").replace(/\//g, "$");

    const readFile = util.promisify(fs.readFile);
    return readFile(`${strapi.config.get('plugin.config-sync.syncDir')}${configType}.${configName}.json`)
      .then((data) => {
        return JSON.parse(data);
      })
      .catch(() => {
        return null;
      });
  },


  /**
   * Get all the config JSON from the filesystem.
   *
   * @param {string} configType - Type of config to gather. Leave empty to get all config.
   * @returns {object} Object with key value pairs of configs.
   */
  getAllConfigFromFiles: async (configType = null) => {
    if (!fs.existsSync(strapi.config.get('plugin.config-sync.syncDir'))) {
      return {};
    }

    const configFiles = fs.readdirSync(strapi.config.get('plugin.config-sync.syncDir'));

    const getConfigs = async () => {
      const fileConfigs = {};

      await Promise.all(configFiles.map(async (file) => {
        const type = file.split('.')[0]; // Grab the first part of the filename.
        const name = file.split(/\.(.+)/)[1].split('.').slice(0, -1).join('.'); // Grab the rest of the filename minus the file extension.

        // Put back reserved characters from filenames.
        const formattedName = name.replace(/#/g, ":").replace(/\$/g, "/");

        if (
          configType && configType !== type
          || !strapi.plugin('config-sync').types[type]
          || !isEmpty(strapi.config.get('plugin.config-sync.excludedConfig').filter((option) => `${type}.${name}`.startsWith(option)))
        ) {
          return;
        }

        const fileContents = await strapi.plugin('config-sync').service('main').readConfigFile(type, name);

        if (!fileContents) {
          strapi.log.warn(logMessage(`An empty config file '${file}' was found in the sync directory`));
          return;
        }

        fileConfigs[`${type}.${formattedName}`] = fileContents;
      }));

      return fileConfigs;
    };

    return getConfigs();
  },

  /**
   * Get all the config JSON from the database.
   *
   * @param {string} configType - Type of config to gather. Leave empty to get all config.
   * @returns {object} Object with key value pairs of configs.
   */
  getAllConfigFromDatabase: async (configType = null) => {
    const getConfigs = async () => {
      let databaseConfigs = {};

      await Promise.all(Object.entries(strapi.plugin('config-sync').types).map(async ([name, type]) => {
        if (configType && configType !== name) {
          return;
        }

        const config = await type.getAllFromDatabase();
        databaseConfigs = Object.assign(config, databaseConfigs);
      }));

      return databaseConfigs;
    };

    return getConfigs();
  },

  /**
   * Import all config files into the db.
   *
   * @param {string} configType - Type of config to impor. Leave empty to import all config.
   * @param {object} onSuccess - Success callback to run on each single successfull import.
   * @returns {void}
   */
  importAllConfig: async (configType = null, onSuccess) => {
    const fileConfig = await strapi.plugin('config-sync').service('main').getAllConfigFromFiles();
    const databaseConfig = await strapi.plugin('config-sync').service('main').getAllConfigFromDatabase();

    const diff = difference(databaseConfig, fileConfig);

    await Promise.all(Object.keys(diff).map(async (file) => {
      const type = file.split('.')[0]; // Grab the first part of the filename.
      const name = file.split(/\.(.+)/)[1]; // Grab the rest of the filename.

      if (configType && configType !== type) {
        return;
      }

      await strapi.plugin('config-sync').service('main').importSingleConfig(`${type}.${name}`, onSuccess);
    }));
  },

  /**
   * Export all config files.
   *
   * @param {string} configType - Type of config to export. Leave empty to export all config.
   * @param {object} onSuccess - Success callback to run on each single successfull import.
   * @returns {void}
   */
  exportAllConfig: async (configType = null, onSuccess) => {
    const fileConfig = await strapi.plugin('config-sync').service('main').getAllConfigFromFiles();
    const databaseConfig = await strapi.plugin('config-sync').service('main').getAllConfigFromDatabase();

    const diff = difference(databaseConfig, fileConfig);

    await Promise.all(Object.keys(diff).map(async (file) => {
      const type = file.split('.')[0]; // Grab the first part of the filename.
      const name = file.split(/\.(.+)/)[1]; // Grab the rest of the filename.

      if (configType && configType !== type) {
        return;
      }

      await strapi.plugin('config-sync').service('main').exportSingleConfig(`${type}.${name}`, onSuccess);
    }));
  },

  /**
   * Import a single config file into the db.
   *
   * @param {string} configName - The name of the config file.
   * @param {object} onSuccess - Success callback to run on each single successfull import.
   * @param {boolean} force - Ignore the soft setting.
   * @returns {void}
   */
  importSingleConfig: async (configName, onSuccess, force) => {
    // Check if the config should be excluded.
    const shouldExclude = !isEmpty(strapi.config.get('plugin.config-sync.excludedConfig').filter((option) => configName.startsWith(option)));
    if (shouldExclude) return;

    const type = configName.split('.')[0]; // Grab the first part of the filename.
    const name = configName.split(/\.(.+)/)[1]; // Grab the rest of the filename.
    const fileContents = await strapi.plugin('config-sync').service('main').readConfigFile(type, name);

    try {
      const importState = await strapi.plugin('config-sync').types[type].importSingle(name, fileContents, force);
      if (onSuccess && importState !== false) onSuccess(`${type}.${name}`);
    } catch (e) {
      throw new Error(`Error when trying to import ${type}.${name}. ${e}`);
    }
  },

  /**
   * Export a single config file.
   *
   * @param {string} configName - The name of the config file.
   * @param {object} onSuccess - Success callback to run on each single successfull import.
   *
   * @returns {void}
   */
  exportSingleConfig: async (configName, onSuccess) => {
    // Check if the config should be excluded.
    const shouldExclude = !isEmpty(strapi.config.get('plugin.config-sync.excludedConfig').filter((option) => configName.startsWith(option)));
    if (shouldExclude) return;

    const type = configName.split('.')[0]; // Grab the first part of the filename.
    const name = configName.split(/\.(.+)/)[1]; // Grab the rest of the filename.

    try {
      await strapi.plugin('config-sync').types[type].exportSingle(configName);
      if (onSuccess) onSuccess(`${type}.${name}`);
    } catch (e) {
      throw new Error(`Error when trying to export ${type}.${name}. ${e}`);
    }
  },

  /**
   * Get the formatted diff.
   *
   * @param {string} configType - Type of config to get the diff of. Leave empty to get the diff of all config.
   *
   * @returns {object} - the formatted diff.
   */
  getFormattedDiff: async (configType = null) => {
    const formattedDiff = {
      fileConfig: {},
      databaseConfig: {},
      diff: {},
    };

    const fileConfig = await strapi.plugin('config-sync').service('main').getAllConfigFromFiles(configType);
    const databaseConfig = await strapi.plugin('config-sync').service('main').getAllConfigFromDatabase(configType);

    const diff = difference(databaseConfig, fileConfig);

    formattedDiff.diff = diff;

    Object.keys(diff).map((changedConfigName) => {
      formattedDiff.fileConfig[changedConfigName] = fileConfig[changedConfigName];
      formattedDiff.databaseConfig[changedConfigName] = databaseConfig[changedConfigName];
    });

    return formattedDiff;
  },
});
