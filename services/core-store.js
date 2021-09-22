'use strict';

const coreStoreQueryString = 'core_store';
const configPrefix = 'core-store'; // Should be the same as the filename.
const difference = require('../utils/getObjectDiff');

/**
 * Import/Export for core-store configs.
 */

module.exports = {
  /**
   * Export all core-store config to files.
   *
   * @returns {void}
   */
   exportAll: async () => {
    const formattedDiff = {
      fileConfig: {},
      databaseConfig: {},
      diff: {}
    };
    
    const fileConfig = await strapi.plugins['config-sync'].services.main.getAllConfigFromFiles(configPrefix);
    const databaseConfig = await strapi.plugins['config-sync'].services.main.getAllConfigFromDatabase(configPrefix);
    const diff = difference(databaseConfig, fileConfig);

    formattedDiff.diff = diff;

    Object.keys(diff).map((changedConfigName) => {
      formattedDiff.fileConfig[changedConfigName] = fileConfig[changedConfigName];
      formattedDiff.databaseConfig[changedConfigName] = databaseConfig[changedConfigName];
    })

    await Promise.all(Object.entries(diff).map(async ([configName, config]) => {
      // Check if the config should be excluded.
      const shouldExclude = strapi.plugins['config-sync'].config.exclude.includes(`${configName}`);
      if (shouldExclude) return;

      const currentConfig = formattedDiff.databaseConfig[configName];

      if (
        !currentConfig &&
        formattedDiff.fileConfig[configName]
      ) {
        await strapi.plugins['config-sync'].services.main.deleteConfigFile(configName);
      } else {
        await strapi.plugins['config-sync'].services.main.writeConfigFile(configPrefix, currentConfig.key.replace('::', '##'), currentConfig);
      }
    }));
  },

  /**
   * Import a single core-store config file into the db.
   *
   * @param {string} configName - The name of the config file.
   * @param {string} configContent - The JSON content of the config file.
   * @returns {void}
   */
  importSingle: async (configName, configContent) => {
    // Check if the config should be excluded.
    const shouldExclude = strapi.plugins['config-sync'].config.exclude.includes(`${configPrefix}.${configName}`);
    if (shouldExclude) return;

    const coreStoreAPI = strapi.query(coreStoreQueryString);

    const configExists = await coreStoreAPI
      .findOne({ key: configName });

    if (configExists && configContent === null) {
      await coreStoreAPI.delete({ key: configName });

      return;
    }

    const { value, ...fileContent } = configContent;

    if (!configExists) {
      await coreStoreAPI.create({ value: JSON.stringify(value), ...fileContent });
    } else {
      await coreStoreAPI.update({ key: configName }, { value: JSON.stringify(value), ...fileContent });
    }
  },

  /**
   * Get all core-store config from the db.
   *
   * @returns {object} Object with key value pairs of configs.
   */
   getAllFromDatabase: async () => {
    const coreStore = await strapi.query(coreStoreQueryString).find({ _limit: -1 });
    let configs = {};

    Object.values(coreStore).map( ({ id, value, key, ...config }) => {
      // Check if the config should be excluded.
      const shouldExclude = strapi.plugins['config-sync'].config.exclude.includes(`${configPrefix}.${key}`);
      if (shouldExclude) return;

      // Do not export the _id field, as it is immutable
      delete config._id;

      configs[`${configPrefix}.${key}`] = { key, value: JSON.parse(value), ...config };
    });

    return configs;
  },

  /**
   * Import all core-store config files into the db.
   *
   * @returns {void}
   */
   importAll: async () => {
    // The main.importAllConfig service will loop the core-store.importSingle service.
    await strapi.plugins['config-sync'].services.main.importAllConfig(configPrefix);
  },

  /**
   * Export a single core-store config to a file.
   *
   * @param {string} configName - The name of the config file.
   * @returns {void}
   */
   exportSingle: async (configName) => {
     // @TODO: write export for a single core-store config.
  },
};
