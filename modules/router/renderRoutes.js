import Switch from './Switch'
import React from 'react'
import Route from './Route'

export default function renderRoutes(routes) {
  return (
      <Switch>
        {
          routes.map(route => <Route key={route.path.toString()} {...route}/>)
        }
      </Switch>
  )
}
