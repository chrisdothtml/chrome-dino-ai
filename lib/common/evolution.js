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

export default (synaptic) => ({
  naturallySelect (dinos) {
    // TODO: get fittest via probability and not the highest score
    const baby = combineBrainJSON(
      dinos[dinos.length - 1].brain.toJSON(),
      dinos[dinos.length - 4].brain.toJSON()
    )

    return synaptic.Network.fromJSON(baby)
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
