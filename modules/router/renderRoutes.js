import Switch from './Switch'
import React from 'react'
import Route from './Route'
import {KeepAlive, Provider as KeepAliveProvider} from 'react-keep-alive'

export default function renderRoutes(routes) {
  return (
      <KeepAliveProvider>
        <Switch>
          {routes.map((route, idx) => <Route key={idx} {...route} component={props =>
              <KeepAlive name={idx.toString()}>
                <div>
                  <route.component {...props}/>
                </div>
              </KeepAlive>}/>)}
        </Switch>
      </KeepAliveProvider>
  )
}
