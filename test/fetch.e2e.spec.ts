/// <reference types="jest-extended" />
import { SolixApi } from '@t21n/solix-api';
import { fetchAndPublish } from '../src/fetch';

const config = {
  username: process.env.ANKER_USERNAME as string,
  password: process.env.ANKER_PASSWORD as string,
  country: process.env.ANKER_COUNTRY as string,
};
test('should load device stats', async () => {
  const api = new SolixApi({
    username: config.username,
    password: config.password,
    country: config.country,
  });
  await api.login();
  const devices = await fetchAndPublish();
  expect(devices.size).toBeGreaterThan(0);
}, 20000);
