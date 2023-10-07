import { MicroserviceConnection } from "../app/models/contracts/microservice";


const { version: appVersion, name: appName } = require('../package.json');

const ENV_NAME = process.env.ENV_NAME || 'LOCAL';
const msport = (process.env.ENV_NAME || 'LOCAL') !== 'LOCAL' ? 3000 : 3007;

const serviceConfigs = {
  port: msport,
  envName: ENV_NAME,
  createPingEndpoint: 'http://orchestrator.dev.create.pwcinternal.com/ping',
  appName: appName,
  appVersion: process.env.CHARTS_RELEASE_VERSION || appVersion // charts release or package.json version
};

const USE_LOCAL_LOGGER = process.env.USE_LOCAL_LOGGER || false;

// App Dynamics
const debug = process.env.APPD_DEBUG || true;
const controllerHostName = process.env.APPDYNAMICS_CONTROLLER_HOST_NAME || '<hostname>';
const controllerPort = process.env.APPDYNAMICS_CONTROLLER_PORT || 443;
const controllerSslEnabled = process.env.APPDYNAMICS_CONTROLLER_SSL_ENABLED || true;
const accountName = process.env.APPDYNAMICS_ACCOUNT_NAME || '<accountname>';
const accountAccessKey = process.env.APPDYNAMICS_ACCOUNT_ACCESS_KEY || '<accesskey>';
const applicationName = process.env.APPDYNAMICS_APPLICATION_NAME || '<appname>';
const tierName = '<servicename>' || process.env.APPDYNAMICS_TIER_NAME;
const nodeName = '<servicename>' || process.env.APPDYNAMICS_NODE_NAME;
const reuseNode = true;
const reuseNodePrefix = '<servicename>';
const libagent = true;

const appDynamicsConfigs = {
  environmentName: ENV_NAME,
  port: msport,
  enableAppdynamics: process.env.ENABLE_APPDYNAMICS || false,
  appdynamicsProfile: {
    debug: debug,
    controllerHostName: controllerHostName,
    controllerPort: controllerPort,
    controllerSslEnabled: controllerSslEnabled,
    accountName: accountName,
    accountAccessKey: accountAccessKey,
    applicationName: applicationName,
    tierName: tierName,
    nodeName: nodeName,
    reuseNode: reuseNode,
    reuseNodePrefix: reuseNodePrefix,
    libagent: libagent
  }
};
// /App Dynamics

const microservices = {
  logger: new MicroserviceConnection('http://auditLogs', 3009, 'auditlogs'),
}

export { serviceConfigs, appDynamicsConfigs, microservices, USE_LOCAL_LOGGER};
