/* eslint-disable no-unused-vars */
const serverOnlyPath = require.resolve('server-only');
require.cache[serverOnlyPath] = {
  id: serverOnlyPath,
  filename: serverOnlyPath,
  loaded: true,
  exports: {},
};
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request, _parent, _isMain) {
  if (request === 'server-only' || request.includes('server-only')) {
    return {};
  }
  return origLoad.apply(this, arguments);
};
