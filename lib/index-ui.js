import config from './common/config.js'
import Game from './game/Game.js'
import { createElement, memoize } from './common/utils.js'
import 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/0.6.1/p5.min.js'
import 'https://cdnjs.cloudflare.com/ajax/libs/synaptic/1.1.4/synaptic.js'

const { p5: P5 } = window
const { synaptic } = window.exports
const { Network } = synaptic

// eslint-disable-next-line no-new
new P5(p5 => {
  const GAME = new Game({ synaptic })
  // eslint-disable-next-line no-unused-vars
  let PressStartFont, spritesheet

  // global references for debugging
  window.config = config
  window.p5 = p5
  window.simulationRate = 1
  window.state = GAME

  window.saveBest = () => {
    p5.createStringDict(GAME.bestBrain.toJSON()).saveJSON('best-dino')
  }

  function loadBest () {
    return window.fetch('./best-dino.json')
      .then(response => response.json())
      .then(brainJSON => {
        GAME.resetEvolution({
          baseBrain: Network.fromJSON(brainJSON)
        })
      })
      .catch(e => console.error(e))
  }

  // memoized because p5.Image.get is ridiculously unperformant
  const getSprite = memoize((name) => {
    const { h, w, x, y } = config.sprites[name]

    return spritesheet.get(x, y, w, h)
  })

  function spriteImage (spriteName, canvasX, canvasY) {
    const { h, w } = config.sprites[spriteName]
    const sprite = getSprite(spriteName)

    // half of width/height because spritesheet uses 2x pixel density
    return p5.image(sprite, canvasX, canvasY, w / 2, h / 2)
  }

  function drawNextFrame () {
    p5.background('#f7f7f7')

    // ground
    {
      const { bgSpeed } = config.settings
      const groundImgWidth = config.sprites.ground.w / 2

      spriteImage('ground', GAME.groundX, GAME.groundY)

      // append second image until first is fully translated
      if (GAME.groundX <= -groundImgWidth + p5.width) {
        spriteImage('ground', (GAME.groundX + groundImgWidth), GAME.groundY)

        if (GAME.groundX <= -groundImgWidth) {
          GAME.groundX = -bgSpeed
        }
      }
    }

    // actors
    ;['clouds', 'cacti', 'birds', 'dinos'].forEach(key => {
      GAME[key].forEach(actor => {
        spriteImage(actor.sprite, actor.x, actor.y)
      })
    })

    // current score
    p5.fill('#535353')
    p5.textAlign(p5.RIGHT)
    p5.textFont(PressStartFont)
    p5.textSize(12)
    p5.text((GAME.score + '').padStart(5, '0'), p5.width, p5.textSize())

    // generation count
    p5.fill('rgba(83, 83, 83, .5)')
    p5.textAlign(p5.LEFT)
    p5.textFont(PressStartFont)
    p5.textSize(8)
    p5.text(`GENERATION ${GAME.generations}`, 0, p5.textSize())

    // highest score
    p5.fill('rgba(83, 83, 83, .5)')
    p5.textAlign(p5.LEFT)
    p5.textFont(PressStartFont)
    p5.textSize(8)
    p5.text(`HI ${GAME.highestScore}`, 0, (p5.textSize() * 2 + 5))
  }

  // triggered on pageload
  p5.preload = () => {
    PressStartFont = p5.loadFont('assets/PressStart2P-Regular.ttf')
    spritesheet = p5.loadImage('assets/spritesheet.png')
  }

  // triggered after preload
  p5.setup = () => {
    const { canvas } = config
    const buttons = {
      cleanSlate: createElement('button', { class: 'btn', title: 'Start training from a new neural network' }, 'Clean slate'),
      preEvolved: createElement('button', { class: 'btn', title: 'Start training from a pre-evolved neural configuration' }, 'Pre-evolved')
    }

    p5.createCanvas(canvas.width, canvas.height)
    window.document.body.appendChild(
      createElement('div', { class: 'btn-container' }, [
        buttons.cleanSlate,
        buttons.preEvolved
      ])
    )

    buttons.cleanSlate.addEventListener('click', (event) => {
      event.preventDefault()
      GAME.resetEvolution()
      GAME.newGeneration()
      p5.loop()
    })

    buttons.preEvolved.addEventListener('click', (event) => {
      event.preventDefault()
      loadBest().then(() => {
        GAME.newGeneration()
        p5.loop()
      })
    })

    p5.noLoop()
    console.log('Set simulation rate:')
    console.log('window.simulationRate = 5')
    console.log('')
    console.log('Save current best dino:')
    console.log('window.saveBest()')
    console.log('')
  }

  // triggered for every frame
  p5.draw = () => {
    for (let i = 0; i < window.simulationRate; i++) {
      GAME.processNextFrame()
    }

    drawNextFrame()
  }
})
