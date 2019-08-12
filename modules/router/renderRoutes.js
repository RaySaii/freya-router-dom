import Switch from './Switch'
import React, {createRef, memo, useEffect, useState} from 'react'
import Route from './Route'
import NormalSwitch from './NormalSwitch'

const lte10 = navigator.userAgent.match(/Mac OS/)
    && (navigator.userAgent.match(/os\s+(\d+)/i) ? navigator.userAgent.match(/os\s+(\d+)/i)[1] - 0 < 10 :
        false)

export default function renderRoutes(routes) {

    if (lte10) {
        return (
            <NormalSwitch>
                {routes.map((route, idx) => <Route key={idx}{...route}/>)}
            </NormalSwitch>
        )
    }
    return <Switch>
        {routes.map((route, idx) => <Route key={idx} {...route}
                                           component={React.memo(props => <route.component {...props}/>, _ => true)}/>)}
    </Switch>
}

