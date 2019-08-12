import React, {useContext, useEffect} from 'react'
import {IdContext} from './Switch'


export const ACTIVATE = 'ACTIVATE'
export const UN_ACTIVATE = 'UN_ACTIVATE'

export function detect(Comp) {
    class Wrap extends React.Component {

        instance = null
        static contextType = IdContext

        lifecycleHandle = (e) => {
            if (e.detail == ACTIVATE) {
                this.instance.componentDidActivate && this.instance.componentDidActivate()
            } else {

                this.instance.componentWillUnactivate && this.instance.componentWillUnactivate()
            }
        }

        componentDidMount() {
            if (this.instance) {
                this.instance.componentDidActivate && this.instance.componentDidActivate()
            }
            window.addEventListener(this.context, this.lifecycleHandle)
        }

        componentWillUnmount() {
            window.removeEventListener(this.context, this.lifecycleHandle)
        }

        render() {
            return <Comp ref={ref => this.instance = ref} {...this.props}/>
        }
    }

    return Wrap
}


export function useDetect(activate) {
    const id = useContext(IdContext)
    let unActivate = null
    let lifecycleHandle = e => {
        if (e.detail == ACTIVATE) {
            unActivate = activate()
        } else {
            unActivate && unActivate()
        }
    }
    useEffect(_ => {
        window.addEventListener(id, lifecycleHandle)
        return _ => window.removeEventListener(id, lifecycleHandle)
    }, [])
}
