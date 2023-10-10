'use strict';

const fs = require('fs');
const { isEmpty } = require('lodash');

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
    if (isEmpty(ctx.request.body)) {
      await strapi.plugin('config-sync').service('main').exportAllConfig();
    } else {
      await Promise.all(ctx.request.body.map(async (configName) => {
        await strapi.plugin('config-sync').service('main').exportSingleConfig(configName);
      }));
    }


    ctx.send({
      message: `Config was successfully exported to ${strapi.config.get('plugin.config-sync.syncDir')}.`,
    });
  },

  /**
   * Import all config, from filesystem to db.
   *
   * @param {object} ctx - Request context object.
   * @returns {void}
   */
  importAll: async (ctx) => {
    // Check for existance of the config file sync dir.
    if (!fs.existsSync(strapi.config.get('plugin.config-sync.syncDir'))) {
      ctx.send({
        message: 'No config files were found.',
      });

      return;
    }

    if (!ctx.request.body.config) {
      ctx.send({
        message: 'No config was specified for the import endpoint.',
      });

      return;
    }

    await Promise.all(ctx.request.body.config.map(async (configName) => {
      await strapi.plugin('config-sync').service('main').importSingleConfig(configName, null, ctx.request.body.force);
    }));

    ctx.send({
      message: 'Config was successfully imported.',
    });
  },

  /**
   * Get config diff between filesystem & db.
   *
   * @param {object} ctx - Request context object.
   * @returns {object} formattedDiff - The formatted diff object.
   * @returns {object} formattedDiff.fileConfig - The config as found in the filesystem.
   * @returns {object} formattedDiff.databaseConfig - The config as found in the database.
   * @returns {object} formattedDiff.diff - The diff between the file config and databse config.
   */
  getDiff: async (ctx) => {
    // Check for existance of the config file sync dir.
    if (!fs.existsSync(strapi.config.get('plugin.config-sync.syncDir'))) {
      ctx.send({
        message: 'No config files were found.',
      });

      return;
    }

    return strapi.plugin('config-sync').service('main').getFormattedDiff();
  },

  zipConfig: async (ctx) => {
    // Check for existance of the config file sync dir.
    if (!fs.existsSync(strapi.config.get('plugin.config-sync.syncDir'))) {
      ctx.send({
        message: 'No config files were found.',
      });

      return;
    }

    return strapi.plugin('config-sync').service('main').zipConfigFiles();
  },

  /**
   * Get the current Strapi env.
   * @returns {string} The current Strapi environment.
   */
  getAppEnv: async () => {
    return {
      env: strapi.server.app.env,
      config: strapi.config.get('plugin.config-sync'),
    };
  },
};
