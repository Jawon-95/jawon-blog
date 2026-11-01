// Add trusted product backends here. Prices are supplied by authenticated BACKENDS, never browsers.
// Each product must use its own random secret and fixed callback/return paths.
export const paymentApps = Object.freeze({
  topro: {
    secretEnv: 'PAY_TOPRO_SECRET',
    originEnv: 'PAY_TOPRO_ORIGIN',
    defaultOrigin: 'https://topro.braveasy.com',
    notifyPath: '/api/pay/gateway-notify',
    successPath: '/pricing',
    cancelPath: '/pricing',
  },
});
