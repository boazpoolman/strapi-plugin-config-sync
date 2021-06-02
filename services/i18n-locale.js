'use strict';

const i18nQueryString = 'i18n_locales';
const configPrefix = 'i18n-locale'; // Should be the same as the filename.

const difference = require('../utils/getObjectDiff');
const { sanitizeEntity } = require('strapi-utils');

/**
 * Import/Export for i18n-locale configs.
 */

module.exports = {
  /**
   * Export all i18n-locale config to files.
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
        await strapi.plugins['config-sync'].services.main.writeConfigFile(configPrefix, currentConfig.code, currentConfig);
      }
    }));
  },

  /**
   * Import a single i18n-locale config file into the db.
   *
   * @param {string} configName - The name of the config file.
   * @param {string} configContent - The JSON content of the config file.
   * @returns {void}
   */
  importSingle: async (configName, configContent) => {
    // Check if the config should be excluded.
    const shouldExclude = strapi.plugins['config-sync'].config.exclude.includes(`${configPrefix}.${configName}`);
    if (shouldExclude) return;

    const service =
      strapi.plugins['i18n'].services.locales;
      
    const locale = await service.findByCode(configName);

    if (locale && configContent === null) {
      await service.deleteFn(locale);
      return;
    }

    if (!locale) {
      await service.create(configContent);
    } else {
      await service.update({ id: locale.id }, configContent);
    }
  },

  /**
   * Get all i18n-locale config from the db.
   *
   * @returns {object} Object with code value pairs of configs.
   */
   getAllFromDatabase: async () => {
    const service =
      strapi.plugins['i18n'].services.locales;

    const locales = await service.find({ _limit: -1 });
    let configs = {};

    const sanitizedLocalesArray = locales.map(locale =>
      sanitizeEntity(locale, {
        model: strapi.plugins['i18n'].models.locale,
      })
    );

    Object.values(sanitizedLocalesArray).map( ({ id, code, ...config }) => {
      // Check if the config should be excluded.
      const shouldExclude = strapi.plugins['config-sync'].config.exclude.includes(`${configPrefix}.${code}`);
      if (shouldExclude) return;

      // Do not export timestamp fields
      delete config.created_at;
      delete config.updated_at;

      // Do not export the _id field, as it is immutable
      delete config._id;

      configs[`${configPrefix}.${code}`] = { code, ...config };
    });

    return configs;
  },

  /**
   * Import all i18n-locale config files into the db.
   *
   * @returns {void}
   */
   importAll: async () => {
    // The main.importAllConfig service will loop the i18n-locale.importSingle service.
    await strapi.plugins['config-sync'].services.main.importAllConfig(configPrefix);
  },

  /**
   * Export a single i18n-locale config to a file.
   *
   * @param {string} configName - The name of the config file.
   * @returns {void}
   */
   exportSingle: async (configName) => {
     // @TODO: write export for a single i18n-locale config.
  },
};
