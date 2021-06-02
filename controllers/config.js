'use strict';

const fs = require('fs');
const difference = require('../utils/getObjectDiff');

/**
 * Main controllers for config import/export.
 */

module.exports = {
  /**
   * Export all config, from db to filesystem.
   *
   * @param {object} ctx - Request context object.
   * @returns {void}
   */
  exportAll: async (ctx) => {
    await strapi.plugins['config-sync'].services.main.exportAllConfig();

    ctx.send({
      message: `Config was successfully exported to ${strapi.plugins['config-sync'].config.destination}.`
    });
  },

  /**
   * Import all config, from filesystem to db.
   *
   * @param {object} ctx - Request context object.
   * @returns {void}
   */
  importAll: async (ctx) => {
    // Check for existance of the config file destination dir.
    if (!fs.existsSync(strapi.plugins['config-sync'].config.destination)) {
      ctx.send({
        message: 'No config files were found.'
      });

      return;
    }
    
    await strapi.plugins['config-sync'].services.main.importAllConfig();

    ctx.send({
      message: 'Config was successfully imported.'
    });
  },

  /**
   * Get config diff between filesystem & db.
   *
   * @param {object} ctx - Request context object.
   * @returns Object with key value pairs of config.
   */
  getDiff: async (ctx) => {
    // Check for existance of the config file destination dir.
    if (!fs.existsSync(strapi.plugins['config-sync'].config.destination)) {
      ctx.send({
        message: 'No config files were found.'
      });

      return;
    }

    const formattedDiff = {
      fileConfig: {},
      databaseConfig: {},
      diff: {}
    };
    
    const fileConfig = await strapi.plugins['config-sync'].services.main.getAllConfigFromFiles();
    const databaseConfig = await strapi.plugins['config-sync'].services.main.getAllConfigFromDatabase();

    const diff = difference(databaseConfig, fileConfig);

    formattedDiff.diff = diff;

    Object.keys(diff).map((changedConfigName) => {
      formattedDiff.fileConfig[changedConfigName] = fileConfig[changedConfigName];
      formattedDiff.databaseConfig[changedConfigName] = databaseConfig[changedConfigName];
    });

    return formattedDiff;
  },
};
