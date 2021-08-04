import './index.scss'

import {
  createDOM,
  transferDOM,
  addClass,
  removeClass,
  hasClass,
  addListener,
  removeListener,
  observeResize,
  observeChildInsert,
  observeStyleChange,
  isOnDocument,
  getNativeScrollBarWidth
} from './dom'

let directions = [
  'horizontal',
  'vertical',
  'both',
  'none'
]

export default class Scroller {
  constructor (options = {}) {
    /**
     * el: DOMElement, element that will use scroller
     * direction: String, scroll direction, default is 'both', vertical'/'horizontal'/'both'/'none'
     * trackClassName: String, scroll track class name
     * barClassName: String, scroll bar class name
     * offset: Number, scroll position offset by the el right or bottom edge
     * scaleable: Boolena, will scroll bar scale when mouse hovering the element
     */
    // deal with options
    this.el = options.el
    // this.direction = directions.indexOf(options.direction) !== -1
    //   ? options.direction
    //   : 'both'
    this.trackClassName = options.trackClassName || '_scroller_track_default'
    this.barClassName = options.barClassName || '_scroller_bar_default'
    this.offset = Number.isNaN(parseInt(options.offset)) ? 4 : parseInt(options.offset)
    this.offset = this.offset > 8 ? 8 : (this.offset < 0 ? 0 : this.offset)
    this.scaleable = options.scaleable === undefined ? true : options.scaleable

    // other properties
    this.container = null
    this.placeholder = null
    this.content = null
    this.elStyleChangeObserver = null
    this.elResizeObserver = null
    this.childInsertObserver = null
    this.contentSizeObserver = null
    this.drag = false
    this.dragDirection = ''
    this.dragDiff = 0
    this.barScroll = 0
    this.cbs = []

    // handlers
    this.scrollHandler = null
    this.mouseenterHandler = null
    this.mouseleaveHandler = null
    this.xMousedownHandler = null
    this.yMousedownHandler = null
    this.xClickHandler = null
    this.yClickHandler = null
    this.mousemoveHandler = null
    this.mouseupHandler = null

    this._init()
    this.setDirection(options.direction, true)
  }

  _needX () {
    const contentRect = this.content.getBoundingClientRect()
    const viewSize = this._getViewSize()
    return (this.direction === 'horizontal' || this.direction === 'both') && contentRect.width > viewSize.width
  }

  _needY () {
    const contentRect = this.content.getBoundingClientRect()
    const viewSize = this._getViewSize()
    return (this.direction === 'vertical' || this.direction === 'both') && contentRect.height > viewSize.height
  }

  _noX () {
    return this.direction === 'vertical' || this.direction === 'none'
  }
  _noY () {
    return this.direction === 'horizontal' || this.direction === 'none'
  }

  _init () {
    // prepare target element
    this._initEl()
    // init dom constructure
    createDOM(['_container', '_mask', '_content_wrapper', '_content'], this)
    transferDOM(this.el, this.content)
    this.placeholder = document.createElement('div')
    this.placeholder.className = '_placeholder'
    this.el.appendChild(this.placeholder)
    this.el.appendChild(this.container)

    this.elStyleChangeObserver = observeStyleChange(this.el, this._recalc, this)
    this.elResizeObserver = observeResize(this.el, this._recalc, this)
    this.contentSizeObserver = observeResize(this.content, this._recalc, this)
    this.childInsertObserver = observeChildInsert(this.el, this._handleChildInsert, this)

    this._initScrollerDom()
    this._recalc()
  }

  _initEl () {
    if (!this.el) {
      throw new Error('Scroller: you should at least specify an DOM element in options')
    }

    addClass(this.el, '_scroller')
    if (this.scaleable) addClass(this.el, '_scaleable')
    let positionStyle = window.getComputedStyle(this.el).position

    if (!positionStyle || positionStyle === 'static') {
      this.el.style.position = 'relative'
    }
  }

  _handleChildInsert (insertedNodes) {
    const children = this.el.children
    children.indexOf = (el) => {
      return Array.prototype.indexOf.call(children, el)
    }
    for (let el of insertedNodes) {
      if (children.indexOf(el) > children.indexOf(this.el)) {
        this.content.appendChild(el)
      } else {
        this.content.insertBefore(el, this.content.children[0])
      }
    }
  }

  _recalc () {
    this._syncPlaceholderSize()
    this._setMask()
    this._calcStatus()
  }

  _syncPlaceholderSize () {
    let contentRect = {}

    if (isOnDocument(this.content)) {
      contentRect = this.content.getBoundingClientRect()
      if (!contentRect.width) {
        let duplicate = this.content.cloneNode(true)
        duplicate.style.visibility = 'hidden'

        this.placeholder.style.width = 'auto'
        this.placeholder.style.height = 'auto'

        this.placeholder.appendChild(duplicate)
        contentRect.width = duplicate.getBoundingClientRect().width
        this.placeholder.removeChild(duplicate)
      }
    } else {
      let duplicate = this.content.cloneNode(true)
      duplicate.className = '___'
      duplicate.style.display = 'inline-block'
      duplicate.style.position = 'absolute'
      duplicate.style.zIndex = '-99999'
      duplicate.style.top = '9999999'
      duplicate.style.left = '9999999'
      document.body.appendChild(duplicate)

      contentRect = duplicate.getBoundingClientRect()
      document.body.removeChild(duplicate)
      duplicate = null
    }

    this.placeholder.style.width = contentRect.width + 'px'
    this.placeholder.style.height = contentRect.height + 'px'
  }

  _setMask () {
    // use a mask div to do the real scroll
    let {
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft
    } = window.getComputedStyle(this.el)
    let { width, height } = this.container.getBoundingClientRect()

    this.content.style.paddingLeft = paddingLeft
    this.content.style.paddingTop = paddingTop
    this.content.style.paddingRight = parseFloat(paddingRight) + 'px'
    this.content.style.paddingBottom = parseFloat(paddingBottom) + 'px'

    if (!this._needX()) {
      this.mask.style.overflowX = 'hidden'
      this.mask.style.height = height + 'px'
    } else {
      this.mask.style.overflowX = 'auto'
      this.mask.style.height = height + getNativeScrollBarWidth() + 'px'
    }
    if (!this._needY()) {
      this.mask.style.overflowY = 'hidden'
      this.mask.style.width = width + 'px'
    } else {
      this.mask.style.overflowY = 'auto'
      this.mask.style.width = width + getNativeScrollBarWidth() + 'px'
    }

    this.scrollHandler = () => this._content2bar()
    this._content2bar()

    addListener(this.mask, 'scroll', this.scrollHandler)
  }

  _insertBg (el, className) {
    const bg = document.createElement('div')
    bg.className = className
    el.insertBefore(bg, el.querySelector(':first-child'))
    return bg
  }

  _initScrollerDom () {
    createDOM(['_x_scroller_container', '_x_scroller_track', '_x_scroller_bar'], this)
    this._insertBg(this.xScrollerTrack, '_scroller_bg ' + this.trackClassName)
    this._insertBg(this.xScrollerBar, '_scroller_bg ' + this.barClassName)
    this.container.appendChild(this.xScrollerContainer)

    createDOM(['_y_scroller_container', '_y_scroller_track', '_y_scroller_bar'], this)
    this._insertBg(this.yScrollerTrack, '_scroller_bg ' + this.trackClassName)
    this._insertBg(this.yScrollerBar, '_scroller_bg ' + this.barClassName)
    this.container.appendChild(this.yScrollerContainer)

    this.xScrollerContainer.style.bottom = this.offset + 'px'
    this.yScrollerContainer.style.right = this.offset + 'px'

    this._calcStatus()

    this.mouseenterHandler = () => this._calcStatus()
    this.mouseleaveHandler = () => this._calcStatus()
    addListener(this.el, 'mouseenter', this.mouseenterHandler)
    addListener(this.el, 'mouseleave', this.mouseleaveHandler)

    this.xMousedownHandler = e => this._mousedownHandler(e, 'horizontal')
    this.yMousedownHandler = e => this._mousedownHandler(e, 'vertical')

    addListener(this.xScrollerBar, 'mousedown', this.xMousedownHandler)
    addListener(this.yScrollerBar, 'mousedown', this.yMousedownHandler)

    this.xClickHandler = e => this._clickHandler(e, 'horizontal')
    this.yClickHandler = e => this._clickHandler(e, 'vertical')
    addListener(this.xScrollerTrack, 'click', this.xClickHandler)
    addListener(this.yScrollerTrack, 'click', this.yClickHandler)
  }

  _getViewSize () {
    const containerRect = this.container.getBoundingClientRect()

    const width = parseFloat(containerRect.width)
    // firefox will ignore padding bottom when do scrolling
    const height = parseFloat(containerRect.height)

    return { width, height }
  }

  _calcStatus () {
    this._calcVisible()
    this._calcBarSize()
  }

  _calcVisible () {
    if (getNativeScrollBarWidth() === 0) {
      this.xScrollerContainer.style.display = 'none'
      this.yScrollerContainer.style.display = 'none'
    } else {
      if (this._needX()) {
        this.xScrollerContainer.style.display = 'inline-block'
        // this.mask.style.overflowX = 'auto'
      } else {
        this.xScrollerContainer.style.display = 'none'
        // this.mask.style.overflowX = 'hidden'
      }
      if (this._needY()) {
        this.yScrollerContainer.style.display = 'inline-block'
        // this.mask.style.overflowY = 'auto'
      } else {
        this.yScrollerContainer.style.display = 'none'
        // this.mask.style.overflowY = 'hidden'
      }
    }
  }

  _calcBarSize () {
    const contentRect = this.content.getBoundingClientRect()
    const viewSize = this._getViewSize()

    const calc = (content, view, track) => Math.floor(track * view / content)

    if (this._needY()) {
      let res = calc(
        contentRect.height,
        viewSize.height,
        this.yScrollerTrack.getBoundingClientRect().height
      )
      this.yScrollerBar.style.height = res + 'px'
      if (res < 20) {
        addClass(this.yScrollerBar, '_minimal')
      } else {
        removeClass(this.yScrollerBar, '_minimal')
      }
    }
    if (this._needX()) {
      let res = calc(
        contentRect.width,
        viewSize.width,
        this.xScrollerTrack.getBoundingClientRect().width
      )
      this.xScrollerBar.style.width = res + 'px'
      if (res < 20) {
        addClass(this.xScrollerBar, '_minimal')
      } else {
        removeClass(this.xScrollerBar, '_minimal')
      }
    }
  }

  _content2bar () {
    const contentRect = this.content.getBoundingClientRect()

    const scrollTop = this.mask.scrollTop
    const scrollLeft = this.mask.scrollLeft

    const calc = (scroll, content, track) => Math.ceil(scroll * track / content) + 1

    if (this._needX()) {
      const trackRect = this.xScrollerTrack.getBoundingClientRect()
      this.xScrollerBar.style.transform = `
        translateX(${calc(scrollLeft, contentRect.width, trackRect.width)}px)
      `
    }
    if (this._needY()) {
      const trackRect = this.yScrollerTrack.getBoundingClientRect()
      this.yScrollerBar.style.transform = `
      translateY(${calc(scrollTop, contentRect.height, trackRect.height)}px)
      `
    }
  }

  // handle drag event of core
  _mousedownHandler (e, direction) {
    e.preventDefault()
    e.stopPropagation()

    this.drag = true
    this.dragDirection = direction
    if (this.dragDirection === 'vertical') {
      this.dragDiff = e.pageY - this.yScrollerBar.getBoundingClientRect().top
      addClass(this.yScrollerBar, '_dragging_target')
    } else {
      this.dragDiff = e.pageX - this.xScrollerBar.getBoundingClientRect().left
      addClass(this.xScrollerBar, '_dragging_target')
    }

    addClass(this.el, '_dragging')

    this.mousemoveHandler = e => this._mousemoveHandler(e)
    this.mouseupHandler = e => this._mouseupHandler(e)
    addListener(window, 'mousemove', this.mousemoveHandler)
    addListener(window, 'mouseup', this.mouseupHandler)
  }

  _mousemoveHandler (e) {
    e.preventDefault()
    e.stopPropagation()

    let theoreticBarScroll = 0

    if (this.dragDirection === 'vertical') {
      theoreticBarScroll = e.pageY - this.dragDiff - this.yScrollerTrack.getBoundingClientRect().top
    } else {
      theoreticBarScroll = e.pageX - this.dragDiff - this.xScrollerTrack.getBoundingClientRect().left
    }

    this._setBarScroll(theoreticBarScroll)
    this._bar2content()
  }

  _mouseupHandler (e) {
    e.preventDefault()
    e.stopPropagation()
    this.drag = false
    removeClass(this.xScrollerBar, '_dragging_target')
    removeClass(this.yScrollerBar, '_dragging_target')
    removeClass(this.el, '_dragging')
    removeListener(window, 'mousemove', this.mousemoveHandler)
    removeListener(window, 'mouseup', this.mouseupHandler)
  }

  _clickHandler (e, direction) {
    if (hasClass(e.target, '_x_scroller_bar') || hasClass(e.target, '_y_scroller_bar')) return false
    this.dragDirection = direction

    const calc = (mouse, track, coreSize) => mouse - track - coreSize / 2

    if (this.dragDirection === 'vertical') {
      const coreRect = this.yScrollerBar.getBoundingClientRect()
      const trackRect = this.yScrollerTrack.getBoundingClientRect()
      this.barScroll = calc(e.clientY, trackRect.top, coreRect.height)
    } else {
      const coreRect = this.xScrollerBar.getBoundingClientRect()
      const trackRect = this.xScrollerTrack.getBoundingClientRect()
      this.barScroll = calc(e.clientX, trackRect.left, coreRect.width)
    }

    this._bar2content()
  }
  // end of handling drag event of core

  _setBarScroll (theoreticBarScroll) {
    if (this.dragDirection === 'vertical') {
      const barRect = this.yScrollerTrack.getBoundingClientRect()
      const coreRect = this.yScrollerBar.getBoundingClientRect()
      const max = barRect.height - coreRect.height
      const reality = theoreticBarScroll < 0 ? 0 : (
        theoreticBarScroll > max ? max : theoreticBarScroll
      )
      this.yScrollerBar.style.transform = `translateY(${reality}px)`
      this.barScroll = reality
    } else {
      const barRect = this.xScrollerTrack.getBoundingClientRect()
      const coreRect = this.xScrollerBar.getBoundingClientRect()
      const max = barRect.width - coreRect.width
      const reality = theoreticBarScroll < 0 ? 0 : (
        theoreticBarScroll > max ? max : theoreticBarScroll
      )
      this.xScrollerBar.style.transform = `translateX(${reality}px)`
      this.barScroll = reality
    }
  }

  _bar2content () {
    const barScroll = this.barScroll
    const contentRect = this.content.getBoundingClientRect()

    const calc = (barScroll, content, track) => Math.ceil(barScroll * content / track)

    if (this.dragDirection === 'vertical') {
      const trackRect = this.yScrollerTrack.getBoundingClientRect()
      this.mask.scrollTop = calc(barScroll, contentRect.height, trackRect.height)
    } else {
      const trackRect = this.xScrollerTrack.getBoundingClientRect()
      this.mask.scrollLeft = calc(barScroll, contentRect.width, trackRect.width)
    }
  }

  getScroll () {
    return {
      scrollTop: this.mask.scrollTop,
      scrollLeft: this.mask.scrollLeft
    }
  }

  scrollTo ({ scrollTop, scrollLeft }) {
    if (scrollTop || scrollTop === 0) {
      this.mask.scrollTop = scrollTop
    }
    if (scrollLeft || scrollLeft === 0) {
      this.mask.scrollLeft = scrollLeft
    }
    return this
  }

  onScroll (cb) {
    if (this.cbs.indexOf(cb) === -1) {
      this.cbs.push(cb)
      addListener(this.mask, 'scroll', cb)
    }
    return this
  }

  offScroll (cb) {
    const index = this.cbs.indexOf(cb)
    if (cb && index !== -1) {
      removeListener(this.mask, 'scroll', cb)
      this.cbs.splice(index, 1)
    } else {
      this.cbs.forEach(c => removeListener(this.mask, 'scroll', c))
    }
    return this
  }

  setDirection (direction, lazy) {
    this.direction = directions.indexOf(direction) !== -1
      ? direction
      : 'both'
    if (this._noX()) {
      addClass(this.content, '_no_x')
    } else {
      removeClass(this.content, '_no_x')
    }
    if (this._noY()) {
      addClass(this.content, '_no_y')
    } else {
      removeClass(this.content, '_no_y')
    }

    if (!lazy) {
      this._recalc()
    }

    return this
  }

  destroy () {
    // recover dom constructure
    transferDOM(this.content, this.el)
    removeClass(this.el, '_scroller')

    // remove all listeners
    // removeListener(this.mask, 'scroll', this.scrollHandler)
    removeListener(this.el, 'mouseenter', this.mouseenterHandler)
    removeListener(this.el, 'mouseleave', this.mouseleaveHandler)
    removeListener(this.xScrollerBar, 'mousedown', this.xMousedownHandler)
    removeListener(this.yScrollerBar, 'mousedown', this.yMousedownHandler)
    removeListener(this.xScrollerTrack, 'click', this.xClickHandler)
    removeListener(this.yScrollerTrack, 'click', this.yClickHandler)
    // removeListener(window, 'mousemove', this.mousemoveHandler)
    // removeListener(window, 'mouseup', this.mouseupHandler)
    this.cbs.forEach(c => removeListener(this.mask, 'scroll', c))

    // remove all handlers
    this.scrollHandler = null
    this.mouseenterHandler = null
    this.mouseleaveHandler = null
    this.xMousedownHandler = null
    this.yMousedownHandler = null
    this.xClickHandler = null
    this.yClickHandler = null
    this.mousemoveHandler = null
    this.mouseupHandler = null

    // remove all properties
    this.barClassName = null
    this.barScroll = null
    this.cbs = null
    this.container = null
    this.placeholder = null
    this.contentWrapper = null
    this.content = null
    this.direction = null
    this.drag = null
    this.dragDiff = null
    this.dragDirection = null
    this.el = null
    this.mask = null
    this.elResizeObserver.disconnect()
    this.elResizeObserver = null
    this.elStyleChangeObserver.disconnect()
    this.elStyleChangeObserver = null
    this.childInsertObserver.disconnect()
    this.childInsertObserver = null
    this.contentSizeObserver.disconnect()
    this.contentSizeObserver = null
    this.trackClassName = null
    this.xScrollerBar = null
    this.xScrollerContainer = null
    this.xScrollerTrack = null
    this.yScrollerBar = null
    this.yScrollerContainer = null
    this.yScrollerTrack = null
  }
}
