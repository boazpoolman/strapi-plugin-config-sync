'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: "POST",
      path: "/export",
      handler: "config.exportAll",
      config: {
        policies: [],
      },
    },
    {
      method: "POST",
      path: "/import",
      handler: "config.importAll",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/diff",
      handler: "config.getDiff",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/zip",
      handler: "config.zipConfig",
      config: {
        policies: [],
      },
    },
    {
      method: "GET",
      path: "/app-env",
      handler: "config.getAppEnv",
      config: {
        policies: [],
      },
    },
  ],
};
