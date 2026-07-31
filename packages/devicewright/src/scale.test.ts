import { describe, expect, test } from 'bun:test';

import {
  type CloudDeviceAdapter,
  ipadLaunchOptions,
  listCloudAdapters,
  physicalLaunchOptions,
  registerCloudAdapter,
} from './scale';

describe('scale surfaces', () => {
  test('ipadLaunchOptions defaults to iOS iPad simulator', () => {
    const opts = ipadLaunchOptions();
    expect(opts.platform).toBe('ios');
    expect(opts.device).toBe('iPad');
    expect(opts.kind).toBe('simulator');
  });

  test('physicalLaunchOptions marks physical kind and skips boot', () => {
    const opts = physicalLaunchOptions(
      'ios',
      'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE'
    );
    expect(opts.kind).toBe('physical');
    expect(opts.boot).toBe(false);
    expect(opts.deviceId).toBe('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE');
  });

  test('cloud adapters register by name', async () => {
    const adapter: CloudDeviceAdapter = {
      name: 'test-cloud',
      async allocate({ platform }) {
        return { platform, deviceId: 'cloud-1', kind: 'cloud' };
      },
    };
    registerCloudAdapter(adapter);
    expect(listCloudAdapters()).toContain('test-cloud');
    const allocated = await adapter.allocate({ platform: 'android' });
    expect(allocated.kind).toBe('cloud');
  });
});
