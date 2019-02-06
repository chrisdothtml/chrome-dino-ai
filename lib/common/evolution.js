import config from './config.js'
import { random } from './utils.js'

function combineBrainJSON (mom, dad) {
  const result = {
    connections: [],
    neurons: []
  }

  ;['connections', 'neurons'].forEach(key => {
    const arrLength = mom[key].length

    for (let i = 0; i < arrLength; i++) {
      const parent = i >= (arrLength / 2) ? mom : dad

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
      .sort(() => (0.5 - random()))
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
    const aiSettings = config.settings.ai
    const json = brain.toJSON()

    json.connections = json.connections.map(connection => {
      if (random() < aiSettings.mutationRate) {
        // TODO: consider mutating other parts of the network (bias?)
        connection.weight += random(-1 * aiSettings.mutationDeviation, aiSettings.mutationDeviation)
      }

      return connection
    })

    return synaptic.Network.fromJSON(json)
  }
})
