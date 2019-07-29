import React from 'react'
import PropTypes from 'prop-types'
import warning from 'tiny-warning'

import RouterContext from './RouterContext'
import matchPath from './matchPath'

const BACKGROUND = '#f5f5f9'

const push_match = {
  background: BACKGROUND,
  boxShadow: '-2px 0 5px rgba(0, 0, 0, .2)',
}

const push_pre = {
  zIndex: -1,
  position: 'absolute',
  left: 0,
  top: 0,
}

const gesture_pre = {
  zIndex: -1,
  position: 'absolute',
  left: 0,
  top: 0,
}

const pop_match = {
  background: BACKGROUND,
  boxShadow: '-2px 0 5px rgba(0, 0, 0, .2)',
}

const pop_pre = {
  position: 'fixed',
  left: 0,
  top: 0,
  boxShadow: '-2px 0 5px rgba(0, 0, 0, .2)',
  background: BACKGROUND,
}

function firstDivInBody() {
  const children = document.body.children
  for (let i = 0; i < children.length; i++) {
    if (children[i].tagName == 'DIV') {
      return children[i]
    }
  }
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

  //在pop或者手势后重新渲染,设置底部上一页
  isRerender = false
  prePage = null
  matchPage = null
  action = ''
  canAnimate = true
  //只有一页
  single = true
  SCREEN_WIDTH = window.innerWidth
  MATCH_SCREEN_OFFSET = this.SCREEN_WIDTH
  BOTTOM_SCREEN_OFFSET = -this.SCREEN_WIDTH * 0.3
  BACK_ACTIVE_POSITION = this.SCREEN_WIDTH * 0.1
  rootElement = firstDivInBody()
  cacheList = {}

  SIZE = { width: window.screen.width, minHeight: window.innerHeight }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.canAnimate && !this.isRerender) {
      this.action == 'POP' ? this.animatePop() : this.animatePush()
    }
    this.isRerender = false
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

  animate = ({ begin, end, ref, done, duration = 0.1, left = false }) => {

    const factor = this.easeOutQuad

    const loop = (time) => {
      const next = factor(time, begin, end - begin, duration)
      requestAnimationFrame(_ => {
        if (left) {
          ref.style.left = next + 'px'
        } else {
          ref.style.transform = `translate3d(${next}px,0px,0)`
        }
        if (next == end) {
          done && done()
          return
        }
        loop(time + 0.01)
      })
    }
    loop(0)
  }

  //matchPage -> prePage ->
  animatePop = () => {
    this.animate({
      begin: this.BOTTOM_SCREEN_OFFSET,
      end: 0,
      ref: this.matchRef,
      done: _ => {
        //动画结束后重新渲染,设置底部上一页
        this.prePage.props.setCache(false)
        this.isRerender = true
        this.forceUpdate()
      },
    })
    this.animate({
      begin: 0,
      end: this.MATCH_SCREEN_OFFSET,
      ref: this.preRef,
    })
  }

  //prePage <- matchPage <-
  animatePush = () => {
    if (!this.matchRef) return
    this.matchPage.props.setCache(true)
    this.animate({
      begin: this.MATCH_SCREEN_OFFSET,
      end: 0,
      ref: this.matchRef,
      done: _ => {
        if (this.matchRef) {
          this.matchRef.style.transform = null
        }
      },
    })
    this.animate({
      begin: 0,
      end: this.BOTTOM_SCREEN_OFFSET,
      ref: this.preRef,
      done: _ => {
        this.matchRef.style.transform = null
        this.hideBottom()
      },
    })
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
    return match ? (
        this.cacheList[location.pathname]
        || (this.cacheList[location.pathname] = React.cloneElement(element, {
          location,
          computedMatch: match,
        }))
    ) : null
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
    // this.preRef.style.left = t + 'px'
    this.preRef.style.transform = `translate3d(${t}px,0px,0)`
  }

  hideBottom = () => {
    this.preRef.style.opacity = 0
  }

  showBottom = () => {
    this.preRef.style.opacity = null
  }

  onTouchStart = (e) => {
    this.rootElement.style.overflow = 'hidden'
    this._ScreenX = this._startScreenX = e.touches[0].screenX
    this.gestureBackActive = this._startScreenX < this.BACK_ACTIVE_POSITION
    if (!this.gestureBackActive) {
      return
    }
    this.showBottom()
    this._lastScreenX = this._lastScreenX || 0
    this.startTime = +new Date()
  }


  onTouchMove = (e) => {

    if (!this.gestureBackActive) {
      return
    }

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
    this.animate({
      begin: this._lastScreenX,
      end: 0,
      ref: this.matchRef,
      done: _ => {
        this.matchRef.style.transform = null
        this.preRef.style.opacity = 0
      },
    })
    this.animate({
      begin: this.BOTTOM_SCREEN_OFFSET + this._lastScreenX * 0.3,
      end: this.BOTTOM_SCREEN_OFFSET,
      ref: this.preRef,
    })
  }

  onTouchEnd = (e) => {

    this.rootElement.style.overflow = null
    //不是从左侧特定区域开始滑动
    if (!this.gestureBackActive) {
      return
    }
    let deltaT = +new Date() - this.startTime
    //速度快而且滑动了一段距离
    if (deltaT < 300 && this._lastScreenX > this.SCREEN_WIDTH * 0.2) {
      this.animate({
        begin: this.BOTTOM_SCREEN_OFFSET + this._lastScreenX * 0.3,
        end: 0,
        ref: this.preRef,
        duration: 0.05,
      })
      this.animate({
        begin: this._lastScreenX,
        end: this.SCREEN_WIDTH,
        ref: this.matchRef,
        done: _ => {
          this.matchPage.props.setCache(false)
          this.props.adapt.history.goBack()
        },
        duration: 0.05,
      })
      this._lastScreenX = 0
      this.isRerender = true
      this.gestureBackActive = false
    }
    //滑动小于一半
    else if (this._lastScreenX < this.SCREEN_WIDTH / 2) {
      //有滑动 恢复(无滑动时,_lastScreenX==0)
      if (this._lastScreenX > 0) {
        this.reset()
      }
      this.gestureBackActive = false
      this._lastScreenX = 0
    } else {
      //将上一页划入
      this.animate({
        begin: this.BOTTOM_SCREEN_OFFSET + this._lastScreenX * 0.3,
        end: 0,
        ref: this.preRef,
        duration: 0.05,
      })
      //将本页划出
      this.animate({
        begin: this._lastScreenX,
        end: this.SCREEN_WIDTH,
        ref: this.matchRef,
        done: _ => {
          this.matchPage.props.setCache(false)
          this.props.adapt.history.goBack()
        },
        duration: 0.05,
      })
      this.isRerender = true
      this.gestureBackActive = false
      this._lastScreenX = 0
    }
  }

  reRender = () => {

    this.matchPage.props.changeStatus('activate')

    if (this.single) {
      return <div ref={ref => this.preRef = this.matchRef = ref}>{this.matchPage}</div>
    }

    //找到本页面上一个页面的path
    const prevLocation = window.globalManger[window.globalManger.length - 2]
    //找到上一个对应的组件
    this.prePage = this.findMatchElementByLocation(prevLocation)

    return <>
      <div style={{
        ...this.SIZE,
        ...gesture_pre,
        opacity: 0,
        position: 'fixed',
        transform: `translate3d(${this.BOTTOM_SCREEN_OFFSET}px,0,0)`,
        top: -window.globalPosition[prevLocation.pathname] || 0,
      }}
           key={Math.random()}
           ref={ref => {
             return this.preRef = ref
           }}>
        {this.prePage}
      </div>
      <div style={{ ...this.SIZE, ...pop_match }}
           key={Math.random()}
           ref={ref => {
             if (ref) {
               ref.removeEventListener('touchstart', this.onTouchStart)
               ref.removeEventListener('touchmove', this.onTouchMove)
               ref.removeEventListener('touchend', this.onTouchEnd)
               ref.addEventListener('touchstart', this.onTouchStart)
               ref.addEventListener('touchmove', this.onTouchMove)
               ref.addEventListener('touchend', this.onTouchEnd)
               ref.addEventListener('touchstart', this.onTouchStart)
               ref.addEventListener('touchmove', this.onTouchMove)
               ref.addEventListener('touchend', this.onTouchEnd)
             }
             this.matchRef = ref
           }}>
        {this.matchPage}
      </div>
    </>
  }

  renderPop = () => {

    if (!this.prePage) {
      this.canAnimate = false
      return <div ref={ref => this.matchRef = ref}>{this.matchPage}</div>
    }


    //回退碰到了相同页面
    if (this.prePage.props.path == this.matchPage.props.path) {
      //还能回退
      if (window.globalManger.length > 1) {
        this.canAnimate = false
        this.props.adapt.history.goBack()
      } else {
        this.canAnimate = false
        return <div ref={ref => this.matchRef = ref}>{this.matchPage}</div>
      }
    }

    return (
        <>
          <div style={{
            ...this.SIZE,
            ...pop_match,
            // left: this.BOTTOM_SCREEN_OFFSET,
            transform: `transform3d(${this.BOTTOM_SCREEN_OFFSET}px,0,0)`,
          }}
               key={Math.random().toString()}
               ref={ref => {
                 if (ref) {
                   ref.removeEventListener('touchstart', this.onTouchStart)
                   ref.removeEventListener('touchmove', this.onTouchMove)
                   ref.removeEventListener('touchend', this.onTouchEnd)
                   ref.addEventListener('touchstart', this.onTouchStart)
                   ref.addEventListener('touchmove', this.onTouchMove)
                   ref.addEventListener('touchend', this.onTouchEnd)
                 }
                 this.matchRef = ref
               }}>
            {this.matchPage}
          </div>
          <div style={{
            ...this.SIZE,
            ...pop_pre,
            zIndex: 1,
            transform: `transform3d(${this.BOTTOM_SCREEN_OFFSET}px,0,0)`,
            top: -(document.documentElement.scrollTop || document.body.scrollTop),
          }}
               key={Math.random().toString()}
               ref={ref => {
                 this.preRef = ref
               }}>
            {this.prePage}
          </div>
        </>
    )
  }

  correctPosition = (key) => {
    window.globalPosition = window.globalPosition || {}
    window.globalPosition[key] = document.documentElement.scrollTop || document.body.scrollTop
    document.documentElement.scrollTop = document.body.scrollTop = 0
    return window.globalPosition[key]
  }

  renderPush = () => {
    //入口重定向
    if (this.single && this.action == 'REPLACE') {
      this.canAnimate = false
      return <div ref={ref => this.preRef = this.matchRef = ref}>{this.matchPage}</div>
    }


    const preLocation = window.globalManger[window.globalManger.length - 2]

    this.correctPosition(preLocation.pathname)
    if (this.prePage) {
      this.prePage.props.changeStatus('unActivate')
    }

    this.matchPage.props.changeStatus('activate')

    return (
        <>
          <div style={{
            transform: `translate3d(0px,0px,0)`,
            ...this.SIZE,
            ...push_pre,
            position: 'fixed',
            left: 0,
            top: -window.globalPosition[preLocation.pathname] || 0,
          }}
               key={Math.random()}
               ref={ref => {
                 if (ref) {
                   ref.style.opacity = null
                 }
                 return this.preRef = ref
               }}>
            {this.prePage}
          </div>
          <div style={{
            transform: `translate3d(${this.MATCH_SCREEN_OFFSET}px,0px,0)`,
            ...this.SIZE,
            ...push_match,
          }}
               key={Math.random()}
               ref={ref => {
                 if (ref) {
                   ref.removeEventListener('touchstart', this.onTouchStart)
                   ref.removeEventListener('touchmove', this.onTouchMove)
                   ref.removeEventListener('touchend', this.onTouchEnd)
                   ref.addEventListener('touchstart', this.onTouchStart)
                   ref.addEventListener('touchmove', this.onTouchMove)
                   ref.addEventListener('touchend', this.onTouchEnd)
                   ref.addEventListener('touchstart', this.onTouchStart)
                   ref.addEventListener('touchmove', this.onTouchMove)
                   ref.addEventListener('touchend', this.onTouchEnd)
                 }
                 this.matchRef = ref
               }}>
            {React.cloneElement(this.matchPage, { ...this.matchPage.props, routerActiveStatus: 'active' })}
          </div>
        </>
    )
  }

  preRender = () => {
    this.action = this.props.adapt.history.action
    this.single = window.globalManger.length == 1
    document.addEventListener('WinJSBridgeReady', _ => {
      window.WinJSBridge.call('webview', 'dragbackenable', { enable: this.single })
    })
    // this.toggleBodyTouch(this.single)
    this.prePage = this.matchPage
    this.matchPage = this.findMatchElement()
  }

  render() {
    this.preRender()
    this.SIZE = { width: window.innerWidth, minHeight: window.innerHeight }
    return this.matchPage ?
        this.action == 'POP' ?
            this.isRerender ? this.reRender() : this.renderPop()
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
