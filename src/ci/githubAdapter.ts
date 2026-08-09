import * as core from '@actions/core';
import CIAdapter from './CIAdapter';

const self : CIAdapter = {
    getInput: (key, defaultValue) => { return core.getInput(key) ?? defaultValue; },
    info: (message) => { core.info(message); },
    warn: (message) => { core.warning(message); },
    error: (message) => { core.setFailed(message); },
    setOutput: (key, output) => { core.setOutput(key, output); }
};

export default self;
