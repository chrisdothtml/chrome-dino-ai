/* eslint-disable no-unused-vars */
import fs from 'fs'
import path from 'path'
import config from './common/config.js'
import Game from './game/Game.js'
let totalAttempts = 0

const { Layer, Network } = require('synaptic')

process.on('exit', () => {
  console.log(`total attempts: ${totalAttempts}`)
})

async function randomlyGenerateMemories () {
  const SCORE_GOAL = 500
  let resolvePromise
  const promise = new Promise(resolve => (resolvePromise = resolve))
  const goodMemories = []

  config.settings.ai.populationSize = 5000

  function hopeForTheBest () {
    totalAttempts++
    const game = new Game()

    game.processNextGeneration()
    for (const dino of game.deadDinos) {
      if (dino.fitness >= SCORE_GOAL) {
        console.log('found a good memory')
        goodMemories.push(dino.memory)
      }
    }

    if (goodMemories.length >= 10) {
      resolvePromise()
    } else {
      process.nextTick(hopeForTheBest)
    }
  }

  process.nextTick(hopeForTheBest)
  return promise
    .then(() => goodMemories)
    // .then(() => {
    //   console.log(`saved ${goodMemories.length} memories`)
    //   fs.writeFileSync('training-data.json', JSON.stringify(goodMemories))
    // })
}

function createBrain () {
  const inputLayer = new Layer(7)
  const hiddenLayer = new Layer(5)
  const outputLayer = new Layer(3)

  inputLayer.project(hiddenLayer)
  hiddenLayer.project(outputLayer)

  return new Network({
    input: inputLayer,
    hidden: [hiddenLayer],
    output: outputLayer
  })
}

function trainNetFromMemories (memoryList) {
  const { learningRate } = config.settings.ai
  const brain = createBrain()

  for (const memories of memoryList) {
    for (const memory of memories) {
      brain.activate(memory.input)
      brain.propagate(learningRate, memory.output)
    }
  }

  console.log(`finished training`)
  fs.writeFileSync('best-dino.json', JSON.stringify(brain.toJSON()))
}

function getAndTrainNetFromMemories () {
  const dirname = 'training-data'
  const { learningRate } = config.settings.ai
  const brain = createBrain()

  for (const filename of fs.readdirSync(dirname)) {
    const memoryList = JSON.parse(
      fs.readFileSync(path.join(dirname, filename), 'utf-8')
    )

    for (const memories of memoryList) {
      for (const memory of memories) {
        brain.activate(memory.input)
        brain.propagate(learningRate, memory.output)
      }
    }

    console.log(`finished training from ${filename}`)
  }

  fs.writeFileSync('best-dino.json', JSON.stringify(brain.toJSON()))
}

randomlyGenerateMemories()
  .then(trainNetFromMemories)
// getAndTrainNetFromMemories()
