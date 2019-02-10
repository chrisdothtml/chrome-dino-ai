import Actor from './Actor.js'
import config from '../../common/config.js'
import { getLargestIndex, randInteger } from '../../common/utils.js'

export default class Dino extends Actor {
  constructor (canvasHeight, brain) {
    super()

    if (!config.settings.ai.guessEnabled) {
      this.brain = brain
    }

    this.canvasHeight = canvasHeight
    this.fitness = 0
    this.isDucking = false
    this.lastThought = null
    this.legFrames = 0
    this.legShowing = 'Left'
    this.memory = []
    this.sprite = `dino${this.legShowing}Leg`
    this.velocity = 0
    this.x = 25
    this.relativeY = 0
  }

  get y () {
    return this.canvasHeight - this.height - 4 + this.relativeY
  }

  jump () {
    if (this.relativeY === 0) {
      this.velocity = -config.settings.dinoLift
    }
  }

  duck (value) {
    this.isDucking = Boolean(value)
  }

  nextFrame () {
    // use gravity to gradually decrease velocity
    this.velocity += config.settings.dinoGravity
    this.relativeY += this.velocity

    // stop falling once back down to the ground
    if (this.relativeY > 0) {
      this.velocity = 0
      this.relativeY = 0
    }

    this.determineSprite()
  }

  guess () {
    const result = [0, 0, 0]

    result[randInteger(0, 2)] = 1
    return result
  }

  think (stateInputs) {
    const isJumping = this.relativeY < 0
    const input = [
      ...stateInputs,
      isJumping ? 1 : 0,
      this.isDucking ? 1 : 0
    ]
    const output = config.settings.ai.guessEnabled ? this.guess() : this.brain.activate(input)
    const decision = getLargestIndex(output)

    this.memory.push({ input, output })
    switch (decision) {
      case 0:
        this.duck(false)
        this.jump()
        break
      case 1:
        this.duck(true)
        break
      case 2:
        this.duck(false)
        break
    }
  }

  determineSprite () {
    if (this.relativeY < 0) {
      // in the air stiff
      this.sprite = 'dino'
    } else {
      // on the ground running
      if (this.legFrames >= config.settings.dinoLegsRate) {
        this.legShowing = this.legShowing === 'Left' ? 'Right' : 'Left'
        this.legFrames = 0
      }

      if (this.isDucking) {
        this.sprite = `dinoDuck${this.legShowing}Leg`
      } else {
        this.sprite = `dino${this.legShowing}Leg`
      }

      this.legFrames++
    }
  }
}
