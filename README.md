 基于 react-router-dom 的仿原生路由库（支持手势返回），改写了其Switch组件，适用于Hybrid，混合开发。

### 预览

![preview](/Users/Blackbird/Desktop/work/freya-router-dom/preview.GIF)

### 生命周期

页面以栈的形式保存，增加了两个生命周期：

- componentDidActivate
- componentWillUnactivate

一个hooks：

```js
import {useDetect} from 'freya-router-dom'

useDetect(_=>{
  didActivate()
  return unactivate()
})

```

### API

`isLastPage`判断当前页面是否是栈中最后一个页面，以便启用原生导航。

