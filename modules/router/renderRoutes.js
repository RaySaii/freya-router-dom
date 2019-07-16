import Switch from './Switch'
import React from 'react'
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
                  <div  key={idx.toString()}>
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
            return <Route key={idx} {...route} changeStatus={st => _routerStore.status = st} component={props => {
              return <KeepAlive name={idx.toString()}>
                <div key={idx.toString()}>
                  <route.component _routerStore={_routerStore}  {...props}/>
                </div>
              </KeepAlive>
            }}/>
          })}
        </Switch>
      </KeepAliveProvider>
  )
}
