/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { LoginResultResponse, SolixApi } from './api';
import { getConfig } from './config';
import { consoleLogger } from './logger';
import { FilePersistence, Persistence } from './persistence';
import express, { Express, Request, Response } from 'express';
const app: Express = express();

const config = getConfig();
const logger = consoleLogger(config.verbose);
const device = config.deviceSn;

const api = new SolixApi({
  username: config.username,
  password: config.password,
  country: config.country,
  logger,
});

const persistence: Persistence<LoginResultResponse> = new FilePersistence(
  config.loginStore,
);

function isLoginValid(loginData: LoginResultResponse, now: Date = new Date()) {
  return new Date(loginData.token_expires_at * 1000).getTime() > now.getTime();
}

export async function fetchAndPublish(): Promise<Map<string, object>> {
  const devices = new Map<string, object>();
  logger.log('Fetching data');
  let loginData = await persistence.retrieve();
  if (loginData == null || !isLoginValid(loginData)) {
    const loginResponse = await api.login();
    loginData = loginResponse.data ?? null;
    if (loginData) {
      await persistence.store(loginData);
    } else {
      logger.error(
        `Could not log in: ${loginResponse.msg} (${loginResponse.code})`,
      );
      throw new Error('Could not log in');
    }
  } else {
    logger.log('Using cached auth data');
  }
  const loggedInApi = api.withLogin(loginData);
  const siteHomepage = await loggedInApi.siteHomepage();
  if (!loginData) {
    throw new Error('No login data available');
  }
  let sites;
  if (!siteHomepage.data) {
    throw new Error('Unknown error during fetching data');
  }
  if (siteHomepage.data.site_list?.length === 0) {
    // Fallback for Shared Accounts
    sites = (await loggedInApi.getSiteList()).data.site_list;
  } else {
    sites = siteHomepage.data.site_list;
  }
  let deviceList = await loggedInApi.getRelateAndBindDevices();
  console.debug('deviceList', deviceList);

  for (const site of sites) {
    const scenInfo = await loggedInApi.scenInfo(site.site_id);
    const deviceSn = scenInfo.data.solarbank_info.solarbank_list[0].device_sn;
    console.debug(`Logging for device ${deviceSn}`, scenInfo);
    const energyAnalysis = await loggedInApi.energyAnalysis({
      siteId: site.site_id,
      deviceSn: device,
      type: 'day',
    });
    console.debug('energyAnalysis', energyAnalysis);
    console.debug('scenInfo', scenInfo);
    devices.set(scenInfo.data.solarbank_info.solarbank_list[0].device_sn, {
      solar_pv1: Number(scenInfo.data.solarbank_info.solar_power_1),
      solar_pv2: Number(scenInfo.data.solarbank_info.solar_power_2),
      solar_pv3: Number(scenInfo.data.solarbank_info.solar_power_3),
      solar_pv4: Number(scenInfo.data.solarbank_info.solar_power_4),
      solar_total: Number(
        scenInfo.data.solarbank_info.solarbank_list[0].photovoltaic_power,
      ),
      bat_soc: Number(
        scenInfo.data.solarbank_info.solarbank_list[0].battery_power,
      ),
      battery_charge: Number(
        scenInfo.data.solarbank_info.solarbank_list[0].charging_power,
      ),
      battery_discharge: Number(
        scenInfo.data.solarbank_info.battery_discharge_power,
      ),
      to_home: Number(scenInfo.data.solarbank_info.total_output_power),
    });
    deviceList = await loggedInApi.getRelateAndBindDevices();
    console.log(
      'Current device stats',
      devices.get(scenInfo.data.solarbank_info.solarbank_list[0].device_sn),
    );
  }
  logger.log('Published.');
  return new Promise<Map<string, object>>((resolve, reject) => {
    resolve(devices);
  });
}

export async function fetchDeviceStats(): Promise<Map<string, object>> {
  return fetchAndPublish();
}
