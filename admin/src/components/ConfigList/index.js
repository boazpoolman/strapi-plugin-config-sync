import React, { useState, useEffect } from 'react';
import { Table } from '@buffetjs/core';
import { isEmpty } from 'lodash';
import ConfigDiff from '../ConfigDiff';
import FirstExport from '../FirstExport';
import ConfigListRow from './ConfigListRow';

const headers = [
  {
    name: 'Config name',
    value: 'config_name',
  },
  {
    name: 'Config type',
    value: 'config_type',
  },
  {
    name: 'State',
    value: 'state',
  },
];

const ConfigList = ({ diff, isLoading }) => {
  const [openModal, setOpenModal] = useState(false);
  const [originalConfig, setOriginalConfig] = useState({});
  const [newConfig, setNewConfig] = useState({});
  const [configName, setConfigName] = useState('');
  const [rows, setRows] = useState([]);

  const getConfigState = (configName) => {
    if (
      diff.fileConfig[configName] &&
      diff.databaseConfig[configName]
    ) {
      return 'Different'
    } else if (
      diff.fileConfig[configName] &&
      !diff.databaseConfig[configName]
    ) {
      return 'Only in sync dir'
    } else if (
      !diff.fileConfig[configName] &&
      diff.databaseConfig[configName]
    ) {
      return 'Only in DB'
    }
  };

  useEffect(() => {
    if (isEmpty(diff.diff)) {
      setRows([]);
      return;
    }

    let formattedRows = [];
    Object.keys(diff.diff).map((configName) => {
      const type = configName.split('.')[0]; // Grab the first part of the filename.
      const name = configName.split(/\.(.+)/)[1]; // Grab the rest of the filename minus the file extension.

      formattedRows.push({ 
        config_name: name,
        config_type: type,
        state: getConfigState(configName),
        onClick: (config_type, config_name) => {
          setOriginalConfig(diff.fileConfig[`${config_type}.${config_name}`]);
          setNewConfig(diff.databaseConfig[`${config_type}.${config_name}`]);
          setConfigName(`${config_type}.${config_name}`);
          setOpenModal(true);
        }
      });
    });

    setRows(formattedRows);
  }, [diff]);
  
  const closeModal = () => {
    setOriginalConfig({});
    setNewConfig({});
    setConfigName('');
    setOpenModal(false);
  };

  if (!isLoading && !isEmpty(diff.message)) {
    return <FirstExport />
  }

  return (
    <div>
      <ConfigDiff
        isOpen={openModal}
        oldValue={originalConfig}
        newValue={newConfig}
        onClose={closeModal}
        onToggle={closeModal}
        configName={configName}
      />
      <Table
        headers={headers}
        customRow={ConfigListRow}
        rows={!isLoading ? rows : []}
        isLoading={isLoading}
        tableEmptyText="No config changes. You are up to date!"
      />
    </div>
  );
}

export default ConfigList;