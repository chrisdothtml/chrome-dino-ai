export function createElement (tagName, attrs, children) {
  const element = window.document.createElement(tagName)

  if (attrs) {
    Object.keys(attrs).forEach(key => element.setAttribute(key, attrs[key]))
  }

  if (Array.isArray(children)) {
    children.forEach(child => {
      element.appendChild(child)
    })
  } else if (typeof children === 'string') {
    element.innerHTML = children
  }

  return element
}

export function getLargestIndex (arr) {
  let largest = 0

  arr.forEach((num, i) => {
    if (num > arr[largest]) {
      largest = i
    }
  })

  return largest
}

export function memoize (func) {
  const cache = new Map()

  return function () {
    const args = arguments
    const key = JSON.stringify(args)
    let result

    if (cache.has(key)) {
      result = cache.get(key)
    } else {
      const returnVal = func.apply(null, args)

      cache.set(key, returnVal)
      result = returnVal
    }

    return result
  }
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
