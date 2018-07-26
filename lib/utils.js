export function getLargestIndex (arr) {
  let largest = 0

  arr.forEach((num, i) => {
    if (num > arr[largest]) {
      largest = i
    }
  })

  return largest
}

export function random (...args) {
  let result

  if (args.length === 2) {
    const [ min, max ] = args

    result = random() * (max - min) + min
  } else {
    result = Math.random()
  }

  return result
}

export function randInteger (min, max) {
  return Math.floor(random() * ((max - min) + 1)) + min
}

export function randBoolean () {
  return Boolean(randInteger(0, 1))
}

export function randItem (arr) {
  return arr[randInteger(0, arr.length - 1)]
}
