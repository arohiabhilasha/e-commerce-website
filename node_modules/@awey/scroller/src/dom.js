import ResizeObserver from 'resize-observer-polyfill'

export const createDOM = (classNames = [], receiver = {}) => {
  let res = classNames.reduce((last, curr) => {
    const key = curr
      .split('_').filter(e => e)
      .reduce((l, c, i) => l + (!i ? c : (c[0].toUpperCase() + c.substring(1))), '')

    const el = document.createElement('div')
    el.className = curr

    if (last[last.length - 1]) {
      last[last.length - 1].el.appendChild(el)
    }
    last.push({ el, key })
    return last
  }, []).reduce((last, curr) => {
    last[curr.key] = curr.el
    return last
  }, receiver)

  return receiver || res
}

export const transferDOM = (source, target, clear = true) => {
  // recover dom constructure
  const fragment = document.createDocumentFragment()
  const contents = source.children
  for (let i = 0; i < contents.length; i++) {
    fragment.appendChild(contents[i])
  }
  target.innerHTML = ''
  if (clear) source.innerHTML = ''
  target.appendChild(fragment)
}

export const addClass = (el, cn) => {
  if (el.className.indexOf(cn) === -1) {
    el.className += ((el.className.trim()) ? ' ' : '') + cn
  }
}

export const removeClass = (el, cn) => {
  if (el.className.indexOf(cn) !== -1) {
    el.className = el.className.split(/\s+/).filter(c => {
      return c && c.trim() !== cn.trim()
    }).join(' ')
  }
}

export const hasClass = (el, cn) => {
  return el.className.trim().indexOf(cn.trim()) !== -1
}

export const addListener = (el, event, handler) => {
  el.removeEventListener(event, handler)
  el.addEventListener(event, handler)
}

export const removeListener = (el, event, handler) => {
  el.removeEventListener(event, handler)
}

export const observeMutation = (el, handler, config, context, throttle) => {
  if (!window.MutationObserver) {
    return { disconnect () {} }
  }
  let throttleTimer = null
  const clear = () => {
    if (throttleTimer) {
      window.clearTimeout(throttleTimer)
      throttleTimer = null
    }
  }
  const observer = new window.MutationObserver(mutationList => {
    if (throttle) {
      clear()
      throttleTimer = window.setTimeout(_ => {
        handler.call(context, mutationList)
        clear()
      }, throttle)
    } else {
      handler.call(context, mutationList)
    }
  })
  observer.observe(el, config)
  return observer
}

export const observeChildInsert = (el, handler, context) => {
  return observeMutation(el, mutationList => {
    let addedNodes = []
    for (let mutation of mutationList) {
      if (mutation.addedNodes && mutation.addedNodes.length) {
        for (let node of mutation.addedNodes) {
          if (addedNodes.indexOf(node) === -1) addedNodes.push(node)
        }
      }
    }
    if (addedNodes.length) handler.call(context, addedNodes)
  }, { childList: true }, context)
}

export const observeStyleChange = (el, handler, context) => {
  return observeMutation(el, handler, { attributeFilter: ['style'] }, context)
}

export const observeResize = (el, handler, context) => {
  let oldSize = { width: 0, height: 0 }
  const observer = new ResizeObserver((entity) => {
    let rect = entity[0].contentRect

    if (rect.width !== oldSize.width || rect.height !== oldSize.height) {
      handler.call(context)
      oldSize.width = rect.width
      oldSize.height = rect.height
    }
  })
  observer.observe(el)
  return observer
}

export const isFirefox = _ => {
  return navigator.userAgent.indexOf('Firefox') !== -1
}

export const isOnDocument = el => {
  if (el === document.body) return true
  else if (!el.parentNode) return false
  else if (el.parentNode === document.body) return true
  else return isOnDocument(el.parentNode)
}

let nativeScrollWidth = null
export const getNativeScrollBarWidth = () => {
  if (nativeScrollWidth) return nativeScrollWidth
  let outer = document.createElement('div')
  let inner = document.createElement('div')
  outer.appendChild(inner)
  outer.style.width = '100px'
  outer.style.position = 'absolute'
  outer.style.visible = 'hidden'
  document.body.appendChild(outer)
  let before = inner.getBoundingClientRect().width
  outer.style.overflow = 'scroll'
  let after = inner.getBoundingClientRect().width
  document.body.removeChild(outer)
  return before - after
}
