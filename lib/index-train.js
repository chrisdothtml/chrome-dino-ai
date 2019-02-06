/* eslint-disable */
import fs from 'fs'
import Game from './game/Game.js'
import config from './common/config.js'

const synaptic = require('synaptic')
const generations = pathExists('generations.json') ? require('../generations.json') : {}
const aiSettings = config.settings.ai
// const configKey = `mRate ${aiSettings.mutationRate}, mDev ${aiSettings.mutationDeviation}, pop ${aiSettings.populationSize}`
const configKey = `pop ${aiSettings.populationSize}; rewards + genetic`

// if (generations[configKey]) throw new Error('already ran with this config')

const GENERATION = generations[configKey] = []
let GAME

// if (pathExists('best-dino.json')) {
//   const baseBrain = synaptic.Network.fromJSON(
//     JSON.parse(
//       fs.readFileSync('best-dino.json', 'utf-8')
//     )
//   )

//   GAME = new Game({ baseBrain, synaptic })
// } else {
  GAME = new Game({ synaptic })
// }

function pathExists (input) {
  try {
    fs.accessSync(input)
    return true
  } catch (e) {
    return false
  }
}

while (GAME.generations < 200) {
  const newGenerations = []

  for (let i = 0; i < 10; i++) {
    GAME.processNextGeneration()
    newGenerations.push(GAME.lastGenerationScore)
  }

  GENERATION.push(...newGenerations)
  fs.writeFileSync('generations.json', JSON.stringify(generations))
  fs.writeFileSync('best-dino.json', JSON.stringify(GAME.bestBrain.toJSON()))
}
