import config from './config.js'
import { random } from './utils.js'
import 'https://cdnjs.cloudflare.com/ajax/libs/synaptic/1.1.4/synaptic.js'

const { synaptic } = window.exports
const { Network } = synaptic

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

export function naturallySelect (deadDinos) {
  // TODO: get fittest via probability and not the highest score
  const baby = combineBrainJSON(
    deadDinos[deadDinos.length - 1].brain.toJSON(),
    deadDinos[deadDinos.length - 4].brain.toJSON()
  )

  return Network.fromJSON(baby)
}

export function mutateBrain (brain) {
  const json = brain.toJSON()

  json.connections = json.connections.map(connection => {
    if (random() < config.settings.ai.mutationRate) {
      // TODO: consider mutating other parts of the network (bias?)
      connection.weight += random(-0.1, 0.1)
    }

    return connection
  })

  return Network.fromJSON(json)
}
