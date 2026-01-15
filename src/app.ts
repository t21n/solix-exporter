/* eslint-disable @typescript-eslint/restrict-template-expressions */
import { fetchDeviceStats } from './fetch';
import { anonymizeConfig, getConfig } from './config';
import { consoleLogger } from './logger';
import { sleep } from './utils';
import express, { Express, Request, Response } from 'express';
const app: Express = express();

const config = getConfig();
const logger = consoleLogger(config.verbose);
const port = config.httpPort;
const device = config.deviceSn;

let devices: Map<string, object> = new Map<string, object>();

export function restService() {
  app.get('/', (req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const deviceInfo: any = devices.get(device);
    if (deviceInfo) {
      const response = `
# TYPE solar_api_status gauge
# HELP solar_api_status Status of the Solix API, 1 (normal), -1 (error)
solar_api_status 0
# HELP solar_now_p current watt of solar
# TYPE solar_now_p gauge
solar_now_p ${Math.round(<number>deviceInfo.solar_total)}
# HELP solar_now_bat current power of battery (percentage, 0-1)
# TYPE solar_now_bat gauge
solar_now_bat ${Math.round(<number>deviceInfo.bat_soc)}
# HELP solar_now_bat_charge_p current power for charging in watt
# TYPE solar_now_bat_charge_p gauge
solar_now_bat_charge_p ${Math.round(<number>deviceInfo.battery_charge)}
# HELP solar_now_bat_discharge_p current power for discharging in watt
# TYPE solar_now_bat_discharge_p gauge
solar_now_bat_discharge_p ${Math.round(<number>deviceInfo.battery_discharge)}
# HELP solar_now_grid current watt to grid
# TYPE solar_now_grid gauge
solar_now_grid ${Math.round(<number>deviceInfo.to_home)}
`;
      res.type('txt');
      res.send(response);
    } else {
      const response = `
      # TYPE solar_api_status gauge
      # HELP solar_api_status Status of the Solix API, 1 (normal), -1 (error)
      solar_api_status -1
      `;
      res.type('txt');
      res.send(response);
      console.log('No data available');
    }
  });

  app.listen(port, () => {
    console.log(`Exporter listening on port ${port}`);
  });
}
async function run(): Promise<void> {
  logger.log(JSON.stringify(anonymizeConfig(config)));

  for (;;) {
    const start = new Date().getTime();
    try {
      devices = await fetchDeviceStats();
    } catch (e) {
      logger.warn('Failed fetching or publishing printer data', e);
    }
    const end = new Date().getTime() - start;
    const sleepInterval = config.pollInterval * 1000 - end;
    logger.log(`Sleeping for ${sleepInterval}ms...`);
    await sleep(sleepInterval);
  }
}

run()
  .then(() => {
    logger.log('Done');
  })
  .catch((err) => {
    logger.error(err);
    process.exit(1);
  });

restService();
