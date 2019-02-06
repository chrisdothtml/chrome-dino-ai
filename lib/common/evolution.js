import config from './config.js'
import { randBoolean, random } from './utils.js'

const parentsRng = random.seeded('parents')
const mutationDevianceRng = random.seeded('mutationDeviance')
const shuffleRng = random.seeded('shuffle')

function combineBrainJSON (mom, dad) {
  const result = {
    connections: [],
    neurons: []
  }

  ;['connections', 'neurons'].forEach(key => {
    const arrLength = mom[key].length

    for (let i = 0; i < arrLength; i++) {
      const parent = randBoolean.call({ rng: parentsRng }) ? mom : dad

      result[key].push(parent[key][i])
    }
  })

  return result
}

function selectBrain (pool) {
  let rand = random()

  for (var i = 0; i < pool.length; i++) {
    const [ value, weight ] = pool[i]

    if (rand < weight) {
      return value
    } else {
      rand -= weight
    }
  }
}

export default (synaptic) => ({
  naturallySelect (dinos) {
    const totalFitness = dinos.reduce((result, dino) => {
      return result + dino.fitness
    }, 0)
    const matingPool = dinos
      // shuffle
      .sort(() => (0.5 - shuffleRng()))
      .map(dino =>
        [ dino.brain.toJSON(), dino.fitness / totalFitness ]
      )

    return dinos.map(() => {
      const babyBrain = combineBrainJSON(
        selectBrain(matingPool),
        selectBrain(matingPool)
      )

      return synaptic.Network.fromJSON(babyBrain)
    })
  },
  mutateBrain (brain) {
    // const neuronKeys = ['activation', 'bias', 'old', 'state']
    const neuronKeys = ['bias']
    const aiSettings = config.settings.ai
    const json = brain.toJSON()

    json.neurons = json.neurons.map(neuron => {
      for (const key of neuronKeys) {
        if (random() < aiSettings.mutationRate) {
          neuron[key] += mutationDevianceRng(-1 * aiSettings.mutationDeviation, aiSettings.mutationDeviation)
        }
      }

      return neuron
    })

    json.connections = json.connections.map(connection => {
      if (random() < aiSettings.mutationRate) {
        connection.weight += mutationDevianceRng(-1 * aiSettings.mutationDeviation, aiSettings.mutationDeviation)
      }

      return connection
    })

    return synaptic.Network.fromJSON(json)
  }
})
