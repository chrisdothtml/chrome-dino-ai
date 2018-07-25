import Bird from './actors/Bird.js'
import Cactus from './actors/Cactus.js'
import Cloud from './actors/Cloud.js'
import config from './config.js'
import Dino from './actors/Dino.js'
import { randBoolean } from './utils.js'
import 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.6.1/p5.min.js'

const { p5: P5 } = window
const { synaptic } = window.exports
const { Network } = synaptic

// eslint-disable-next-line no-new
new P5(p5 => {
  // for resetting settings that change due to
  // difficulty increasing
  const SETTINGS_BACKUP = { ...config.settings }
  const STATE = {
    birds: [],
    cacti: [],
    clouds: [],
    deadDinos: [],
    dinos: [],
    gameOver: false,
    generations: 0,
    groundX: 0,
    groundY: 0,
    highestScore: 0,
    isRunning: false,
    level: 0,
    score: 0
  }
  // eslint-disable-next-line no-unused-vars
  let PressStartFont, sprite

  // global references for debugging
  window.config = config
  window.p5 = p5
  window.state = STATE

  function spriteImage (spriteName, ...clientCoords) {
    const { h, w, x, y } = config.sprites[spriteName]

    // eslint-disable-next-line no-useless-call
    return p5.image.apply(p5, [sprite, ...clientCoords, w / 2, h / 2, x, y, w, h])
  }

  function mutateBrain (brain) {
    const json = brain.toJSON()

    json.connections = json.connections.map(connection => {
      if (Math.random() < config.settings.ai.mutationRate) {
        connection.weight += p5.randomGaussian(0, 0.1)
      }

      return connection
    })

    return Network.fromJSON(json)
  }

  function newGeneration () {
    const { deadDinos } = STATE
    const dinos = []
    let baseBrain

    if (deadDinos.length) {
      // TODO: get fittest via probability and not the highest score
      baseBrain = deadDinos[deadDinos.length - 1].brain.clone()
    }

    for (let i = 0; i < config.settings.ai.populationSize; i++) {
      dinos.push(
        new Dino(p5.height, baseBrain && mutateBrain(baseBrain))
      )
    }

    Object.assign(STATE, {
      birds: [],
      cacti: [],
      deadDinos: [],
      dinos,
      gameOver: false,
      isRunning: true,
      level: 0,
      score: 0
    })

    Object.assign(config.settings, SETTINGS_BACKUP)
    STATE.generations++
  }

  function increaseDifficulty () {
    const { settings } = config
    const { bgSpeed, cactiSpawnRate, dinoLegsRate } = settings
    const { level } = STATE

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

  function updateScore () {
    if (p5.frameCount % config.settings.scoreIncreaseRate === 0) {
      const oldLevel = STATE.level

      STATE.score++
      STATE.level = Math.floor(STATE.score / 100)

      if (STATE.level !== oldLevel) {
        increaseDifficulty()
      }
    }
  }

  function drawGround () {
    const { bgSpeed } = config.settings
    const groundImgWidth = config.sprites.ground.w / 2

    spriteImage('ground', STATE.groundX, STATE.groundY)
    STATE.groundX -= bgSpeed

    // append second image until first is fully translated
    if (STATE.groundX <= -groundImgWidth + p5.width) {
      spriteImage('ground', (STATE.groundX + groundImgWidth), STATE.groundY)

      if (STATE.groundX <= -groundImgWidth) {
        STATE.groundX = -bgSpeed
      }
    }
  }

  function drawClouds () {
    const { clouds } = STATE

    for (let i = clouds.length - 1; i >= 0; i--) {
      const cloud = clouds[i]

      cloud.nextFrame()

      if (cloud.x <= -cloud.width) {
        // remove if off screen
        clouds.splice(i, 1)
      } else {
        spriteImage(cloud.sprite, cloud.x, cloud.y)
      }
    }

    if (p5.frameCount % config.settings.cloudSpawnRate === 0) {
      clouds.push(new Cloud(p5.width))
    }
  }

  function drawDinos () {
    const { birds, cacti, dinos, level } = STATE

    if (dinos.length) {
      const closestBird = birds[0] || {}
      const closestCactus = cacti[0] || {}
      const stateInputs = [
        (closestBird.x || 0) / p5.width,
        (closestBird.y || 0) / p5.height,
        (closestCactus.x || 0) / p5.width,
        (closestCactus.y || 0) / p5.height,
        level / 20
      ]

      dinos.forEach(dino => {
        dino.think(stateInputs)
        dino.nextFrame()
        spriteImage(dino.sprite, dino.x, dino.y)
      })
    } else {
      spriteImage('dino', 25, (p5.height - (config.sprites.dino.h / 2) - 4))
    }
  }

  function drawCacti () {
    const { cacti } = STATE

    for (let i = cacti.length - 1; i >= 0; i--) {
      const cactus = cacti[i]

      cactus.nextFrame()

      if (cactus.x <= -cactus.width) {
        // remove if off screen
        cacti.splice(i, 1)
      } else {
        spriteImage(cactus.sprite, cactus.x, cactus.y)
      }
    }

    if (p5.frameCount % config.settings.cactiSpawnRate === 0) {
      // randomly either do or don't add cactus
      if (randBoolean()) {
        cacti.push(new Cactus(p5.width, p5.height))
      }
    }
  }

  function drawScore () {
    p5.fill('#535353')
    p5.textAlign(p5.RIGHT)
    p5.textFont(PressStartFont)
    p5.textSize(12)
    p5.text((STATE.score + '').padStart(5, '0'), p5.width, p5.textSize())
  }

  function drawEvolutionInfo () {
    // generations
    p5.fill('rgba(83, 83, 83, .5)')
    p5.textAlign(p5.LEFT)
    p5.textFont(PressStartFont)
    p5.textSize(8)
    p5.text(`GENERATION ${STATE.generations}`, 0, p5.textSize())

    // highest score
    p5.fill('rgba(83, 83, 83, .5)')
    p5.textAlign(p5.LEFT)
    p5.textFont(PressStartFont)
    p5.textSize(8)
    p5.text(`HI ${STATE.highestScore}`, 0, (p5.textSize() * 2 + 5))
  }

  function drawBirds () {
    const { birds } = STATE

    for (let i = birds.length - 1; i >= 0; i--) {
      const bird = birds[i]

      bird.nextFrame()

      if (bird.x <= -bird.width) {
        // remove if off screen
        birds.splice(i, 1)
      } else {
        spriteImage(bird.sprite, bird.x, bird.y)
      }
    }

    if (p5.frameCount % config.settings.birdSpawnRate === 0) {
      // randomly either do or don't add bird
      if (randBoolean()) {
        birds.push(new Bird(p5.width, p5.height))
      }
    }
  }

  // triggered on pageload
  p5.preload = () => {
    PressStartFont = p5.loadFont('assets/PressStart2P-Regular.ttf')
    sprite = p5.loadImage('assets/sprite.png')
  }

  // triggered after preload
  p5.setup = () => {
    p5.createCanvas(600, 150)
    STATE.groundY = p5.height - config.sprites.ground.h / 2
    newGeneration()
  }

  // triggered for every frame
  p5.draw = () => {
    p5.background('#f7f7f7')
    drawGround()
    drawClouds()
    drawDinos()
    drawCacti()

    if (STATE.level > 3) {
      drawBirds()
    }

    drawScore()
    drawEvolutionInfo()

    for (let i = STATE.dinos.length - 1; i >= 0; i--) {
      const dino = STATE.dinos[i]

      if (dino.hits([STATE.cacti[0], STATE.birds[0]])) {
        dino.fitness = STATE.score
        STATE.deadDinos.push(dino)
        STATE.dinos.splice(i, 1)
      }
    }

    if (!STATE.dinos.length) {
      if (STATE.score > STATE.highestScore) {
        STATE.highestScore = STATE.score
      }

      STATE.gameOver = true
    }

    if (STATE.gameOver) {
      newGeneration()
    } else {
      updateScore()
    }
  }
})
