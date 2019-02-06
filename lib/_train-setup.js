if (process.env.SEED) {
  require('seedrandom')(process.env.SEED, { global: true })
}
