export const easeInQuad = (time, begin, change, duration) => {
    const x = time / duration //x值
    const y = x * x //y值
    return begin + change * y //套入最初的公式
}

export const easeOutQuad = (time, begin, change, duration) => {
    const x = time / duration         //x值
    const y = -x * x + 2 * x  //y值
    return begin + change * y        //套入最初的公式
}

export const easeInOut = (time, begin, change, duration) => {
    if (time < duration / 2) { //前半段时间
        return easeInQuad(time, begin, change / 2, duration / 2)//改变量和时间都除以2
    } else {
        const t1 = time - duration / 2 //注意时间要减去前半段时间
        const b1 = begin + change / 2//初始量要加上前半段已经完成的
        return easeOutQuad(t1, b1, change / 2, duration / 2)//改变量和时间都除以2
    }
}

export const animate = ({ begin, end, ref, done, duration = 0.1, left = false }) => {

    const factor =easeOutQuad

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
