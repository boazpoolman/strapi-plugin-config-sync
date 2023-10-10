/**
 *
 * Main actions
 *
 */

import { request } from '@strapi/helper-plugin';

export function getAllConfigDiff(toggleNotification) {
  return async function (dispatch) {
    dispatch(setLoadingState(true));
    try {
      const configDiff = await request('/config-sync/diff', { method: 'GET' });
      dispatch(setConfigPartialDiffInState([]));
      dispatch(setConfigDiffInState(configDiff));
      dispatch(setLoadingState(false));
    } catch (err) {
      toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
      dispatch(setLoadingState(false));
    }
  };
}

export const SET_CONFIG_DIFF_IN_STATE = 'SET_CONFIG_DIFF_IN_STATE';
export function setConfigDiffInState(config) {
  return {
    type: SET_CONFIG_DIFF_IN_STATE,
    config,
  };
}

export const SET_CONFIG_PARTIAL_DIFF_IN_STATE = 'SET_CONFIG_PARTIAL_DIFF_IN_STATE';
export function setConfigPartialDiffInState(config) {
  return {
    type: SET_CONFIG_PARTIAL_DIFF_IN_STATE,
    config,
  };
}

export function exportAllConfig(partialDiff, toggleNotification) {
  return async function (dispatch) {
    dispatch(setLoadingState(true));
    try {
      const { message } = await request('/config-sync/export', {
        method: 'POST',
        body: partialDiff,
      });
      toggleNotification({ type: 'success', message });
      dispatch(getAllConfigDiff(toggleNotification));
      dispatch(setLoadingState(false));
    } catch (err) {
      toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
      dispatch(setLoadingState(false));
    }
  };
}

export function downloadZip(toggleNotification) {
  return async function (dispatch) {
    dispatch(setLoadingState(true));
    try {
      const { message, url } = await request('/config-sync/zip', {
        method: 'GET'
      });
      toggleNotification({ type: 'success', message });
      if (url) {
        window.location = url;
      }
      dispatch(setLoadingState(false));
    } catch (err) {
      toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
      dispatch(setLoadingState(false));
    }
  };
}

export function importAllConfig(partialDiff, force, toggleNotification) {
  return async function (dispatch) {
    dispatch(setLoadingState(true));
    try {
      const { message } = await request('/config-sync/import', {
        method: 'POST',
        body: {
          force,
          config: partialDiff,
        },
      });
      toggleNotification({ type: 'success', message });
      dispatch(getAllConfigDiff(toggleNotification));
      dispatch(setLoadingState(false));
    } catch (err) {
      toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
      dispatch(setLoadingState(false));
    }
  };
}

export const SET_LOADING_STATE = 'SET_LOADING_STATE';
export function setLoadingState(value) {
  return {
    type: SET_LOADING_STATE,
    value,
  };
}

export function getAppEnv(toggleNotification) {
  return async function (dispatch) {
    try {
      const envVars = await request('/config-sync/app-env', {
        method: 'GET',
      });
      dispatch(setAppEnvInState(envVars));
    } catch (err) {
      toggleNotification({ type: 'warning', message: { id: 'notification.error' } });
    }
  };
}

export const SET_APP_ENV_IN_STATE = 'SET_APP_ENV_IN_STATE';
export function setAppEnvInState(value) {
  return {
    type: SET_APP_ENV_IN_STATE,
    value,
  };
}
