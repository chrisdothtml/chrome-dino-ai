import Bird from './actors/Bird.js'
import Cactus from './actors/Cactus.js'
import Cloud from './actors/Cloud.js'
import config from './config.js'
import Dino from './actors/Dino.js'
import { mutateBrain, naturallySelect } from './evolution.js'
import { createElement, randBoolean } from './utils.js'
import 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.6.1/p5.min.js'
import 'https://cdnjs.cloudflare.com/ajax/libs/synaptic/1.1.4/synaptic.js'

const { p5: P5 } = window
const { synaptic } = window.exports
const { Network } = synaptic

// eslint-disable-next-line no-new
new P5(p5 => {
  // for resetting settings that change due to
  // difficulty increasing
  const SETTINGS_BACKUP = { ...config.settings }
  const STATE = {
    bestBrain: null,
    birds: [],
    cacti: [],
    clouds: [],
    deadDinos: [],
    dinos: [],
    frameCount: 0,
    generations: 0,
    groundX: 0,
    groundY: 0,
    highestScore: 0,
    level: 0,
    score: 0,
    // amount of frames to process before redraw
    simulationRate: 1
  }
  // eslint-disable-next-line no-unused-vars
  let PressStartFont, spritesheet

  // global references for debugging
  window.config = config
  window.p5 = p5
  window.state = STATE

  window.saveBest = () => {
    p5.createStringDict(STATE.bestBrain.toJSON()).saveJSON('best-dino')
  }

  function resetEvolution () {
    Object.assign(STATE, {
      bestBrain: null,
      deadDinos: [],
      generations: 0,
      highestScore: 0
    })
  }

  function loadBest () {
    return window.fetch('./best-dino.json')
      .then(response => response.json())
      .then(body => {
        resetEvolution()
        STATE.bestBrain = Network.fromJSON(body)
      })
      .catch(e => console.error(e))
  }

  function spriteImage (spriteName, canvasX, canvasY) {
    const { h, w, x, y } = config.sprites[spriteName]
    const sprite = spritesheet.get(x, y, w, h)

    // half of width/height because spritesheet uses 2x pixel density
    return p5.image(sprite, canvasX, canvasY, w / 2, h / 2)
  }

  function newGeneration () {
    const dinos = []
    let baseBrain

    if (STATE.deadDinos.length) {
      baseBrain = naturallySelect(STATE.deadDinos)
    } else if (STATE.bestBrain) {
      baseBrain = STATE.bestBrain
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
      frameCount: 0,
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

  function spawnActor (actorType) {
    let result

    switch (actorType) {
      case 'birds':
      case 'cacti':
        const ActorClass = actorType === 'birds' ? Bird : Cactus

        // randomly either do or don't add bird/cactus
        if (randBoolean()) {
          result = new ActorClass(p5.width, p5.height)
        }
        break
      case 'clouds':
        result = new Cloud(p5.width)
        break
    }

    return result
  }

  function processNextFrame () {
    STATE.frameCount++
    STATE.groundX -= config.settings.bgSpeed

    // loop through these actors, triggering them to calculate
    // their next frame, removing any offscreen, and adding
    // new if necessary
    ;['birds', 'cacti', 'clouds'].forEach(key => {
      // if birds, only process after level 3
      if (key === 'birds' ? STATE.level > 3 : true) {
        const actorList = STATE[key]

        // loop backwards since we're possibly gonna splice one out
        for (let i = actorList.length - 1; i >= 0; i--) {
          const actor = actorList[i]

          actor.nextFrame()
          if (actor.x <= -actor.width) {
            // remove if off screen
            actorList.splice(i, 1)
          }
        }

        if (STATE.frameCount % config.settings.spawnRates[key] === 0) {
          const actor = spawnActor(key)

          if (actor) actorList.push(actor)
        }
      }
    })

    // let dinos decide their next move, remove any that die
    if (STATE.dinos.length) {
      const { birds, cacti, deadDinos, dinos, level, score } = STATE
      const closestBird = birds[0] || {}
      const closestCactus = cacti[0] || {}
      const stateInputs = [
        (closestBird.x || 0) / p5.width,
        (closestBird.y || 0) / p5.height,
        (closestCactus.x || 0) / p5.width,
        (closestCactus.y || 0) / p5.height,
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
    if (STATE.dinos.length) {
      // increase score
      if (STATE.frameCount % config.settings.scoreIncreaseRate === 0) {
        const oldLevel = STATE.level

        STATE.score++
        STATE.level = Math.floor(STATE.score / 100)

        if (STATE.level !== oldLevel) {
          increaseDifficulty()
        }
      }
    } else {
      if (STATE.score > STATE.highestScore) {
        STATE.highestScore = STATE.score
        STATE.bestBrain = STATE.deadDinos[STATE.deadDinos.length - 1].brain
      }

      newGeneration()
    }
  }

  function drawNextFrame () {
    p5.background('#f7f7f7')

    // ground
    {
      const { bgSpeed } = config.settings
      const groundImgWidth = config.sprites.ground.w / 2

      spriteImage('ground', STATE.groundX, STATE.groundY)

      // append second image until first is fully translated
      if (STATE.groundX <= -groundImgWidth + p5.width) {
        spriteImage('ground', (STATE.groundX + groundImgWidth), STATE.groundY)

        if (STATE.groundX <= -groundImgWidth) {
          STATE.groundX = -bgSpeed
        }
      }
    }

    // actors
    ;['clouds', 'cacti', 'birds', 'dinos'].forEach(key => {
      STATE[key].forEach(actor => {
        spriteImage(actor.sprite, actor.x, actor.y)
      })
    })

    // current score
    p5.fill('#535353')
    p5.textAlign(p5.RIGHT)
    p5.textFont(PressStartFont)
    p5.textSize(12)
    p5.text((STATE.score + '').padStart(5, '0'), p5.width, p5.textSize())

    // generation count
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

  // triggered on pageload
  p5.preload = () => {
    PressStartFont = p5.loadFont('assets/PressStart2P-Regular.ttf')
    spritesheet = p5.loadImage('assets/spritesheet.png')
  }

  // triggered after preload
  p5.setup = () => {
    const buttons = {
      cleanSlate: createElement('button', { class: 'btn', title: 'Start training from a new neural network' }, 'Clean slate'),
      preEvolved: createElement('button', { class: 'btn', title: 'Start training from a pre-evolved neural configuration' }, 'Pre-evolved')
    }

    p5.createCanvas(600, 150)
    window.document.body.appendChild(
      createElement('div', { class: 'btn-container' }, [
        buttons.cleanSlate,
        buttons.preEvolved
      ])
    )

    buttons.cleanSlate.addEventListener('click', (event) => {
      event.preventDefault()
      resetEvolution()
      newGeneration()
      p5.loop()
    })

    buttons.preEvolved.addEventListener('click', (event) => {
      event.preventDefault()
      loadBest().then(() => {
        newGeneration()
        p5.loop()
      })
    })

    STATE.groundY = p5.height - config.sprites.ground.h / 2
    p5.noLoop()

    console.log('Set simulation rate:')
    console.log('window.state.simulationRate = 5')
    console.log('')
    console.log('Save current best dino:')
    console.log('window.saveBest()')
    console.log('')
  }

  // triggered for every frame
  p5.draw = () => {
    for (let i = 0; i < STATE.simulationRate; i++) {
      processNextFrame()
    }

    drawNextFrame()
  }
})
