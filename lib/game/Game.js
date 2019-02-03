import Bird from './actors/Bird.js'
import Cactus from './actors/Cactus.js'
import Cloud from './actors/Cloud.js'
import config from '../common/config.js'
import Dino from './actors/Dino.js'
import evolution from '../common/evolution.js'
import { randBoolean } from '../common/utils.js'

// for resetting settings that change due to
// difficulty increasing
const SETTINGS_BACKUP = { ...config.settings }

function createBrain (synaptic) {
  const { Layer, Network } = synaptic
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

export default class Game {
  constructor ({ baseBrain, synaptic }) {
    const { mutateBrain, naturallySelect } = evolution(synaptic)

    this.mutateBrain = mutateBrain
    this.naturallySelect = naturallySelect

    this.bestBrain = baseBrain || createBrain(synaptic)
    this.birds = []
    this.cacti = []
    this.clouds = []
    this.deadDinos = []
    this.dinos = []
    this.frameCount = 0
    this.generations = 0
    this.groundX = 0
    this.groundY = config.canvas.height - config.sprites.ground.h / 2
    this.highestScore = 0
    this.level = 0
    this.score = 0
    this.synaptic = synaptic
  }

  resetEvolution (opts = {}) {
    Object.assign(this, {
      bestBrain: opts.baseBrain || createBrain(this.synaptic),
      deadDinos: [],
      generations: 0,
      highestScore: 0
    })
  }

  newGeneration () {
    const dinos = []
    let baseBrain

    if (this.deadDinos.length) {
      baseBrain = this.naturallySelect(this.deadDinos)
    } else if (this.bestBrain) {
      baseBrain = this.bestBrain
    }

    for (let i = 0; i < config.settings.ai.populationSize; i++) {
      dinos.push(
        new Dino(config.canvas.height, this.mutateBrain(baseBrain))
      )
    }

    Object.assign(this, {
      birds: [],
      cacti: [],
      deadDinos: [],
      dinos,
      frameCount: 0,
      level: 0,
      score: 0
    })

    Object.assign(config.settings, SETTINGS_BACKUP)
    this.generations++
  }

  increaseDifficulty () {
    const { settings } = config
    const { bgSpeed, cactiSpawnRate, dinoLegsRate } = settings
    const { level } = this

    if (level > 4 && level < 8) {
      settings.bgSpeed++
      settings.birdSpeed = settings.bgSpeed * 0.8
    } else if (level > 7) {
      settings.bgSpeed = Math.ceil(bgSpeed * 1.1)
      settings.birdSpeed = settings.bgSpeed * 0.9
      settings.cactiSpawnRate = Math.floor(cactiSpawnRate * 0.98)

      if (level > 7 && level % 2 === 0 && dinoLegsRate > 3) {
        settings.dinoLegsRate--
      }
    }
  }

  spawnActor (actorType) {
    let result

    switch (actorType) {
      case 'birds':
      case 'cacti':
        const ActorClass = actorType === 'birds' ? Bird : Cactus

        // randomly either do or don't add bird/cactus
        if (randBoolean()) {
          result = new ActorClass(config.canvas.width, config.canvas.height)
        }
        break
      case 'clouds':
        result = new Cloud(config.canvas.width)
        break
    }

    return result
  }

  processNextFrame () {
    this.frameCount++
    this.groundX -= config.settings.bgSpeed

    // loop through these actors, triggering them to calculate
    // their next frame, removing any offscreen, and adding
    // new if necessary
    ;['birds', 'cacti', 'clouds'].forEach(key => {
      // if birds, only process after level 3
      if (key === 'birds' ? this.level > 3 : true) {
        const actorList = this[key]

        // loop backwards since we're possibly gonna splice one out
        for (let i = actorList.length - 1; i >= 0; i--) {
          const actor = actorList[i]

          actor.nextFrame()
          if (actor.x <= -actor.width) {
            // remove if off screen
            actorList.splice(i, 1)
          }
        }

        if (this.frameCount % config.settings.spawnRates[key] === 0) {
          const actor = this.spawnActor(key)

          if (actor) actorList.push(actor)
        }
      }
    })

    // let dinos decide their next move, remove any that die
    if (this.dinos.length) {
      const { birds, cacti, deadDinos, dinos, level, score } = this
      const closestBird = birds[0] || {}
      const closestCactus = cacti[0] || {}
      const stateInputs = [
        (closestBird.x || 0) / config.canvas.width,
        (closestBird.y || 0) / config.canvas.height,
        (closestCactus.x || 0) / config.canvas.width,
        (closestCactus.y || 0) / config.canvas.height,
        level / 20
      ]

      // loop backwards since we're possibly gonna splice one out
      for (let i = dinos.length - 1; i >= 0; i--) {
        const dino = dinos[i]

        dino.think(stateInputs)
        dino.nextFrame()

        if (dino.hits([cacti[0], birds[0]])) {
          dino.fitness = score
          deadDinos.push(dino)
          dinos.splice(i, 1)
        }
      }
    }

    // if dinos are left, increase score/difficulty, otherwise
    // generate new generation of dinos
    if (this.dinos.length) {
      // increase score
      if (this.frameCount % config.settings.scoreIncreaseRate === 0) {
        const oldLevel = this.level

        this.score++
        this.level = Math.floor(this.score / 100)

        if (this.level !== oldLevel) {
          this.increaseDifficulty()
        }
      }
    } else {
      if (this.score > this.highestScore) {
        this.highestScore = this.score
        this.bestBrain = this.deadDinos[this.deadDinos.length - 1].brain
      }

      this.newGeneration()
    }
  }
}
