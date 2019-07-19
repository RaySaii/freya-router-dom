import React from 'react'
import PropTypes from 'prop-types'
import warning from 'tiny-warning'

import RouterContext from './RouterContext'
import matchPath from './matchPath'
import invariant from 'tiny-invariant'

/**
 * The public API for rendering the first <Route> that matches.
 */
export default class NormalSwitch extends React.Component {
  cacheList = {}

  componentDidMount() {
    document.addEventListener('WinJSBridgeReady', _ => {
      window.WinJSBridge.call('webview', 'dragbackenable', { enable: false })
    })
  }

  findMatchElement = (location) => {
    // We use React.Children.forEach instead of React.Children.toArray().find()
    // here because toArray adds keys to all child elements and we do not want
    // to trigger an unmount/remount for two <Route>s that render the same
    // component at different URLs.
    let element, match
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

  preRender = (context) => {
    this.action = context.history.action
    this.prePage = this.matchPage
    this.matchPage = this.findMatchElement(context.location)
  }

  render() {
    return (
        <RouterContext.Consumer>
          {context => {
            invariant(context, 'You should not use <Switch> outside a <Router>')

            this.preRender(context)

            if (this.action == 'PUSH') {
              this.matchPage.props.setCache(true)
              document.body.scrollTop = document.documentElement.scrollTop = 0
            } else {
              if (this.prePage && this.prePage !== this.matchPage) {
                this.prePage.props.setCache(false)
              }
            }
            if (this.prePage && this.prePage !== this.matchPage) {
              this.prePage.props.changeStatus('unActivate')
            }
            this.matchPage.props.changeStatus('activate')

            return this.matchPage
          }}
        </RouterContext.Consumer>
    )
  }
}
if (__DEV__) {
  NormalSwitch.propTypes = {
    children: PropTypes.node,
    location: PropTypes.object,
  }

  NormalSwitch.prototype.componentDidUpdate = function (prevProps) {
    warning(
        !(this.props.location && !prevProps.location),
        '<NormalSwitch> elements should not change from uncontrolled to controlled (or vice versa). You initially used no "location" prop and then provided one on a subsequent render.',
    )

    warning(
        !(!this.props.location && prevProps.location),
        '<NormalSwitch> elements should not change from controlled to uncontrolled (or vice versa). You provided a "location" prop initially but omitted it on a subsequent render.',
    )
  }
}
