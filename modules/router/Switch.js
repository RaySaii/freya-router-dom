import React from 'react'
import PropTypes from 'prop-types'
import warning from 'tiny-warning'

import RouterContext from './RouterContext'
import matchPath from './matchPath'


const push_match = {
  background: '#fff',
  boxShadow: '-2px 0 5px rgba(0, 0, 0, .2)',
}

const push_current = {
  zIndex: -1,
  position: 'absolute',
  left: 0,
  top: 0,
}

const gesture_current = {
  zIndex: -1,
  position: 'absolute',
  left: 0,
  top: 0,
}

const pop_match = {
  background: '#fff',
  boxShadow: '-2px 0 5px rgba(0, 0, 0, .2)',
}

const pop_current = {
  position: 'absolute',
  left: 0,
  top: 0,
  boxShadow: '-2px 0 5px rgba(0, 0, 0, .2)',
  background: '#fff',
}


/**
 * The public API for rendering the first <Route> that matches.
 */
class Switch extends React.Component {

  render() {
    return (
        <RouterContext.Consumer>
          {context => <AnimateRoute {...this.props} adapt={context}/>}
        </RouterContext.Consumer>
    )
  }
}

const isWebView = typeof navigator !== 'undefined' &&
    /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent)


class AnimateRoute extends React.Component {

  currentPage = null
  matchPage = null
  action = ''
  canAnimate = true
  SCREEN_WIDTH = window.innerWidth
  MATCH_SCREEN_OFFSET = this.SCREEN_WIDTH
  BOTTOM_SCREEN_OFFSET = -this.SCREEN_WIDTH * 0.3
  BACK_ACTIVE_POSITION = this.SCREEN_WIDTH * 0.1

  SIZE = { width: window.innerWidth, height: window.innerHeight }


  disabledBodyTouch = (e) => {
    if (e._isScroller) return
    e.preventDefault()
  }

  //magic code
  toggleBodyTouch = (bool) => {
    if (!bool) {
      // console.log('======== disabled =========')
      document.body.addEventListener('touchmove', this.disabledBodyTouch, {
        passive: false,
      })
    } else {
      // console.log('======== enable =========')
      document.body.removeEventListener('touchmove', this.disabledBodyTouch)
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.canAnimate && !this.fromGesture) {
      this.action == 'POP' ? this.animatePop() : this.animatePush()
    }
    this.fromGesture = false
    this.canAnimate = true
  }

  easeInQuad = (time, begin, change, duration) => {
    const x = time / duration //x值
    const y = x * x //y值
    return begin + change * y //套入最初的公式
  }

  easeOutQuad = (time, begin, change, duration) => {
    const x = time / duration         //x值
    const y = -x * x + 2 * x  //y值
    return begin + change * y        //套入最初的公式
  }

  easeInOut = (time, begin, change, duration) => {
    if (time < duration / 2) { //前半段时间
      return this.easeInQuad(time, begin, change / 2, duration / 2)//改变量和时间都除以2
    } else {
      const t1 = time - duration / 2 //注意时间要减去前半段时间
      const b1 = begin + change / 2//初始量要加上前半段已经完成的
      return this.easeOutQuad(t1, b1, change / 2, duration / 2)//改变量和时间都除以2
    }
  }

  animate = ({ begin, end, ref, done, type = 'ease-in-out', duration = 0.1 }) => {

    const factor = type == 'ease-in-out' ? this.easeInOut
        : type == 'ease-in' ? this.easeInQuad
            : type == 'ease-out' ? this.easeOutQuad
                : this.easeInOut

    const loop = (time) => {
      const next = factor(time, begin, end - begin, duration)
      requestAnimationFrame(_ => {
        ref.style.transform = `translate3d(${next}px,0px,0)`
        if (next == end) {
          done && done()
          return
        }
        loop(time + 0.01)
      })
    }
    loop(0)
  }

  //matchPage -> currentPage ->
  animatePop = () => {
    this.animate({ begin: this.BOTTOM_SCREEN_OFFSET, end: 0, ref: this.matchRef })
    this.animate({
      begin: 0,
      end: this.MATCH_SCREEN_OFFSET,
      ref: this.currentRef,
      done: _ => this.currentRef.style.display = 'none',
    })
  }

  //currentPage <- matchPage <-
  animatePush = () => {
    this.animate({ begin: this.MATCH_SCREEN_OFFSET, end: 0, ref: this.matchRef })
    this.animate({ begin: 0, end: this.BOTTOM_SCREEN_OFFSET, ref: this.currentRef })
  }


  findMatchElement = (location) => {
    // We use React.Children.forEach instead of React.Children.toArray().find()
    // here because toArray adds keys to all child elements and we do not want
    // to trigger an unmount/remount for two <Route>s that render the same
    // component at different URLs.
    let element, match
    location = location || this.props.location || this.props.adapt.location
    React.Children.forEach(this.props.children, child => {
      if (match == null && React.isValidElement(child)) {
        element = child

        const path = child.props.path || child.props.from
        match = path
            ? matchPath(location.pathname, { ...child.props, path })
            : this.props.adapt.match
      }
    })
    return match ? React.cloneElement(element, {
      location,
      computedMatch: match,
    }) : null
  }

  findMatchElementByLocation = (location) => {
    return this.findMatchElement(location)
  }

  // 页面平移
  setTransform = (translate) => {
    this.matchRef.style.transform = `translate3d(${translate}px,0px,0)`
    this.setBottomTransform(translate)
  }

  setBottomTransform = (translate) => {
    const t = this.BOTTOM_SCREEN_OFFSET + translate * 0.3
    this.currentRef.style.transform = `translate3d(${t}px,0px,0)`
  }

  onTouchStart = (e) => {
    document.getElementById('root').style.overflow = 'hidden'
    this._ScreenX = this._startScreenX = e.touches[0].screenX
    this.gestureBackActive = this._startScreenX < this.BACK_ACTIVE_POSITION
    this._lastScreenX = this._lastScreenX || 0
    this.startTime = +new Date()
  }


  onTouchMove = (e) => {

    if (!this.gestureBackActive) return

    // 使用 pageX 对比有问题
    const _screenX = e.touches[0].screenX

    // 拖动方向不符合的不处理
    if (this._startScreenX > _screenX) {
      return
    }
    e.preventDefault()
    // add stopPropagation with fastclick will trigger content onClick event. why?
    // ref https://github.com/ant-design/ant-design-mobile/issues/2141
    // e.stopPropagation();

    const _diff = Math.round(_screenX - this._ScreenX)
    this._ScreenX = _screenX
    this._lastScreenX += _diff


    this.setTransform(this._lastScreenX)

    // https://github.com/ant-design/ant-design-mobile/issues/573#issuecomment-339560829
    // iOS UIWebView issue, It seems no problem in WKWebView
    if (isWebView && e.changedTouches[0].clientY < 0) {
      this.onTouchEnd()
    }
  }

  reset = () => {
    this.animate({ begin: this._lastScreenX, end: 0, ref: this.matchRef })
  }

  onTouchEnd = (e) => {
    //不是从左侧特定区域开始滑动
    if (!this.gestureBackActive) return
    let deltaT = +new Date() - this.startTime
    document.getElementById('root').style.overflow = null
    if (deltaT < 300 && this._lastScreenX > this.SCREEN_WIDTH * 0.2) {
      this.animate({
        begin: this.BOTTOM_SCREEN_OFFSET + this._lastScreenX * 0.3,
        end: 0,
        ref: this.currentRef,
        duration: 0.05,
      })
      this.animate({
        begin: this._lastScreenX,
        end: this.SCREEN_WIDTH,
        ref: this.matchRef,
        done: this.props.adapt.history.goBack,
        type: 'ease-out',
        duration: 0.05,
      })
      this._lastScreenX = 0
      this.fromGesture = true
      this.gestureBackActive = false
    } else if (this._lastScreenX < this.SCREEN_WIDTH / 2) {
      this.reset()
      this.gestureBackActive = false
      this._lastScreenX = 0
    } else {
      this.animate({
        begin: this.BOTTOM_SCREEN_OFFSET + this._lastScreenX * 0.3,
        end: 0,
        ref: this.currentRef,
        duration: 0.05,
      })
      this.animate({
        begin: this._lastScreenX,
        end: this.SCREEN_WIDTH,
        ref: this.matchRef,
        done: this.props.adapt.history.goBack,
        type: 'ease-out',
        duration: 0.05,
      })
      this.fromGesture = true
      this.gestureBackActive = false
      this._lastScreenX = 0
    }
  }

  renderGesture = () => {

    if (this.single) {
      return this.matchPage
    }

    this.currentPage = this.findMatchElementByLocation(window.globalManger[window.globalManger.length - 2])

    return <>
      <div style={{ transform: `translate3d(${this.BOTTOM_SCREEN_OFFSET}px,0px,0)`, ...this.SIZE, gesture_current }}
           key={Math.random()}
           ref={ref => this.currentRef = ref}>
        {this.currentPage}
      </div>
      <div onTouchStart={this.onTouchStart} onTouchMove={this.onTouchMove} onTouchEnd={this.onTouchEnd}
           style={{ ...this.SIZE, ...pop_match }}
           key={Math.random()}
           ref={ref => this.matchRef = ref}>
        {this.matchPage}
      </div>
    </>
  }

  renderPop = () => {

    if (!this.currentPage) return this.matchPage

    if (this.fromGesture) {
      return this.renderGesture()
    }

    if (this.currentPage.props.path == this.matchPage.props.path) {
      this.props.adapt.history.goBack()
      this.canAnimate = false
      return this.matchPage
    }

    return (
        <>
          <div onTouchStart={this.single ? null : this.onTouchStart}
               onTouchMove={this.single ? null : this.onTouchMove}
               onTouchEnd={this.single ? null : this.onTouchEnd}
               style={{ transform: `translate3d(${this.BOTTOM_SCREEN_OFFSET}px,0px,0)`, ...this.SIZE, ...pop_match }}
               key={Math.random()}
               ref={ref => this.matchRef = ref}>
            {this.matchPage}
          </div>
          <div style={{ transform: `translate3d(0px,0px,0)`, ...this.SIZE, ...pop_current }}
               key={Math.random()}
               ref={ref => this.currentRef = ref}>
            {this.currentPage}
          </div>
        </>
    )
  }

  renderPush = () => {
    //入口重定向
    if (this.single && this.action == 'REPLACE') {
      this.canAnimate = false
      return this.matchPage
    }
    return (
        <>
          <div style={{ transform: `translate3d(0px,0px,0)`, ...this.SIZE, ...push_current }}
               key={Math.random()}
               ref={ref => this.currentRef = ref}>
            {this.currentPage}
          </div>
          <div onTouchStart={this.onTouchStart} onTouchMove={this.onTouchMove} onTouchEnd={this.onTouchEnd}
               style={{ transform: `translate3d(${this.MATCH_SCREEN_OFFSET}px,0px,0)`, ...this.SIZE, ...push_match }}
               key={Math.random()} ref={ref => this.matchRef = ref}>
            {this.matchPage}
          </div>
        </>
    )
  }

  preRender = () => {
    this.action = this.props.adapt.history.action
    this.single = window.globalManger.length == 1
    this.toggleBodyTouch(this.single)
    this.currentPage = this.matchPage
    this.matchPage = this.findMatchElement()
  }

  render() {
    this.preRender()
    return this.matchPage
        ? this.action == 'POP' ? this.renderPop()
            : this.renderPush()
        : '404'
  }

}

if (__DEV__) {
  Switch.propTypes = {
    children: PropTypes.node,
    location: PropTypes.object,
  }

  Switch.prototype.componentDidUpdate = function (prevProps) {
    warning(
        !(this.props.location && !prevProps.location),
        '<Switch> elements should not change from uncontrolled to controlled (or vice versa). You initially used no "location" prop and then provided one on a subsequent render.',
    )

    warning(
        !(!this.props.location && prevProps.location),
        '<Switch> elements should not change from controlled to uncontrolled (or vice versa). You provided a "location" prop initially but omitted it on a subsequent render.',
    )
  }
}

export default Switch
