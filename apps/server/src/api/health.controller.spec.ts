import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports process health without external dependencies', () => {
    expect(new HealthController().getHealth()).toEqual({ status: 'ok' });
  });
});
