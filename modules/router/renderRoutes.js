import Switch from './Switch'
import React, {useState} from 'react'
import Route from './Route'
import {KeepAlive, Provider as KeepAliveProvider} from 'freya-keep-alive'
import NormalSwitch from './NormalSwitch'

const lte10 = navigator.userAgent.match(/Mac OS/)
    && (navigator.userAgent.match(/os\s+(\d+)/i) ? navigator.userAgent.match(/os\s+(\d+)/i)[1] - 0 < 10 :
        false)

export default function renderRoutes(routes) {

  if (lte10) {
    return (
        <KeepAliveProvider>
          <NormalSwitch>
            {routes.map((route, idx) => <Route key={idx} {...route} component={props =>
                <KeepAlive name={idx.toString()}>
                  <div>
                    <route.component {...props}/>
                  </div>
                </KeepAlive>}/>)}
          </NormalSwitch>
        </KeepAliveProvider>
    )
  }
  return (
      <KeepAliveProvider>
        <Switch>
          {routes.map((route, idx) => {
            let _routerStore = {}
            let ref = null
            return <Route
                key={idx}
                {...route}
                setCache={cache => {
                  if (ref) {
                    ref.setCache(cache)
                  }
                }}
                changeStatus={st => _routerStore.status = st}
                component={props => (
                    <KeepAlive name={idx.toString()}>
                      <Wrap ref={_ref => ref = _ref}
                            component={route.component}
                            _routerStore={_routerStore}
                            {...props}/>
                    </KeepAlive>
                )}
            />
          })}
        </Switch>
      </KeepAliveProvider>
  )
}

class Wrap extends React.PureComponent {

  state = {
    cache: true,
  }

  setCache = (cache) => {
    this.setState({ cache })
  }

  render() {
    if (!this.state.cache) return null
    return <this.props.component {...this.props}/>
  }

}
