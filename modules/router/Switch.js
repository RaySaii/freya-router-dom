import React, {useEffect} from 'react'
import PropTypes from 'prop-types'
import warning from 'tiny-warning'

import RouterContext from './RouterContext'
import matchPath from './matchPath'
import {ACTIVATE, UN_ACTIVATE} from './detect'
import {animate} from './animate'

const BACK_GROUND = '#f5f5f9'
const BOX_SHADOW = '-3px 0 8px rgba(0, 0, 0, .2)'

function firstDivInBody() {
    return document.getElementById('root')
    const children = document.body.children
    for (let i = 0; i < children.length; i++) {
        if (children[i].tagName == 'DIV') {
            return children[i]
        }
    }
}

export const IdContext = React.createContext('')


const isWebView = typeof navigator !== 'undefined' &&
    /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent)


let PAGE_ID = {}

const getId = (pathname, isNewId) => {
    return pathname + (
        PAGE_ID[pathname]
            ? isNewId ? ++PAGE_ID[pathname] : PAGE_ID[pathname]
            : (PAGE_ID[pathname] = 1)
    )
}

const deleteId = pathname => {
    PAGE_ID[pathname] -= 1
}

const clearId = _ => {
    PAGE_ID = {}
}

class Switch extends React.Component {


    static contextType = RouterContext

    //来自于手势的后退
    fromGesture = false
    action = ''
    //只有一页
    single = true
    SCREEN_WIDTH = window.innerWidth
    BOTTOM_SCREEN_OFFSET = -this.SCREEN_WIDTH * 0.3
    BACK_ACTIVE_POSITION = this.SCREEN_WIDTH * 0.1
    rootElement = firstDivInBody()
    cacheList = {}
    //切换动画中
    animating = false
    //是否能更新
    canUpdate = false

    vdom = null

    refArr = []


    componentWillReceiveProps(nextProps, nextContext) {
        if (nextContext.location.pathname != this.context.location.pathname) {
            const currentContext = this.context
            Promise.resolve().then(_ => this.transitionPage(currentContext, nextContext))
        }
    }

    shouldComponentUpdate(nextProps, nextState, nextContext) {
        return this.canUpdate
    }


    //leftPage -> rightPage ->
    animatePop = (done) => {
        if (this.animating) return
        this.animating = true
        animate({
            begin: this.BOTTOM_SCREEN_OFFSET,
            end: 0,
            ref: this.refArr[this.refArr.length - 2],
            done: _ => {
                this.animating = false
                //动画结束后重新渲染,设置底部上一页
                done && done()
            },
        })
        animate({
            begin: 0,
            end: this.SCREEN_WIDTH,
            ref: this.refArr[this.refArr.length - 1],
        })
    }

    //leftPage <- rightPage <-
    animatePush = (done) => {
        if (this.animating) return
        this.animating = true
        animate({
            begin: this.SCREEN_WIDTH,
            end: 0,
            ref: this.refArr[this.refArr.length - 1],
        })
        setTimeout(_ => {
            animate({
                begin: 0,
                end: this.BOTTOM_SCREEN_OFFSET,
                ref: this.refArr[this.refArr.length - 2],
                done: _ => {
                    done && done()
                    this.animating = false
                },
            })
        }, 100)
    }


    findMatchElement = (location, id) => {
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
                    : this.props.match
            }
        })
        if (match) {
            if (id) {
                return <IdContext.Provider value={id}>
                    {React.cloneElement(element, {
                        location,
                        computedMatch: match,
                    })}
                </IdContext.Provider>
            }
            return React.cloneElement(element, {
                location,
                computedMatch: match,
            })
        }
        return null
    }

    findMatchElementByLocation = (location, id) => {
        if (!location) return null
        return this.findMatchElement(location, id)
    }

    // 页面平移
    setTransform = (translate) => {
        const last = this.refArr[this.refArr.length - 1]
        last.style.transform = `translate3d(${translate}px,0px,0)`
        this.setBottomTransform(translate)
    }

    setBottomTransform = (translate) => {
        const prev = this.refArr[this.refArr.length - 2]
        const t = this.BOTTOM_SCREEN_OFFSET + translate * 0.3
        // this.preRef.style.left = t + 'px'
        prev.style.transform = `translate3d(${t}px,0px,0)`
    }

    hideBottom = () => {
        const prev = this.refArr[this.refArr.length - 2]
        prev.style.opacity = 0
    }

    showBottom = () => {
        const prev = this.refArr[this.refArr.length - 2]
        prev.style.opacity = null
    }

    onTouchStart = (e) => {
        this._ScreenX = this._startScreenX = e.touches[0].screenX
        this.gestureBackActive = this._startScreenX < this.BACK_ACTIVE_POSITION
        if (!this.gestureBackActive) {
            return
        }
        this.showBottom()
        this._lastScreenX = this._lastScreenX || 0
        this.startTime = +new Date()
    }

    setCurrent = () => {
        const last = this.refArr[this.refArr.length - 1]
        last.style.boxShadow = BOX_SHADOW
    }

    restCurrent = () => {
        const last = this.refArr[this.refArr.length - 1]
        last.style.boxShadow = null
    }

    onTouchMove = (e) => {

        if (!this.gestureBackActive) {
            return
        }
        // this.rootElement.style.overflow = 'hidden'
        // 使用 pageX 对比有问题
        const _screenX = e.touches[0].screenX

        // 拖动方向不符合的不处理
        if (this._startScreenX > _screenX) {
            return
        }
        e.preventDefault()
        // add stopPropagation with fastclick will trigger content onClick event. why?
        // ref https://github.com/ant-design/ant-design-mobile/issues/2141
        // e.stopPropagation()


        const _diff = Math.round(_screenX - this._ScreenX)
        this._ScreenX = _screenX
        this._lastScreenX += _diff

        this.setCurrent()
        this.setTransform(this._lastScreenX)

        // https://github.com/ant-design/ant-design-mobile/issues/573#issuecomment-339560829
        // iOS UIWebView issue, It seems no problem in WKWebView
        if (isWebView && e.changedTouches[0].clientY < 0) {
            this.onTouchEnd()
        }
    }

    reset = () => {
        const last = this.refArr[this.refArr.length - 1]
        const prev = this.refArr[this.refArr.length - 2]
        animate({
            begin: this._lastScreenX,
            end: 0,
            ref: last,
            done: _ => {
                last.style.transform = null
                this.hideBottom()
                this.restCurrent()
            },
        })
        animate({
            begin: this.BOTTOM_SCREEN_OFFSET + this._lastScreenX * 0.3,
            end: this.BOTTOM_SCREEN_OFFSET,
            ref: prev,
        })
    }

    goPrevPage = () => {
        const last = this.refArr[this.refArr.length - 1]
        const prev = this.refArr[this.refArr.length - 2]
        animate({
            begin: this.BOTTOM_SCREEN_OFFSET + this._lastScreenX * 0.3,
            end: 0,
            ref: prev,
            duration: 0.05,
        })
        animate({
            begin: this._lastScreenX,
            end: this.SCREEN_WIDTH,
            ref: last,
            done: _ => {
                this.fromGesture = true
                this.context.history.goBack()
            },
            duration: 0.05,
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
            this.goPrevPage()
        }
        //滑动小于一半
        else if (this._lastScreenX < this.SCREEN_WIDTH / 2) {
            //有滑动 恢复(无滑动时,_lastScreenX==0)
            if (this._lastScreenX > 0) {
                this.reset()
            }
        } else {
            this.goPrevPage()
        }
        this.gestureBackActive = false
        this._lastScreenX = 0
    }

    //个别安卓机不能回复滚动位置
    revertScrollTop = () => {
        const currentLocation = window.globalManger[window.globalManger.length - 1]
        if (currentLocation && currentLocation.pathname && window.globalPosition) {
            Promise.resolve().then(_ => {
                document.body.scrollTop = document.documentElement.scrollTop = window.globalPosition[currentLocation.pathname]
            })
        }
    }


    recordPosition = () => {
        window.globalPosition = window.globalPosition || []
        window.globalPosition.push( document.documentElement.scrollTop || document.body.scrollTop)
    }

    transitionPage = (currentContext, nextContext) => {
        this.action = this.context.history.action
        this.single = window.globalManger.length == 1
        document.addEventListener('WinJSBridgeReady', _ => {
            window.WinJSBridge.call('webview', 'dragbackenable', { enable: this.single })
        })
        if (this.action == 'PUSH') {
            this.recordPosition()
            this.renderPush(currentContext, nextContext)
            document.documentElement.scrollTop = document.body.scrollTop = 0
        }
        if (this.action == 'POP') {
            this.renderPop(currentContext, nextContext)
        }
        if (this.action == 'REPLACE') {
            this.renderPush(currentContext, nextContext, true)
        }
    }


    addEvent = ref => {
        if (ref) {
            ref.addEventListener('touchstart', this.onTouchStart)
            ref.addEventListener('touchmove', this.onTouchMove)
            ref.addEventListener('touchend', this.onTouchEnd)
        }
    }

    setPrePageWhenPush = (ref) => {
        ref.style.cssText = `
            width: 100vw;
                    min-height:100vh;
                    position: fixed;
                    left: 0;
                    z-index: -1;
                    top: -${window.globalPosition[window.globalPosition.length - 1] || 0}px;
        `
    }

    setNextPageWhenPush = (ref) => {
        ref.style.cssText = `
                            width: 100vw;
                            min-height: 100vh;
                            transform: translate3d(${this.SCREEN_WIDTH}px,0px,0);
                            background: ${BACK_GROUND};
                            box-shadow: ${BOX_SHADOW};
                         `
    }

    dispatchUnactivate = (id) => {
        window.dispatchEvent(new CustomEvent(id, { detail: UN_ACTIVATE }))
    }

    dispatchActivate = id => {
        window.dispatchEvent(new CustomEvent(id, { detail: ACTIVATE }))
    }

    renderPush = (currentContext, nextContext, isReplace) => {
        const newIdx = this.vdom.length
        const lastIdx = newIdx - 1

        const lastPageId = getId(currentContext.location.pathname)
        const newPageId = getId(nextContext.location.pathname, true)

        this.vdom.push(
            <div key={newPageId}
                 ref={ref => {
                     this.addEvent(ref)
                     if (ref) {
                         this.refArr[newIdx] = ref
                     }
                 }}>
                {this.findMatchElementByLocation(nextContext.location, newPageId)}
            </div>,
        )
        //将新页面 渲染出来
        this.canUpdate = true
        this.setState({}, _ => {

            const prev = this.refArr[lastIdx]

            //从倒数第三页开始display设为none
            if (lastIdx > 0) {
                this.refArr[lastIdx - 1].style.display = 'none'
            }

            //将新一页页面渲染后改变css为动画做准备
            this.setPrePageWhenPush(this.refArr[lastIdx])
            this.setNextPageWhenPush(this.refArr[newIdx])

            //触发上一页的Unactivate lifecycle
            this.dispatchUnactivate(lastPageId)

            this.animateForAction(_ => {
                if (isReplace) {
                    //将倒数第二页设为新页面
                    this.refArr[newIdx].style.cssText = `
                                width: 100vw
                                 min-height: 100vh;
                                 transform: null;
                                 background: ${BACK_GROUND};
                    `
                    this.vdom[lastIdx] = this.vdom[this.vdom.length - 1]
                    this.refArr[lastIdx] = this.refArr[newIdx]

                    //删除最后一页
                    this.vdom.pop()
                    this.refArr.pop()

                    //将被替换的页面滚动位置与id移除
                    window.globalPosition.pop()
                    deleteId(currentContext.location.pathname)

                    this.canUpdate = true
                    this.setState({}, _ => {
                        //触发下一页的 Activate lifecycle
                        this.dispatchActivate(newPageId)
                        if (this.refArr[lastIdx - 1]) {
                            this.refArr[lastIdx - 1].style.display = null
                            this.refArr[lastIdx - 1].style.opacity = 0
                        }
                        this.canUpdate = false
                    })
                } else {
                    //触发下一页的 Activate lifecycle
                    this.dispatchActivate(newPageId)
                    prev.style.opacity = 0
                    this.refArr[newIdx].style.transform = null
                    this.refArr[newIdx].style.boxShadow = null
                }
            })
            this.canUpdate = false
        })
    }


    setPrePageWhenPop = (ref) => {
        ref.style.cssText = `
                width: 100vw;
                minHeight: 100vh;
                background: ${BACK_GROUND};
                z-index: -1;
                opacity: null;
                display: null;
                transform: transform3d(${this.BOTTOM_SCREEN_OFFSET}px,0,0),
        `
    }

    setNextPageWhenPop = ref => {
        ref.style.cssText = `
                width: ${window.innerWidth}px;
                min-height: ${window.innerHeight}px;
                box-shadow: ${BOX_SHADOW};
                background: ${BACK_GROUND};
                position:fixed;
                z-index:1;
                top:-${document.documentElement.scrollTop || document.body.scrollTop}px;
                left:0;
        `
    }

    renderPop = (currentContext, nextContext) => {
        //回复上一页的滚动为值（异步）
        this.revertScrollTop()

        //如果只有一个页面，同时action为pop直接返回对应页面
        if (this.vdom.length <= 1) {
            clearId()
            const id = getId(this.context.location.pathname, true)
            this.vdom = [<div key={id}
                              ref={ref => this.refArr[0] = ref}>{this.findMatchElementByLocation(this.context.location, id)}</div>]
            this.canUpdate = true
            this.setState({}, _ => {
                this.canUpdate = false
            })
            return
        }


        const prevPageIdx = this.vdom.length - 2
        const lastPageIdx = this.vdom.length - 1

        this.setPrePageWhenPop(this.refArr[prevPageIdx])
        this.setNextPageWhenPop(this.refArr[lastPageIdx])

        const done = () => {
            const lastPageId = getId(currentContext.location.pathname)
            const nextPageId = getId(nextContext.location.pathname)
            this.refArr.pop()
            this.vdom.pop()
            window.globalPosition.pop()
            this.canUpdate = true

            this.dispatchUnactivate(lastPageId)

            deleteId(currentContext.location.pathname)

            this.setState({}, _ => {
                this.dispatchActivate(nextPageId)
                this.canUpdate = false
                this.refArr[prevPageIdx].style.boxShadow = BOX_SHADOW
                this.refArr[prevPageIdx].style.zIndex = null
                this.refArr[prevPageIdx].style.transform = null
                //将底部下一页显示
                if (this.refArr[prevPageIdx - 1]) {
                    this.refArr[prevPageIdx - 1].style.display = null
                }
            })
        }
        //如果手势回退，不播动画
        if (this.fromGesture) {
            done()
            this.fromGesture = false
        } else {
            this.animateForAction(_ => {
                done()
            })
        }
    }

    animateForAction = (done) => {
        this.action == 'POP' ? this.animatePop(done) : this.animatePush(done)
    }


    render() {
        return this.vdom || (
            this.vdom = [
                <div key={getId(this.context.location.pathname, true)}
                     ref={ref => this.refArr[0] = ref}>
                    {this.findMatchElementByLocation(this.context.location, getId(this.context.location.pathname))}
                </div>,
            ]
        )
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
